import { requireUser } from "@/lib/api/require-user"
import { createLogger, getErrorMessage } from "@/lib/logger"
import { createWorkflow, listWorkflows } from "@/lib/workflows/repository"
import { createWorkflowSchema } from "@/lib/workflows/validation"

export const dynamic = "force-dynamic"

const log = createLogger("api-workflows")

export async function GET(req: Request) {
  const auth = await requireUser(req)
  if ("response" in auth) return auth.response

  try {
    const rows = await listWorkflows(auth.user.id)
    return Response.json({ workflows: rows })
  } catch (error) {
    log.error("list workflows failed", { error: getErrorMessage(error) })
    return Response.json({ error: "Failed to list workflows" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireUser(req)
  if ("response" in auth) return auth.response

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = createWorkflowSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid workflow payload", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const row = await createWorkflow({ ownerId: auth.user.id, ...parsed.data })
    return Response.json({ workflow: row }, { status: 201 })
  } catch (error) {
    log.error("create workflow failed", { error: getErrorMessage(error) })
    return Response.json({ error: "Failed to create workflow" }, { status: 500 })
  }
}
