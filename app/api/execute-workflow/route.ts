/**
 * file: app/api/execute-workflow/route.ts
 * description: 工作流执行 API 路由 · SSE 流式执行引擎接口
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [api],[workflow],[execute],[sse]
 *
 * brief: 工作流执行 API 路由，提供 SSE 流式执行引擎接口，支持鉴权、限流与运行落库。
 *
 * details:
 * - 传输层：SSE 流式推送执行状态（node_start/node_complete/node_error）
 * - 鉴权：WORKFLOW_API_TOKEN 令牌验证（x-workflow-token 或 Authorization: Bearer）
 * - 限流：按 IP 滑动窗口，默认 20 次/60s，返回 429 携带 Retry-After
 * - 请求体：512 KB 大小上限，200 节点/500 边图规模上限
 * - 出站防护：SSRF 网关、10s 硬超时、1 MiB 响应上限
 * - 运行落库：workflows/runs/run_events 三表持久化
 * - 超时预算：统一 28s，客户端断开透传 AbortSignal 取消 AI 调用
 *
 * dependencies: @/lib/api-guard, @/lib/auth, @/lib/logger, @/lib/runs/repository, @/lib/workflows/repository, @/lib/workflow-engine, @xyflow/react
 * exports: GET (dynamic), POST (execute-workflow), maxDuration=30
 * notes: 纯动态 Node 路由，不可部署至 GitHub Pages
 */

import { checkRequest } from "@/lib/api-guard"
import { getRequestUser } from "@/lib/auth"
import { createLogger, getErrorMessage } from "@/lib/logger"
import { appendRunEvent, createRun, finishRun } from "@/lib/runs/repository"
import { getWorkflow } from "@/lib/workflows/repository"
import { executeWorkflow, type StreamUpdate } from "@/lib/workflow-engine"
import type { Edge, Node } from "@xyflow/react"

export const maxDuration = 30

const MAX_BODY_BYTES = 512_000
const MAX_NODES = 200
const MAX_EDGES = 500
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateUrl(url: string): void {
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`Forbidden protocol: ${parsed.protocol}`)
    }
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "")
    const isBlockedHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "::" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.startsWith("169.254.") ||
      hostname.startsWith("fc00:") ||
      hostname.startsWith("fd00:") ||
      hostname.startsWith("fe80:")
    if (isBlockedHost) {
      throw new Error("SSRF protection: Private, loopback, link-local or metadata addresses are not allowed")
    }
  } catch (e: any) {
    if (e.message.includes("SSRF") || e.message.includes("Forbidden")) throw e
    throw new Error(`Invalid URL: ${url}`)
  }
}

/**
 * 统一执行超时预算：Next.js Route Handler 的 maxDuration=30s，单个 AI 调用 25s。
 * 若图中节点数较多，累计可能超过 30s；生产部署时应按实际节点数/并发度在部署平台
 * 相应调大超时，或将长流程拆分为多次执行。
 */
const EXECUTION_BUDGET_MS = 28_000

function jsonError(message: string, status: number, log: ReturnType<typeof createLogger>): Response {
  log.warn("invalid request", { status, message })
  return new Response(JSON.stringify({ type: "error", error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(req: Request) {
  const log = createLogger("execute-workflow")
  const user = await getRequestUser(req)

  const guard = await checkRequest(req, { authenticatedUserId: user?.id })
  if (!guard.ok) {
    log.warn("request rejected", { status: guard.status, clientId: guard.clientId })
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (guard.retryAfter) headers["Retry-After"] = String(guard.retryAfter)
    return new Response(JSON.stringify({ type: "error", error: guard.error }), {
      status: guard.status,
      headers,
    })
  }

  // 客户端断开时取消整个执行（含进行中的 AI 调用），避免资源泄露与无效计算
  const abortController = new AbortController()
  const executionSignal = AbortSignal.any([req.signal, AbortSignal.timeout(EXECUTION_BUDGET_MS)])

  executionSignal.addEventListener("abort", () => {
    log.warn("execution aborted by client disconnect or budget timeout", {
      reason: executionSignal.reason?.message ?? "unknown",
      clientId: guard.clientId,
    })
    abortController.abort(executionSignal.reason)
  })

  let nodes: Node[]
  let edges: Edge[]
  let workflowId: string | undefined

  try {
    const rawBody = await req.text()
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return jsonError("Request body too large", 413, log)
    }
    const payload: unknown = JSON.parse(rawBody)
    const parsed = payload as { nodes?: unknown; edges?: unknown; workflowId?: unknown }
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return jsonError("Invalid workflow payload: nodes/edges must be arrays", 400, log)
    }
    if (parsed.nodes.length > MAX_NODES || parsed.edges.length > MAX_EDGES) {
      return jsonError(`Workflow exceeds size limits (${MAX_NODES} nodes / ${MAX_EDGES} edges)`, 413, log)
    }
    nodes = parsed.nodes as Node[]
    edges = parsed.edges as Edge[]

    if (parsed.workflowId !== undefined) {
      if (typeof parsed.workflowId !== "string" || !UUID_PATTERN.test(parsed.workflowId)) {
        return jsonError("Invalid workflowId", 400, log)
      }
      if (!user) {
        return jsonError("Unauthorized: login required to bind a workflow", 401, log)
      }
      let owned: Awaited<ReturnType<typeof getWorkflow>>
      try {
        owned = await getWorkflow(parsed.workflowId, user.id)
      } catch (error) {
        log.error("workflow lookup failed", { error: getErrorMessage(error) })
        return jsonError("Workflow storage unavailable", 503, log)
      }
      if (!owned) {
        return jsonError("Workflow not found", 404, log)
      }
      workflowId = parsed.workflowId
    }
  } catch (error) {
    return jsonError(`Invalid JSON body: ${getErrorMessage(error)}`, 400, log)
  }

  log.info("workflow execution started", {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    clientId: guard.clientId,
    userId: user?.id,
    workflowId,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let runId: string | null = null
      if (workflowId && user) {
        try {
          runId = await createRun({ workflowId, userId: user.id })
        } catch (error) {
          log.warn("failed to create run record", { error: getErrorMessage(error) })
        }
      }

      let seq = 0
      let persistQueue: Promise<void> = Promise.resolve()

      const persist = (update: StreamUpdate) => {
        if (!runId) return
        const activeRunId = runId
        const currentSeq = ++seq
        persistQueue = persistQueue
          .then(() => appendRunEvent(activeRunId, currentSeq, update))
          .catch((error: unknown) => {
            log.warn("failed to persist run event", { error: getErrorMessage(error) })
          })
      }

      const sendUpdate = (update: StreamUpdate) => {
        controller.enqueue(encoder.encode(JSON.stringify(update) + "\n"))
        persist(update)
      }

      try {
        const executionLog = await executeWorkflow({ nodes, edges, onUpdate: sendUpdate, signal: executionSignal })
        log.info("workflow execution completed", { executedNodes: executionLog.length, runId })
        sendUpdate({ type: "complete", executionLog })
        await persistQueue
        if (runId) {
          try {
            await finishRun(runId, "succeeded")
          } catch (error) {
            log.warn("failed to mark run succeeded", { error: getErrorMessage(error) })
          }
        }
        controller.close()
      } catch (error: unknown) {
        const message = getErrorMessage(error)
        log.error("workflow execution failed", { error: message, runId })
        sendUpdate({ type: "error", error: message })
        await persistQueue
        if (runId) {
          try {
            await finishRun(runId, "failed", message)
          } catch (finishError) {
            log.warn("failed to mark run failed", { error: getErrorMessage(finishError) })
          }
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  })
}
