/**
 * file: app/api/workflows/route.ts
 * description: 工作流 CRUD API 路由 · 列表与创建接口
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [api],[workflow],[crud]
 *
 * brief: 工作流 CRUD API 路由，提供工作流列表与创建接口，支持归属隔离。
 *
 * details:
 * - GET：按用户 ID 列出工作流，需要登录认证
 * - POST：创建新工作流，校验请求体 schema
 * - 所有端点启用 requireUser 鉴权
 * - 错误统一通过 getErrorMessage 处理，避免敏感信息泄露
 *
 * dependencies: @/lib/api/require-user, @/lib/logger, @/lib/workflows/repository, @/lib/workflows/validation
 * exports: GET (dynamic), POST (create workflow)
 * notes: 工作流数据与用户归属隔离，防止跨租户数据泄露
 */

import { requireUser } from "@/lib/api/require-user"
import { createLogger, getErrorMessage } from "@/lib/logger"
import { createWorkflow, listWorkflows } from "@/lib/workflows/repository"
import { createWorkflowSchema } from "@/lib/workflows/validation"

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
