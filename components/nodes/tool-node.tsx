/**
 * file: components/nodes/tool-node.tsx
 * description: 工具节点组件 · 自定义工具调用
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [component],[node],[tool]
 *
 * brief: 工具节点组件，支持自定义工具调用。
 *
 * details:
 * - 通过 safe-executor 执行自定义工具代码（默认熔断）
 * - 支持工具定义与参数配置
 * - 客户端组件（use client）
 *
 * dependencies: react, @xyflow/react, lucide-react, @/components/ui/card, @/lib/i18n, @/lib/node-utils
 * exports: ToolNode, ToolNodeData
 * notes: 未开启 ENABLE_UNSAFE_CODE_NODES 时明确报错
 */

"use client"

import { memo } from "react"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { Wrench, Settings } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"
import { getStatusColor } from "@/lib/node-utils"

export type ToolNodeData = {
  name: string
  description: string
  parameters?: Record<string, any>
  code?: string
  status?: "idle" | "running" | "completed" | "error"
}

function ToolNode({ data, selected }: NodeProps<Node<ToolNodeData>>) {
  const { t } = useI18n()
  const status = data.status || "idle"

  return (
    <Card className={`min-w-[280px] border-2 bg-card transition-all ${getStatusColor(status, selected)}`}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chart-4">
          <Wrench className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{t("nodes.tool.label")}</h3>
          <p className="text-xs text-muted-foreground">{data.name || t("nodes.tool.description")}</p>
        </div>
        <Settings className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="p-4">
        <p className="text-xs text-muted-foreground">{data.description || t("nodes.tool.description")}</p>
        {data.code && (
          <div className="mt-2 flex items-center gap-1 text-xs text-chart-3">
            <div className="h-1.5 w-1.5 rounded-full bg-chart-3" />
            {t("config.javascript.code")}
          </div>
        )}
        {status === "running" && (
          <div className="mt-2 flex items-center gap-2 text-xs text-yellow-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
            {t("nodes.textModel.running")}...
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="!bg-chart-4" />
      <Handle type="source" position={Position.Right} id="output" className="!bg-chart-4" />
    </Card>
  )
}

export default memo(ToolNode)
