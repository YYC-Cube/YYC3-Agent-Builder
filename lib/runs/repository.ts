import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { runEvents, runs } from "@/lib/db/schema"
import type { StreamUpdate } from "@/lib/workflow-engine"

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled"

/** 单个媒体字段入库前的最大字节数，超过则替换为对象存储引用占位，避免 base64 膨胀 DB */
const MAX_MEDIA_BYTES = 4_096

const DATA_URL_RE = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i

/**
 * 递归截断 payload 中的媒体 base64 内容。
 * 对形如 `data:image/png;base64,...` 的字符串，若超出阈值则替换为
 * `{ $mediaRef: true, mimeType, originalSize, truncated: true }`，仅保留引用元数据，
 * 真实媒体应上传至对象存储，此处只存引用。
 */
function truncateMediaPayload(value: unknown): unknown {
  if (typeof value === "string") {
    const match = value.match(DATA_URL_RE)
    if (match && Buffer.byteLength(value, "utf8") > MAX_MEDIA_BYTES) {
      return {
        $mediaRef: true,
        mimeType: match[1],
        originalSize: Buffer.byteLength(value, "utf8"),
        truncated: true,
      }
    }
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => truncateMediaPayload(item))
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = truncateMediaPayload(val)
    }
    return result
  }
  return value
}

export async function createRun(input: { workflowId: string; userId: string }): Promise<string | null> {
  const [row] = await getDb()
    .insert(runs)
    .values({
      workflowId: input.workflowId,
      userId: input.userId,
      status: "running",
    })
    .returning({ id: runs.id })
  return row?.id ?? null
}

export async function appendRunEvent(runId: string, seq: number, event: StreamUpdate): Promise<void> {
  await getDb()
    .insert(runEvents)
    .values({
      runId,
      seq,
      nodeId: event.nodeId ?? null,
      type: event.type,
      payload: truncateMediaPayload(event) as unknown as Record<string, unknown>,
    })
}

export async function finishRun(
  runId: string,
  status: Exclude<RunStatus, "queued" | "running">,
  error?: string,
): Promise<void> {
  await getDb()
    .update(runs)
    .set({
      status,
      finishedAt: new Date(),
      error: error ?? null,
    })
    .where(eq(runs.id, runId))
}
