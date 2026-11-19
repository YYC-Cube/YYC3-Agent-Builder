import { requireUser } from "@/lib/api/require-user"
import { createLogger, getErrorMessage } from "@/lib/logger"
import { deleteWorkflow, getWorkflow, updateWorkflow } from "@/lib/workflows/repository"
import { updateWorkflowSchema } from "@/lib/workflows/validation"

export const dynamic = "force-dynamic"

const log = createLogger("api-workflow")

type RouteContext = { params: Promise<{ id: string }> }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function resolveId(context: RouteContext): Promise<string | null> {
  const { id } = await context.params
  return UUID_PATTERN.test(id) ? id : null
}

export async function GET(req: Request, context: RouteContext) {
  const auth = await requireUser(req)
  if ("response" in auth) return auth.response

  const id = await resolveId(context)
  if (!id) return Response.json({ error: "Workflow not found" }, { status: 404 })

  try {
    const row = await getWorkflow(id, auth.user.id)
    if (!row) return Response.json({ error: "Workflow not found" }, { status: 404 })
    return Response.json({ workflow: row })
  } catch (error) {
    log.error("get workflow failed", { error: getErrorMessage(error), id })
    return Response.json({ error: "Failed to get workflow" }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireUser(req)
  if ("response" in auth) return auth.response

  const id = await resolveId(context)
  if (!id) return Response.json({ error: "Workflow not found" }, { status: 404 })

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = updateWorkflowSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid workflow payload", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const row = await updateWorkflow(id, auth.user.id, parsed.data)
    if (!row) return Response.json({ error: "Workflow not found" }, { status: 404 })
    return Response.json({ workflow: row })
  } catch (error) {
    log.error("update workflow failed", { error: getErrorMessage(error), id })
    return Response.json({ error: "Failed to update workflow" }, { status: 500 })
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const auth = await requireUser(req)
  if ("response" in auth) return auth.response

  const id = await resolveId(context)
  if (!id) return Response.json({ error: "Workflow not found" }, { status: 404 })

  try {
    const deleted = await deleteWorkflow(id, auth.user.id)
    if (!deleted) return Response.json({ error: "Workflow not found" }, { status: 404 })
    return new Response(null, { status: 204 })
  } catch (error) {
    log.error("delete workflow failed", { error: getErrorMessage(error), id })
    return Response.json({ error: "Failed to delete workflow" }, { status: 500 })
  }
}
