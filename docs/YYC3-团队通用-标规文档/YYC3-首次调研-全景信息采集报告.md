---
file: YYC3-首次调研-全景信息采集报告.md
title: YYC³ Agent Builder — 首次调研全景信息采集报告
description: 首次调研四层信息采集：业务、技术、代码、协作，含缺失项确认清单
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-18
updated: 2026-11-18
status: stable
tags: [research, onboarding, inventory, confirmation]
category: report
language: zh-CN
audience: developers,qa,managers,stakeholders
complexity: intermediate
---

# YYC³ Agent Builder — 首次调研全景信息采集报告

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 核心理念

**五高架构**：高可用 | 高性能 | 高安全 | 高扩展 | 高智能
**五标体系**：标准化 | 规范化 | 自动化 | 可视化 | 智能化
**五化转型**：流程化 | 数字化 | 生态化 | 工具化 | 服务化
**五维评估**：时间维 | 空间维 | 属性维 | 事件维 | 关联维

---

## 0. 采集原则与证据口径

- **零前置认知**：所有结论来自本机实测与仓库文件，不引用未验证的口头约定。
- **禁止编造**：未见即标「待确认」，不填任何默认假设；库名/版本/配置项一律引用文件原文。
- **证据可回溯**：每条关键事实附相对仓库根的路径；测试结论附实测命令与退出码。
- **时间基准**：采集日 2026-11-18；代码版本基准 `package.json` v0.1.0 / `main` 分支 HEAD `86952c7`。

采集环境：`node v22.22.3`、`pnpm 10.17.0`（CI 声明 `PNPM_VERSION=11`，差异见确认清单 C-07）、`node_modules` 初始缺失，经 `pnpm install --frozen-lockfile` 安装后执行全部门禁。

---

## 1. 业务层

| 维度 | 采集结果 | 证据 |
| ---- | ---- | ---- |
| 核心目标 | 可视化 AI 工作流编排平台：拖拽节点 + 连线构建工作流，实时流式执行，导出 AI SDK 生产代码 | `README.md:56-68` |
| 定位口号 | CloudPivot Intelli-Matrix · 言启千行代码，语枢万物智能 | `README.md:14` |
| 适用场景 | ① LLM 文本生成 ② 条件分支 ③ HTTP 集成 ④ 自定义 JS 代码 ⑤ 图像/音频/向量化 ⑥ 结构化输出 | `README.md:58-68`、`components/nodes/` |
| 用户群体 | **待确认**（C-01） | README 未定义终端用户画像；从功能推断为 AI 应用开发者/集成者，不作为既定事实 |
| 核心业务流程 | 拖拽节点→连线→配置面板填参→Run→`POST /api/execute-workflow`→拓扑排序执行→NDJSON 流推送→执行面板实时刷新 | `app/page.tsx`、`app/api/execute-workflow/route.ts:50-489` |
| 关键功能清单 | 12 类节点、SSE/NDJSON 流式执行、代码导出、工作流 JSON 导入导出、多 Provider（openai/google/anthropic/xai）、变量插值 `$inputN`、10 语言 i18n（含阿拉伯语 RTL）、oklch 暗色主题、SSRF 防护、VM 沙箱 | `README.md:280-312` |
| 非功能需求（明确值） | 无 SLA / 并发数 / P95 延迟等量化指标 | 全库未见；仅 `README.md:340-348` 有自评百分比（高可用 60%、高性能 80%、高安全 40%、高扩展 60%、高智能 75%），属**自评非验收标准** |
| 非功能需求（代码约束） | 执行超时 `maxDuration=30`（s）、VM 单节点 5s 硬超时、用户代码上限 5000 字符 | `route.ts:7`、`lib/safe-executor.ts:3-4` |

---

## 2. 技术层

### 2.1 技术栈与版本（以 `package.json` 为 SSOT）

