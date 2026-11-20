/**
 * file: api-guard.ts
 * description: 执行 API 访问控制 · 令牌鉴权与滑动窗口限流
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [security],[api],[auth],[ratelimit]
 *
 * brief: 执行 API 的访问控制，支持可选令牌鉴权与按 IP 滑动窗口限流。
 *
 * details:
 * - 可选令牌鉴权：设置 WORKFLOW_API_TOKEN 后必须携带 x-workflow-token 或 Authorization: Bearer
 * - 滑动窗口限流：按客户端 IP 计数，默认 20 次 / 60 秒
 * - 限流状态由 rate-limit-store 提供：单实例进程内实现；配置 Upstash/Vercel KV 后自动切换为共享 Redis
 * - 多实例部署无需改动调用方
 * - 返回 401（未授权）/ 429（限流，携带 Retry-After）
 *
 * dependencies: node:crypto, @/lib/logger, @/lib/rate-limit-store
 * exports: checkRequest
 * notes: 限流是防护手段，不应成为全站不可用的单点
 */

import { createHash, timingSafeEqual } from "node:crypto"
import { createLogger } from "@/lib/logger"
import { getRateLimitStore, resetRateLimitStore } from "@/lib/rate-limit-store"

const DEFAULT_RATE_LIMIT_MAX = 20
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000

let warnedMissingToken = false

export type GuardSuccess = { ok: true; clientId: string }
export type GuardFailure = { ok: false; status: 401 | 429; error: string; clientId: string; retryAfter?: number }
export type GuardResult = GuardSuccess | GuardFailure

function constantTimeEqual(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest()
  const b = createHash("sha256").update(right).digest()
  return timingSafeEqual(a, b)
}

export function getClientId(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim() || "unknown"
  return req.headers.get("x-real-ip")?.trim() || "local"
}

function getTokenFromRequest(req: Request): string {
  const header = req.headers.get("x-workflow-token")
  if (header) return header.trim()
  const authorization = req.headers.get("authorization") || ""
  return authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : ""
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export type GuardOptions = {
  now?: number
  /** 已通过 Better Auth 会话认证的用户；存在时跳过令牌校验，并按用户维度限流 */
  authenticatedUserId?: string
}

export async function checkRequest(
  req: Request,
  options: GuardOptions | number = {},
): Promise<GuardResult> {
  const { now = Date.now(), authenticatedUserId } = typeof options === "number" ? { now: options } : options
  const clientId = authenticatedUserId ? `user:${authenticatedUserId}` : getClientId(req)
  const requiredToken = process.env.WORKFLOW_API_TOKEN

  if (!requiredToken && !warnedMissingToken) {
    warnedMissingToken = true
    createLogger("api-guard").warn(
      "WORKFLOW_API_TOKEN is not set; execution API is open (development mode only)",
    )
  }

  if (requiredToken && !authenticatedUserId && !constantTimeEqual(getTokenFromRequest(req), requiredToken)) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized: a valid x-workflow-token is required",
      clientId,
    }
  }

  const max = positiveInt(process.env.WORKFLOW_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX)
  const windowMs = positiveInt(process.env.WORKFLOW_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS)

  const decision = await getRateLimitStore().hit(clientId, max, windowMs, now)

  if (!decision.allowed) {
    return {
      ok: false,
      status: 429,
      error: "Too many requests: workflow execution rate limit exceeded",
      clientId,
      retryAfter: Math.max(1, Math.ceil(decision.retryAfterMs / 1000)),
    }
  }

  return { ok: true, clientId }
}

/** 仅供测试使用：清空限流状态（内存桶 + 存储解析缓存）。 */
export function resetRateLimitState(): void {
  resetRateLimitStore()
}
