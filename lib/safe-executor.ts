/**
 * YYC³ · 隔离 VM 沙箱执行器
 * ================
 * 双模式执行：
 * 1) 脚本模式 —— 用户代码以尾表达式结尾时，取 Script 完成值（向后兼容）。
 * 2) 函数模式 —— 用户代码含顶层 return（含 conditional 引擎拼接的 `return <expr>`）时，
 *    由 V8 编译期抛出 "Illegal return statement"，自动降级为函数体执行。
 * 安全：宿主内置对象（JSON/Object/Array…）不再注入上下文，输入以序列化字符串传入，
 *       消除 `constructor.constructor` 越狱通道；V8 timeout 提供真正的同步代码硬中断。
 */

import vm from "node:vm"

const MAX_CODE_LENGTH = 5000
const MAX_EXECUTION_TIME_MS = 5000

const BLOCKED_PATTERNS = [
  /\b(process|require|import|eval|Function|global|globalThis|module|exports|__dirname|__filename)\b/gi,
  /\b(child_process|fs|net|http|https|os|path|crypto|dns|cluster|worker_threads)\b/gi,
  /\b(eval|Function)\s*\(/gi,
  /\bwhile\s*\(\s*true\s*\)/gi,
  /\bfor\s*\(\s*;\s*;\s*\)/gi,
]

export function validateUserCode(code: string, label: string): void {
  if (!code || code.trim().length === 0) {
    throw new Error(`${label}: Code cannot be empty`)
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new Error(`${label}: Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`)
  }
  for (const pattern of BLOCKED_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(code)) {
      throw new Error(`${label}: Code contains forbidden pattern`)
    }
  }
}

function serializeInputs(inputs: unknown[], label: string): string {
  try {
    const normalized = inputs.map((input) => (input === undefined ? null : input))
    return JSON.stringify(normalized) ?? "[]"
  } catch {
    throw new Error(`${label}: Inputs must be JSON-serializable`)
  }
}

function buildScriptSource(code: string): string {
  return `
    "use strict";
    const inputs = JSON.parse(__inputsJSON);
    const input1 = inputs[0];
    const input2 = inputs[1];
    const input3 = inputs[2];
    const input4 = inputs[3];
    const input5 = inputs[4];
    ${code}
  `
}

function buildFunctionSource(code: string): string {
  return `
    "use strict";
    (function(input1, input2, input3, input4, input5, inputs) {
      ${code}
    })(
      JSON.parse(__inputsJSON)[0],
      JSON.parse(__inputsJSON)[1],
      JSON.parse(__inputsJSON)[2],
      JSON.parse(__inputsJSON)[3],
      JSON.parse(__inputsJSON)[4],
      JSON.parse(__inputsJSON)
    )
  `
}

function compile(source: string, filename: string): vm.Script {
  return new vm.Script(source, { filename })
}

/**
 * 在隔离的 VM 沙箱中执行用户代码。
 *
 * @param code   - 用户提供的 JavaScript 代码片段（可含顶层 return）
 * @param inputs - 上游节点传入的数据数组
 * @param label  - 节点标签（用于错误信息）
 * @returns      - 代码执行结果（显式 return 值或尾表达式完成值）
 */
export function safeExecute(code: string, inputs: unknown[], label: string): unknown {
  validateUserCode(code, label)

  const filename = `safe-execute-${label}`
  const inputsJSON = serializeInputs(inputs, label)
  const context = vm.createContext({ __inputsJSON: inputsJSON })

  let script: vm.Script
  try {
    script = compile(buildScriptSource(code), filename)
  } catch (error) {
    if (error instanceof SyntaxError && /Illegal return statement/i.test(error.message)) {
      script = compile(buildFunctionSource(code), filename)
    } else {
      throw error
    }
  }

  try {
    return script.runInContext(context, {
      timeout: MAX_EXECUTION_TIME_MS,
      displayErrors: true,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("timed out")) {
      throw new Error(`${label}: Execution timed out (${MAX_EXECUTION_TIME_MS}ms)`)
    }
    throw err
  }
}
