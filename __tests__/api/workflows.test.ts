/**
 * file: __tests__/api/workflows.test.ts
 * description: 工作流 CRUD API 测试 · 列表/创建/获取/更新/删除验证
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [test],[api],[workflow],[crud]
 *
 * brief: 工作流 CRUD API 测试，验证工作流列表、创建、获取、更新、删除功能。
 *
 * details:
 * - 验证 GET /api/workflows 列表
 * - 验证 POST /api/workflows 创建
 * - 验证 GET/PATCH/DELETE /api/workflows/[id] 单条操作
 * - 验证 requireUser 鉴权
 *
 * dependencies: @/app/api/workflows/route, @/app/api/workflows/[id]/route, @/lib/auth, @/lib/workflows/repository, vitest
 * exports: 测试用例集
 * notes: 工作流数据与用户归属隔离
 */

import { GET as GET_ONE, PATCH, DELETE } from "@/app/api/workflows/[id]/route"
import { GET, POST } from "@/app/api/workflows/route"
import { getRequestUser } from "@/lib/auth"
import * as repo from "@/lib/workflows/repository"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth", () => ({ getRequestUser: vi.fn(async () => null) }))
vi.mock("@/lib/workflows/repository", () => ({
  listWorkflows: vi.fn(),
  getWorkflow: vi.fn(),
  createWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
}))

const VALID_ID = "11111111-1111-4111-8111-111111111111"

function request(method: string, body?: unknown): Request {
  return new Request(`http://localhost/api/workflows/${VALID_ID}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function context(id = VALID_ID) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getRequestUser).mockReset().mockResolvedValue(null)
  vi.mocked(repo.listWorkflows).mockReset()
  vi.mocked(repo.getWorkflow).mockReset()
  vi.mocked(repo.createWorkflow).mockReset()
  vi.mocked(repo.updateWorkflow).mockReset()
  vi.mocked(repo.deleteWorkflow).mockReset()
})

describe("工作流 CRUD — 鉴权", () => {
  it("未登录时 GET/POST 返回 401", async () => {
    expect((await GET(request("GET"))).status).toBe(401)
    expect((await POST(request("POST", { name: "x", graph: { nodes: [], edges: [] } }))).status).toBe(401)
  })

  it("未登录时单条 GET/PATCH/DELETE 返回 401", async () => {
    expect((await GET_ONE(request("GET"), context())).status).toBe(401)
    expect((await PATCH(request("PATCH", { name: "x" }), context())).status).toBe(401)
    expect((await DELETE(request("DELETE"), context())).status).toBe(401)
  })
})

describe("工作流 CRUD — 列表与创建", () => {
  beforeEach(() => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: "user-1", email: "u@example.com", name: "U" })
  })

  it("GET 只按当前用户查询", async () => {
    vi.mocked(repo.listWorkflows).mockResolvedValue([])
    const response = await GET(request("GET"))
    expect(response.status).toBe(200)
    expect(repo.listWorkflows).toHaveBeenCalledWith("user-1")
  })

  it("POST 校验失败返回 400", async () => {
    const response = await POST(request("POST", { name: "", graph: { nodes: [], edges: [] } }))
    expect(response.status).toBe(400)
    expect(repo.createWorkflow).not.toHaveBeenCalled()
  })

  it("POST 合法请求创建并返回 201，ownerId 来自会话", async () => {
    vi.mocked(repo.createWorkflow).mockResolvedValue({ id: VALID_ID } as never)
    const response = await POST(
      request("POST", { name: "Demo", graph: { nodes: [], edges: [] }, isPublic: false }),
    )
    expect(response.status).toBe(201)
    expect(repo.createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "user-1", name: "Demo" }),
    )
  })
})

describe("工作流 CRUD — 单条操作", () => {
  beforeEach(() => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: "user-1", email: "u@example.com", name: "U" })
  })

  it("非法 UUID 返回 404 且不查询数据库", async () => {
    const response = await GET_ONE(request("GET"), context("not-a-uuid"))
    expect(response.status).toBe(404)
    expect(repo.getWorkflow).not.toHaveBeenCalled()
  })

  it("不属于当前用户/不存在时返回 404", async () => {
    vi.mocked(repo.getWorkflow).mockResolvedValue(null)
    vi.mocked(repo.updateWorkflow).mockResolvedValue(null)
    vi.mocked(repo.deleteWorkflow).mockResolvedValue(false)

    expect((await GET_ONE(request("GET"), context())).status).toBe(404)
    expect((await PATCH(request("PATCH", { name: "x" }), context())).status).toBe(404)
    expect((await DELETE(request("DELETE"), context())).status).toBe(404)
  })

  it("PATCH 成功返回更新后的工作流", async () => {
    vi.mocked(repo.updateWorkflow).mockResolvedValue({ id: VALID_ID, name: "Renamed" } as never)
    const response = await PATCH(request("PATCH", { name: "Renamed" }), context())
    expect(response.status).toBe(200)
    expect(repo.updateWorkflow).toHaveBeenCalledWith(VALID_ID, "user-1", { name: "Renamed" })
  })

  it("PATCH 空对象返回 400", async () => {
    expect((await PATCH(request("PATCH", {}), context())).status).toBe(400)
  })

  it("DELETE 成功返回 204", async () => {
    vi.mocked(repo.deleteWorkflow).mockResolvedValue(true)
    const response = await DELETE(request("DELETE"), context())
    expect(response.status).toBe(204)
    expect(repo.deleteWorkflow).toHaveBeenCalledWith(VALID_ID, "user-1")
  })
})
