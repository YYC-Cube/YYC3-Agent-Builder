import { getTableColumns } from "drizzle-orm"
import {
  account,
  runEvents,
  runStatusEnum,
  runs,
  session,
  user,
  verification,
  workflowVersions,
  workflows,
} from "@/lib/db/schema"
import { describe, expect, it } from "vitest"

describe("数据库 Schema — Better Auth 兼容", () => {
  it("user 表包含 Better Auth 必需字段与唯一邮箱", () => {
    const columns = getTableColumns(user)
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining(["id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"]),
    )
    expect(columns.email.isUnique).toBe(true)
    expect(columns.id.primary).toBe(true)
  })

  it("session / account / verification 关键列与唯一约束存在", () => {
    expect(getTableColumns(session).token.isUnique).toBe(true)
    expect(getTableColumns(session).userId.notNull).toBe(true)
    expect(getTableColumns(account).providerId.notNull).toBe(true)
    expect(getTableColumns(verification).identifier.notNull).toBe(true)
  })
})

describe("数据库 Schema — 工作流与运行记录", () => {
  it("workflows 使用 JSONB 图、版本与公开标记", () => {
    const columns = getTableColumns(workflows)
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining(["id", "ownerId", "name", "graph", "version", "isPublic", "createdAt", "updatedAt"]),
    )
    expect(columns.graph.notNull).toBe(true)
    expect(columns.version.notNull).toBe(true)
  })

  it("runs 使用 run_status 枚举并保留用量/成本", () => {
    expect(runStatusEnum.enumValues).toEqual(["queued", "running", "succeeded", "failed", "cancelled"])
    const columns = getTableColumns(runs)
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining(["id", "workflowId", "userId", "status", "startedAt", "finishedAt", "tokenUsage", "costUsd"]),
    )
  })

  it("run_events 以 (run_id, seq) 唯一约束保证事件有序", () => {
    const columns = getTableColumns(runEvents)
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining(["id", "runId", "seq", "nodeId", "type", "payload", "createdAt"]),
    )
    expect(columns.seq.notNull).toBe(true)
  })

  it("workflow_versions 保留版本号与作者", () => {
    const columns = getTableColumns(workflowVersions)
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining(["id", "workflowId", "version", "graph", "createdBy", "createdAt"]),
    )
  })
})
