import { POST } from "@/app/api/execute-workflow/route"
import { resetRateLimitState } from "@/lib/api-guard"
import { getRequestUser } from "@/lib/auth"
import { appendRunEvent, createRun, finishRun } from "@/lib/runs/repository"
import { getWorkflow } from "@/lib/workflows/repository"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("ai", () => ({
  generateText: vi.fn(async () => ({ text: "mock-ai-text", output: { mock: true }, usage: {}, files: [] })),
  generateImage: vi.fn(async () => ({
    image: { base64: "aW1hZ2U=" },
    images: [{ base64: "aW1hZ2U=" }],
    warnings: [],
    usage: { images: 1 },
  })),
  generateSpeech: vi.fn(async () => ({ audio: { base64: "YXVkaW8=", mediaType: "audio/mpeg" } })),
  embed: vi.fn(async () => ({ embedding: [0.1, 0.2, 0.3], usage: { tokens: 3 } })),
  jsonSchema: vi.fn((schema: unknown) => ({ jsonSchema: schema })),
  Output: {
    object: vi.fn((options: unknown) => ({ kind: "object", options })),
    array: vi.fn((options: unknown) => ({ kind: "array", options })),
  },
}))
vi.mock("@ai-sdk/google", () => {
  const image = vi.fn(() => ({}))
  return { google: Object.assign(vi.fn(() => ({})), { image }), googleImage: image }
})
vi.mock("@ai-sdk/openai", () => ({
  openai: {
    image: vi.fn(() => ({})),
    speech: vi.fn(() => ({})),
    embedding: vi.fn(() => ({})),
  },
}))
vi.mock("@/lib/model-resolver", () => ({ resolveModel: vi.fn(() => ({})) }))
vi.mock("@/lib/auth", () => ({ getRequestUser: vi.fn(async () => null) }))
vi.mock("@/lib/workflows/repository", () => ({ getWorkflow: vi.fn() }))
vi.mock("@/lib/runs/repository", () => ({
  createRun: vi.fn(),
  appendRunEvent: vi.fn(),
  finishRun: vi.fn(),
}))
vi.mock("node:dns/promises", () => {
  const lookupMock = vi.fn(async () => [{ address: "8.8.8.8", family: 4 }])
  return { default: { lookup: lookupMock }, lookup: lookupMock }
})

type TestNode = { id: string; type: string; data?: Record<string, unknown>; position?: { x: number; y: number } }
type TestEdge = { id: string; source: string; target: string; sourceHandle?: string }
type StreamEvent = {
  type: string
  nodeId?: string
  output?: unknown
  error?: string
  executionLog?: Array<{ nodeId: string; type: string; output: unknown; error?: string }>
}

function node(id: string, type: string, data: Record<string, unknown> = {}, x = 0): TestNode {
  return { id, type, data, position: { x, y: 0 } }
}

function edge(id: string, source: string, target: string, sourceHandle?: string): TestEdge {
  return sourceHandle ? { id, source, target, sourceHandle } : { id, source, target }
}

function makeRequest(payload: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3146/api/execute-workflow", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  })
}

async function collect(response: Response): Promise<StreamEvent[]> {
  const text = await response.text()
  return text.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as StreamEvent)
}

function completeEvent(events: StreamEvent[]): StreamEvent | undefined {
  return events.find((event) => event.type === "complete")
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getRequestUser).mockReset().mockResolvedValue(null)
  vi.mocked(getWorkflow).mockReset()
  vi.mocked(createRun).mockReset().mockResolvedValue(null)
  vi.mocked(appendRunEvent).mockReset().mockResolvedValue(undefined)
  vi.mocked(finishRun).mockReset().mockResolvedValue(undefined)
  vi.unstubAllEnvs()
  vi.stubEnv("LOG_LEVEL", "silent")
  vi.stubEnv("WORKFLOW_RATE_LIMIT_MAX", "1000")
  delete process.env.WORKFLOW_API_TOKEN
  resetRateLimitState()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  resetRateLimitState()
  delete process.env.WORKFLOW_API_TOKEN
})