| 层 | 技术 | 声明版本 | 备注 |
| ---- | ---- | ---- | ---- |
| 框架 | Next.js（App Router） | `16.4.2` | 实测 build 输出 `Next.js 16.4.2 (Turbopack)`；README 标 `16.2.10`（漂移 C-05） |
| UI | React / React DOM | `19.1.0` | — |
| 语言 | TypeScript | `^5`（strict, noEmit） | README 标 5.8（漂移 C-05） |
| 流程图 | `@xyflow/react` | `latest` | README 标 12.10.2（漂移 C-05）；**禁止臆造固定版本** |
| AI | `ai`（Vercel AI SDK） | `latest` | README 标 v6.0.176（漂移 C-05） |
| AI Provider | `@ai-sdk/openai` / `@ai-sdk/anthropic` / `@ai-sdk/google` | `^3.0.87` / `^3.0.100` / `latest` | `model-resolver.ts` 支持 openai/google/gemini/anthropic/claude/xai |
| 样式 | `tailwindcss` + `@tailwindcss/postcss` | `^4.1.9` | oklch 色彩系统 |
| UI 原语 | Radix UI（26 个 `@radix-ui/*`）、shadcn/ui | 固定版本 / new-york | `components/ui/` 约 56–57 个文件 |
| 表单校验 | `react-hook-form` + `zod` | `^7.60.0` / `4.4.3` | — |
| i18n | `@yyc3/i18n-core` | `^2.4.0` | 实际加载 `public/locales/{lang}/common.json` |
| 测试 | `vitest` + `@vitest/coverage-v8` + Testing Library | `^5.0.1` / `4.1.6` / `^16.3.2` | README 标 vitest 4.1.6（漂移 C-05） |
| 包管理 | pnpm | 本机 `10.17.0` / CI `11` | 锁文件 `pnpm-lock.yaml`；硬约束：禁止切换 |
| 图表/图标 | `recharts 2.15.4` / `lucide-react ^0.454.0` | — | — |

### 2.2 中间件与数据层

- **中间件**：无独立消息/缓存/队列组件。服务端仅 Next.js Route Handler + `node:vm` 沙箱。
- **数据库/缓存**：**代码中未发现任何 PG15 / Redis / 数据库客户端依赖或连接配置**。用户硬约束要求「禁止替换 PG15 + Redis 自研数据架构」——该架构在本仓库未落地，归属需确认（C-02）。**未引入 Supabase / Firebase 等 BaaS**（符合硬约束）。
- **状态持久化**：`README.md:624-627` 提及 localStorage / IndexedDB / BroadcastChannel 类模式，但当前代码仅见 localStorage 主题与语言偏好（`lib/i18n/provider.tsx`、`components/theme-provider.tsx`）；工作流图本身是否持久化**待确认**（C-03）。

### 2.3 部署与环境

| 项 | 采集结果 | 证据 |
| ---- | ---- | ---- |
| 主部署平台 | Vercel（原生支持 API Routes） | `next.config.mjs:3-7` |
| 自定义域名 | `agent.yyc3.vip`，DNS 校验文件 `public/CNAME` | `next.config.mjs:6`、`README.md:29` |
| 容器化 | 未发现 `Dockerfile` / `docker-compose.yml` | 全库搜索 0 命中（C-04 确认是否需要） |
| 物理机/K8s | 未发现部署清单 | C-04 |
| 边缘运行时 | `/api/*` 使用 edge runtime；build 报 `Edge Runtime is deprecated` 警告 | `next build` 实测输出 |

### 2.4 CI/CD 工具链

`.github/workflows/ci-cd.yml`：`name: CI — Quality Gate`，触发 `push(main, develop)` 与 `PR(main)`；顺序 ESLint → `tsc --noEmit` → `pnpm test` → `pnpm test:coverage` → `pnpm build`；`NODE_VERSION=22`、`PNPM_VERSION=11`；覆盖率上传路径 `__tests__/coverage/`。Dependabot 已在提交历史中活动（`b7898d2` sharp 升级）。

---

## 3. 代码层

