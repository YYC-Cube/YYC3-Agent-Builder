import Redis from "ioredis"
import { createLogger } from "@/lib/logger"

/**
 * file: rate-limit-store.ts
 * description: 限流存储抽象 · 进程内滑动窗口与 Redis 共享配额
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [util],[security],[ratelimit],[redis]
 *
 * brief: 限流存储抽象，单实例进程内滑动窗口，配置 Redis 后自动切换为共享配额。
 *
 * details:
 * - 窗口内用 ZSET 存请求时间戳，刻度精确到毫秒，避免固定窗口边界双倍突发
 * - Redis 侧通过单次 EVAL（Lua）完成「清理过期 → 计数 → 判定 → 写入」，避免竞态
 * - 远端存储异常时 fail-open（放行并告警）：限流是防护手段，不应成为全站不可用的单点
 * - 高风险场景可改为 fail-closed（见 RATE_LIMIT_FAIL_MODE）
 * - 多实例部署共享同一配额，无需改动调用方
 *
 * dependencies: ioredis, @/lib/logger
 * exports: getRateLimitStore, resetRateLimitStore, RateLimitDecision
 * notes: 对高风险场景可设为 fail-closed 模式
 */

export type RateLimitDecision = {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

export interface RateLimitStore {
  readonly kind: "memory" | "redis"
  hit(key: string, limit: number, windowMs: number, now?: number): Promise<RateLimitDecision>
}

const MEMORY_SWEEP_THRESHOLD = 500

class MemoryRateLimitStore implements RateLimitStore {
  readonly kind = "memory" as const
  private readonly buckets = new Map<string, number[]>()

  async hit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<RateLimitDecision> {
    const windowStart = now - windowMs
    const timestamps = (this.buckets.get(key) ?? []).filter((ts) => ts > windowStart)

    if (timestamps.length >= limit) {
      this.buckets.set(key, timestamps)
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(1, timestamps[0]! + windowMs - now),
      }
    }

    timestamps.push(now)
    this.buckets.set(key, timestamps)

    if (this.buckets.size > MEMORY_SWEEP_THRESHOLD) {
      for (const [bucketKey, bucket] of this.buckets) {
        if (bucket.every((ts) => ts <= windowStart)) this.buckets.delete(bucketKey)
      }
    }

    return { allowed: true, remaining: Math.max(0, limit - timestamps.length), retryAfterMs: 0 }
  }

  reset(): void {
    this.buckets.clear()
  }
}

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry = window
  if oldest[2] then retry = math.max(1, tonumber(oldest[2]) + window - now) end
  return {0, 0, retry}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, limit - count - 1, 0}
`

type UpstashResponse = { result?: unknown; error?: string }

class RedisRateLimitStore implements RateLimitStore {
  readonly kind = "redis" as const
  private warnedAt = 0

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async hit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<RateLimitDecision> {
    const namespacedKey = `yyc3:ratelimit:${key}`
    const member = `${now}-${Math.random().toString(36).slice(2, 8)}`

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["EVAL", SLIDING_WINDOW_LUA, "1", namespacedKey, String(now), String(windowMs), String(limit), member]),
        cache: "no-store",
      })

      if (!response.ok) throw new Error(`Upstash HTTP ${response.status}`)

      const payload = (await response.json()) as UpstashResponse
      if (payload.error) throw new Error(payload.error)

      const tuple = Array.isArray(payload.result) ? payload.result : []
      const allowed = Number(tuple[0]) === 1
      return {
        allowed,
        remaining: Number(tuple[1] ?? 0),
        retryAfterMs: Number(tuple[2] ?? 0),
      }
    } catch (error) {
      return failureDecision(limit, error, this.warnedAt, (value) => {
        this.warnedAt = value
      })
    }
  }
}

/** ioredis 的最小接口，便于单测注入假客户端 */
export type RedisEvalClient = {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>
  on(event: "error", listener: (error: unknown) => void): unknown
}

export class IoredisRateLimitStore implements RateLimitStore {
  readonly kind = "redis" as const
  private warnedAt = 0
  private readonly client: RedisEvalClient

  constructor(url: string, client?: RedisEvalClient) {
    this.client =
      client ??
      (new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 200, 2000),
      }) as unknown as RedisEvalClient)

    this.client.on("error", (error) => {
      const now = Date.now()
      if (now - this.warnedAt > 60_000) {
        this.warnedAt = now
        createLogger("rate-limit").warn("Redis connection error", {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })
  }

  async hit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<RateLimitDecision> {
    const member = `${now}-${Math.random().toString(36).slice(2, 8)}`
    try {
      const result = await this.client.eval(
        SLIDING_WINDOW_LUA,
        1,
        `yyc3:ratelimit:${key}`,
        String(now),
        String(windowMs),
        String(limit),
        member,
      )
      return normalizeDecision(result, limit)
    } catch (error) {
      return failureDecision(limit, error, this.warnedAt, (value) => {
        this.warnedAt = value
      })
    }
  }
}

function normalizeDecision(result: unknown, limit: number): RateLimitDecision {
  const tuple = Array.isArray(result) ? result : []
  return {
    allowed: Number(tuple[0]) === 1,
    remaining: Number(tuple[1] ?? 0),
    retryAfterMs: Number(tuple[2] ?? 0),
  }
}

function failureDecision(
  limit: number,
  error: unknown,
  warnedAt: number,
  markWarned: (value: number) => void,
): RateLimitDecision {
  const now = Date.now()
  if (now - warnedAt > 60_000) {
    markWarned(now)
    createLogger("rate-limit").warn("Redis rate limit unavailable, falling back to fail-open", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
  if (process.env.RATE_LIMIT_FAIL_MODE === "closed") {
    return { allowed: false, remaining: 0, retryAfterMs: 1000 }
  }
  return { allowed: true, remaining: limit, retryAfterMs: 0 }
}

const memoryStore = new MemoryRateLimitStore()
let cached: { signature: string; store: RateLimitStore } | null = null

function resolveStore(): RateLimitStore {
  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    const signature = `url:${redisUrl}`
    if (cached?.signature === signature) return cached.store
    cached = { signature, store: new IoredisRateLimitStore(redisUrl) }
    return cached.store
  }

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return memoryStore

  const signature = `${url}:${token.length}`
  if (cached?.signature === signature) return cached.store

  cached = { signature, store: new RedisRateLimitStore(url, token) }
  return cached.store
}

/** 获取当前生效的限流存储（按环境变量惰性解析） */
export function getRateLimitStore(): RateLimitStore {
  return resolveStore()
}

/** 仅测试使用：清空内存桶与解析缓存 */
export function resetRateLimitStore(): void {
  memoryStore.reset()
  cached = null
}
