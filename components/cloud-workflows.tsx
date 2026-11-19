"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import type { Edge, Node } from "@xyflow/react"
import { Cloud, FolderOpen, Loader2, LogIn, Save, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type WorkflowGraph = { nodes: Node[]; edges: Edge[] }
type WorkflowSummary = { id: string; name: string; version: number; updatedAt: string }

type CloudWorkflowsProps = {
  graph: WorkflowGraph
  workflowId: string | null
  onLoad: (graph: WorkflowGraph) => void
  onWorkflowIdChange: (id: string | null) => void
}

function sanitizeGraph(graph: WorkflowGraph): WorkflowGraph {
  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      data: { ...node.data, status: undefined, output: undefined },
    })),
    edges: graph.edges,
  }
}

export function CloudWorkflows({ graph, workflowId, onLoad, onWorkflowIdChange }: CloudWorkflowsProps) {
  const { data: session } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [items, setItems] = useState<WorkflowSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refreshList = useCallback(async () => {
    try {
      const response = await fetch("/api/workflows", { cache: "no-store" })
      if (!response.ok) return
      const payload = (await response.json()) as { workflows?: WorkflowSummary[] }
      setItems(payload.workflows ?? [])
    } catch {
      // 离线/未登录时静默，面板内仍有保存入口
    }
  }, [])

  useEffect(() => {
    if (!open || !session?.user) return
    let cancelled = false

    async function loadList() {
      try {
        const response = await fetch("/api/workflows", { cache: "no-store" })
        if (!response.ok || cancelled) return
        const payload = (await response.json()) as { workflows?: WorkflowSummary[] }
        if (!cancelled) setItems(payload.workflows ?? [])
      } catch {
        // 网络异常时保留已有列表
      }
    }

    void loadList()
    return () => {
      cancelled = true
    }
  }, [open, session?.user])

  async function handleSave() {
    setBusy(true)
    setMessage(null)
    try {
      const body = {
        name: name.trim() || `Untitled ${new Date().toLocaleString()}`,
        graph: sanitizeGraph(graph),
      }

      const response = await fetch(workflowId ? `/api/workflows/${workflowId}` : "/api/workflows", {
        method: workflowId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflowId ? { name: body.name, graph: body.graph } : body),
      })

      if (!response.ok) {
        setMessage(response.status === 401 ? "请先登录" : "保存失败")
        return
      }

      const payload = (await response.json()) as { workflow?: { id: string; name: string } }
      if (payload.workflow) {
        onWorkflowIdChange(payload.workflow.id)
        setName(payload.workflow.name)
        setMessage("已保存到云端")
        void refreshList()
      }
    } catch {
      setMessage("网络异常，保存失败")
    } finally {
      setBusy(false)
    }
  }

  async function handleLoad(id: string) {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/workflows/${id}`, { cache: "no-store" })
      if (!response.ok) {
        setMessage("加载失败")
        return
      }
      const payload = (await response.json()) as {
        workflow?: { id: string; name: string; graph: WorkflowGraph }
      }
      if (payload.workflow) {
        onLoad(sanitizeGraph(payload.workflow.graph))
        onWorkflowIdChange(payload.workflow.id)
        setName(payload.workflow.name)
        setOpen(false)
      }
    } catch {
      setMessage("网络异常，加载失败")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!workflowId) return
    if (!window.confirm("确定删除当前云端工作流？")) return

    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, { method: "DELETE" })
      if (response.status === 204) {
        onWorkflowIdChange(null)
        setMessage("已删除")
        void refreshList()
      } else {
        setMessage("删除失败")
      }
    } catch {
      setMessage("网络异常，删除失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
        <Cloud className="mr-2 h-4 w-4" />
        云端
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">云端工作流</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!session?.user ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">登录后可跨设备保存与加载工作流。</p>
              <Button asChild size="sm" className="w-full">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  去登录
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>

              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="工作流名称"
                  className="h-8"
                />
                <Button size="sm" onClick={handleSave} disabled={busy}>
                  {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                  保存
                </Button>
              </div>

              <div className="max-h-48 space-y-1 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">暂无云端工作流</p>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void handleLoad(item.id)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="ml-2 shrink-0 text-muted-foreground">v{item.version}</span>
                    </button>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => void refreshList()}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  刷新
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-destructive disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={!workflowId || busy}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除当前
                </button>
              </div>
            </div>
          )}

          {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  )
}