describe("POST /api/execute-workflow — 正向链路", () => {
  it("start → prompt → javascript(return) → end 全链路透传（P0 回归）", async () => {
    const response = await POST(
      makeRequest({
        nodes: [
          node("n1", "start", {}, 0),
          node("n2", "prompt", { content: "Hello $input1" }, 1),
          node("n3", "javascript", { code: "return input1.toUpperCase()" }, 2),
          node("n4", "end", {}, 3),
        ],
        edges: [edge("e1", "n1", "n2"), edge("e2", "n2", "n3"), edge("e3", "n3", "n4")],
      }),
    )
    expect(response.status).toBe(200)
    const events = await collect(response)
    const jsComplete = events.find((event) => event.type === "node_complete" && event.nodeId === "n3")
    expect(jsComplete?.output).toBe("HELLO WORKFLOW STARTED")
    const endLog = completeEvent(events)?.executionLog?.find((item) => item.nodeId === "n4")
    expect(endLog?.output).toEqual({ finalOutput: "HELLO WORKFLOW STARTED" })
  })

  it("javascript 节点尾表达式写法仍兼容", async () => {
    const events = await collect(
      await POST(
        makeRequest({
          nodes: [node("n1", "start"), node("n2", "javascript", { code: "input1 + ' ok'" }, 1)],
          edges: [edge("e1", "n1", "n2")],
        }),
      ),
    )
    expect(events.find((event) => event.type === "node_complete" && event.nodeId === "n2")?.output).toBe(
      "Workflow started ok",
    )
  })

  it("变量插值不会把上游的 $& 当成替换模式（P2 回归）", async () => {
    const events = await collect(
      await POST(
        makeRequest({
          nodes: [
            node("n1", "start"),
            node("n2", "javascript", { code: 'return "A$&B"' }, 1),
            node("n3", "prompt", { content: "X $input1 Y" }, 2),
            node("n4", "end", {}, 3),
          ],
          edges: [edge("e1", "n1", "n2"), edge("e2", "n2", "n3"), edge("e3", "n3", "n4")],
        }),
      ),
    )
    const endLog = completeEvent(events)?.executionLog?.find((item) => item.nodeId === "n4")
    expect(endLog?.output).toEqual({ finalOutput: "X A$&B Y" })
  })

  it("imageGeneration 返回 data URL（AI SDK 7 generateImage）", async () => {
    const events = await collect(
      await POST(
        makeRequest({
          nodes: [
            node("n1", "start"),
            node("n2", "imageGeneration", { model: "gemini-2.5-flash-image", aspectRatio: "16:9" }, 1),
          ],
          edges: [edge("e1", "n1", "n2")],
        }),
      ),
    )
    const output = events.find((event) => event.type === "node_complete" && event.nodeId === "n2")?.output
    expect(output).toBe("data:image/png;base64,aW1hZ2U=")
    const log = completeEvent(events)?.executionLog?.find((item) => item.nodeId === "n2")?.output as {
      images: string[]
      aspectRatio: string
    }
    expect(log.images).toHaveLength(1)
    expect(log.aspectRatio).toBe("16:9")
  })

  it("audio 返回 audio/mpeg data URL（AI SDK 7 generateSpeech）", async () => {
    const events = await collect(
      await POST(
        makeRequest({
          nodes: [node("n1", "start"), node("n2", "audio", { model: "openai/tts-1", voice: "nova" }, 1)],
          edges: [edge("e1", "n1", "n2")],
        }),
      ),
    )
    const output = events.find((event) => event.type === "node_complete" && event.nodeId === "n2")?.output as {
      audioUrl: string
      model: string
      voice: string
    }
    expect(output.audioUrl.startsWith("data:audio/mpeg;base64,")).toBe(true)
    expect(output).toMatchObject({ model: "tts-1", voice: "nova" })
  })

  it("embeddingModel 返回向量与维度（AI SDK 7 embed）", async () => {
    const events = await collect(
      await POST(
        makeRequest({
          nodes: [
            node("n1", "start"),
            node("n2", "embeddingModel", { model: "openai/text-embedding-3-small" }, 1),
          ],
          edges: [edge("e1", "n1", "n2")],
        }),
      ),
    )
    const output = events.find((event) => event.type === "node_complete" && event.nodeId === "n2")?.output as {
      embedding: number[]
      dimensions: number
    }
    expect(output.embedding).toEqual([0.1, 0.2, 0.3])
    expect(output.dimensions).toBe(3)
  })

  it("structuredOutput 使用 Output.object 输出结构化结果", async () => {
    const schema = JSON.stringify({ type: "object", properties: { name: { type: "string" } } })
    const events = await collect(
      await POST(
        makeRequest({
          nodes: [
            node("n1", "start"),
            node("n2", "structuredOutput", { schema, schemaName: "Profile", mode: "object" }, 1),
          ],
          edges: [edge("e1", "n1", "n2")],
        }),
      ),
    )
    const log = completeEvent(events)?.executionLog?.find((item) => item.nodeId === "n2")?.output as {
      data: unknown
      schemaName: string
      mode: string
    }
    expect(log.data).toEqual({ mock: true })
    expect(log).toMatchObject({ schemaName: "Profile", mode: "object" })
  })

  it("structuredOutput 非法 schema JSON 与缺失 prompt 均给出明确错误", async () => {
    const invalidSchema = await collect(
      await POST(
        makeRequest({
          nodes: [node("n1", "structuredOutput", { schema: "{oops", prompt: "hi" })],
          edges: [],
        }),
      ),
    )
    expect(invalidSchema.find((event) => event.type === "error")?.error).toContain("not valid JSON")

    const missingPrompt = await collect(
      await POST(
        makeRequest({
          nodes: [node("n1", "structuredOutput", { schema: '{"type":"object"}' })],
          edges: [],
        }),
      ),
    )
    expect(missingPrompt.find((event) => event.type === "error")?.error).toContain("requires a prompt")
  })

  it("imageGeneration 缺少 prompt 时给出明确错误", async () => {
    const events = await collect(
      await POST(makeRequest({ nodes: [node("n1", "imageGeneration", {})], edges: [] })),
    )
    expect(events.find((event) => event.type === "error")?.error).toContain("requires a prompt")
  })
})

