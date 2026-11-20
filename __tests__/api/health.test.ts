/**
 * file: __tests__/api/health.test.ts
 * description: 健康检查 API 测试 · 服务状态与限流存储类型验证
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [test],[api],[health]
 *
 * brief: 健康检查 API 测试，验证服务状态与非敏感限流存储类型。
 *
 * details:
 * - 验证 GET /api/health 返回 200
 * - 验证响应头 Cache-Control 为 no-store
 * - 验证服务状态字段
 *
 * dependencies: @/app/api/health/route, @/lib/api-guard, vitest
 * exports: 测试用例集
 * notes: 健康检查不返回敏感信息
 */

import { GET } from "@/app/api/health/route"
import { resetRateLimitState } from "@/lib/api-guard"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllEnvs()
  resetRateLimitState()
})

describe("GET /api/health", () => {
  it("返回服务状态与非敏感的限流存储类型", async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")

    const body = (await response.json()) as Record<string, unknown>
    expect(body).toMatchObject({ status: "ok", service: "yyc3-agent-builder", rateLimitStore: "memory" })
    expect(typeof body.uptimeSeconds).toBe("number")
    expect(JSON.stringify(body)).not.toMatch(/token|secret|key/i)
  })

  it("配置 Redis 后报告 redis 存储类型", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    const body = (await (await GET()).json()) as Record<string, unknown>
    expect(body.rateLimitStore).toBe("redis")
  })
})
