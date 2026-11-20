/**
 * file: components/nodes/embedding-model-node.tsx
 * description: 向量化节点组件 · 文本向量化 Embedding
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [component],[node],[embedding]
 *
 * brief: 向量化节点组件，支持文本 Embedding 向量化。
 *
 * details:
 * - 通过 embed 调用 OpenAI Embeddings 生成向量
 * - 支持模型、维度等参数
 * - 客户端组件（use client）
 *
 * dependencies: react, @xyflow/react, lucide-react, @/components/ui/card, @/lib/i18n, @/lib/node-utils
 * exports: EmbeddingModelNode, EmbeddingModelNodeData
 * notes: 向量输出供下游检索节点使用
 */

"use client"

import { memo } from "react"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { Layers, Settings } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"

export type EmbeddingModelNodeData = {
  model: string
  dimensions?: number
}

function EmbeddingModelNode({ data, selected }: NodeProps<Node<EmbeddingModelNodeData>>) {
  const { t } = useI18n()
  return (
    <Card
      className={`min-w-[280px] border-2 bg-card transition-all ${
        selected ? "border-primary shadow-lg" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-border bg-secondary/50 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chart-2">
          <Layers className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{t("nodes.embeddingModel.label")}</h3>
          <p className="text-xs text-muted-foreground">{data.model || "openai/text-embedding-3-small"}</p>
        </div>
        <Settings className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-2 p-4">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t("config.embeddingModel.dimensions")}:</span>
          <span className="font-mono text-foreground">{data.dimensions || 1536}</span>
        </div>
      </div>

      <Handle type="target" position={Position.Left} id="input" className="!bg-chart-2" />
      <Handle type="source" position={Position.Right} id="embedding" className="!bg-chart-2" />
    </Card>
  )
}

export default memo(EmbeddingModelNode)
