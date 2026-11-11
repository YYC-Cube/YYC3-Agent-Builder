import { createLogger, getErrorMessage } from "@/lib/logger"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("createLogger — 结构化日志机制", () => {
  it("输出可解析的 JSON Lines 且包含模块、requestId 与消息", () => {
    vi.stubEnv("LOG_LEVEL", "debug")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    createLogger("unit-test", { requestId: "req-001" }).info("hello", { count: 2 })
    expect(spy).toHaveBeenCalledOnce()
    const entry = JSON.parse(spy.mock.calls[0]![0] as string)
    expect(entry).toMatchObject({ level: "info", module: "unit-test", requestId: "req-001", message: "hello", count: 2 })
    expect(typeof entry.ts).toBe("string")
  })

  it("敏感字段自动脱敏（含嵌套对象）", () => {
    vi.stubEnv("LOG_LEVEL", "info")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    createLogger("unit-test").info("auth", {
      "x-workflow-token": "real-secret",
      nested: { password: "another-secret", apiKey: "key-123" },
    })
    const line = spy.mock.calls[0]![0] as string
    expect(line).toContain("[REDACTED]")
    expect(line).not.toContain("real-secret")
    expect(line).not.toContain("another-secret")
    expect(line).not.toContain("key-123")
  })

  it("silent 级别不输出日志", () => {
    vi.stubEnv("LOG_LEVEL", "silent")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    createLogger("unit-test").error("should not appear")
    expect(spy).not.toHaveBeenCalled()
  })

  it("child 继承同一 requestId", () => {
    vi.stubEnv("LOG_LEVEL", "debug")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const parent = createLogger("unit-test", { requestId: "shared-id" })
    parent.child({ nodeId: "n1" }).debug("child log")
    const entry = JSON.parse(spy.mock.calls[0]![0] as string)
    expect(entry).toMatchObject({ requestId: "shared-id", nodeId: "n1" })
  })
})

describe("getErrorMessage", () => {
  it("从 Error / 字符串 / 未知值提取消息", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom")
    expect(getErrorMessage("plain")).toBe("plain")
    expect(getErrorMessage({ code: 1 })).toBe("Unknown error")
  })
})
