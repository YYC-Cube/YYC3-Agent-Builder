# YYC³ 改进路线图与实施计划

> **项目名称**：YYC³ Agent Builder — Visual AI Workflow Builder
> **制定日期**：2026-07-21
> **目标定位**：五高架构达标 · 五标准体系落地 · 五转型目标实现
> **规划周期**：短期（1 周）→ 中期（1 月）→ 长期（3 月）

---

## 一、改进路线图总览

```
时间轴 ──────────────────────────────────────────────────────────────▶

 ▼ 第一阶段：紧急修复          ▼ 第二阶段：功能完善       ▼ 第三阶段：架构升级
   Week 1 (P0)                  Week 2-4 (P1)             Month 2-3 (P2/P3)

 ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 │  基础设施修复     │     │  安全与功能       │     │  工程化与优化     │
 │                  │     │                  │     │                  │
 │  • Git 初始化    │────▶│  • SSRF 精准     │────▶│  • CI/CD 流水线  │
 │  • Public 重命名 │     │  • 沙箱加固      │     │  • E2E 测试      │
 │  • ESLint 修复   │     │  • 节点面板补全  │     │  • 状态管理重构  │
 │  • AI SDK 修复   │     │  • 输入验证      │     │  • 组件抽取      │
 │  • 超时修复      │     │  • 占位节点实现  │     │  • 监控接入      │
 └──────────────────┘     └──────────────────┘     └──────────────────┘
        │                          │                        │
        ▼                          ▼                        ▼
   上线就绪 60% → 80%         上线就绪 80% → 90%       上线就绪 90% → 95%+
```

---

## 二、短期改进项（Week 1 · P0 紧急修复）

### 2.1 Day 1：基础设施修复（解除所有阻塞）

#### 任务 S-01 · Git 仓库初始化

| 属性 | 详情 |
|------|------|
| **预估** | 30 分钟 |
| **依赖** | 无 |
| **阻塞** | 所有后续工作 |

**实施步骤**：

```bash
# 1. 初始化 Git
cd "/Users/yanyu/YYC-Cube/YYC3 Agent Builder — Visual AI Workflow Builder"
git init

# 2. 配置 .gitignore（已有，需确认 coverage 路径）
# 修改 .gitignore：将 coverage/ 改为 __tests__/coverage/

# 3. 首次提交
git add -A
git commit -m "feat: initial commit — YYC³ Agent Builder v0.1.0

- Next.js 16 + React 19 + React Flow 可视化 AI 工作流编排
- 12 种节点类型，10 语言国际化，SSE 流式执行
- 135 测试用例全部通过，TypeScript strict 零错误"

# 4. 创建远程仓库并推送
# (需用户在 GitHub 创建仓库后执行)
git remote add origin <repository-url>
git branch -M main
git push -u origin main
```

**验收标准**：
- [ ] `git log --oneline` 显示初始提交
- [ ] `git status` 显示 clean
- [ ] `.gitignore` 包含 `__tests__/coverage/`

---

#### 任务 S-02 · `Public/` 重命名为 `public/`

| 属性 | 详情 |
|------|------|
| **预估** | 15 分钟 |
| **依赖** | S-01（Git 初始化后用 git mv 保留历史） |

**实施步骤**：

```bash
# macOS 大小写不敏感，需要两步重命名
git mv Public Public_temp
git mv Public_temp public

# 验证
ls -la public/locales/en/common.json  # 应存在

git commit -m "fix: rename Public/ to public/ for Linux/Vercel compatibility"
```

**同步修改**：
- 删除根目录重复的 `locales/`（仅保留 `public/locales/`）
- 更新 `.gitignore`：添加 `.DS_Store`（已有）

---

#### 任务 S-03 · ESLint 配置修复

| 属性 | 详情 |
|------|------|
| **预估** | 5 分钟 |
| **依赖** | 无 |

**实施步骤**：

修改 [eslint.config.mjs](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/eslint.config.mjs)：

```javascript
// 修改前
{
  ignores: ["coverage/**"],
}

// 修改后
{
  ignores: [
    "coverage/**",
    "__tests__/coverage/**",
    ".next/**",
    "node_modules/**"
  ],
}
```

