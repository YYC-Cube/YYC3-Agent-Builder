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

/**
 * 在隔离的 VM 沙箱中执行用户代码，具有真正的超时中断能力。
 *
 * 使用 vm.runInNewContext 的 timeout 选项，由 V8 引擎在底层
 * 中断长时间运行的同步代码（不同于 setTimeout 无法中断同步执行）。
 *
 * @param code   - 用户提供的 JavaScript 代码片段
 * @param inputs - 上游节点传入的数据数组
 * @param label  - 节点标签（用于错误信息）
 * @returns      - 代码执行结果
 */
export function safeExecute(code: string, inputs: unknown[], label: string): unknown {
  validateUserCode(code, label)

  const wrappedCode = `
    "use strict";
    const input1 = inputs[0];
    const input2 = inputs[1];
    const input3 = inputs[2];
    const input4 = inputs[3];
    const input5 = inputs[4];
    ${code}
  `

  // 创建最小化沙箱上下文 — 不暴露 require, process, global 等危险全局变量
  const sandbox: Record<string, unknown> = {
    inputs,
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
  }

  const context = vm.createContext(sandbox)

  try {
    return vm.runInNewContext(wrappedCode, context, {
      timeout: MAX_EXECUTION_TIME_MS,
      filename: `safe-execute-${label}`,
      displayErrors: true,
    })
  } catch (err: unknown) {
    // V8 超时会抛出 "Script execution timed out" 错误
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("timed out")) {
      throw new Error(`${label}: Execution timed out (${MAX_EXECUTION_TIME_MS}ms)`)
    }
    throw err
  }
}
