/**
 * file: components/execution-panel.tsx
 * description: 执行面板组件 · SSE 流式执行状态显示与控制
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [component],[ui],[execution],[sse]
 *
 * brief: 执行面板组件，显示 SSE 流式执行状态，支持运行控制与日志查看。
 *
 * details:
 * - 显示节点执行状态（node_start/node_complete/node_error）
 * - 支持运行/暂停/停止控制
 * - 显示执行日志与错误信息
 * - 客户端组件（use client）
 *
 * dependencies: @/components/ui/*, @/lib/i18n, @xyflow/react, lucide-react, react
 * exports: ExecutionPanel
 * notes: 通过 SSE 连接接收执行状态推送
 */

"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "@/lib/i18n"
import type { Edge, Node } from "@xyflow/react"
import { CheckCircle, Loader2, Play, X, XCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const TOKEN_STORAGE_KEY = "yyc3-workflow-token"

type ExecutionResult = {
  nodeId: string
  type: string
  output: unknown
  error?: string
}

type ExecutionPanelProps = {
  nodes: Node[]
  edges: Edge[]
  onClose: () => void
  onNodeStatusChange?: (nodeId: string, status: "idle" | "running" | "completed" | "error") => void
  onNodeOutputChange?: (nodeId: string, output: unknown) => void
  autoRunToken?: number
  /** 已保存的云端工作流 ID；存在时执行结果会写入 runs/run_events */
  workflowId?: string | null
}

export function ExecutionPanel({
  nodes,
  edges,
  onClose,
  onNodeStatusChange,
  onNodeOutputChange,
  autoRunToken,
  workflowId,
}: ExecutionPanelProps) {
  const { t } = useI18n()
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionLog, setExecutionLog] = useState<ExecutionResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_STORAGE_KEY) || "",
  )

  const handleExecuteRef = useRef<() => Promise<void>>(async () => {})
  const lastAutoRunToken = useRef(0)

  const handleExecute = async () => {
    setIsExecuting(true)
    setExecutionLog([])
    setError(null)
    setCurrentNodeId(null)

    nodes.forEach((node) => {
      if (onNodeStatusChange) onNodeStatusChange(node.id, "idle")
      if (onNodeOutputChange) onNodeOutputChange(node.id, null)
    })

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const token = accessToken || process.env.NEXT_PUBLIC_WORKFLOW_API_TOKEN
      if (token) headers["x-workflow-token"] = token

      const response = await fetch("/api/execute-workflow", {
        method: "POST",
        headers,
        body: JSON.stringify({ nodes, edges, ...(workflowId ? { workflowId } : {}) }),
      })

      if (!response.ok) {
        let message = `HTTP ${response.status}`
        try {
          const payload = (await response.json()) as { error?: string }
          if (payload?.error) message = payload.error
        } catch {
          // 非 JSON 错误响应时保留 HTTP 状态码信息
        }
        throw new Error(message)
      }

      if (!response.body) {
        throw new Error("No response body")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const update = JSON.parse(line)

            switch (update.type) {
              case "node_start":
                if (onNodeStatusChange && update.nodeId) {
                  onNodeStatusChange(update.nodeId, "running")
                  setCurrentNodeId(update.nodeId)
                }
                break

              case "node_complete":
                if (update.nodeId) {
                  if (onNodeStatusChange) {
                    onNodeStatusChange(update.nodeId, "completed")
                  }
                  if (onNodeOutputChange) {
                    onNodeOutputChange(update.nodeId, update.output)
                  }
                  const node = nodes.find((n) => n.id === update.nodeId)
                  setExecutionLog((prev) => [
                    ...prev,
                    {
                      nodeId: update.nodeId,
                      type: node?.type || "unknown",
                      output: update.output,
                    },
                  ])
                  setCurrentNodeId(null)
                }
                break

              case "node_error":
                if (update.nodeId && onNodeStatusChange) {
                  onNodeStatusChange(update.nodeId, "error")
                }
                const errorNode = nodes.find((n) => n.id === update.nodeId)
                setExecutionLog((prev) => [
                  ...prev,
                  {
                    nodeId: update.nodeId || "unknown",
                    type: errorNode?.type || "unknown",
                    output: null,
                    error: update.error,
                  },
                ])
                setCurrentNodeId(null)
                break

              case "complete":
                setCurrentNodeId(null)
                break

              case "error":
                setError(update.error || "Execution failed")
                break
            }
          } catch (parseError) {
            console.error("Failed to parse update:", parseError)
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to execute workflow")
    } finally {
      setIsExecuting(false)
    }
  }

  useEffect(() => {
    handleExecuteRef.current = handleExecute
  })

  useEffect(() => {
    if (autoRunToken && autoRunToken !== lastAutoRunToken.current) {
      lastAutoRunToken.current = autoRunToken
      void handleExecuteRef.current()
    }
  }, [autoRunToken])

  const getNodeLabel = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return nodeId

    switch (node.type) {
      case "textModel":
        return `Text Model (${node.data.model})`
      case "embeddingModel":
        return `Embedding Model (${node.data.model})`
      case "tool":
        return `Tool (${node.data.name})`
      case "structuredOutput":
        return `Structured Output (${node.data.schemaName})`
      case "prompt":
        return "Prompt"
      case "imageGeneration":
        return "Image Generation"
      case "audio":
        return "Audio Generation"
      case "javascript":
        return "JavaScript"
      default:
        return node.type || "Unknown"
    }
  }

  return (
    <aside className="absolute right-0 top-0 z-10 h-full w-full border-l border-border bg-card md:relative md:w-96">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">{t("execution.title")}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4">
        <Button
          data-execute-workflow
          onClick={handleExecute}
          disabled={isExecuting || nodes.length === 0}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("execution.running")}
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              {t("toolbar.run")}
            </>
          )}
        </Button>

        <div className="mt-3 space-y-1">
          <label htmlFor="workflow-access-token" className="text-xs text-muted-foreground">
            Access Token (optional)
          </label>
          <Input
            id="workflow-access-token"
            type="password"
            value={accessToken}
            onChange={(event) => {
              const next = event.target.value
              setAccessToken(next)
              try {
                if (next) localStorage.setItem(TOKEN_STORAGE_KEY, next)
                else localStorage.removeItem(TOKEN_STORAGE_KEY)
              } catch {
                // localStorage 不可用时仅保留内存态令牌
              }
            }}
            placeholder="Required when WORKFLOW_API_TOKEN is set"
            className="h-8 text-xs"
            autoComplete="off"
          />
        </div>

        {error && (
          <Card className="mt-4 border-destructive bg-destructive/10 p-3">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-xs text-destructive/80">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {executionLog.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-foreground">Execution Log</h3>
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-3">
                {currentNodeId && (
                  <Card className="border border-primary/50 bg-primary/5 p-3">
                    <div className="flex items-start gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{getNodeLabel(currentNodeId)}</p>
                        <p className="text-xs text-muted-foreground">Executing...</p>
                      </div>
                    </div>
                  </Card>
                )}
                {executionLog.map((result, index) => (
                  <Card
                    key={index}
                    className={`border p-3 ${
                      result.error ? "border-destructive bg-destructive/5" : "border-border bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.error ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-chart-3" />
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-foreground">{getNodeLabel(result.nodeId)}</p>
                        {result.error ? (
                          <p className="text-xs text-destructive">{result.error}</p>
                        ) : (
                          <div className="rounded bg-background p-2">
                            <pre className="max-h-32 overflow-auto text-xs text-muted-foreground">
                              {typeof result.output === "string"
                                ? result.output
                                : JSON.stringify(result.output, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {executionLog.length === 0 && currentNodeId && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-foreground">Execution Log</h3>
            <Card className="border border-primary/50 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{getNodeLabel(currentNodeId)}</p>
                  <p className="text-xs text-muted-foreground">Executing...</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {executionLog.length === 0 && !error && !isExecuting && !currentNodeId && (
          <Card className="mt-4 border-border bg-secondary/50 p-4">
            <p className="text-center text-sm text-muted-foreground">
              Click "Run Workflow" to execute your AI agent pipeline
            </p>
          </Card>
        )}
      </div>
    </aside>
  )
}
