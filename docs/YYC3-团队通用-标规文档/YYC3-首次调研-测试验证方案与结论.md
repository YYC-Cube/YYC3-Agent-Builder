---
file: YYC3-首次调研-测试验证方案与结论.md
title: YYC³ Agent Builder — 首次调研测试验证方案与结论
description: 可执行测试用例、边界异常清单、覆盖建议、环境兼容矩阵与通过判定
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-18
updated: 2026-11-18
status: stable
tags: [research, testing, qa, verification]
category: report
language: zh-CN
audience: developers,qa
complexity: intermediate
---

# YYC³ Agent Builder — 首次调研测试验证方案与结论

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

## 0. 执行环境与方法

- 环境：`node v22.22.3` / `pnpm 10.17.0` / 仓库根；`pnpm install --frozen-lockfile` 后执行。
- 门禁命令：`pnpm lint`、`pnpm exec tsc --noEmit`、`pnpm test`（vitest run）、`pnpm exec next build`。
- 原则：**不粉饰失败**。所有结论附实测退出码与日志；未执行的测试不写"通过"。

---

## 1. 实测门禁结果（基线 vs 修复后）

| 门禁 | 基线结果（首次采集） | 修复后结果（本次交付） | 证据 |
| ---- | ---- | ---- | ---- |
| ESLint `--max-warnings 0` | EXIT=0，0 warning | EXIT=0，0 warning | `/tmp/yyc3-audit/final-lint.log` |
| TypeScript `tsc --noEmit` | EXIT=0，0 error | EXIT=0，0 error | `/tmp/yyc3-audit/final-tsc.log` |
| Vitest `run` | 11 文件 / **135 passed** | 12 文件 / **147 passed** | `/tmp/yyc3-audit/final-test.log` |
| Next build（Turbopack） | EXIT=0，5 静态页 | EXIT=0，5 静态页 | `/tmp/yyc3-audit/r-build.log` |

> 说明：147 = 原 135 + 新增 12 条 SSRF 回归测试。build 有 `Edge Runtime is deprecated` 与 `edge runtime 禁用静态生成` 两条**警告**（非失败），已如实记录于深度分析报告 P5/S 段。

---

## 2. 核心功能测试用例（正向 + 反向）

> 优先级 P0=阻断发布，P1=高，P2=中，P3=低。预期结果来自代码实现，标注 ⏳ 的需按确认清单补规格后定稿。

### 2.1 节点执行引擎（`POST /api/execute-workflow`）

| 用例 ID | 场景 | 类型 | 优先级 | 预期结果 | 当前可测状态 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| TC-E01 | start→end 最小工作流，返回 "Workflow started" | 正向 | P0 | SSE 依次收到 `node_start`/`node_complete`/`complete`，`finalOutput` 非空 | ⏳ 无路由测试；需补（见 §4） |
| TC-E02 | conditional TRUE/FALSE 分支裁剪 | 正向 | P0 | 仅匹配 `sourceHandle` 的分支被计入输入 | ⏳ `nodes.test.tsx` 覆盖组件，未覆盖引擎 |
| TC-E03 | prompt 变量插值 `$input1..5` | 正向 | P1 | 占位符被上游值替换 | ⏳ `interpolateVariables` 未导出，需补 |
| TC-E04 | javascript 节点 `return input1.toUpperCase()` | 正向 | P0 | 返回大写字符串 | ✅ `safeExecute` 有间接覆盖，建议补直接单测 |
| TC-E05 | 循环连线 A→B→A | 反向 | P1 | 应在有限步内终止并报错，**非栈溢出/无限递归** | ❌ 现有代码无环检测（深度分析 A2），预期**不通过**，需修复 |
| TC-E06 | 未知节点 type | 反向 | P2 | 走 `default: output=null`，不抛异常 | ⏳ 未测 |
| TC-E07 | 空 `nodes`/`edges` 请求体 | 反向 | P1 | 返回 `complete` 且 `executionLog=[]`，不抛 500 | ⏳ 未测 |
| TC-E08 | 多入口 entryNodes 顺序执行 | 正向 | P2 | 每个入口均产生结果 | ⏳ 未测 |

### 2.2 SSRF 与沙箱（安全）

