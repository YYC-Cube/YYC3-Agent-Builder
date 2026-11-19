/**
 * YYC³ · 工作流执行引擎
 * ================
 * 从 `app/api/execute-workflow/route.ts` 抽离的纯执行内核：
 * - 输入：节点图（React Flow 的 nodes/edges）
 * - 输出：逐步回调 onUpdate（node_start / node_complete / node_error）
 * - 返回：完整执行日志
 *
 * 传输层（SSE、鉴权、请求体校验）保留在 route handler，本模块不依赖 Next.js。
 * 这样同一内核可被 API、CLI、定时任务或批量执行复用，并可直接单测。
 */

import { google } from "@ai-sdk/google"
import { openai } from "@ai-sdk/openai"
import type { Edge, Node } from "@xyflow/react"
import { embed, generateImage, generateSpeech, generateText, jsonSchema, Output } from "ai"
import { createLogger, getErrorMessage } from "@/lib/logger"
import { evaluateExpression } from "@/lib/expression-evaluator"
import { resolveModel } from "@/lib/model-resolver"
import { isCodeExecutionEnabled, safeExecute } from "@/lib/safe-executor"
import { fetchExternal } from "@/lib/url-guard"

const MAX_GRAPH_DEPTH = 100
const AI_CALL_TIMEOUT_MS = 25_000
const ALLOWED_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const

/** 合并外部取消信号与单调用超时，客户端断开时可立即取消进行中的 AI 调用 */
function resolveAbortSignal(signal: AbortSignal | undefined): AbortSignal {
  if (!signal) return AbortSignal.timeout(AI_CALL_TIMEOUT_MS)
  return AbortSignal.any([signal, AbortSignal.timeout(AI_CALL_TIMEOUT_MS)])
}

export type ExecutionResult = {
  nodeId: string
  type: string
  output: unknown
  error?: string
}

export type StreamUpdate = {
  type: "node_start" | "node_complete" | "node_error" | "complete" | "error"
  nodeId?: string
  nodeType?: string
  output?: unknown
  error?: string
  executionLog?: ExecutionResult[]
}

export type ExecuteWorkflowOptions = {
  nodes: Node[]
  edges: Edge[]
  onUpdate?: (update: StreamUpdate) => void
  /** 仅测试使用：覆盖最大递归深度 */
  maxDepth?: number
  /** 客户端断开/预算超时时取消整个执行（含进行中的 AI 调用） */
  signal?: AbortSignal
}

export function interpolateVariables(template: string, inputs: unknown[]): string {
  let result = template
  inputs.forEach((input, index) => {
    const placeholder = `$input${index + 1}`
    const value = typeof input === "string" ? input : JSON.stringify(input)
    // 使用函数式替换，避免上游输出中的 $& / $' 等被当作替换模式解析
    result = result.replace(new RegExp(`\\${placeholder}`, "g"), () => value)
  })
  return result
}