**验收标准**：
- [ ] `pnpm lint` 退出码 0
- [ ] 无 warning 输出

---

#### 任务 S-04 · `pnpm-workspace.yaml` 配置补全

| 属性 | 详情 |
|------|------|
| **预估** | 2 分钟 |

```yaml
# pnpm-workspace.yaml
onlyBuiltDependencies:
  - sharp
  - unrs-resolver
```

---

### 2.2 Day 2-3：核心功能修复

#### 任务 S-05 · AI SDK 模型调用修复

| 属性 | 详情 |
|------|------|
| **预估** | 2 小时 |
| **依赖** | 安装 `@ai-sdk/openai`、`@ai-sdk/anthropic` |

**实施步骤**：

**Step 1**：安装缺失的 AI SDK provider

```bash
pnpm add @ai-sdk/openai @ai-sdk/anthropic
```

**Step 2**：创建模型解析器 `lib/model-resolver.ts`

```typescript
import { google } from "@ai-sdk/google"
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import type { LanguageModel } from "ai"

/**
 * 将 "provider/model" 格式的模型 ID 解析为 AI SDK 模型对象
 * @example resolveModel("openai/gpt-5") → openai("gpt-5")
 */
export function resolveModel(modelId: string): LanguageModel {
  const [provider, ...modelParts] = modelId.split("/")
  const modelName = modelParts.join("/")

  if (!modelName) {
    throw new Error(`Invalid model ID format: ${modelId}`)
  }

  switch (provider) {
    case "openai":
      return openai(modelName)
    case "google":
    case "gemini":
      return google(modelName)
    case "anthropic":
    case "claude":
      return anthropic(modelName)
    default:
      throw new Error(`Unsupported AI provider: ${provider}`)
  }
}
```

**Step 3**：修改 [route.ts](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/app/api/execute-workflow/route.ts)

```typescript
// 修改前（第 232 行）
model: String(node.data.model || "openai/gpt-5") as any,

// 修改后
model: resolveModel(String(node.data.model || "openai/gpt-5")),
```

同样修复 embedding 节点（使用 `openai.embedding()`）。

**验收标准**：
- [ ] textModel 节点能成功调用 LLM
- [ ] 无 `as any` 类型断言
- [ ] 支持至少 3 个 provider（openai/google/anthropic）

---

#### 任务 S-06 · `safeExecute` 超时修复

| 属性 | 详情 |
|------|------|
| **预估** | 3 小时 |
| **依赖** | 无 |

**实施方案**（使用 worker_threads）：

创建 `lib/safe-worker-executor.ts`：

```typescript
import { Worker, isMainThread, workerData, parentPort } from "worker_threads"
import path from "path"

const MAX_CODE_LENGTH = 5000
const MAX_EXECUTION_TIME_MS = 5000

const BLOCKED_PATTERNS = [
  /\b(process|require|import|eval|Function|global|globalThis|module|exports)\b/gi,
  // ... 保留原有黑名单
]

function validateUserCode(code: string): void {
  if (!code || code.trim().length === 0) throw new Error("Code cannot be empty")
  if (code.length > MAX_CODE_LENGTH) throw new Error("Code too long")
  for (const pattern of BLOCKED_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(code)) throw new Error("Forbidden pattern detected")
  }
}

export function safeExecuteAsync(
  code: string,
  inputs: unknown[],
  label: string,
  timeout = MAX_EXECUTION_TIME_MS
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    validateUserCode(code)

    const workerScript = `
      const { workerData, parentPort } = require('worker_threads')
      const inputs = workerData.inputs
      const code = workerData.code
      const input1 = inputs[0]
      const input2 = inputs[1]
      const input3 = inputs[2]
      const input4 = inputs[3]
      const input5 = inputs[4]
      try {
        const result = eval(code)
        parentPort.postMessage({ success: true, result })
      } catch (err) {
        parentPort.postMessage({ success: false, error: err.message })
      }
    `

    const worker = new Worker(workerScript, {
      eval: true,
      workerData: { code, inputs },
    })

    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error(`${label}: Execution timed out (${timeout}ms)`))
    }, timeout)

    worker.on("message", (msg: { success: boolean; result?: unknown; error?: string }) => {
      clearTimeout(timer)
      worker.terminate()
      if (msg.success) {
        resolve(msg.result)
      } else {
        reject(new Error(`${label}: ${msg.error}`))
      }
    })

    worker.on("error", (err) => {
      clearTimeout(timer)
      reject(new Error(`${label}: ${err.message}`))
    })
  })
}
```

