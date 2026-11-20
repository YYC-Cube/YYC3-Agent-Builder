/**
 * file: expression-evaluator.ts
 * description: 受限条件表达式求值器 · 替代 node:vm 的条件节点安全求值
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [util],[security],[expression],[conditional]
 *
 * brief: 条件节点默认使用本模块，提供受限表达式求值，替代不安全的 node:vm 沙箱。
 *
 * details:
 * - 仅允许字面量、input1..input5/inputs 变量、成员/下标读取、白名单方法
 * - 白名单方法：includes/startsWith/endsWith/toLowerCase/toUpperCase/trim/slice/split/join/indexOf
 * - 全局函数：Number/String/Boolean/Array.isArray
 * - 运算：! + - * / % > >= < <= === !== == != && || 与三元表达式
 * - 明确不支持：赋值、函数声明、箭头函数、模板字符串、new/in/instanceof/任意属性访问
 * - 危险属性（__proto__/constructor/prototype）直接抛错，拒绝构造器链越狱
 *
 * dependencies: 无外部依赖
 * exports: evaluateExpression
 * notes: 任何未识别语法或危险属性直接抛错
 */

const MAX_EXPRESSION_LENGTH = 2000
const MAX_TOKENS = 500
const MAX_NESTING = 50
const MAX_CALL_ARGS = 3

const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"])
const ALLOWED_VARIABLES = new Set(["input1", "input2", "input3", "input4", "input5", "inputs"])
const ALLOWED_GLOBALS = new Set(["Number", "String", "Boolean", "Array"])
const ALLOWED_METHODS = new Set([
  "includes",
  "startsWith",
  "endsWith",
  "toLowerCase",
  "toUpperCase",
  "trim",
  "slice",
  "split",
  "join",
  "indexOf",
])

type Token =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string }

type Expression =
  | { kind: "literal"; value: unknown }
  | { kind: "identifier"; name: string }
  | { kind: "unary"; operator: string; argument: Expression }
  | { kind: "binary"; operator: string; left: Expression; right: Expression }
  | { kind: "conditional"; test: Expression; consequent: Expression; alternate: Expression }
  | { kind: "member"; object: Expression; property: string }
  | { kind: "computed"; object: Expression; key: Expression }
  | { kind: "call"; callee: Expression; args: Expression[] }

const TWO_CHAR_OPERATORS = ["==", "!=", ">=", "<=", "&&", "||"] as const
const THREE_CHAR_OPERATORS = ["===", "!=="] as const
const SINGLE_CHAR_OPERATORS = "!><+-*/%?:()[].,"

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9"
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char)
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char)
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < source.length) {
    const char = source[index]!
    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (char === '"' || char === "'") {
      const quote = char
      let value = ""
      index += 1
      let closed = false
      while (index < source.length) {
        const current = source[index]!
        if (current === quote) {
          index += 1
          closed = true
          break
        }
        if (current === "\n" || current === "\r") {
          throw new Error("Conditional expression: unterminated string literal")
        }
        if (current === "\\") {
          const escaped = source[index + 1]
          if (escaped === undefined) {
            throw new Error("Conditional expression: unterminated escape sequence")
          }
          value += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped
          index += 2
          continue
        }
        value += current
        index += 1
      }
      if (!closed) throw new Error("Conditional expression: unterminated string literal")
      tokens.push({ type: "string", value })
      continue
    }

    if (isDigit(char) || (char === "." && isDigit(source[index + 1] ?? ""))) {
      const match = /^\d+(?:\.\d+)?|^\.\d+/.exec(source.slice(index))
      if (!match) throw new Error("Conditional expression: invalid number literal")
      tokens.push({ type: "number", value: Number(match[0]) })
      index += match[0].length
      continue
    }

    if (isIdentifierStart(char)) {
      let end = index + 1
      while (end < source.length && isIdentifierPart(source[end]!)) end += 1
      tokens.push({ type: "identifier", value: source.slice(index, end) })
      index = end
      continue
    }

    const three = source.slice(index, index + 3)
    if ((THREE_CHAR_OPERATORS as readonly string[]).includes(three)) {
      tokens.push({ type: "operator", value: three })
      index += 3
      continue
    }

    const two = source.slice(index, index + 2)
    if ((TWO_CHAR_OPERATORS as readonly string[]).includes(two)) {
      tokens.push({ type: "operator", value: two })
      index += 2
      continue
    }

    if (SINGLE_CHAR_OPERATORS.includes(char)) {
      tokens.push({ type: "operator", value: char })
      index += 1
      continue
    }

    throw new Error(`Conditional expression: unsupported character "${char}"`)
  }

  if (tokens.length > MAX_TOKENS) {
    throw new Error(`Conditional expression: too many tokens (max ${MAX_TOKENS})`)
  }

  return tokens
}

