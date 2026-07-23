"use client"

import { Card } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"
import { getStatusColor } from "@/lib/node-utils"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { Play } from "lucide-react"
import { memo } from "react"

export type StartNodeData = {
  status?: "idle" | "running" | "completed" | "error"
  output?: any
}

function StartNode({ data, selected }: NodeProps<Node<StartNodeData>>) {
  const { t } = useI18n()
  const status = data.status || "idle"

  return (
    <Card className={`min-w-[200px] border-2 bg-card transition-all ${getStatusColor(status, selected)}`}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500">
          <Play className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{t("nodes.start.label")}</h3>
          <p className="text-xs text-muted-foreground">{t("nodes.start.description")}</p>
        </div>
      </div>

      {status === "running" && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-yellow-600">
          <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          {t("nodes.start.starting")}
        </div>
      )}

      <Handle type="source" position={Position.Right} id="output" className="!bg-green-500" />
    </Card>
  )
}

export default memo(StartNode)