**Step 2**：修改 route.ts 中的 `safeExecute` 调用为 `await safeExecuteAsync()`

**验收标准**：
- [ ] `for(;;){}` 变体在 5 秒后被终止
- [ ] 正常代码不受影响
- [ ] worker 线程正确释放

---

### 2.3 Day 4-5：测试与文档同步

#### 任务 S-07 · README 数据同步

更新 [README.md](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/README.md) "项目指标"表格：

| 指标 | 更新为 |
|------|--------|
| Next.js 版本 | 16.2.10 |
| 测试用例 | 135 passed |
| 测试文件 | 11 |
| 项目结构 | 更新 Public → public |

---

## 三、中期改进项（Week 2-4 · P1 功能完善）

### 3.1 Week 2：安全加固

#### 任务 M-01 · SSRF 防护精准化

```typescript
// lib/ssrf-guard.ts
import ipaddr from "ipaddr.js"

const PRIVATE_RANGES = [
  "10.0.0.0/8",
  "172.16.0.0/12",   // ← 精确范围，不是 172.*
  "192.168.0.0/16",
  "127.0.0.0/8",
  "169.254.0.0/16",  // Link-local
  "0.0.0.0/8",
]

export function validateUrl(urlStr: string): void {
  let parsed: URL
  try {
    parsed = new URL(urlStr)
  } catch {
    throw new Error(`Invalid URL: ${urlStr}`)
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Forbidden protocol: ${parsed.protocol}`)
  }

  const hostname = parsed.hostname

  // 检查是否为 IP 地址
  if (ipaddr.isValid(hostname)) {
    const addr = ipaddr.parse(hostname)
    if (addr.range() !== "unicast") {
      throw new Error(`SSRF protection: Private/reserved IP blocked`)
    }
  }

  // 检查 localhost 变体
  const blockedHosts = ["localhost", "0.0.0.0", "[::1]"]
  if (blockedHosts.includes(hostname)) {
    throw new Error(`SSRF protection: Blocked host`)
  }
}
```

---

#### 任务 M-02 · API 输入验证

```typescript
// 在 route.ts 中添加
import { z } from "zod"

const WorkflowSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string().max(100),
        type: z.string().max(50),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.record(z.unknown()).optional(),
      }),
    )
    .max(100, "Too many nodes (max 100)"),
  edges: z
    .array(
      z.object({
        id: z.string().max(100),
        source: z.string(),
        target: z.string(),
        sourceHandle: z.string().optional(),
      }),
    )
    .max(200, "Too many edges (max 200)"),
})

// 在 POST handler 中
const parseResult = WorkflowSchema.safeParse(await req.json())
if (!parseResult.success) {
  return Response.json(
    { error: "Invalid workflow", details: parseResult.error.flatten() },
    { status: 400 },
  )
}
const { nodes, edges } = parseResult.data
```

---

#### 任务 M-03 · 速率限制

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

```typescript
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 每分钟 10 次
  analytics: true,
})
```

在 route.ts 中使用：

```typescript
import { ratelimit } from "@/lib/ratelimit"

