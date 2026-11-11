import { IoredisRateLimitStore, getRateLimitStore, resetRateLimitStore } from "@/lib/rate-limit-store"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.unstubAllEnvs()
  resetRateLimitStore()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  resetRateLimitStore()
})

describe("限流存储 — 进程内滑动窗口", () => {
  it("未配置 Redis 时使用内存实现", () => {
    expect(getRateLimitStore().kind).toBe("memory")
  })

  it("窗口内超限拒绝并给出剩余等待时间", async () => {
    const store = getRateLimitStore()
    const first = await store.hit("k", 2, 1000, 1000)
    const second = await store.hit("k", 2, 1000, 1500)
    const third = await store.hit("k", 2, 1000, 1800)
    expect(first).toMatchObject({ allowed: true, remaining: 1 })
    expect(second).toMatchObject({ allowed: true, remaining: 0 })
    expect(third.allowed).toBe(false)
    expect(third.retryAfterMs).toBe(200)
  })

  it("窗口滑过后旧请求被清理", async () => {
    const store = getRateLimitStore()
    await store.hit("k", 1, 1000, 1000)
    expect((await store.hit("k", 1, 1000, 1500)).allowed).toBe(false)
    expect((await store.hit("k", 1, 1000, 2100)).allowed).toBe(true)
  })

  it("不同 key 互不影响", async () => {
    const store = getRateLimitStore()
    await store.hit("a", 1, 1000, 1000)
    expect((await store.hit("b", 1, 1000, 1000)).allowed).toBe(true)
  })
})

describe("限流存储 — Redis（Upstash REST）", () => {
  function stubRedis(result: unknown) {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result }), { headers: { "Content-Type": "application/json" } }),
    )
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
  }

  it("配置 Upstash 后切换为 redis 实现并用单次 EVAL 判定", async () => {
    const fetchMock = stubRedis([1, 7, 0])
    const store = getRateLimitStore()
    expect(store.kind).toBe("redis")

    const decision = await store.hit("ip", 10, 60_000, 1000)
    expect(decision).toMatchObject({ allowed: true, remaining: 7, retryAfterMs: 0 })

    const body = JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body)) as unknown[]
    expect(body[0]).toBe("EVAL")
    expect(body[3]).toContain("yyc3:ratelimit:ip")
  })

  it("Redis 返回拒绝时透传 retryAfterMs", async () => {
    stubRedis([0, 0, 2500])
    const decision = await getRateLimitStore().hit("ip", 10, 60_000)
    expect(decision).toMatchObject({ allowed: false, remaining: 0, retryAfterMs: 2500 })
  })

  it("Redis 异常时默认 fail-open", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")))
    expect((await getRateLimitStore().hit("ip", 10, 60_000)).allowed).toBe(true)
  })

  it("RATE_LIMIT_FAIL_MODE=closed 时异常改为拒绝", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    vi.stubEnv("RATE_LIMIT_FAIL_MODE", "closed")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")))
    const decision = await getRateLimitStore().hit("ip", 10, 60_000)
    expect(decision.allowed).toBe(false)
    expect(decision.retryAfterMs).toBe(1000)
  })
})

describe("限流存储 — 本地 Redis（REDIS_URL / ioredis）", () => {
  function fakeClient(result: unknown) {
    return {
      eval: vi.fn().mockResolvedValue(result),
      on: vi.fn(),
    }
  }

  it("REDIS_URL 优先于 Upstash REST 且走 ioredis EVAL", async () => {
    vi.stubEnv("REDIS_URL", "redis://yyc3-45:6379/0")
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const store = getRateLimitStore()
    expect(store.kind).toBe("redis")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("本地 Redis 允许/拒绝结果解析与滑动窗口键前缀", async () => {
    const client = fakeClient([1, 7, 0])
    const store = new IoredisRateLimitStore("redis://yyc3-45:6379/0", client)

    const decision = await store.hit("ip", 10, 60_000, 1000)
    expect(decision).toMatchObject({ allowed: true, remaining: 7, retryAfterMs: 0 })

    const args = client.eval.mock.calls[0]!
    expect(args[1]).toBe(1)
    expect(String(args[2])).toBe("yyc3:ratelimit:ip")

    const denied = new IoredisRateLimitStore("redis://yyc3-45:6379/0", fakeClient([0, 0, 2500]))
    expect(await denied.hit("ip", 10, 60_000)).toMatchObject({ allowed: false, retryAfterMs: 2500 })
  })

  it("本地 Redis 异常时 fail-open，closed 模式拒绝", async () => {
    const failing = { eval: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")), on: vi.fn() }
    const openStore = new IoredisRateLimitStore("redis://yyc3-45:6379/0", failing)
    expect((await openStore.hit("ip", 10, 60_000)).allowed).toBe(true)

    vi.stubEnv("RATE_LIMIT_FAIL_MODE", "closed")
    const closedStore = new IoredisRateLimitStore("redis://yyc3-45:6379/0", failing)
    expect((await closedStore.hit("ip", 10, 60_000)).allowed).toBe(false)
  })
})
