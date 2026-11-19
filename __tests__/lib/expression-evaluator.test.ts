import { evaluateExpression } from "@/lib/expression-evaluator"
import { describe, expect, it } from "vitest"

describe("evaluateExpression — 允许的语法", () => {
  it("读取 input1..input5 与嵌套属性", () => {
    expect(evaluateExpression("input1.country === 'US'", [{ country: "US" }])).toBe(true)
    expect(evaluateExpression('input2["score"] >= 60', [null, { score: 80 }])).toBe(true)
    expect(evaluateExpression("input1[0] === 1", [[1, 2]])).toBe(true)
  })

  it("支持逻辑、比较与三元表达式", () => {
    expect(evaluateExpression("input1 > 10 && input2 !== 'x'", [11, "y"])).toBe(true)
    expect(evaluateExpression("!input1 || input2", [false, true])).toBe(true)
    expect(evaluateExpression("input1 ? 'yes' : 'no'", [true])).toBe("yes")
    expect(evaluateExpression("input1 + input2 * 2", [1, 3])).toBe(7)
  })

  it("支持白名单方法与全局函数", () => {
    expect(evaluateExpression("input1.startsWith('he')", ["hello"])).toBe(true)
    expect(evaluateExpression("input1.includes('ell')", ["hello"])).toBe(true)
    expect(evaluateExpression("input1.toUpperCase() === 'HI'", ["hi"])).toBe(true)
    expect(evaluateExpression("input1.length > 3", ["hello"])).toBe(true)
    expect(evaluateExpression("Array.isArray(input1)", [[1]])).toBe(true)
    expect(evaluateExpression("Number(input1) + 1", ["41"])).toBe(42)
  })

  it("布尔化上游对象与字符串", () => {
    expect(evaluateExpression("input1.length > 5", ["Workflow started"])).toBe(true)
    expect(evaluateExpression("inputs.length === 2", ["a", "b"])).toBe(true)
  })
})

describe("evaluateExpression — 拒绝越界语法", () => {
  it("拒绝 constructor / prototype / __proto__ 访问", () => {
    expect(() => evaluateExpression("input1.constructor", [{}])).toThrow(/forbidden property/)
    expect(() => evaluateExpression("input1.__proto__", [{}])).toThrow(/forbidden property/)
    expect(() => evaluateExpression("input1['constructor']", [{}])).toThrow(/forbidden property/)
    expect(() => evaluateExpression("input1.prototype", [{}])).toThrow(/forbidden property/)
  })

  it("拒绝函数构造与全局逃逸 payload", () => {
    const payloads = [
      "(function(){ return 1 })()",
      "(() => 1)()",
      "({}).constructor.constructor('return process')()",
      "globalThis.constructor",
      "process.env",
      "require('fs')",
      "eval('1')",
      "Function('return 1')",
      "input1.toString.constructor",
    ]
    for (const payload of payloads) {
      expect(() => evaluateExpression(payload, [{}])).toThrow()
    }
  })

  it("拒绝赋值、模板字符串与多条语句", () => {
    expect(() => evaluateExpression("input1 = 1", [0])).toThrow()
    expect(() => evaluateExpression("`${input1}`", ["x"])).toThrow()
    expect(() => evaluateExpression("input1; input2", [1, 2])).toThrow()
  })

  it("拒绝非白名单方法与未知标识符", () => {
    expect(() => evaluateExpression("input1.constructor(() => 1)", [{}])).toThrow()
    expect(() => evaluateExpression("input1.replace('a', 'b')", ["a"])).toThrow(/not allowed/)
    expect(() => evaluateExpression("window.location", [{}])).toThrow(/unknown identifier/)
  })

  it("拒绝空表达式、超长表达式与未闭合括号", () => {
    expect(() => evaluateExpression("   ", [])).toThrow(/cannot be empty/)
    expect(() => evaluateExpression("1 + ".repeat(800), [])).toThrow(/maximum length/)
    expect(() => evaluateExpression("(input1", [1])).toThrow()
  })

  it("读取 null 属性时给出明确错误", () => {
    expect(() => evaluateExpression("input1.country === 'US'", [null])).toThrow(/cannot read property/)
  })
})