const ip = req.headers.get("x-forwarded-for") ?? "anonymous"
const { success } = await ratelimit.limit(ip)
if (!success) {
  return Response.json({ error: "Rate limit exceeded" }, { status: 429 })
}
```

---

### 3.2 Week 3：功能补全

#### 任务 M-04 · 节点面板补全 12 个节点

修改 [node-palette.tsx](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/components/node-palette.tsx)，添加缺失的两个节点：

```typescript
// 在 nodeTypeDefs 数组中添加
{ type: "audio", i18nKey: "nodes.audio", icon: <Mic className="h-4 w-4" />, color: "bg-orange-500" },
{ type: "structuredOutput", i18nKey: "nodes.structuredOutput", icon: <FileJson className="h-4 w-4" />, color: "bg-chart-3" },
```

同步修改 [node-registry.ts](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/lib/node-registry.ts) 的 `NODE_TYPES_LIST`：

```typescript
{ type: "audio", label: "Audio", color: "bg-orange-500", description: "Audio generation" },
{ type: "structuredOutput", label: "Structured Output", color: "bg-chart-3", description: "Structured JSON output" },
```

---

#### 任务 M-05 · 占位节点实现

**Audio 节点**（集成 OpenAI TTS）：

```typescript
// route.ts 中 audio case
case "audio": {
  const audioText = inputs.length > 0 ? String(inputs[0]) : ""
  const voice = String(node.data.voice || "alloy")
  const speed = Number(node.data.speed || 1.0)

  const audioResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: audioText,
      voice,
      speed,
      response_format: "mp3",
    }),
  })

  if (!audioResponse.ok) {
    throw new Error(`TTS API error: ${audioResponse.status}`)
  }

  const audioBuffer = await audioResponse.arrayBuffer()
  const base64Audio = Buffer.from(audioBuffer).toString("base64")
  output = {
    audioUrl: `data:audio/mp3;base64,${base64Audio}`,
    text: audioText,
  }
  break
}
```

**Embedding 节点**：

```typescript
case "embeddingModel": {
  const { embed } = await import("ai")
  const { openai } = await import("@ai-sdk/openai")
  const embInput = inputs.length > 0 ? String(inputs[0]) : ""

  const result = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: embInput,
  })

  output = {
    embedding: result.embedding,
    dimensions: result.embedding.length,
  }
  break
}
```

**Structured Output 节点**：

```typescript
case "structuredOutput": {
  const { generateObject } = await import("ai")
  const structInput = inputs.length > 0 ? String(inputs[0]) : ""

  // 解析用户定义的 schema
  const schemaName = String(node.data.schemaName || "Output")
  const result = await generateObject({
    model: resolveModel("openai/gpt-5-mini"),
    schema: z.object({
      // 基础 schema，可根据用户配置动态生成
      content: z.string(),
    }),
    prompt: structInput,
  })

  output = result.object
  break
}
```

---

#### 任务 M-06 · 代码生成器条件分支修复

重构 [code-generator.ts](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/lib/code-generator.ts) 的 conditional 处理：

```typescript
case "conditional": {
  // ... 生成条件变量 ...

  const outgoingEdges = edges.filter((e) => e.source === nodeId)
  const trueEdge = outgoingEdges.find((e) => e.sourceHandle === "true")
  const falseEdge = outgoingEdges.find((e) => e.sourceHandle === "false")

  if (trueEdge || falseEdge) {
    nodeCode += `${indent}if (${varName}) {\n`
    if (trueEdge) {
      // 递归生成 true 分支的节点代码
      nodeCode += generateNodeCode(trueEdge.target, indent + "  ")
    }
    nodeCode += `${indent}} else {\n`
    if (falseEdge) {
      // 递归生成 false 分支的节点代码
      nodeCode += generateNodeCode(falseEdge.target, indent + "  ")
    }
    nodeCode += `${indent}}\n\n`
  }
  break
}
```

---

### 3.3 Week 4：测试补全

#### 任务 M-07 · API 路由测试

创建 `__tests__/api/execute-workflow.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({ text: "Mocked text", usage: {} }),
  generateObject: vi.fn().mockResolvedValue({ object: { content: "Mocked" } }),
  embed: vi.fn().mockResolvedValue({ embedding: [0.1, 0.2] }),
}))

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => ({})),
}))

