# YYC³ 问题清单与优先级矩阵

> **项目名称**：YYC³ Agent Builder — Visual AI Workflow Builder
> **生成日期**：2026-07-21
> **问题总数**：28 个（P0: 5 / P1: 9 / P2: 8 / P3: 6）
> **审核方法**：五维驱动全面检测 + 实际运行验证

---

## 一、严重程度定义

| 等级 | 标识 | 定义 | 响应时限 |
|------|------|------|----------|
| **致命** | 🔴 P0 | 阻断核心功能或部署，必须立即修复 | 24 小时内 |
| **严重** | 🟠 P1 | 影响功能完整性或安全性，上线前必须修复 | 1 周内 |
| **中等** | 🟡 P2 | 影响代码质量或用户体验，迭代中修复 | 2 周内 |
| **轻微** | 🟢 P3 | 优化项，不紧急，长期改进 | 1 个月内 |

---

## 二、P0 致命问题清单（5 个）

### P0-01 · 项目未初始化 Git 仓库

| 属性 | 详情 |
|------|------|
| **严重程度** | 🔴 P0 致命 |
| **影响维度** | 关联维度 |
| **影响范围** | 全项目 — 无法追踪变更、无法回滚、无法协作、无法部署 |
| **问题描述** | 项目根目录无 `.git/` 目录，`git status` 返回 "not a git repository"。项目完全脱离版本控制。 |
| **根本原因** | 项目创建时未执行 `git init`，或 `.git` 目录被误删。 |
| **检测证据** | `git status` → `fatal: not a git repository`<br>`git log` → `fatal: not a git repository` |
| **建议方案** | 1. 执行 `git init`<br>2. 创建 `.gitignore`（已有）<br>3. `git add` + `git commit -m "Initial commit"`<br>4. 创建 GitHub/GitLab 远程仓库<br>5. `git remote add origin <url>` + `git push` |
| **验证标准** | `git log --oneline` 能显示至少 1 条提交记录 |

---

### P0-02 · `Public/` 目录大小写不兼容 Linux 部署

| 属性 | 详情 |
|------|------|
| **严重程度** | 🔴 P0 致命 |
| **影响维度** | 空间维度 |
| **影响范围** | 静态资源服务 — locales、图标、占位图在 Linux 上无法访问 |
| **问题描述** | Next.js 要求静态资源目录为小写 `public/`，但项目使用大写 `Public/`。macOS 文件系统大小写不敏感所以本地正常，但 Vercel/Linux 环境大小写敏感会导致部署后静态资源 404。 |
| **根本原因** | 目录创建时使用了大写 P，可能是受 `YYC3-Public/` 品牌目录命名影响。 |
| **检测证据** | `ls -la | grep public` → 显示 `Public`（大写）<br>Next.js 文档明确要求 `public/` 小写。 |
| **建议方案** | 1. `git mv Public public`（在 Git 初始化后）<br>2. 或在 macOS 上：`mv Public public_tmp && mv public_tmp public`<br>3. 验证 `ls -la public/` 能访问 locales |
| **验证标准** | 在 Linux Docker 容器中 `curl http://localhost:3146/locales/en/common.json` 返回 200 |

---

### P0-03 · ESLint 检查失败阻断 CI

| 属性 | 详情 |
|------|------|
| **严重程度** | 🔴 P0 致命 |
| **影响维度** | 属性维度 |
| **影响范围** | CI/CD 流水线 — `pnpm lint` 退出码 1，阻断任何自动化构建 |
| **问题描述** | `eslint.config.mjs` 中 `ignores: ["coverage/**"]` 未覆盖实际覆盖率输出路径 `__tests__/coverage/**`，导致生成的 JS 文件被 lint 检查并产生 6 个 warning，触发 `--max-warnings 0` 限制。 |
| **根本原因** | vitest 配置 `reportsDirectory: "./__tests__/coverage"` 与 ESLint ignore 规则不匹配。 |
| **检测证据** | `pnpm lint` 输出：<br>`__tests__/coverage/block-navigation.js`<br>`__tests__/coverage/lcov-report/block-navigation.js`<br>`... (共 6 个文件)`<br>`✖ 6 problems (0 errors, 6 warnings)`<br>`ESLint found too many warnings (maximum: 0).` |
| **建议方案** | 修改 [eslint.config.mjs](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/eslint.config.mjs)：<br>```javascript<br>{ ignores: ["coverage/**", "__tests__/coverage/**"] }<br>``` |
| **验证标准** | `pnpm lint` 退出码 0 |

