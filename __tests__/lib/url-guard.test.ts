import { isPrivateAddress, validateUrl, fetchExternal } from "@/lib/url-guard"
import { lookup } from "node:dns/promises"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:dns/promises", () => {
  const lookupMock = vi.fn()
  // Node 内置 CJS 模块经 interop 后可能从 default 命名空间取成员，两处都指向同一 mock
  return { default: { lookup: lookupMock }, lookup: lookupMock }
})

const mockedLookup = vi.mocked(lookup)

beforeEach(() => {
  vi.clearAllMocks()
  mockedLookup.mockReset()
  mockedLookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }] as never)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("isPrivateAddress — P1 SSRF 边界", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254", // 云元数据
    "0.0.0.0",
    "100.64.0.1",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:7f00:1", // IPv4 映射 IPv6（URL 归一化后的写法）
    "::ffff:127.0.0.1",
  ])("拦截私网/保留地址 %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true)
  })

  it.each(["8.8.8.8", "1.1.1.1", "2001:4860:4860::8888"])("允许公网地址 %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false)
  })
})

describe("validateUrl", () => {
  it("拒绝非 http(s) 协议", async () => {
    await expect(validateUrl("file:///etc/passwd")).rejects.toThrow(/Forbidden protocol/)
  })

  it("拒绝 URL 内嵌凭据", async () => {
    await expect(validateUrl("http://user:pass@8.8.8.8/")).rejects.toThrow(/credentials/)
  })

  it("拒绝 localhost 及本地后缀", async () => {
    await expect(validateUrl("http://localhost:3000/")).rejects.toThrow(/local hostnames/)
    await expect(validateUrl("http://foo.localhost/")).rejects.toThrow(/local hostnames/)
  })

  it("拒绝十进制 / 十六进制 IP 变形（WHATWG URL 归一化后判定）", async () => {
    await expect(validateUrl("http://2130706433/")).rejects.toThrow(/private network/)
    await expect(validateUrl("http://0x7f000001/")).rejects.toThrow(/private network/)
  })

  it("拒绝云元数据地址", async () => {
    await expect(validateUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow(/private network/)
  })

  it("DNS 解析到私网地址时拒绝", async () => {
    mockedLookup.mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }] as never)
    await expect(validateUrl("https://internal.example.com/api")).rejects.toThrow(/private network/)
  })

  it("DNS 解析失败时拒绝（fail closed）", async () => {
    mockedLookup.mockRejectedValueOnce(new Error("ENOTFOUND"))
    await expect(validateUrl("https://does-not-resolve.example.com/")).rejects.toThrow(/resolution failed/)
  })

  it("允许解析到公网地址的合法 https URL", async () => {
    const parsed = await validateUrl("https://api.example.com/v1?q=1")
    expect(parsed.hostname).toBe("api.example.com")
  })
})

describe("fetchExternal — 出站加固", () => {
  it("拒绝 302 重定向（防止绕过 SSRF 校验）", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/" } })),
    )
    await expect(fetchExternal("https://api.example.com/")).rejects.toThrow(/redirects are not allowed/)
  })

  it("拒绝超过大小上限的响应", async () => {
    vi.stubEnv("WORKFLOW_HTTP_MAX_BYTES", "20")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: "x".repeat(200) }))))
    await expect(fetchExternal("https://api.example.com/")).rejects.toThrow(/exceeds 20 bytes/)
  })

  it("拒绝非 JSON 响应", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json")))
    await expect(fetchExternal("https://api.example.com/")).rejects.toThrow(/not valid JSON/)
  })

  it("正常返回 JSON 且不跟随重定向", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal("fetch", fetchMock)
    await expect(fetchExternal("https://api.example.com/v1")).resolves.toEqual({ ok: true })
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual" })
  })

  it("超时后中断请求", async () => {
    vi.stubEnv("WORKFLOW_HTTP_TIMEOUT_MS", "10")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_input: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const error = new Error("aborted")
              error.name = "AbortError"
              reject(error)
            })
          }),
      ),
    )
    await expect(fetchExternal("https://api.example.com/")).rejects.toThrow(/timeout/)
  })
})