describe("/api/execute-workflow", () => {
  it("should reject invalid workflow payload", async () => {
    // 测试 zod 验证
  })

  it("should execute start → end workflow", async () => {
    // 测试最简工作流
  })

  it("should handle textModel node", async () => {
    // 测试 LLM 调用
  })

  it("should handle conditional branching", async () => {
    // 测试条件分支
  })

  it("should enforce rate limits", async () => {
    // 测试速率限制
  })

  it("should timeout on infinite loop", async () => {
    // 测试安全超时
  })
})
```

---

## 四、长期改进项（Month 2-3 · P2/P3 架构升级）

### 4.1 Month 2：工程化提升

#### 任务 L-01 · CI/CD 流水线搭建

创建 `.github/workflows/ci.yml`：

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: npx tsc --noEmit

  test:
    name: Test Suite
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: __tests__/coverage/

  build:
    name: Production Build
    runs-on: ubuntu-latest
    needs: [quality, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Upload build
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: .next/
```

---

#### 任务 L-02 · 组件架构重构

**Step 1**：抽取公共节点组件

```typescript
// components/nodes/shared/node-header.tsx
import type { LucideIcon } from "lucide-react"

interface NodeHeaderProps {
  icon: LucideIcon
  iconColor: string
  title: string
  subtitle?: string
  showSettings?: boolean
}

export function NodeHeader({ icon: Icon, iconColor, title, subtitle }: NodeHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${iconColor}`}>
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}
```

```typescript
// components/nodes/shared/node-output.tsx
interface NodeOutputProps {
  output: unknown
  label?: string
}

export function NodeOutput({ output, label = "Output" }: NodeOutputProps) {
  if (!output) return null
  return (
    <div className="border-t border-border bg-secondary/30 p-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}:</p>
      <div className="max-h-32 overflow-y-auto rounded bg-background p-2">
        <pre className="text-xs text-foreground whitespace-pre-wrap break-words">
          {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
        </pre>
      </div>
    </div>
  )
}
```

**Step 2**：重构各节点组件使用公共组件，每个节点文件从 ~70 行减少到 ~30 行。

---

#### 任务 L-03 · 状态管理优化

引入 zustand 管理工作流状态：

```typescript
// lib/stores/workflow-store.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Edge, Node } from "@xyflow/react"

interface WorkflowState {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (node: Node) => void
  updateNode: (id: string, data: Record<string, unknown>) => void
  selectNode: (id: string | null) => void
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
      updateNode: (id, data) =>
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, data } : n)),
        })),
      selectNode: (id) => set({ selectedNodeId: id }),
    }),
    {
      name: "yyc3-agent-builder-workflow",
      partialize: (state) => ({
        nodes: state.nodes.map((n) => ({
          ...n,
          data: { ...n.data, status: undefined, output: undefined },
        })),
        edges: state.edges,
      }),
    },
  ),
)
```

---

### 4.2 Month 3：质量保障

#### 任务 L-04 · E2E 测试（Playwright）

```typescript
// e2e/workflow.spec.ts
import { test, expect } from "@playwright/test"

test("complete workflow execution", async ({ page }) => {
  await page.goto("http://localhost:3146")

  // 添加节点
  await page.click('[data-testid="node-start"]')
  await page.click('[data-testid="node-textModel"]')
  await page.click('[data-testid="node-end"]')

  // 连接节点
  // ...

  // 执行工作流
  await page.click("button:has-text('Run Workflow')")

  // 验证执行结果
  await expect(page.locator("[data-node-status='completed']")).toHaveCount(3)
})
```

---

#### 任务 L-05 · 错误监控接入（Sentry）

```bash
pnpm add @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

---

## 五、实施甘特图

```
2026 年 7-8 月改进时间线
═══════════════════════════════════════════════════════════════

Week 1 (7/21-7/27)     Week 2 (7/28-8/3)    Week 3-4 (8/4-8/17)
─────────────────      ─────────────────     ─────────────────────
S-01 Git 初始化    ██   M-01 SSRF 修复   ██   M-04 节点补全     ████
S-02 Public 重命名 ██   M-02 输入验证    ██   M-05 占位实现     ████
S-03 ESLint 修复   ██   M-03 速率限制    ██   M-06 代码生成修复 ████
S-04 pnpm 配置     ██                          M-07 API 测试     ████
S-05 AI SDK 修复   ███
S-06 超时修复      ███
S-07 README 同步   ██

Month 2 (8/18-9/14)                Month 3 (9/15-10/12)
──────────────────────────         ──────────────────────────
L-01 CI/CD 流水线  ████████         L-04 E2E 测试       ██████
L-02 组件重构      ████████         L-05 Sentry 接入    ██████
L-03 状态管理      ████████         L-06 性能优化       ██████
```