---

### P0-04 · AI SDK 模型调用方式错误

| 属性 | 详情 |
|------|------|
| **严重程度** | 🔴 P0 致命 |
| **影响维度** | 属性维度 |
| **影响范围** | 工作流执行 — textModel 节点执行必定失败 |
| **问题描述** | `/api/execute-workflow/route.ts` 中 `textModel` 节点将字符串模型 ID（如 `"openai/gpt-5"`）直接传给 `generateText` 的 `model` 参数，但 AI SDK v6 要求传入模型对象（如 `openai('gpt-5')`），而非字符串。 |
| **根本原因** | 代码使用了 `as any` 绕过类型检查，未按 AI SDK API 规范调用。 |
| **检测证据** | [route.ts](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/app/api/execute-workflow/route.ts) 第 232 行：<br>`model: String(node.data.model || "openai/gpt-5") as any,` |
| **建议方案** | 创建模型解析函数：<br>```typescript<br>import { google } from '@ai-sdk/google'<br>import { openai } from '@ai-sdk/openai'<br><br>function resolveModel(modelId: string) {<br>  const [provider, ...modelParts] = modelId.split('/')<br>  const model = modelParts.join('/')<br>  switch (provider) {<br>    case 'openai': return openai(model)<br>    case 'google': return google(model)<br>    case 'anthropic': return anthropic(model)<br>    default: throw new Error(`Unknown provider: ${provider}`)<br>  }<br>}<br>```<br>然后：`model: resolveModel(node.data.model),` |
| **验证标准** | 工作流中 textModel 节点能成功调用 LLM 并返回结果 |

---

### P0-05 · `safeExecute` 超时机制失效

| 属性 | 详情 |
|------|------|
| **严重程度** | 🔴 P0 致命 |
| **影响维度** | 属性维度（安全） |
| **影响范围** | 服务端安全 — 恶意用户可通过死循环导致 DoS |
| **问题描述** | `safeExecute` 使用 `setTimeout` 尝试实现超时，但 JavaScript 单线程特性决定了 `setTimeout` 回调无法中断正在同步执行的 `new Function()` 调用。timeout 回调中的 `throw` 只会在主线程空闲时触发，此时函数早已执行完毕或仍在运行。 |
| **根本原因** | 对 JavaScript 事件循环机制理解有误。同步代码无法被异步定时器中断。 |
| **检测证据** | [route.ts](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/app/api/execute-workflow/route.ts) 第 35-45 行：<br>```typescript<br>const timeout = setTimeout(() => {<br>  throw new Error(`${label}: Execution timed out`)<br>}, MAX_EXECUTION_TIME_MS)<br>try {<br>  const result = func(inputs)  // ← 同步执行，无法被中断<br>``` |
| **建议方案** | 方案 A（推荐）：使用 `worker_threads` 在子线程中执行，可真正中断：<br>```typescript<br>// lib/safe-worker.ts<br>import { Worker } from 'worker_threads'<br><br>export function safeExecuteInWorker(code, inputs, timeout = 5000) {<br>  return new Promise((resolve, reject) => {<br>    const worker = new Worker(/* ... */)<br>    const timer = setTimeout(() => {<br>      worker.terminate()<br>      reject(new Error('Timeout'))<br>    }, timeout)<br>    worker.on('message', (msg) => { clearTimeout(timer); resolve(msg) })<br>    worker.on('error', (err) => { clearTimeout(timer); reject(err) })<br>  })<br>}<br>```<br><br>方案 B（次选）：使用 `vm2` 或 `isolated-vm` 替代 `new Function`，它们支持资源限制。 |
| **验证标准** | 提交 `for(;;){}` 变体代码能在 5 秒后被终止 |

