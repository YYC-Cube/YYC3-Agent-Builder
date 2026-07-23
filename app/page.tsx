"use client"

import type React from "react"

import { LanguageSwitcher } from "@/components/language-switcher"
import AudioNode from "@/components/nodes/audio-node"
import ConditionalNode from "@/components/nodes/conditional-node"
import EmbeddingModelNode from "@/components/nodes/embedding-model-node"
import EndNode from "@/components/nodes/end-node"
import HttpRequestNode from "@/components/nodes/http-request-node"
import ImageGenerationNode from "@/components/nodes/image-generation-node"
import JavaScriptNode from "@/components/nodes/javascript-node"
import PromptNode from "@/components/nodes/prompt-node"
import StartNode from "@/components/nodes/start-node"
import StructuredOutputNode from "@/components/nodes/structured-output-node"
import TextModelNode from "@/components/nodes/text-model-node"
import ToolNode from "@/components/nodes/tool-node"
import { Button } from "@/components/ui/button"
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Code2, Download, Menu, Play, Sparkles, Upload, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { CodeExportDialog } from "@/components/code-export-dialog"
import { ExecutionPanel } from "@/components/execution-panel"
import { NodeConfigPanel } from "@/components/node-config-panel"
import { NodePalette } from "@/components/node-palette"
import { useI18n } from "@/lib/i18n"
import { getDefaultNodeData, MINIMAP_NODE_COLORS } from "@/lib/node-registry"

const STORAGE_KEY = "yyc3-agent-builder-workflow"

const nodeTypes: NodeTypes = {
  textModel: TextModelNode as any,
  embeddingModel: EmbeddingModelNode as any,
  tool: ToolNode as any,
  structuredOutput: StructuredOutputNode as any,
  prompt: PromptNode as any,
  imageGeneration: ImageGenerationNode as any,
  audio: AudioNode as any,
  javascript: JavaScriptNode as any,
  start: StartNode as any,
  end: EndNode as any,
  conditional: ConditionalNode as any,
  httpRequest: HttpRequestNode as any,
}

const initialNodes: Node[] = [
  {
    id: "1",
    type: "start",
    position: { x: 50, y: 250 },
    data: {},
  },
  {
    id: "2",
    type: "httpRequest",
    position: { x: 350, y: 250 },
    data: {
      url: "https://v0-generated-agent-builder.vercel.app/api/demo-country",
      method: "GET",
    },
  },
  {
    id: "3",
    type: "conditional",
    position: { x: 750, y: 250 },
    data: {
      condition: "input1.country === 'US'",
    },
  },
  {
    id: "4",
    type: "prompt",
    position: { x: 1150, y: 50 },
    data: { content: "Write a short patriotic poem about the United States" },
  },
  {
    id: "5",
    type: "prompt",
    position: { x: 1150, y: 450 },
    data: { content: "Write a welcoming message for visitors from $input1" },
  },
  {
    id: "6",
    type: "textModel",
    position: { x: 1550, y: 50 },
    data: { model: "openai/gpt-5-mini", temperature: 0.7, maxTokens: 300 },
  },
  {
    id: "7",
    type: "textModel",
    position: { x: 1550, y: 450 },
    data: { model: "openai/gpt-5-mini", temperature: 0.7, maxTokens: 300 },
  },
  {
    id: "8",
    type: "prompt",
    position: { x: 1950, y: 250 },
    data: { content: "Generate an artistic image representing this text: $input1" },
  },
  {
    id: "9",
    type: "imageGeneration",
    position: { x: 2400, y: 250 },
    data: { model: "gemini-2.5-flash-image", aspectRatio: "16:9", outputFormat: "png" },
  },
  {
    id: "10",
    type: "end",
    position: { x: 2850, y: 250 },
    data: {},
  },
]

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3" },
  { id: "e3-4", source: "3", target: "4", sourceHandle: "true", label: "✓ TRUE", style: { stroke: "#22c55e" } },
  { id: "e3-5", source: "3", target: "5", sourceHandle: "false", label: "✗ FALSE", style: { stroke: "#ef4444" } },
  { id: "e4-6", source: "4", target: "6" },
  { id: "e5-7", source: "5", target: "7" },
  { id: "e6-8", source: "6", target: "8" },
  { id: "e7-8", source: "7", target: "8" },
  { id: "e8-9", source: "8", target: "9" },
  { id: "e9-10", source: "9", target: "10" },
]