class Parser {
  private position = 0
  private nesting = 0

  constructor(private readonly tokens: Token[]) {}

  parse(): Expression {
    const expression = this.parseExpression()
    if (this.position !== this.tokens.length) {
      throw new Error("Conditional expression: unexpected token at end of expression")
    }
    return expression
  }

  private peek(): Token | undefined {
    return this.tokens[this.position]
  }

  private match(operator: string): boolean {
    const token = this.peek()
    if (token?.type === "operator" && token.value === operator) {
      this.position += 1
      return true
    }
    return false
  }

  private expect(operator: string): void {
    if (!this.match(operator)) {
      throw new Error(`Conditional expression: expected "${operator}"`)
    }
  }

  private consumeIdentifier(): string {
    const token = this.peek()
    if (token?.type !== "identifier") {
      throw new Error("Conditional expression: expected identifier")
    }
    this.position += 1
    return token.value
  }

  private parseExpression(): Expression {
    this.nesting += 1
    if (this.nesting > MAX_NESTING) {
      throw new Error(`Conditional expression: nesting exceeds ${MAX_NESTING}`)
    }
    try {
      return this.parseTernary()
    } finally {
      this.nesting -= 1
    }
  }

  private parseTernary(): Expression {
    const test = this.parseOr()
    if (this.match("?")) {
      const consequent = this.parseExpression()
      this.expect(":")
      const alternate = this.parseExpression()
      return { kind: "conditional", test, consequent, alternate }
    }
    return test
  }

  private parseOr(): Expression {
    let left = this.parseAnd()
    while (this.match("||")) {
      left = { kind: "binary", operator: "||", left, right: this.parseAnd() }
    }
    return left
  }

  private parseAnd(): Expression {
    let left = this.parseEquality()
    while (this.match("&&")) {
      left = { kind: "binary", operator: "&&", left, right: this.parseEquality() }
    }
    return left
  }

  private parseEquality(): Expression {
    let left = this.parseRelational()
    while (true) {
      if (this.match("===")) {
        left = { kind: "binary", operator: "===", left, right: this.parseRelational() }
      } else if (this.match("!==")) {
        left = { kind: "binary", operator: "!==", left, right: this.parseRelational() }
      } else if (this.match("==")) {
        left = { kind: "binary", operator: "==", left, right: this.parseRelational() }
      } else if (this.match("!=")) {
        left = { kind: "binary", operator: "!=", left, right: this.parseRelational() }
      } else {
        return left
      }
    }
  }

  private parseRelational(): Expression {
    let left = this.parseAdditive()
    while (true) {
      if (this.match(">=")) {
        left = { kind: "binary", operator: ">=", left, right: this.parseAdditive() }
      } else if (this.match("<=")) {
        left = { kind: "binary", operator: "<=", left, right: this.parseAdditive() }
      } else if (this.match(">")) {
        left = { kind: "binary", operator: ">", left, right: this.parseAdditive() }
      } else if (this.match("<")) {
        left = { kind: "binary", operator: "<", left, right: this.parseAdditive() }
      } else {
        return left
      }
    }
  }

  private parseAdditive(): Expression {
    let left = this.parseMultiplicative()
    while (true) {
      if (this.match("+")) {
        left = { kind: "binary", operator: "+", left, right: this.parseMultiplicative() }
      } else if (this.match("-")) {
        left = { kind: "binary", operator: "-", left, right: this.parseMultiplicative() }
      } else {
        return left
      }
    }
  }