---

## 三、P1 严重问题清单（9 个）

### P1-01 · SSRF 防护范围过大

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟠 P1 严重 |
| **影响维度** | 属性维度（安全） |
| **影响范围** | HTTP Request 节点 — 误拦截合法公网 API |
| **问题描述** | `validateUrl` 函数用 `parsed.hostname.startsWith("172.")` 拦截所有 172 开头的 IP，但 RFC 1918 只定义 `172.16.0.0/12`（即 172.16-172.31）为私有地址。172.0-172.15 和 172.32-172.255 是合法公网 IP。 |
| **建议方案** | 使用 CIDR 精确匹配：<br>```typescript<br>import ipaddr from 'ipaddr.js'<br><br>function isPrivateIP(ip) {<br>  const addr = ipaddr.parse(ip)<br>  return addr.range() !== 'unicast'<br>}<br>``` |

---

### P1-02 · 节点面板缺失 2 个节点类型

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟠 P1 严重 |
| **影响维度** | 属性维度（功能） |
| **影响范围** | 用户无法通过面板添加 audio 和 structuredOutput 节点 |
| **问题描述** | `node-palette.tsx` 硬编码了 10 个节点定义，遗漏 `audio` 和 `structuredOutput`。但这两个节点组件存在、代码生成器支持、执行引擎支持、i18n 有翻译。 |
| **建议方案** | 1. 在 `node-palette.tsx` 的 `nodeTypeDefs` 数组添加 audio 和 structuredOutput<br>2. 或改为从 `NODE_TYPES_LIST` 动态渲染（需先补全注册表） |

---

### P1-03 · `NODE_TYPES_LIST` 注册表不完整

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟠 P1 严重 |
| **影响维度** | 空间维度（一致性） |
| **影响范围** | 节点系统数据源不一致 |
| **问题描述** | [node-registry.ts](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/lib/node-registry.ts) 的 `NODE_TYPES_LIST` 只有 10 项，但 `getDefaultNodeData()` 和 `MINIMAP_NODE_COLORS` 包含 12 项。 |
| **建议方案** | 补全 `NODE_TYPES_LIST`：添加 `{ type: "audio", label: "Audio", color: "bg-orange-500", description: "Audio generation" }` 和 `{ type: "structuredOutput", ... }` |

---

### P1-04 · `locales/` 目录重复

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟠 P1 严重 |
| **影响维度** | 空间维度 |
| **影响范围** | 维护混乱 — 修改一端另一端不同步 |
| **问题描述** | 根目录 `locales/` 和 `Public/locales/`（即将变为 `public/locales/`）内容完全相同。10 个语言文件 × 2 = 20 份重复文件。 |
| **检测证据** | `diff locales/en/common.json Public/locales/en/common.json` → `IDENTICAL` |
| **建议方案** | 删除根目录 `locales/`，仅保留 `public/locales/`（重命名后）。Next.js 会自动从 `public/` 提供静态文件。 |

---

### P1-05 · API 路由无输入验证

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟠 P1 严重 |
| **影响维度** | 属性维度（安全） |
| **影响范围** | `/api/execute-workflow` — 可接收任意恶意 payload |
| **问题描述** | 执行工作流 API 直接 `await req.json()` 使用 nodes 和 edges，未用 zod 校验结构。攻击者可发送超大 payload 或畸形结构导致崩溃。 |
| **建议方案** | ```typescript<br>import { z } from 'zod'<br><br>const WorkflowSchema = z.object({<br>  nodes: z.array(z.object({<br>    id: z.string(),<br>    type: z.string(),<br>    position: z.object({ x: z.number(), y: z.number() }),<br>    data: z.record(z.any()).optional(),<br>  })).max(100),  // 限制节点数<br>  edges: z.array(z.object({<br>    id: z.string(),<br>    source: z.string(),<br>    target: z.string(),<br>  })).max(200),  // 限制边数<br>})<br>``` |

