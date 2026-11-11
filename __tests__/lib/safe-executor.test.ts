import { safeExecute, validateUserCode } from "@/lib/safe-executor"
import { describe, expect, it } from "vitest"

describe("safeExecute — P0 顶层 return 修复", () => {
  it("支持显式 return 语句", () => {
    expect(safeExecute("return 1 + 1", [], "T")).toBe(2)
  })

  it("支持 conditional 引擎拼接的 return 表达式并读取上游输入", () => {
    expect(safeExecute("return input1.length > 5", ["Workflow started"], "Conditional")).toBe(true)
    expect(safeExecute("return input1 === 'x' && input2 === 2", ["x", 2], "Conditional")).toBe(true)
  })

  it("保留尾表达式完成值（向后兼容）", () => {
    expect(safeExecute("input1.toUpperCase()", ["hello"], "T")).toBe("HELLO")
    expect(safeExecute("1 + 1", [], "T")).toBe(2)
  })

  it("支持嵌套函数内的 return 且不影响尾表达式", () => {
    expect(safeExecute("const f = () => { return 3 }; f()", [], "T")).toBe(3)
  })

  it("inputs 数组与 input1..input5 均可访问", () => {
    expect(safeExecute("return inputs.length", ["a", "b"], "T")).toBe(2)
    expect(safeExecute("return input5", ["a", "b", "c", "d", "e"], "T")).toBe("e")
  })

  it("非 JSON 可序列化输入被拒绝而不是崩溃", () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => safeExecute("return 1", [circular], "T")).toThrow(/JSON-serializable/)
  })
})

describe("safeExecute — 安全护栏", () => {
  it("拒绝危险关键字（require / process / eval）", () => {
    expect(() => safeExecute("return require('fs')", [], "T")).toThrow(/forbidden pattern/)
    expect(() => safeExecute("return process.env", [], "T")).toThrow(/forbidden pattern/)
    expect(() => safeExecute("return eval('1')", [], "T")).toThrow(/forbidden pattern/)
  })

  it("沙箱内无法取得宿主 process（宿主内置对象已移除）", () => {
    const code = "return typeof (this ?? {})[[\"pro\", \"cess\"].join(\"\")]"
    expect(safeExecute(code, [], "T")).toBe("undefined")
  })

  it("拒绝空代码与超长代码", () => {
    expect(() => safeExecute("", [], "T")).toThrow(/cannot be empty/)
    expect(() => safeExecute("return 1".padEnd(5001, " "), [], "T")).toThrow(/maximum length/)
  })

  it("validateUserCode 接受合法代码", () => {
    expect(() => validateUserCode("return input1 + 1", "T")).not.toThrow()
  })
})
