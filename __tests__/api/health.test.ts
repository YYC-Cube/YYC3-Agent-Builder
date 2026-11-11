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