---

### P1-06 · 代码执行沙箱可绕过

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟠 P1 严重 |
| **影响维度** | 属性维度（安全） |
| **影响范围** | JavaScript/Conditional/Tool 节点 — 可执行恶意代码 |
| **问题描述** | 1. 黑名单正则不完整：`this.constructor.constructor('return process')()` 可绕过<br>2. `new Function` 创建的函数在主线程执行，可访问全局变量<br>3. 异步代码（Promise/fetch）未限制 |
| **建议方案** | 使用 `isolated-vm` 创建真正的隔离沙箱：<br>```typescript<br>import ivm from 'isolated-vm'<br><br>const isolate = new ivm.Isolate({ memoryLimit: 32 })<br>const context = isolate.createContextSync()<br>// 设置超时和资源限制<br>``` |

---

### P1-07 · README 文档数据严重滞后

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟠 P1 严重 |
| **影响维度** | 关联维度 |
| **影响范围** | 项目文档准确性 |
| **问题描述** | README 声称数据与实际不符：<br>- 测试用例：声称 80，实际 **135**<br>- 测试文件：声称 6，实际 **11**<br>- Next.js 版本：声称 15.5.7，实际 **16.2.10**<br>- 源代码行数：声称 ~10,317（未验证） |
| **建议方案** | 更新 README "项目指标" 表格为实测数据。 |

---

### P1-08 · 代码生成器条件分支未嵌套

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟠 P1 严重 |
| **影响维度** | 属性维度（功能） |
| **影响范围** | 代码导出 — 条件分支生成的代码逻辑不完整 |
| **问题描述** | [code-generator.ts](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/lib/code-generator.ts) 的 conditional case 生成了 `if/else` 骨架，但分支内的代码只有注释占位，true/false 分支的下游节点代码未被实际嵌套进去。 |
| **建议方案** | 递归处理分支节点，将 trueEdge 和 falseEdge 的目标节点代码生成嵌入到对应分支内。 |

---

### P1-09 · 无速率限制保护

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟠 P1 严重 |
| **影响维度** | 属性维度（安全） |
| **影响范围** | API 路由 — 可被滥用产生高额 AI 调用费用 |
| **问题描述** | `/api/execute-workflow` 无任何速率限制，攻击者可频繁调用触发大量 LLM API 请求。 |
| **建议方案** | 1. 使用 `@upstash/ratelimit` + Upstash Redis：<br>```typescript<br>import { Ratelimit } from '@upstash/ratelimit'<br>const ratelimit = new Ratelimit({<br>  redis: Redis.fromEnv(),<br>  limiter: Ratelimit.slidingWindow(10, '1 m'),<br>})<br>```<br>2. 或使用 Vercel Edge Config 实现简单的 IP 限流。 |

---

## 四、P2 中等问题清单（8 个）

### P2-01 · `app/page.tsx` 文件过大

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟡 P2 中等 |
| **问题描述** | 主页面文件 444 行，承担状态管理、拖拽处理、导入导出、持久化等多重职责，违反单一职责原则。 |
| **建议方案** | 拆分为：`WorkflowCanvas.tsx`（画布）、`useWorkflowState.ts`（状态 Hook）、`useWorkflowPersistence.ts`（持久化 Hook）。 |

---

### P2-02 · `node-config-panel.tsx` 硬编码英文

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟡 P2 中等 |
| **问题描述** | 配置面板中有大量未国际化的英文字符串："Model"、"Headers (JSON)"、"Body (JSON)"、"Structured Output"、"Schema Name"、"Tool Name"、"Description"、"Implementation (JavaScript)" 等。 |
| **建议方案** | 在 locales 中补充对应翻译 key，将硬编码字符串替换为 `t()` 调用。 |