  private parseMultiplicative(): Expression {
    let left = this.parseUnary()
    while (true) {
      if (this.match("*")) {
        left = { kind: "binary", operator: "*", left, right: this.parseUnary() }
      } else if (this.match("/")) {
        left = { kind: "binary", operator: "/", left, right: this.parseUnary() }
      } else if (this.match("%")) {
        left = { kind: "binary", operator: "%", left, right: this.parseUnary() }
      } else {
        return left
      }
    }
  }

  private parseUnary(): Expression {
    if (this.match("!")) return { kind: "unary", operator: "!", argument: this.parseUnary() }
    if (this.match("+")) return { kind: "unary", operator: "+", argument: this.parseUnary() }
    if (this.match("-")) return { kind: "unary", operator: "-", argument: this.parseUnary() }
    return this.parsePostfix()
  }

  private parsePostfix(): Expression {
    let expression = this.parsePrimary()

    while (true) {
      if (this.match(".")) {
        const property = this.consumeIdentifier()
        if (BLOCKED_KEYS.has(property)) {
          throw new Error(`Conditional expression: forbidden property "${property}"`)
        }
        expression = { kind: "member", object: expression, property }
        continue
      }

      if (this.match("[")) {
        const key = this.parseExpression()
        this.expect("]")
        expression = { kind: "computed", object: expression, key }
        continue
      }

      if (this.match("(")) {
        const args: Expression[] = []
        if (!this.match(")")) {
          do {
            args.push(this.parseExpression())
          } while (this.match(","))
          this.expect(")")
        }
        expression = { kind: "call", callee: expression, args }
        continue
      }

      return expression
    }
  }

  private parsePrimary(): Expression {
    const token = this.peek()
    if (!token) throw new Error("Conditional expression: unexpected end of expression")

    if (token.type === "number") {
      this.position += 1
      return { kind: "literal", value: token.value }
    }

    if (token.type === "string") {
      this.position += 1
      return { kind: "literal", value: token.value }
    }

    if (token.type === "identifier") {
      this.position += 1
      if (token.value === "true") return { kind: "literal", value: true }
      if (token.value === "false") return { kind: "literal", value: false }
      if (token.value === "null") return { kind: "literal", value: null }
      if (!ALLOWED_VARIABLES.has(token.value) && !ALLOWED_GLOBALS.has(token.value)) {
        throw new Error(`Conditional expression: unknown identifier "${token.value}"`)
      }
      return { kind: "identifier", name: token.value }
    }

    if (this.match("(")) {
      const expression = this.parseExpression()
      this.expect(")")
      return expression
    }

    throw new Error(`Conditional expression: unexpected token "${token.value}"`)
  }
}

function readMember(target: unknown, key: string | number): unknown {
  const property = String(key)
  if (BLOCKED_KEYS.has(property)) {
    throw new Error(`Conditional expression: forbidden property "${property}"`)
  }
  if (target === null || target === undefined) {
    throw new Error(`Conditional expression: cannot read property "${property}" of ${String(target)}`)
  }
  if (typeof target !== "object" && typeof target !== "string") {
    throw new Error(`Conditional expression: cannot read property "${property}" of primitive`)
  }
  return (target as Record<string, unknown>)[property]
}

function looseEquals(left: unknown, right: unknown): boolean {
  return left == right
}

function applyBinary(operator: string, left: unknown, right: unknown): unknown {
  switch (operator) {
    case "===":
      return left === right
    case "!==":
      return left !== right
    case "==":
      return looseEquals(left, right)
    case "!=":
      return !looseEquals(left, right)
    case ">":
      return (left as number) > (right as number)
    case ">=":
      return (left as number) >= (right as number)
    case "<":
      return (left as number) < (right as number)
    case "<=":
      return (left as number) <= (right as number)
    case "+":
      return (left as number) + (right as number)
    case "-":
      return (left as number) - (right as number)
    case "*":
      return (left as number) * (right as number)
    case "/":
      return (left as number) / (right as number)
    case "%":
      return (left as number) % (right as number)
    default:
      throw new Error(`Conditional expression: unsupported operator "${operator}"`)
  }
}