describe("POST /api/execute-workflow — 条件分支（P0 核心修复）", () => {
  const branchWorkflow = (condition: string) => ({
    nodes: [
      node("n1", "start", {}, 0),
      node("n2", "conditional", { condition }, 1),
      node("n3", "prompt", { content: "TRUE" }, 2),
      node("n4", "prompt", { content: "FALSE" }, 3),
      node("n5", "end", {}, 4),
    ],
    edges: [
      edge("e1", "n1", "n2"),
      edge("e2", "n2", "n3", "true"),
      edge("e3", "n2", "n4", "false"),
      edge("e4", "n3", "n5"),
      edge("e5", "n4", "n5"),
    ],
  })

  it("条件为 TRUE 时只走 true 分支", async () => {
    const events = await collect(await POST(makeRequest(branchWorkflow("input1.length > 5"))))
    expect(completeEvent(events)).toBeDefined()
    expect(events.some((event) => event.type === "error")).toBe(false)
    expect(events.some((event) => event.type === "node_complete" && event.nodeId === "n3")).toBe(true)
    expect(events.some((event) => event.type === "node_complete" && event.nodeId === "n4")).toBe(false)
    const endLog = completeEvent(events)?.executionLog?.find((item) => item.nodeId === "n5")
    expect(endLog?.output).toEqual({ finalOutput: "TRUE" })
  })

  it("条件为 FALSE 时只走 false 分支", async () => {
    const events = await collect(await POST(makeRequest(branchWorkflow("input1.length > 100"))))
    expect(events.some((event) => event.type === "error")).toBe(false)
    expect(events.some((event) => event.type === "node_complete" && event.nodeId === "n4")).toBe(true)
    expect(events.some((event) => event.type === "node_complete" && event.nodeId === "n3")).toBe(false)
  })
})