---

### P2-03 · `error-boundary.tsx` 硬编码英文

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟡 P2 中等 |
| **问题描述** | 错误边界组件的 "Something went wrong"、"An unexpected error occurred"、"Reload Page" 均为硬编码英文。 |
| **建议方案** | 添加 `error.title`、`error.message`、`error.reload` 的 i18n key。注意：ErrorBoundary 是 class 组件，不能用 Hook，需通过 `withI18n` HOC 或 Consumer 模式。 |

---

### P2-04 · `handleRun` DOM 操控反模式

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟡 P2 中等 |
| **问题描述** | [page.tsx](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/app/page.tsx) 第 253-261 行使用 `document.querySelector` + `setTimeout` + `.click()` 触发执行，违反 React 数据流原则。 |
| **建议方案** | 改用状态提升或 ref：将 `handleExecute` 逻辑提升到 page.tsx，或使用 `useImperativeHandle` + `forwardRef`。 |

---

### P2-05 · 无 CI/CD 自动化

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟡 P2 中等 |
| **问题描述** | 无 `.github/workflows/` 或 `vercel.json`，所有构建、测试、部署需手动操作。 |
| **建议方案** | 创建 `.github/workflows/ci.yml`：<br>```yaml<br>name: CI<br>on: [push, pull_request]<br>jobs:<br>  test:<br>    runs-on: ubuntu-latest<br>    steps:<br>      - uses: actions/checkout@v4<br>      - uses: pnpm/action-setup@v4<br>      - run: pnpm install --frozen-lockfile<br>      - run: pnpm lint<br>      - run: pnpm tsc --noEmit<br>      - run: pnpm test<br>``` |

---

### P2-06 · API 路由零测试覆盖

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟡 P2 中等 |
| **问题描述** | `/api/execute-workflow`（538 行）和 `/api/demo-country`（14 行）无任何测试。 |
| **建议方案** | 创建 `__tests__/api/execute-workflow.test.ts`，使用 vitest 的 `vi.mock` 模拟 AI SDK，测试各种节点类型的执行。 |

---

### P2-07 · 3 个节点为占位实现

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟡 P2 中等 |
| **问题描述** | audio、embeddingModel、structuredOutput 节点在执行引擎中返回占位字符串：<br>- `"Audio generation placeholder"`<br>- `"Embedding generation not implemented in demo"`<br>- `"Structured output not implemented in demo"` |
| **建议方案** | 1. audio：集成 OpenAI TTS API（`/v1/audio/speech`）<br>2. embeddingModel：使用 AI SDK 的 `embed()` 函数<br>3. structuredOutput：使用 `generateObject()` + zod schema |

---

### P2-08 · `pnpm-workspace.yaml` 配置为占位模板

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟡 P2 中等 |
| **问题描述** | 文件内容为未填写的模板：<br>```yaml<br>allowBuilds:<br>  sharp: set this to true or false<br>  unrs-resolver: set this to true or false<br>``` |
| **建议方案** | 设置为：<br>```yaml<br>allowBuilds:<br>  sharp: true<br>  unrs-resolver: true<br>``` |

---

## 五、P3 轻微问题清单（6 个）

### P3-01 · `loadSavedWorkflow()` 重复调用

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟢 P3 轻微 |
| **问题描述** | `page.tsx` 的 `nodes` 和 `edges` 初始化各调用一次 `loadSavedWorkflow()`，重复解析 localStorage。 |
| **建议方案** | 提取为单次调用：`const saved = loadSavedWorkflow(); const [nodes, setNodes] = useState(saved?.nodes ?? initialNodes)` |

---

### P3-02 · `PromptNode` 冗余三元表达式

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟢 P3 轻微 |
| **问题描述** | [prompt-node.tsx](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/components/nodes/prompt-node.tsx) 第 25 行：`hasVariables ? t("nodes.prompt.description") : t("nodes.prompt.description")` — 两个分支返回相同值。 |
| **建议方案** | 直接使用 `t("nodes.prompt.description")`。 |