function loadSavedWorkflow(): { nodes: Node[]; edges: Edge[] } | null {
  if (typeof window === "undefined") return null
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const workflow = JSON.parse(saved)
      if (workflow.nodes && workflow.edges) {
        return { nodes: workflow.nodes, edges: workflow.edges }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

export default function AgentBuilder() {
  const { t } = useI18n()
  const [nodes, setNodes] = useState<Node[]>(() => {
    const saved = loadSavedWorkflow()
    return saved ? saved.nodes : initialNodes
  })

  const [edges, setEdges] = useState<Edge[]>(() => {
    const saved = loadSavedWorkflow()
    return saved ? saved.edges : initialEdges
  })

  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [showCodeExport, setShowCodeExport] = useState(false)
  const [showExecution, setShowExecution] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const nodeIdCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  useEffect(() => {
    const maxId = Math.max(...nodes.map((n) => Number.parseInt(n.id) || 0), 0)
    nodeIdCounter.current = maxId + 1
  }, [nodes])

  useEffect(() => {
    try {
      const cleanNodes = nodes.map((n) => ({
        ...n,
        data: { ...n.data, status: undefined, output: undefined },
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: cleanNodes, edges }))
    } catch { }
  }, [nodes, edges])

  const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [])

  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])

  const onConnect: OnConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setShowExecution(false)
    setIsPaletteOpen(false)
  }, [])

  const onAddNode = useCallback(
    (type: string) => {
      if (!reactFlowInstance) return

      const newNode: Node = {
        id: `${Date.now()}-${nodeIdCounter.current++}`,
        type,
        position: reactFlowInstance.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        }),
        data: getDefaultNodeData(type),
      }

      setNodes((nds) => [...nds, newNode])
    },
    [reactFlowInstance],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (!reactFlowWrapper.current || !reactFlowInstance) return

      const type = event.dataTransfer.getData("application/reactflow")
      if (!type) return

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: `${Date.now()}-${nodeIdCounter.current++}`,
        type,
        position,
        data: getDefaultNodeData(type),
      }

      setNodes((nds) => [...nds, newNode])
    },
    [reactFlowInstance],
  )

  const onUpdateNode = useCallback((nodeId: string, data: any) => {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data } : node)))
    setSelectedNode((node) => (node?.id === nodeId ? { ...node, data } : node))
  }, [])

  const handleNodeStatusChange = useCallback((nodeId: string, status: "idle" | "running" | "completed" | "error") => {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, status } } : node)))
  }, [])

  const handleNodeOutputChange = useCallback((nodeId: string, output: any) => {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, output } } : node)))
  }, [])

  const handleExportWorkflow = useCallback(() => {
    const workflow = { nodes, edges }
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ai-workflow-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [nodes, edges])

  const handleImportWorkflow = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const workflow = JSON.parse(content)

          if (workflow.nodes && workflow.edges) {
            setNodes(workflow.nodes)
            setEdges(workflow.edges)

            const maxId = Math.max(
              ...workflow.nodes.map((n: Node) => {
                const parts = n.id.split("-")
                return Number.parseInt(parts[parts.length - 1]) || 0
              }),
              0,
            )
            nodeIdCounter.current = maxId + 1
          } else {
            alert("Invalid workflow file format")
          }
        } catch (error) {
          console.error("Failed to import workflow:", error)
          alert("Failed to import workflow. Please check the file format.")
        }
      }
      reader.readAsText(file)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [],
  )

  const handleRun = useCallback(() => {
    setShowExecution(true)
    // Trigger execution after panel opens
    setTimeout(() => {
      const executeButton = document.querySelector("[data-execute-workflow]") as HTMLButtonElement
      if (executeButton) {
        executeButton.click()
      }
    }, 100)
  }, [])

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            aria-label="Toggle node palette"
          >
            {isPaletteOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground md:text-xl">{t("app.title")}</h1>
            <p className="text-xs text-muted-foreground md:text-sm">{t("app.subtitle")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportWorkflow}
            className="hidden"
            aria-label="Import workflow"
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            {t("toolbar.import")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportWorkflow}>
            <Download className="mr-2 h-4 w-4" />
            {t("toolbar.exportWorkflow")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCodeExport(true)}>
            <Code2 className="mr-2 h-4 w-4" />
            {t("toolbar.export")}
          </Button>
          <LanguageSwitcher />
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleRun}>
            <Play className="mr-2 h-4 w-4" />
            {t("toolbar.run")}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        <div
          className={`${isPaletteOpen ? "fixed inset-0 z-40 bg-black/50 md:hidden" : "hidden"}`}
          onClick={() => setIsPaletteOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`${isPaletteOpen ? "fixed left-0 top-[73px] z-50 h-[calc(100vh-73px)]" : "hidden"
            } ${selectedNode ? "md:block" : "md:block"} md:relative md:top-0 md:z-auto md:h-auto`}
        >
          <NodePalette onAddNode={onAddNode} onClose={() => setIsPaletteOpen(false)} />
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
          >
            <Background className="bg-background" gap={16} size={1} />
            <MiniMap
              pannable
              zoomable
              className="bg-card border border-border"
              maskColor="rgb(0, 0, 0, 0.6)"
              nodeColor={(node) => MINIMAP_NODE_COLORS[node.type || ""] || "oklch(0.65 0.25 265)"}
            />
          </ReactFlow>
        </div>

        {selectedNode && !showExecution && (
          <NodeConfigPanel node={selectedNode} onClose={() => setSelectedNode(null)} onUpdate={onUpdateNode} />
        )}

        {showExecution && (
          <ExecutionPanel
            nodes={nodes}
            edges={edges}
            onClose={() => setShowExecution(false)}
            onNodeStatusChange={handleNodeStatusChange}
            onNodeOutputChange={handleNodeOutputChange}
          />
        )}
      </div>

      <CodeExportDialog open={showCodeExport} onOpenChange={setShowCodeExport} nodes={nodes} edges={edges} />
    </div>
  )
}