| 用例 ID | 场景 | 类型 | 优先级 | 预期结果 | 当前状态 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| TC-S01 | 公网 https URL | 正向 | P0 | 放行 | ✅ `ssrf-validation.test.ts` 通过 |
| TC-S02 | 非 http(s) 协议（file://） | 反向 | P0 | 抛 `Forbidden protocol`/`Invalid URL` | ✅ 通过 |
| TC-S03 | 私网/环回/元数据（127、10、192.168、172.16、169.254、::1、fe80） | 反向 | P0 | 抛 `SSRF protection` | ✅ 8 条参数化用例通过 |
| TC-S04 | 畸形 URL | 反向 | P1 | 抛 `Invalid URL` | ✅ 通过 |
| TC-S05 | 302 重定向至内网 | 反向 | P1 | 应拒绝跳转 | ❌ **未防护**（S4），需修复 |
| TC-S06 | DNS 重绑定（域名解析到 127.0.0.1） | 反向 | P1 | 应拒绝 | ❌ 未防护（S6），需修复 |
| TC-S07 | JS 代码含 `while(true)` | 反向 | P0 | 5s 内超时中断并报错 | ⏳ `safe-executor.ts` 无直接单测，建议补 |
| TC-S08 | JS 代码含 `process`/`require` | 反向 | P0 | 被 `BLOCKED_PATTERNS` 拒绝 | ⏳ 建议补直接单测 |
| TC-S09 | 代码超 5000 字符 | 反向 | P2 | 抛长度错误 | ⏳ 建议补 |

### 2.3 节点组件与 UI

| 用例 ID | 场景 | 类型 | 优先级 | 预期结果 | 当前状态 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| TC-U01 | 12 种节点组件渲染 | 正向 | P1 | 各自渲染无异常 | ✅ `nodes.test.tsx` 23 测试通过 |
| TC-U02 | 面板（Palette/Execution/Export/ErrorBoundary） | 正向 | P1 | 渲染与交互正常 | ✅ `panels.test.tsx` 14 测试通过 |
| TC-U03 | 语言切换 10 语言 + RTL | 正向 | P1 | 文案切换、`dir=rtl`（ar） | ✅ `i18n-provider.test.tsx` 9 测试通过（含 act 警告） |
| TC-U04 | 主题切换 | 正向 | P2 | 类名/属性切换 | ✅ `theme-provider.test.tsx` 通过 |
| TC-U05 | 代码导出生成 AI SDK 代码 | 正向 | P1 | 含 `generateText`/route handler 模板 | ✅ `code-generator*.test.ts` 通过 |
| TC-U06 | 节点注册表 10 palette / 12 配色 / 默认数据 | 正向 | P1 | 符合固化契约 | ✅ `node-registry.test.ts` 通过 |

---

## 3. 边界条件与异常场景清单

| 类别 | 场景 | 期望处理 | 现状 |
| ---- | ---- | ---- | ---- |
| 输入 | `nodes` 非数组 / `edges` 缺失 | 返回结构化 `error` 事件，非 500 | ⏳ 待补测 |
| 输入 | `node.data` 为 null | 安全取默认值 | 部分用 `||` 兜底，未系统覆盖 |
| 代码 | 代码含合法标识符子串（如变量名 `myprocess`） | 不应误杀 | ❌ 黑名单正则 `\b(process)\b` 用词边界，子串场景部分可过，但注释/字符串含 `process` 会误杀（S3） |
| 网络 | HTTP 目标无响应 / 超大响应体 | 超时 + 体积上限 | ❌ 均无（P3） |
| 图 | 环形依赖 | 终止并报错 | ❌ 无环检测（A2） |
| 图 | 孤立节点（无入无出） | 作为入口执行 | ✅ `entryNodes` 逻辑覆盖 |
| 模型 | 缺 API Key | 明确错误提示 | ⏳ AI SDK 原始错误直出（S5） |
| 平台 | 生产环境 `x-vercel-ip-country` 缺失 | 回退默认值 | ⏳ 直接返回 `null`（S7） |
| 配置 | `.env.local` 缺失 | 构建/启动应给出指引 | ⏳ 依赖 SDK 报错 |

---

## 4. 接口/单元测试覆盖建议与关键校验点

### 4.1 覆盖缺口（按优先级）