| 维度 | 采集结果 | 证据 |
| ---- | ---- | ---- |
| 仓库地址 | `git@github.com:YYC-Cube/YYC3-Agent-Builder.git`，分支 `main` | `git remote -v` 实测 |
| 目录结构 | 仓库**无 `src/` 目录**，采用根级 `app/ components/ lib/ hooks/ locales/ public/ __tests__/ docs/` | `list_dir` 实测；与团队标准模板 `src/` 布局存在漂移（C-06） |
| 入口文件 | `app/layout.tsx`（根布局 + ErrorBoundary/ThemeProvider/I18nProvider）、`app/page.tsx`（`"use client"` 主画布，14.44 KB） | 实测 |
| 核心模块 | `lib/`：`code-generator.ts`（导出 AI SDK 代码）、`model-resolver.ts`（多 provider 解析）、`node-registry.ts`（节点注册表）、`node-utils.ts`、`safe-executor.ts`（VM 沙箱）、`utils.ts`、`i18n/{config,index,provider}` | 逐文件读取 |
| 公共组件 | `components/ui/` 约 56–57 个 shadcn/Radix 组件；业务组件 7 个（code-export-dialog、error-boundary、execution-panel、language-switcher、node-config-panel、node-palette、theme-provider）；节点组件 12 个 | 实测 |
| 工具/重复 | `hooks/use-mobile.ts`、`hooks/use-toast.ts` 与 `components/ui/use-mobile.tsx`、`components/ui/use-toast.ts` **同名重复**；`locales/`（根）与 `public/locales/` **两套 10 语言文件** | 实测（C-08 确认清理策略） |
| API 路由 | `app/api/demo-country/route.ts`（GET）、`app/api/execute-workflow/route.ts`（POST，489 行） | 实测 |
| 测试文件 | `__tests__/` 11 个测试文件（原）+ 本次新增 `lib/ssrf-validation.test.ts`；支撑 `setup.ts`/`helpers.ts` | 实测 |
| 第三方依赖 | `package.json`：54 dependencies + 15 devDependencies；`@yyc3/i18n-core`、`@ai-sdk/*`、`@xyflow/react` 等 | `package.json:14-91` |
| 硬约束核查 | **未发现** Tailscale `100.x` 节点 IP、硬编码密钥/token、`vm2`/`isolated-vm`、Supabase/Firebase 依赖；`process.env` 仅 3 处（XAI_API_KEY / 导出模板 OPENAI_API_KEY / VERCEL_ENV） | 全库正则搜索实测 |

**关于 `NODE_TYPES_LIST` 的澄清**：该数组为「节点面板（palette）可见项」，恰为 10 项，`__tests__/lib/node-registry.test.ts:9` 显式断言 `toHaveLength(10)`，并在 `:15` 注明 "Palette items exclude structuredOutput"。`audio` 同样不在 palette。此为**测试固化的设计契约，非缺陷**——不列入问题清单，避免误「修复」导致回归。

---

## 4. 协作层

| 维度 | 采集结果 | 证据 |
| ---- | ---- | ---- |
| 干系人 | 提交作者：`yyc3`、`YYC-Cube`、`dependabot[bot]`。具体职责分工与对应人**待确认**（C-09） | `git log -5` |
| 提交规范 | Conventional Commits：`feat/fix/docs/style/refactor/perf/test/build/chore` | `CONTRIBUTING.md` |
| 分支规范 | `main`（受保护，PR 进入）、`feat/*`、`fix/*`、`docs/*`、`dependabot/*` | `CONTRIBUTING.md` |
| 评审流程 | Fork/建分支→开发自测→提交→Push+PR（关联 Issue，说明验证方式）→CI + 维护者审查后合并 | `CONTRIBUTING.md` |
| 发布周期 | **待确认**（C-10）：未见 Release 计划/版本号语义（仓库 v0.1.0） | 全库未见 |
| 问题反馈渠道 | 功能：GitHub Issue（推断，待确认 C-11）；安全漏洞：`admin@0379.email`，主题 `[SECURITY] <项目名>`，48h 确认 / 7 天分级 / 高危 30 天修复 | `SECURITY.md` |
| 本地钩子 | **未发现 Husky / `.git/hooks` 有效钩子**（目录仅 sample）；标头规范仅文档约束 | 实测 |
| 工作区状态 | `git status` 显示 `docs/YYC3-项目闭环-验收系统/` 下大量文件为**已删除（D）未提交**状态——非本次操作，属既有工作区改动，**不予触碰**，需确认（C-12） | `git status --short` 实测 |

