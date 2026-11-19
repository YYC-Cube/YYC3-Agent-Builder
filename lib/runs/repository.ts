import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { runEvents, runs } from "@/lib/db/schema"
import type { StreamUpdate } from "@/lib/workflow-engine"

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled"

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
      payload: event as unknown as Record<string, unknown>,
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