---

## 六、资源需求估算

### 6.1 人力需求

| 阶段 | 角色 | 人天 | 说明 |
|------|------|------|------|
| 短期 | 全栈开发 | 5 人天 | P0 修复 |
| 中期 | 全栈开发 | 10 人天 | P1 修复 |
| 中期 | 安全顾问 | 2 人天 | 沙箱加固审查 |
| 长期 | 前端开发 | 8 人天 | 组件重构 |
| 长期 | 测试开发 | 5 人天 | E2E + API 测试 |
| 长期 | DevOps | 3 人天 | CI/CD + 监控 |
| **合计** | | **33 人天** | |

### 6.2 外部服务需求

| 服务 | 用途 | 预估费用 |
|------|------|----------|
| GitHub | 代码托管 | 免费 |
| Vercel | 部署托管 | Pro $20/月 |
| Upstash Redis | 速率限制 | Free tier 够用 |
| Sentry | 错误监控 | Developer $26/月 |
| OpenAI API | LLM 调用 | 按用量 |
| Google AI API | Gemini 模型 | 按用量 |

---

## 七、风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| AI SDK v6 API 变更 | 中 | 高 | 锁定版本，关注 changelog |
| Vercel 部署限制 | 低 | 中 | 配置 `maxDuration`，备选自托管 |
| worker_threads 兼容性 | 低 | 中 | 添加 fallback 到 vm2 |
| 测试覆盖率目标未达 | 中 | 低 | 优先 API 路由测试，组件测试后补 |
| i18n 翻译质量 | 中 | 中 | 使用 AI 辅助翻译 + 人工校验 |

---

## 八、验收标准

### 8.1 第一阶段验收（Week 1 结束）

- [ ] Git 仓库已初始化，至少 1 次提交
- [ ] `public/` 目录小写确认
- [ ] `pnpm lint` 退出码 0
- [ ] `pnpm test` 全部通过（135+）
- [ ] `npx tsc --noEmit` 0 错误
- [ ] textModel 节点能成功调用 LLM
- [ ] safeExecute 能在 5s 内终止死循环

### 8.2 第二阶段验收（Week 4 结束）

- [ ] SSRF 防护精准（172.16-31 拦截，其他放行）
- [ ] API 输入验证生效（畸形 payload 返回 400）
- [ ] 速率限制生效（超限返回 429）
- [ ] 节点面板显示 12 个节点
- [ ] audio/embedding/structuredOutput 节点功能可用
- [ ] 代码生成的条件分支正确嵌套
- [ ] API 路由测试覆盖率 > 80%

### 8.3 第三阶段验收（Month 3 结束）

- [ ] CI/CD 流水线自动化运行
- [ ] 组件重构后代码行数减少 30%+
- [ ] zustand 状态管理落地
- [ ] E2E 测试覆盖核心流程
- [ ] Sentry 错误监控上线
- [ ] 上线就绪度 ≥ 95%

---

## 九、持续改进机制

### 9.1 度量指标

| 指标 | 当前 | 目标 | 频率 |
|------|------|------|------|
| 测试用例数 | 135 | 200+ | 每周 |
| 测试覆盖率 | ~60% | 85%+ | 每周 |
| TypeScript 严格度 | strict | strict + noUncheckedIndexedAccess | 月度 |
| ESLint 规则数 | 基础 | strict + import + security | 月度 |
| 首次加载性能 | 未测 | < 3s LCP | 月度 |
| 上线就绪度 | 60% | 95%+ | 月度 |

### 9.2 回顾节奏

- **每日**：P0 问题修复进度同步
- **每周**：代码审查 + 测试覆盖率检查
- **每月**：架构回顾 + 技术债务评估
- **每季度**：五维评估全面审核

---

> **路线图声明**：本计划基于 2026-07-21 项目审核结果制定，所有任务均提供具体实施步骤和验收标准。建议按优先级顺序执行，确保每个阶段交付可验证的成果。

*— 智能应用实施专家 · 言启千行代码，语枢万物智能*