---

## 5. 确认清单（缺失项 / 禁止假设）

> 以下项目**未获书面确认前不作为事实使用**。确认路径为建议动作，不代替决策。

| 编号 | 待确认项 | 为何不能假设 | 建议确认路径 | 影响 |
| ---- | ---- | ---- | ---- | ---- |
| C-01 | 终端用户画像与使用场景优先级 | README 无定义 | 产品负责人补用户故事/角色卡 | 影响功能取舍与验收口径 |
| C-02 | `PG15 + Redis 自研数据架构` 与本项目关系 | 代码零命中；硬约束提及但无落点 | 架构负责人确认是否关联系统/后续阶段 | 防止误引入 BaaS 或误判数据层缺失 |
| C-03 | 工作流图是否需持久化（localStorage/IndexedDB/DB） | 当前仅主题/语言持久化 | 产品 + 架构确认需求 | 影响刷新恢复、分享、多端 |
| C-04 | 目标部署形态（Vercel / 容器 / 物理机 / K8s） | 仅见 Vercel 配置 | 运维确认生产环境清单 | 影响容灾、回滚、密钥注入方式 |
| C-05 | 依赖版本口径：README 与 `package.json` 漂移 | 两处声明不一致，不可择一臆断 | 维护者确认 SSOT（默认应 `package.json`+锁文件）并同步 README | 影响可复现构建 |
| C-06 | 是否迁移到团队标准 `src/` 布局 | 现状根级布局可构建，迁移属大范围改动 | 架构负责人评估收益/成本后决策 | 影响标头脚本路径、别名 |
| C-07 | pnpm 版本：本机 10.17.0 vs CI 11 vs README 11.10.0 | 三方不一致 | 维护者锁定 `packageManager` 字段 | 影响锁文件兼容与 CI 稳定性 |
| C-08 | `locales/` 重复目录与 `hooks/` 重复文件的清理策略 | 来源与引用关系未明 | 开发负责人确认哪套为权威 | 影响 i18n 加载路径 |
| C-09 | 干系人角色矩阵（开发/测试/产品/运维责任人） | 仅见 git 作者名 | 项目管理补齐 RACI | 影响对接与审批链 |
| C-10 | 发布周期与版本策略 | 仓库 v0.1.0，无 Release 说明 | 维护者确认节奏（周/迭代/按需） | 影响门禁强度与回归范围 |
| C-11 | 功能类问题反馈渠道 | 仅安全邮箱明确 | 维护者确认 Issue 模板/看板 | 影响缺陷闭环 |
| C-12 | `docs/YYC3-项目闭环-验收系统/` 已删除未提交文件 | 既有工作区改动，非本次产生 | 原作者确认是有意删除还是待恢复 | 影响文档完整性；本次不触碰 |
| C-13 | `/api/execute-workflow` 鉴权策略 | 当前无需鉴权即可调用付费 AI 与外部 URL | 产品/安全确认是否内网隔离或加 API Key | 影响成本滥用与越权风险 |
| C-14 | 3 个占位节点（audio/embeddingModel/structuredOutput）实现排期 | README 标 ✅，路由实为占位返回 | 产品确认是否承诺对外可用 | 影响功能真实性对外表述 |
| C-15 | `pnpm-workspace.yaml` 占位值（`set this to true or false`） | 形似未替换模板；**硬约束禁止修改 workspace 架构**，本次不改 | 维护者确认 `allowBuilds` 正确取值与 workspace 意图 | 影响原生模块 sharp/unrs-resolver 构建；已列入建议但**未执行** |

---

## 6. 采集结论

四层信息中，**技术层/代码层证据完整可验证**；**业务层的用户画像、非功能量化指标，协作层的责任人矩阵、发布周期、反馈渠道存在实质缺口**，已全部进入确认清单（15 项）。在确认前，后续分析与优化设计对相关项仅给出**条件性建议**，不作既定结论。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-18 | 首次调研：业务/技术/代码/协作四层信息采集 + 15 项确认清单 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