function evaluateCall(callee: Expression, args: Expression[], scope: Record<string, unknown>, depth: number): unknown {
  if (args.length > MAX_CALL_ARGS) {
    throw new Error(`Conditional expression: too many arguments (max ${MAX_CALL_ARGS})`)
  }

  const values = args.map((argument) => evaluate(argument, scope, depth + 1))

  if (callee.kind === "identifier") {
    if (!ALLOWED_GLOBALS.has(callee.name)) {
      throw new Error(`Conditional expression: "${callee.name}" is not callable`)
    }
    if (callee.name === "Number") return Number(values[0])
    if (callee.name === "String") return String(values[0])
    if (callee.name === "Boolean") return Boolean(values[0])
    throw new Error("Conditional expression: Array is only callable via Array.isArray")
  }

  if (callee.kind !== "member") {
    throw new Error("Conditional expression: only whitelisted method calls are allowed")
  }

  if (callee.object.kind === "identifier" && callee.object.name === "Array") {
    if (callee.property !== "isArray") {
      throw new Error(`Conditional expression: Array.${callee.property} is not allowed`)
    }
    return Array.isArray(values[0])
  }

  if (!ALLOWED_METHODS.has(callee.property)) {
    throw new Error(`Conditional expression: method "${callee.property}" is not allowed`)
  }

  const receiver = evaluate(callee.object, scope, depth + 1)
  if (receiver === null || receiver === undefined) {
    throw new Error(`Conditional expression: cannot call "${callee.property}" on ${String(receiver)}`)
  }

  const method = (receiver as Record<string, unknown>)[callee.property]
  if (typeof method !== "function") {
    throw new Error(`Conditional expression: "${callee.property}" is not a function`)
  }

  return (method as (...callArgs: unknown[]) => unknown).apply(receiver, values)
}

function evaluate(node: Expression, scope: Record<string, unknown>, depth: number): unknown {
  if (depth > MAX_NESTING * 2) {
    throw new Error("Conditional expression: evaluation depth exceeded")
  }

  switch (node.kind) {
    case "literal":
      return node.value

    case "identifier":
      if (!Object.prototype.hasOwnProperty.call(scope, node.name)) {
        throw new Error(`Conditional expression: unknown identifier "${node.name}"`)
      }
      return scope[node.name]

    case "unary": {
      const value = evaluate(node.argument, scope, depth + 1)
      if (node.operator === "!") return !value
      if (node.operator === "+") return +(value as number)
      return -(value as number)
    }

    case "binary": {
      if (node.operator === "&&") {
        const left = evaluate(node.left, scope, depth + 1)
        return left ? evaluate(node.right, scope, depth + 1) : left
      }
      if (node.operator === "||") {
        const left = evaluate(node.left, scope, depth + 1)
        return left ? left : evaluate(node.right, scope, depth + 1)
      }
      return applyBinary(
        node.operator,
        evaluate(node.left, scope, depth + 1),
        evaluate(node.right, scope, depth + 1),
      )
    }

    case "conditional":
      return evaluate(node.test, scope, depth + 1)
        ? evaluate(node.consequent, scope, depth + 1)
        : evaluate(node.alternate, scope, depth + 1)

    case "member":
      return readMember(evaluate(node.object, scope, depth + 1), node.property)

    case "computed": {
      const key = evaluate(node.key, scope, depth + 1)
      if (typeof key !== "string" && typeof key !== "number") {
        throw new Error("Conditional expression: computed key must be a string or number")
      }
      return readMember(evaluate(node.object, scope, depth + 1), key)
    }

    case "call":
      return evaluateCall(node.callee, node.args, scope, depth)
  }
}

/**
 * 在受限语法内求值条件表达式。
 *
 * @param source - 条件表达式，例如 `input1.country === 'US'`
 * @param inputs - 上游节点输入，映射为 input1..input5 与 inputs
 */
export function evaluateExpression(source: string, inputs: unknown[]): unknown {
  if (!source || source.trim().length === 0) {
    throw new Error("Conditional expression: expression cannot be empty")
  }
  if (source.length > MAX_EXPRESSION_LENGTH) {
    throw new Error(`Conditional expression: exceeds maximum length of ${MAX_EXPRESSION_LENGTH} characters`)
  }

  const expression = new Parser(tokenize(source)).parse()

  const scope: Record<string, unknown> = { inputs }
  for (let index = 0; index < 5; index += 1) {
    scope[`input${index + 1}`] = inputs[index]
  }

  return evaluate(expression, scope, 0)
}
