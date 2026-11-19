import { and, desc, eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { workflowVersions, workflows, type WorkflowGraph } from "@/lib/db/schema"

export type WorkflowRow = typeof workflows.$inferSelect

export type CreateWorkflowRecord = {
  ownerId: string
  name: string
  description?: string | null
  graph: WorkflowGraph
  isPublic?: boolean
}

export type UpdateWorkflowRecord = {
  name?: string
  description?: string | null
  graph?: WorkflowGraph
  isPublic?: boolean
}

export async function listWorkflows(ownerId: string): Promise<WorkflowRow[]> {
  return getDb()
    .select()
    .from(workflows)
    .where(eq(workflows.ownerId, ownerId))
    .orderBy(desc(workflows.updatedAt))
    .limit(100)
}

export async function getWorkflow(id: string, ownerId: string): Promise<WorkflowRow | null> {
  const [row] = await getDb()
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.ownerId, ownerId)))
    .limit(1)
  return row ?? null
}

export async function createWorkflow(input: CreateWorkflowRecord): Promise<WorkflowRow> {
  const db = getDb()
  const [row] = await db
    .insert(workflows)
    .values({
      ownerId: input.ownerId,
      name: input.name,
      description: input.description ?? null,
      graph: input.graph,
      isPublic: input.isPublic ?? false,
    })
    .returning()

  if (!row) throw new Error("Failed to create workflow")

  await db.insert(workflowVersions).values({
    workflowId: row.id,
    version: row.version,
    graph: row.graph,
    createdBy: input.ownerId,
  })

  return row
}

export async function updateWorkflow(
  id: string,
  ownerId: string,
  patch: UpdateWorkflowRecord,
): Promise<WorkflowRow | null> {
  const existing = await getWorkflow(id, ownerId)
  if (!existing) return null

  const nextVersion = patch.graph ? existing.version + 1 : existing.version
  const db = getDb()

  const [row] = await db
    .update(workflows)
    .set({
      name: patch.name ?? existing.name,
      description: patch.description !== undefined ? patch.description : existing.description,
      graph: patch.graph ?? existing.graph,
      isPublic: patch.isPublic ?? existing.isPublic,
      version: nextVersion,
      updatedAt: new Date(),
    })
    .where(and(eq(workflows.id, id), eq(workflows.ownerId, ownerId)))
    .returning()

  if (row && patch.graph) {
    await db.insert(workflowVersions).values({
      workflowId: row.id,
      version: nextVersion,
      graph: patch.graph,
      createdBy: ownerId,
    })
  }

  return row ?? null
}

export async function deleteWorkflow(id: string, ownerId: string): Promise<boolean> {
  const [row] = await getDb()
    .delete(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.ownerId, ownerId)))
    .returning({ id: workflows.id })
  return Boolean(row)
}
