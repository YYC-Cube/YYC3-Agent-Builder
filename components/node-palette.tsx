"use client"

import type React from "react"
import { MessageSquare, Layers, Wrench, FileText, ImageIcon, Code, Play, Flag, GitBranch, Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"

type NodeTypeDef = {
  type: string
  i18nKey: string
  icon: React.ReactNode
  color: string
}

const nodeTypeDefs: NodeTypeDef[] = [
  { type: "start", i18nKey: "nodes.start", icon: <Play className="h-4 w-4" />, color: "bg-green-500" },
  { type: "prompt", i18nKey: "nodes.prompt", icon: <FileText className="h-4 w-4" />, color: "bg-chart-5" },
  { type: "textModel", i18nKey: "nodes.textModel", icon: <MessageSquare className="h-4 w-4" />, color: "bg-primary" },
  { type: "imageGeneration", i18nKey: "nodes.imageGeneration", icon: <ImageIcon className="h-4 w-4" />, color: "bg-chart-1" },
  { type: "httpRequest", i18nKey: "nodes.httpRequest", icon: <Globe className="h-4 w-4" />, color: "bg-blue-500" },
  { type: "conditional", i18nKey: "nodes.conditional", icon: <GitBranch className="h-4 w-4" />, color: "bg-purple-500" },
  { type: "javascript", i18nKey: "nodes.javascript", icon: <Code className="h-4 w-4" />, color: "bg-yellow-500" },
  { type: "embeddingModel", i18nKey: "nodes.embeddingModel", icon: <Layers className="h-4 w-4" />, color: "bg-chart-2" },
  { type: "tool", i18nKey: "nodes.tool", icon: <Wrench className="h-4 w-4" />, color: "bg-chart-4" },
  { type: "end", i18nKey: "nodes.end", icon: <Flag className="h-4 w-4" />, color: "bg-red-500" },
]

type NodePaletteProps = {
  onAddNode: (type: string) => void
  onClose?: () => void
}

export function NodePalette({ onAddNode, onClose }: NodePaletteProps) {
  const { t } = useI18n()

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType)
    event.dataTransfer.effectAllowed = "move"
  }

  const handleAddNode = (type: string) => {
    onAddNode(type)
    onClose?.()
  }

  return (
    <aside className="h-full w-80 overflow-y-auto border-r border-border bg-card p-3 md:w-64 md:p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground md:mb-4">{t("palette.title")}</h2>
      <div className="space-y-2">
        {nodeTypeDefs.map((node) => (
          <Card
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            onClick={() => handleAddNode(node.type)}
            className="cursor-grab border border-border bg-secondary p-2 transition-all hover:border-primary hover:bg-secondary/80 active:cursor-grabbing md:p-3"
          >
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-md md:h-8 md:w-8 ${node.color}`}>
                <div className="text-primary-foreground">{node.icon}</div>
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-medium text-foreground md:text-sm">{t(`${node.i18nKey}.label`)}</h3>
                <p className="hidden text-xs text-muted-foreground md:block">{t(`${node.i18nKey}.description`)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </aside>
  )
}
