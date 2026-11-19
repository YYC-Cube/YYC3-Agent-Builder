/**
 * YYC³ · 隔离 VM 沙箱执行器（仅显式开启时可用）
 * ================
 * 安全边界说明：Node.js 官方明确声明 `node:vm` 不是安全机制，正则黑名单可被绕过
 * （例如通过内建构造器链取得宿主 process）。因此本模块默认 **禁用**，仅作为
 * 可信内网单租户环境的兼容通道，由 `ENABLE_UNSAFE_CODE_NODES=true` 显式开启。
 * 公网多租户场景必须使用进程级或独立沙箱服务，不得依赖本模块。
 *
 * 双模式执行：
 * 1) 脚本模式 —— 用户代码以尾表达式结尾时，取 Script 完成值（向后兼容）。
 * 2) 函数模式 —— 用户代码含顶层 return（含 conditional 引擎拼接的 `return <expr>`）时，
 *    由 V8 编译期抛出 "Illegal return statement"，自动降级为函数体执行。
 * 其他防护：代码长度上限、V8 同步超时、危险关键字黑名单（仅降低误用风险，不构成边界）。
 */

import vm from "node:vm"
import { createLogger } from "@/lib/logger"

const MAX_CODE_LENGTH = 5000
const MAX_EXECUTION_TIME_MS = 5000
const CODE_EXECUTION_ENV = "ENABLE_UNSAFE_CODE_NODES"

let warnedDisabled = false

/**
 * 不可信代码执行开关。
 * 默认关闭：`javascript` / `tool` 节点会明确报错，`conditional` 走受限表达式求值。
 * 仅允许在完全可信的内网单租户环境显式开启。
 */
export function isCodeExecutionEnabled(): boolean {
  return process.env[CODE_EXECUTION_ENV] === "true"
}

export function assertCodeExecutionEnabled(label: string): void {
  if (isCodeExecutionEnabled()) return
  if (!warnedDisabled) {
    warnedDisabled = true
    createLogger("safe-executor").warn(
      `${label}: untrusted code execution is disabled by default; set ${CODE_EXECUTION_ENV}=true only for trusted internal deployments`,
    )
  }
  throw new Error(
    `${label}: untrusted code execution is disabled. Set ${CODE_EXECUTION_ENV}=true only on trusted internal deployments.`,
  )
}

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
  assertCodeExecutionEnabled(label)
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
