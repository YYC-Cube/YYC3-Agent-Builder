/**
 * file: components/nodes/audio-node.tsx
 * description: 音频节点组件 · 语音合成与音频生成
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [component],[node],[audio]
 *
 * brief: 音频节点组件，支持语音合成与音频生成。
 *
 * details:
 * - 通过 generateSpeech 调用 OpenAI TTS 生成语音
 * - 支持文本、语音模型、语速等参数
 * - 客户端组件（use client）
 *
 * dependencies: react, @xyflow/react, lucide-react, @/components/ui/card, @/lib/i18n, @/lib/node-utils
 * exports: AudioNode, AudioNodeData
 * notes: 输出音频 URL 供下游节点使用
 */

"use client"

import { Card } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"
import { getStatusColor } from "@/lib/node-utils"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { Mic } from "lucide-react"
import { memo } from "react"

export type AudioNodeData = {
  model: string
  voice?: string
  speed?: number
  status?: "idle" | "running" | "completed" | "error"
  output?: any
}

function AudioNode({ data, selected }: NodeProps<Node<AudioNodeData>>) {
  const { t } = useI18n()
  const status = data.status || "idle"

  return (
    <Card className={`min-w-[280px] max-w-[400px] border-2 bg-card transition-all ${getStatusColor(status, selected)}`}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500">
          <Mic className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{t("nodes.audio.label")}</h3>
          <p className="text-xs text-muted-foreground">{t("nodes.audio.description")}</p>
        </div>
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t("config.textModel.model")}</span>
          <span className="text-xs font-medium text-foreground">{data.model || "openai/tts-1"}</span>
        </div>
        {data.voice && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("config.audio.voice")}</span>
            <span className="text-xs font-medium text-foreground">{data.voice}</span>
          </div>
        )}
        {status === "running" && (
          <div className="flex items-center gap-2 text-xs text-yellow-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
            {t("execution.running")}...
          </div>
        )}
      </div>

      {data.output && (
        <div className="border-t border-border bg-secondary/30 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t("nodes.textModel.output")}:</p>
          <div className="rounded bg-background p-2">
            <p className="text-xs text-foreground">
              {typeof data.output === "string" ? data.output : JSON.stringify(data.output, null, 2)}
            </p>
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="text" className="!bg-orange-500" />
      <Handle type="source" position={Position.Right} id="audio" className="!bg-orange-500" />
    </Card>
  )
}

export default memo(AudioNode)
