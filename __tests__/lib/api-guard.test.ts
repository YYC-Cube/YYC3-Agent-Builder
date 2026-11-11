import { checkRequest, getClientId, resetRateLimitState } from "@/lib/api-guard"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/execute-workflow", { method: "POST", headers })
}

beforeEach(() => {
  vi.unstubAllEnvs()
  resetRateLimitState()
  delete process.env.WORKFLOW_API_TOKEN
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  resetRateLimitState()
  delete process.env.WORKFLOW_API_TOKEN
})

describe("checkRequest — P0 鉴权", () => {
  it("未配置令牌时开发态放行", async () => {
    expect((await checkRequest(request())).ok).toBe(true)
  })

  it("配置令牌后缺少令牌返回 401", async () => {
    vi.stubEnv("WORKFLOW_API_TOKEN", "secret-token")
    const result = await checkRequest(request())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(401)
  })

  it("错误令牌返回 401", async () => {
    vi.stubEnv("WORKFLOW_API_TOKEN", "secret-token")
    expect((await checkRequest(request({ "x-workflow-token": "wrong" }))).ok).toBe(false)
  })

  it("x-workflow-token 正确时放行", async () => {
    vi.stubEnv("WORKFLOW_API_TOKEN", "secret-token")
    expect((await checkRequest(request({ "x-workflow-token": "secret-token" }))).ok).toBe(true)
  })

  it("支持 Authorization: Bearer", async () => {
    vi.stubEnv("WORKFLOW_API_TOKEN", "secret-token")
    expect((await checkRequest(request({ Authorization: "Bearer secret-token" }))).ok).toBe(true)
  })
})

describe("checkRequest — P0 限流", () => {
  it("超出窗口内最大请求数返回 429 并给出 Retry-After", async () => {
    vi.stubEnv("WORKFLOW_RATE_LIMIT_MAX", "2")
    const first = await checkRequest(request({ "x-forwarded-for": "1.2.3.4" }), 1000)
    const second = await checkRequest(request({ "x-forwarded-for": "1.2.3.4" }), 2000)
    const third = await checkRequest(request({ "x-forwarded-for": "1.2.3.4" }), 3000)
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(third.ok).toBe(false)
    if (!third.ok) {
      expect(third.status).toBe(429)
      expect(third.retryAfter).toBeGreaterThan(0)
    }
  })

  it("不同 IP 的限流互不影响", async () => {
    vi.stubEnv("WORKFLOW_RATE_LIMIT_MAX", "1")
    expect((await checkRequest(request({ "x-forwarded-for": "1.1.1.1" }))).ok).toBe(true)
    expect((await checkRequest(request({ "x-forwarded-for": "2.2.2.2" }))).ok).toBe(true)
  })

  it("窗口过期后重新放行", async () => {
    vi.stubEnv("WORKFLOW_RATE_LIMIT_MAX", "1")
    vi.stubEnv("WORKFLOW_RATE_LIMIT_WINDOW_MS", "1000")
    expect((await checkRequest(request(), 1000)).ok).toBe(true)
    expect((await checkRequest(request(), 2500)).ok).toBe(true)
  })

  it("配置 Upstash 后走共享 Redis 存储", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token")
    vi.stubEnv("WORKFLOW_RATE_LIMIT_MAX", "5")
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: [1, 4, 0] }), {
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const decision = await checkRequest(request({ "x-forwarded-for": "3.3.3.3" }), 5000)
    expect(decision.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0]!
    const body = JSON.parse(String((init as RequestInit).body)) as unknown[]
    expect(body[0]).toBe("EVAL")
    expect(String(body[3])).toContain("yyc3:ratelimit:")
  })

  it("Redis 不可用时 fail-open 放行", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))
    expect((await checkRequest(request({ "x-forwarded-for": "4.4.4.4" }))).ok).toBe(true)
  })

  it("RATE_LIMIT_FAIL_MODE=closed 时 Redis 异常改为拒绝", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token")
    vi.stubEnv("RATE_LIMIT_FAIL_MODE", "closed")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))
    const decision = await checkRequest(request({ "x-forwarded-for": "5.5.5.5" }))
    expect(decision.ok).toBe(false)
    if (!decision.ok) expect(decision.status).toBe(429)
  })
})

describe("getClientId", () => {
  it("优先取 x-forwarded-for 的第一个 IP", () => {
    expect(getClientId(request({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" }))).toBe("9.9.9.9")
  })

  it("无代理头时回退到 local", () => {
    expect(getClientId(request())).toBe("local")
  })
})