describe("POST /api/execute-workflow — 安全与健壮性", () => {
  it("未携带令牌返回 401，携带令牌可正常执行（P0 回归）", async () => {
    vi.stubEnv("WORKFLOW_API_TOKEN", "test-secret")
    const workflow = { nodes: [node("n1", "start")], edges: [] }
    const rejected = await POST(makeRequest(workflow))
    expect(rejected.status).toBe(401)
    expect((await rejected.json()) as { error: string }).toMatchObject({ error: expect.stringContaining("Unauthorized") })

    const accepted = await POST(makeRequest(workflow, { "x-workflow-token": "test-secret" }))
    expect(accepted.status).toBe(200)
    expect(completeEvent(await collect(accepted))).toBeDefined()
  })

  it("超出限流返回 429 与 Retry-After（P0 回归）", async () => {
    vi.stubEnv("WORKFLOW_RATE_LIMIT_MAX", "1")
    const workflow = { nodes: [node("n1", "start")], edges: [] }
    await POST(makeRequest(workflow))
    const limited = await POST(makeRequest(workflow))
    expect(limited.status).toBe(429)
    expect(limited.headers.get("Retry-After")).toBeTruthy()
  })

  it("非法 JSON / 结构错误返回 400", async () => {
    expect((await POST(makeRequest("{not-json"))).status).toBe(400)
    expect((await POST(makeRequest({ nodes: [], edges: "bad" }))).status).toBe(400)
  })

  it("超过节点数上限返回 413", async () => {
    const nodes = Array.from({ length: 201 }, (_, index) => node(`n${index}`, "start"))
    expect((await POST(makeRequest({ nodes, edges: [] }))).status).toBe(413)
  })

  it("云元数据地址被 SSRF 网关拒绝（P1 回归）", async () => {
    const events = await collect(
      await POST(
        makeRequest({
          nodes: [node("n1", "httpRequest", { url: "http://169.254.169.254/latest/meta-data/", method: "GET" })],
          edges: [],
        }),
      ),
    )
    const errorEvent = events.find((event) => event.type === "error")
    expect(errorEvent?.error).toContain("SSRF protection")
  })

  it("HTTP 节点拒绝非法方法", async () => {
    const events = await collect(
      await POST(
        makeRequest({
          nodes: [node("n1", "httpRequest", { url: "https://api.example.com/", method: "TRACE" })],
          edges: [],
        }),
      ),
    )
    expect(events.find((event) => event.type === "error")?.error).toContain("unsupported method")
  })

  it("环图触发深度保护而不是无限递归（P1 回归）", async () => {
    const events = await collect(
      await POST(
        makeRequest({
          nodes: [node("n0", "start", {}, 0), node("a", "prompt", { content: "A" }, 1), node("b", "prompt", { content: "B" }, 2)],
          edges: [edge("e0", "n0", "a"), edge("e1", "a", "b"), edge("e2", "b", "a")],
        }),
      ),
    )
    expect(events.find((event) => event.type === "error")?.error).toContain("maximum execution depth")
  })
})

describe("POST /api/execute-workflow — 运行记录落库（阶段 B）", () => {
  const WORKFLOW_ID = "22222222-2222-4222-8222-222222222222"

  const workflowPayload = {
    workflowId: WORKFLOW_ID,
    nodes: [node("n1", "start")],
    edges: [],
  }

  it("登录用户绑定 workflowId 时创建 run、写事件并标记成功", async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: "u1", email: "u@example.com", name: "U" })
    vi.mocked(getWorkflow).mockResolvedValue({ id: WORKFLOW_ID } as never)
    vi.mocked(createRun).mockResolvedValue("run-1")
    vi.mocked(appendRunEvent).mockResolvedValue(undefined)
    vi.mocked(finishRun).mockResolvedValue(undefined)

    const events = await collect(await POST(makeRequest(workflowPayload)))

    expect(createRun).toHaveBeenCalledWith({ workflowId: WORKFLOW_ID, userId: "u1" })
    expect(appendRunEvent).toHaveBeenCalled()
    expect(vi.mocked(appendRunEvent).mock.calls[0]?.[0]).toBe("run-1")
    expect(vi.mocked(appendRunEvent).mock.calls[0]?.[1]).toBe(1)
    expect(finishRun).toHaveBeenCalledWith("run-1", "succeeded")
    expect(completeEvent(events)).toBeDefined()
  })

  it("绑定 workflowId 但未登录返回 401", async () => {
    const response = await POST(makeRequest(workflowPayload))
    expect(response.status).toBe(401)
    expect(createRun).not.toHaveBeenCalled()
  })

  it("工作流不属于当前用户返回 404", async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: "u2", email: "u2@example.com", name: "U2" })
    vi.mocked(getWorkflow).mockResolvedValue(null)
    const response = await POST(makeRequest(workflowPayload))
    expect(response.status).toBe(404)
    expect(createRun).not.toHaveBeenCalled()
  })

  it("运行记录写入失败不影响执行结果", async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: "u1", email: "u@example.com", name: "U" })
    vi.mocked(getWorkflow).mockResolvedValue({ id: WORKFLOW_ID } as never)
    vi.mocked(createRun).mockRejectedValue(new Error("db down"))

    const events = await collect(await POST(makeRequest(workflowPayload)))
    expect(completeEvent(events)).toBeDefined()
    expect(finishRun).not.toHaveBeenCalled()
  })
})