function resolveImageModel(modelId: string) {
  if (modelId.startsWith("openai/")) return openai.image(modelId.slice("openai/".length))
  if (modelId.startsWith("google/")) return google.image(modelId.slice("google/".length))
  // 含 provider 前缀的模型交给 AI Gateway 字符串路由
  if (/^[a-z0-9-]+\//i.test(modelId)) return modelId
  return google.image(modelId)
}

export async function executeWorkflow({
  nodes,
  edges,
  onUpdate,
  maxDepth = MAX_GRAPH_DEPTH,
  signal,
}: ExecuteWorkflowOptions): Promise<ExecutionResult[]> {
  const log = createLogger("workflow-engine")
  const sendUpdate = (update: StreamUpdate) => onUpdate?.(update)
  const callSignal = resolveAbortSignal(signal)

  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const results = new Map<string, unknown>()
  const executionLog: ExecutionResult[] = []

  // Find nodes with no incoming edges (entry points)
  const incomingEdges = new Set(edges.map((e) => e.target))
  const entryNodes = nodes.filter((node) => !incomingEdges.has(node.id))

  const executeNode = async (nodeId: string, depth = 0): Promise<unknown> => {
    // 防止环图导致无限递归（P1 健壮性）
    if (depth > maxDepth) {
      throw new Error("Workflow exceeds maximum execution depth (possible cycle)")
    }

    // Return cached result if already executed
    if (results.has(nodeId)) {
      return results.get(nodeId)
    }

    const node = nodeMap.get(nodeId)
    if (!node) {
      throw new Error(`Node ${nodeId} not found`)
    }

    const inputEdges = edges
      .filter((e) => e.target === nodeId)
      .sort((a, b) => {
        const nodeA = nodeMap.get(a.source)
        const nodeB = nodeMap.get(b.source)
        return (nodeA?.position.x || 0) - (nodeB?.position.x || 0)
      })

    let hasValidInput = inputEdges.length === 0 // Nodes with no inputs are valid (entry nodes)

    for (const edge of inputEdges) {
      const sourceNode = nodeMap.get(edge.source)

      if (sourceNode?.type === "conditional") {
        // Check if the conditional has been evaluated
        if (results.has(edge.source)) {
          const conditionResult = results.get(edge.source)
          const expectedHandle = conditionResult ? "true" : "false"

          // If this edge's sourceHandle matches the condition result, it's a valid input
          if (!edge.sourceHandle || edge.sourceHandle === expectedHandle) {
            hasValidInput = true
            break
          }
        }
      } else {
        // For non-conditional inputs, check if the source node has executed successfully
        const sourceResult = await executeNode(edge.source, depth + 1)
        // Only consider it valid input if the source node actually produced output
        if (sourceResult !== null) {
          hasValidInput = true
          break
        }
      }
    }

    // If no valid inputs, skip this node
    if (!hasValidInput) {
      results.set(nodeId, null)
      return null
    }

    sendUpdate({
      type: "node_start",
      nodeId,
      nodeType: node.type,
    })

    const inputs: unknown[] = []
    for (const edge of inputEdges) {
      // Only collect inputs from valid paths
      const sourceNode = nodeMap.get(edge.source)
      let shouldIncludeInput = true

      if (sourceNode?.type === "conditional" && results.has(edge.source)) {
        const conditionResult = results.get(edge.source)
        const expectedHandle = conditionResult ? "true" : "false"

        if (edge.sourceHandle && edge.sourceHandle !== expectedHandle) {
          shouldIncludeInput = false
        }
      }

      if (shouldIncludeInput) {
        const inputResult = await executeNode(edge.source, depth + 1)
        // Only add non-null inputs (skip inputs from skipped branches)
        if (inputResult !== null) {
          inputs.push(inputResult)
        }
      }
    }

    // Skip this node only if it has no valid inputs at all
    // (all inputs were null or from invalid conditional paths)
    if (inputEdges.length > 0 && inputs.length === 0) {
      results.set(nodeId, null)
      return null
    }

    let output: unknown

    try {
      switch (node.type) {
        case "start":
          output = "Workflow started"
          executionLog.push({ nodeId, type: node.type, output })
          break

        case "end": {
          const endInput = inputs.length > 0 ? inputs[0] : null
          output = endInput
          executionLog.push({ nodeId, type: node.type, output: { finalOutput: output } })
          break
        }

        case "conditional": {
          const conditionCode = String(node.data.condition || "true")
          const conditionInputs = inputs

          try {
            const result = isCodeExecutionEnabled()
              ? safeExecute(`return ${conditionCode}`, conditionInputs, "Conditional")
              : evaluateExpression(conditionCode, conditionInputs)
            output = Boolean(result)
          } catch (condError: unknown) {
            throw new Error(`Conditional evaluation error: ${getErrorMessage(condError)}`)
          }

          executionLog.push({
            nodeId,
            type: node.type,
            output: { condition: conditionCode, result: output, inputs: conditionInputs },
          })
          break
        }

        case "httpRequest": {
          const method = String(node.data.method || "GET").toUpperCase()
          if (!(ALLOWED_HTTP_METHODS as readonly string[]).includes(method)) {
            throw new Error(`HTTP request failed: unsupported method ${method}`)
          }

          const rawUrl = String(node.data.url || "")
          const url = inputs.length > 0 ? interpolateVariables(rawUrl, inputs) : rawUrl

          const headers: Record<string, string> = {}
          if (node.data.headers) {
            try {
              Object.assign(headers, JSON.parse(String(node.data.headers)))
            } catch (error) {
              log.warn("invalid headers JSON ignored", { nodeId, error: getErrorMessage(error) })
            }
          }

          let body = String(node.data.body || "")
          if (body && inputs.length > 0) {
            body = interpolateVariables(body, inputs)
          }

          const fetchOptions: RequestInit = { method, headers }
          if (method !== "GET" && method !== "HEAD" && body) {
            fetchOptions.body = body
          }

          try {
            output = await fetchExternal(url, fetchOptions)
          } catch (error) {
            throw new Error(`HTTP request failed: ${getErrorMessage(error)}`)
          }

          executionLog.push({
            nodeId,
            type: node.type,
            output: { url, method, response: output },
          })
          break
        }

        case "prompt": {
          const content = String(node.data.content || "")
          output = inputs.length > 0 ? interpolateVariables(content, inputs) : content
          executionLog.push({ nodeId, type: node.type, output })
          break
        }

        case "textModel": {
          const prompt = inputs.length > 0 ? String(inputs[0]) : String(node.data.prompt || "")

          if (node.data.structuredOutput && node.data.schema) {
            const textResult = await generateText({
              model: resolveModel(String(node.data.model || "openai/gpt-5")),
              prompt: `${prompt}\n\nRespond in JSON format matching this schema: ${node.data.schema}`,
              temperature: Number(node.data.temperature || 0.7),
              maxOutputTokens: Number(node.data.maxTokens || 2000),
              abortSignal: callSignal,
            })
            output = textResult.text
            executionLog.push({
              nodeId,
              type: node.type,
              output: {
                text: output,
                structured: true,
                schemaName: node.data.schemaName,
                usage: textResult.usage,
              },
            })
          } else {
            const textResult = await generateText({
              model: resolveModel(String(node.data.model || "openai/gpt-5")),
              prompt,
              temperature: Number(node.data.temperature || 0.7),
              maxOutputTokens: Number(node.data.maxTokens || 2000),
              abortSignal: callSignal,
            })
            output = textResult.text
            executionLog.push({
              nodeId,
              type: node.type,
              output: { text: output, usage: textResult.usage },
            })
          }
          break
        }

        case "imageGeneration": {
          const imagePrompt = inputs.length > 0 ? String(inputs[0]) : String(node.data.prompt || "")
          if (!imagePrompt.trim()) throw new Error("Image generation requires a prompt")

          const modelId = String(node.data.model || "gemini-2.5-flash-image")
          const aspectRatio =
            typeof node.data.aspectRatio === "string" && /^\d+:\d+$/.test(node.data.aspectRatio)
              ? (node.data.aspectRatio as `${number}:${number}`)
              : undefined

          const imageResult = await generateImage({
            model: resolveImageModel(modelId),
            prompt: imagePrompt,
            aspectRatio,
            abortSignal: callSignal,
          })

          const generated = imageResult.images ?? (imageResult.image ? [imageResult.image] : [])
          const images = generated
            .map((item) => (item.base64 ? `data:image/png;base64,${item.base64}` : ""))
            .filter((item): item is string => item.length > 0)

          output = images[0] ?? null
          executionLog.push({
            nodeId,
            type: node.type,
            output: {
              images,
              prompt: imagePrompt,
              model: modelId,
              aspectRatio: aspectRatio ?? "1:1",
              warnings: imageResult.warnings,
              usage: imageResult.usage,
            },
          })
          break
        }

        case "javascript": {
          const jsCode = String(node.data.code || "")

          try {
            output = safeExecute(jsCode, inputs, "JavaScript")
          } catch (jsError: unknown) {
            throw new Error(`JavaScript execution error: ${getErrorMessage(jsError)}`)
          }

          executionLog.push({ nodeId, type: node.type, output })
          break
        }

        case "audio": {
          const audioText = inputs.length > 0 ? String(inputs[0]) : String(node.data.text || "")
          if (!audioText.trim()) throw new Error("Audio generation requires text input")

          const rawModel = String(node.data.model || "tts-1")
          const speechModelId = rawModel.replace(/^openai\//, "")
          const voice = String(node.data.voice || "alloy")
          const speechResult = await generateSpeech({
            model: openai.speech(speechModelId),
            text: audioText,
            voice,
            abortSignal: callSignal,
          })
          const mediaType = (speechResult.audio as { mediaType?: string }).mediaType ?? "audio/mpeg"
          const audioUrl = `data:${mediaType};base64,${speechResult.audio.base64}`

          output = { audioUrl, text: audioText, model: speechModelId, voice, mediaType }
          executionLog.push({
            nodeId,
            type: node.type,
            output: { audioUrl, text: audioText, model: speechModelId, voice, mediaType },
          })
          break
        }

        case "embeddingModel": {
          const embedText = inputs.length > 0 ? String(inputs[0]) : String(node.data.text || "")
          if (!embedText.trim()) throw new Error("Embedding generation requires text input")

          const embedModelId = String(node.data.model || "openai/text-embedding-3-small")
          const embedResult = await embed({
            model: openai.embedding(embedModelId.replace(/^openai\//, "")),
            value: embedText,
            abortSignal: callSignal,
          })

          output = {
            embedding: embedResult.embedding,
            dimensions: embedResult.embedding.length,
            model: embedModelId,
            usage: embedResult.usage,
          }
          executionLog.push({
            nodeId,
            type: node.type,
            output: {
              embedding: embedResult.embedding,
              dimensions: embedResult.embedding.length,
              model: embedModelId,
              usage: embedResult.usage,
            },
          })
          break
        }

        case "structuredOutput": {
          const structuredPrompt = inputs.length > 0 ? String(inputs[0]) : String(node.data.prompt || "")
          if (!structuredPrompt.trim()) throw new Error("Structured output requires a prompt")

          const schemaText = String(node.data.schema || "").trim()
          if (!schemaText) throw new Error("Structured output requires a JSON schema")

          let parsedSchema: unknown
          try {
            parsedSchema = JSON.parse(schemaText)
          } catch {
            throw new Error("Structured output schema is not valid JSON")
          }

          const schemaName = String(node.data.schemaName || "Response")
          const schema = jsonSchema(parsedSchema as Parameters<typeof jsonSchema>[0])
          const outputSpec =
            node.data.mode === "array"
              ? Output.array({ element: schema, name: schemaName })
              : Output.object({ schema, name: schemaName })

          const structuredResult = await generateText({
            model: resolveModel(String(node.data.model || "openai/gpt-5")),
            output: outputSpec,
            prompt: structuredPrompt,
            abortSignal: callSignal,
          })

          output = structuredResult.output
          executionLog.push({
            nodeId,
            type: node.type,
            output: {
              data: structuredResult.output,
              schemaName,
              mode: node.data.mode === "array" ? "array" : "object",
              usage: structuredResult.usage,
            },
          })
          break
        }

        case "tool": {
          if (node.data.code) {
            try {
              output = safeExecute(String(node.data.code), inputs, "Tool")
            } catch (toolError: unknown) {
              throw new Error(`Tool execution error: ${getErrorMessage(toolError)}`)
            }
          } else {
            output = { message: "Tool has no implementation code" }
          }
          executionLog.push({ nodeId, type: node.type, output })
          break
        }

        default:
          output = null
      }

      results.set(nodeId, output)

      sendUpdate({
        type: "node_complete",
        nodeId,
        nodeType: node.type,
        output,
      })

      return output
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      log.warn("node execution failed", { nodeId, nodeType: node.type || "unknown", error: errorMessage })
      executionLog.push({
        nodeId,
        type: node.type || "unknown",
        output: null,
        error: errorMessage,
      })

      sendUpdate({
        type: "node_error",
        nodeId,
        nodeType: node.type || "unknown",
        error: errorMessage,
      })

      throw error
    }
  }

  // Execute all entry nodes（visited 集合防止环图导致下游遍历死循环）
  const visitedDownstream = new Set<string>()
  for (const entryNode of entryNodes) {
    await executeNode(entryNode.id)

    const processDownstream = async (nodeId: string) => {
      if (visitedDownstream.has(nodeId)) return
      visitedDownstream.add(nodeId)
      const outgoingEdges = edges.filter((e) => e.source === nodeId)

      // The skip logic in executeNode will handle conditional branching
      for (const edge of outgoingEdges) {
        await executeNode(edge.target)
        await processDownstream(edge.target)
      }
    }
    await processDownstream(entryNode.id)
  }

  return executionLog
}