1. **P0 — 执行引擎路由**（当前 0 覆盖）：将 `route.ts` 中的图构建/遍历纯逻辑抽为 `lib/workflow-engine.ts`（不改外部行为），对 `executeNode` 的分支裁剪、循环检测、结果缓存做纯函数测试。**须在 C-06/C-13 确认后进行，避免大范围重构。**
2. **P0 — 环检测**：TC-E05 应先写失败测试（红灯），再实现检测（绿灯）。
3. **P1 — `safe-executor.ts` 直接单测**：TC-S07/S08/S09，覆盖超时、黑名单、长度上限。
4. **P1 — SSRF 重定向/DNS 重绑定**：TC-S05/S06，需先修 S4/S6。
5. **P2 — `model-resolver.ts`**：provider 合法/非法 ID、缺 key 行为。
6. **P2 — `interpolateVariables`**：多输入、特殊字符、未匹配占位符保留。

### 4.2 关键校验点（断言锚点）

- SSE 帧格式：每帧为 `JSON.stringify(update) + "\n"`，`type` 属于 `node_start|node_complete|node_error|complete|error`。
- 条件分支：仅 `sourceHandle` 匹配 `Boolean(result)` 的边参与输入（`/TRUE`、`/FALSE`）。
- 缓存：`results` Map 命中时不得重复执行同一 `nodeId`。
- 沙箱：5s 硬超时错误消息含 `Execution timed out (5000ms)`。
- SSRF：拒绝消息含 `SSRF protection`，协议拒绝含 `Forbidden protocol`/`Invalid URL`。
- 覆盖率门槛：建议 `lib/**` 行覆盖 ≥80%（vitest coverage include 已配置 `lib/**`、`components/**`，排除 `ui/**`）。

---

## 5. 环境兼容性测试范围

| 维度 | 范围 | 状态 |
| ---- | ---- | ---- |
| Node | 本机 22.22.3；CI 22；README 要求 20+（与 pnpm 11 冲突，见 C-07） | ✅ 22 实测通过；20 未测 |
| pnpm | 本机 10.17.0 / CI 11 / README 11.10.0 | ⚠️ 版本口径未统一 |
| 浏览器 | Chrome/Safari/Firefox/Edge；RTL（ar）布局 | ⏳ 未测（jsdom 仅 DOM 级） |
| 视口 | 桌面/平板/移动（`use-mobile` hook） | ⏳ 未做 E2E |
| 主题 | 浅色/深色/系统跟随（next-themes） | ✅ 组件级通过 |
| 部署 | Vercel edge runtime（现状）；容器/K8s 未配置 | ⚠️ 仅 Vercel 路径可测（C-04） |
| 模型 Provider | openai/google/anthropic/xai（需真实 Key） | ⏳ 无 Key，未做联通测试 |

---

## 6. 测试通过标准与失败判定规则

### 通过标准（全部满足方可判定 PASS）
1. `pnpm lint` EXIT=0 且 0 warning。
2. `pnpm exec tsc --noEmit` EXIT=0。
3. `pnpm test` EXIT=0，失败用例数=0；新增用例须含正向 + 反向。
4. `pnpm exec next build` EXIT=0；警告须登记但不阻断（除非升级为 error）。
5. P0 用例（TC-E01~E04、TC-S01~S03、TC-S07~S08）全部通过。
6. 安全类修复须附回归测试（如本次 SSRF 12 条）。

### 失败判定（任一命中即 FAIL / 停闸）
- 任一门禁 EXIT≠0 → 立即停闸，禁止合并与发布。
- P0 用例失败 → 停闸。
- 发现无环检测、无鉴权、SSRF 可绕过等 P0/P1 安全项 → 停闸，除非有书面风险接受（C-13）。
- 测试被跳过（`.skip`/`.todo`）或删除以"通过" → 视为粉饰，判 FAIL。
- 覆盖率低于门槛且无豁免说明 → 判 FAIL（当前未设门槛，属待完善）。

### 停闸执行记录（本次）
- 首次 `next build` 因并行会话"Another next build process is already running" EXIT=1 → **未粉饰**，等待原进程完成后重取日志确认 EXIT=0（见 §1）。
- 未绕过任何安全钩子/密钥扫描/权限校验；未引入 BaaS；未改 workspace 架构；未切换包管理器；未引入循环依赖。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-18 | 首次调研：测试方案、边界异常清单、覆盖建议、环境矩阵、通过/失败规则与实测结论 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
