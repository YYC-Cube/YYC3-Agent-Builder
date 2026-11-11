/**
 * YYC³ · 结构化日志机制
 * ================
 * 统一 JSON Lines 输出，支持分级、请求追踪与敏感字段脱敏。
 * 约定：服务端日志只写 stdout/stderr，由部署平台采集；禁止记录密钥与完整 payload。
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent"

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
}

const SENSITIVE_KEY = /^(authorization|bearer|cookie|set-cookie|x-api-key|x-workflow-token|token|apikey|api_key|password|secret|credential|privatekey)$/i
const MAX_STRING_LENGTH = 2000
const MAX_DEPTH = 4

export type LogFields = Record<string, unknown>

function normalize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Error) return { name: value.name, message: value.message.slice(0, MAX_STRING_LENGTH) }
  if (typeof value === "string") return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]` : value
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value
  if (depth >= MAX_DEPTH) return "[max-depth]"
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => normalize(item, depth + 1))
  if (typeof value === "object") {
    const result: LogFields = {}
    for (const [key, item] of Object.entries(value as LogFields)) {
      result[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : normalize(item, depth + 1)
    }
    return result
  }
  return String(value)
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return typeof error === "string" ? error : "Unknown error"
}

function currentThreshold(): number {
  const configured = (process.env.LOG_LEVEL || "info").toLowerCase()
  return LEVEL_PRIORITY[configured as LogLevel] ?? LEVEL_PRIORITY.info
}

export type Logger = {
  debug: (message: string, fields?: LogFields) => void
  info: (message: string, fields?: LogFields) => void
  warn: (message: string, fields?: LogFields) => void
  error: (message: string, fields?: LogFields) => void
  child: (fields: LogFields) => Logger
}

export function createLogger(module: string, baseFields: LogFields = {}): Logger {
  const requestId = typeof baseFields.requestId === "string"
    ? baseFields.requestId
    : Math.random().toString(36).slice(2, 10)

  const emit = (level: Exclude<LogLevel, "silent">, message: string, fields: LogFields = {}) => {
    if (LEVEL_PRIORITY[level] < currentThreshold()) return
    const entry = {
      ts: new Date().toISOString(),
      level,
      module,
      requestId,
      message,
      ...(normalize({ ...baseFields, ...fields }) as LogFields),
    }
    const line = JSON.stringify(entry)
    if (level === "error") console.error(line)
    else if (level === "warn") console.warn(line)
    else console.log(line)
  }

  return {
    debug: (message, fields) => emit("debug", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
    error: (message, fields) => emit("error", message, fields),
    child: (fields) => createLogger(module, { ...baseFields, ...fields, requestId }),
  }
}
