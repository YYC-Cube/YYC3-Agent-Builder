import { checkRequest } from "@/lib/api-guard"
import { createLogger, getErrorMessage } from "@/lib/logger"
import { executeWorkflow, type StreamUpdate } from "@/lib/workflow-engine"
import type { Edge, Node } from "@xyflow/react"

export const maxDuration = 30

const MAX_BODY_BYTES = 512_000
const MAX_NODES = 200
const MAX_EDGES = 500

function jsonError(message: string, status: number, log: ReturnType<typeof createLogger>): Response {
  log.warn("invalid request", { status, message })
  return new Response(JSON.stringify({ type: "error", error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(req: Request) {
  const log = createLogger("execute-workflow")

  const guard = await checkRequest(req)
  if (!guard.ok) {
    log.warn("request rejected", { status: guard.status, clientId: guard.clientId })
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (guard.retryAfter) headers["Retry-After"] = String(guard.retryAfter)
    return new Response(JSON.stringify({ type: "error", error: guard.error }), {
      status: guard.status,
      headers,
    })
  }

  let nodes: Node[]
  let edges: Edge[]
  try {
    const rawBody = await req.text()
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return jsonError("Request body too large", 413, log)
    }
    const payload: unknown = JSON.parse(rawBody)
    const parsed = payload as { nodes?: unknown; edges?: unknown }
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return jsonError("Invalid workflow payload: nodes/edges must be arrays", 400, log)
    }
    if (parsed.nodes.length > MAX_NODES || parsed.edges.length > MAX_EDGES) {
      return jsonError(`Workflow exceeds size limits (${MAX_NODES} nodes / ${MAX_EDGES} edges)`, 413, log)
    }
    nodes = parsed.nodes as Node[]
    edges = parsed.edges as Edge[]
  } catch (error) {
    return jsonError(`Invalid JSON body: ${getErrorMessage(error)}`, 400, log)
  }

  log.info("workflow execution started", {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    clientId: guard.clientId,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (update: StreamUpdate) => {
        controller.enqueue(encoder.encode(JSON.stringify(update) + "\n"))
      }

      try {
        const executionLog = await executeWorkflow({ nodes, edges, onUpdate: sendUpdate })
        log.info("workflow execution completed", { executedNodes: executionLog.length })
        sendUpdate({ type: "complete", executionLog })
        controller.close()
      } catch (error: unknown) {
        const message = getErrorMessage(error)
        log.error("workflow execution failed", { error: message })
        sendUpdate({ type: "error", error: message })
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