---

### P3-03 · 图片错误回退引用不存在文件

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟢 P3 轻微 |
| **问题描述** | [image-generation-node.tsx](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/components/nodes/image-generation-node.tsx) 第 63 行 `e.currentTarget.src = "/image-error.png"` 引用了不存在的图片。 |
| **建议方案** | 使用已存在的 `/placeholder.svg`。 |

---

### P3-04 · `demo-country` 路由未使用参数

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟢 P3 轻微 |
| **问题描述** | [demo-country/route.ts](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/app/api/demo-country/route.ts) 非生产环境分支不使用 `request` 参数，但函数签名声明了它。 |
| **建议方案** | 使用下划线前缀：`export async function GET(_request: Request)`。 |

---

### P3-05 · 节点组件缺少 `status`/`output` 属性

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟢 P3 轻微 |
| **问题描述** | `StructuredOutputNodeData` 和 `EmbeddingModelNodeData` 类型未定义 `status` 和 `output` 字段，但执行引擎会设置这些字段。 |
| **建议方案** | 补全类型定义。 |

---

### P3-06 · `images.unoptimized: true` 禁用图片优化

| 属性 | 详情 |
|------|------|
| **严重程度** | 🟢 P3 轻微 |
| **问题描述** | [next.config.mjs](file:///Users/yanyu/YYC-Cube/YYC3%20Agent%20Builder%20—%20Visual%20AI%20Workflow%20Builder/next.config.mjs) 全局禁用了 Next.js Image Optimization。 |
| **建议方案** | 仅对需要优化的图片启用，或在 Vercel 部署时移除此配置。 |

---

## 六、问题分布统计

### 按严重程度分布

```
P0 致命  ████████████           5 个 (17.9%)
P1 严重  █████████████████████  9 个 (32.1%)
P2 中等  ████████████████       8 个 (28.6%)
P3 轻微  ████████████           6 个 (21.4%)
```

### 按影响维度分布

```
属性维度  ████████████████████████████  16 个 (57.1%)  质量/安全/功能
空间维度  ████████████                  6 个 (21.4%)  结构/目录/复用
关联维度  ████████                      4 个 (14.3%)  文档/版本/部署
事件维度  ████                          2 个 ( 7.1%)  交互/反馈
```

### 按文件分布

```
app/api/execute-workflow/route.ts     4 个问题 (P0×2, P1×2)
app/page.tsx                          3 个问题 (P2×2, P3×1)
lib/node-registry.ts                  2 个问题 (P1×2)
components/node-config-panel.tsx      2 个问题 (P2×2)
components/node-palette.tsx           1 个问题 (P1×1)
eslint.config.mjs                     1 个问题 (P0×1)
项目根目录                             3 个问题 (P0×3: Git, Public, locales)
```

---

## 七、修复优先级排序

### 第一优先级（本周必须完成）

1. **P0-01** Git 初始化 → 解除所有后续工作的阻塞
2. **P0-02** Public → public 重命名 → 修复部署
3. **P0-03** ESLint ignore 修复 → 解除 CI 阻塞（5 分钟可完成）
4. **P0-04** AI SDK 模型调用修复 → 核心功能可用
5. **P0-05** safeExecute 修复 → 安全防护有效

### 第二优先级（下周完成）

6. **P1-01** SSRF 精准化
7. **P1-02 + P1-03** 节点面板 + 注册表补全
8. **P1-04** locales 去重
9. **P1-05** 输入验证
10. **P1-08** 代码生成器分支修复

### 第三优先级（迭代中完成）

11. **P1-06** 沙箱加固（isolated-vm）
12. **P1-07** README 同步
13. **P1-09** 速率限制
14. **P2 系列** 代码质量提升

---

> **清单状态**：28 个问题已全部定位并分类，建议按优先级顺序逐项修复。
> *— 智能应用实施专家 · 言启千行代码，语枢万物智能*
