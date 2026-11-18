/**
 * file: ssrf-validation.test.ts
 * description: execute-workflow SSRF URL 校验单元测试
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-18
 * updated: 2026-11-18
 * status: active
 * tags: [test],[security],[ssrf]
 *
 * brief: 验证 validateUrl 对合法/非法目标 URL 的判定
 *
 * details:
 * - 正向：公网 http/https URL 应放行
 * - 反向：非 http(s) 协议应拒绝
 * - 反向：私网 / 环回 / 链路本地 / 云元数据地址应拒绝
 *
 * test-target: app/api/execute-workflow/route.ts
 * notes: 仅测试纯函数 validateUrl，不发起真实网络请求
 */

import { validateUrl } from "@/app/api/execute-workflow/route"
import { describe, expect, it } from "vitest"

describe("validateUrl — 正向", () => {
  it("allows public HTTPS URL", () => {
    expect(() => validateUrl("https://api.example.com/v1/data")).not.toThrow()
  })

  it("allows public HTTP URL", () => {
    expect(() => validateUrl("http://example.org")).not.toThrow()
  })
})

describe("validateUrl — 反向", () => {
  it("rejects non-http protocol", () => {
    expect(() => validateUrl("file:///etc/passwd")).toThrow(/Forbidden protocol|Invalid URL/)
  })

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://[::1]",
    "http://192.168.1.1",
    "http://10.0.0.5",
    "http://172.16.0.1",
    "http://169.254.169.254/latest/meta-data/",
    "http://[fe80::1]",
  ])("rejects internal/metadata address: %s", (url) => {
    expect(() => validateUrl(url)).toThrow(/SSRF protection/)
  })

  it("rejects malformed URL", () => {
    expect(() => validateUrl("not a url")).toThrow(/Invalid URL/)
  })
})
