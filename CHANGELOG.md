---
file: CHANGELOG.md
title: YYC³ Agent Builder 变更日志
description: 项目级版本变更记录 — 遵循 Keep a Changelog 结构
author: YYC³ Team <admin@0379.email>
version: v0.1.2
created: 2026-11-11
updated: 2026-11-11
status: active
tags: [changelog, release, handoff]
category: report
language: zh-CN
audience: developers, stakeholders
complexity: basic
---

# YYC³ Agent Builder 变更日志

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

本文件记录所有值得注意的变更，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 SemVer。

## [Unreleased]

### Added

- `deploy/docker-compose.prod.yml`：NAS（yyc3-45 / Docker V3）生产编排，app 仅绑定 Tailscale 地址 + 内置 Redis + 健康检查 + 资源上限。
- `deploy/.env.production.example`：NAS 环境模板（含 PG15 主备 `5433` 占位）。
- `lib/rate-limit-store.ts`：新增 `IoredisRateLimitStore`，支持 `REDIS_URL` 直连 NAS 本地 Redis；优先级 `REDIS_URL` > Upstash REST > 内存。
- `docs/06-运维保障阶段/0601-运维策略/004-集群拓扑与部署映射.md`：七节点落位、PG 主备方向、数据盘选型、备份与安全边界。

### Changed

- `lib/rate-limit-store.ts`：统一 fail-open/fail-closed 判定，`IoredisRateLimitStore` 采用 `lazyConnect`，避免启动即建连。
- `.env.example`：补充 `REDIS_URL`、`DATABASE_URL` / `DATABASE_REPLICA_URL` 占位。
- 测试：限流存储新增 4 例（本地 Redis 结果解析、优先级、降级），总数 224 → **227**。

### Known Limits

- `DATABASE_URL` 尚未被应用读取，持久化仍为 ADR；需先确认 PG 主备方向与数据盘迁移。

---

## [v0.1.2] — 2026-11-11

> 未闭环项深度分析与落地：多实例限流外置、3 个占位节点真实现、执行引擎抽离、部署定案与运行手册。

### Added

- `lib/rate-limit-store.ts`：可插拔限流存储（进程内滑动窗口 / Upstash Redis Lua 滑动窗口），支持 `RATE_LIMIT_FAIL_MODE=open|closed`。
- `lib/workflow-engine.ts`：执行内核从 route 抽离，纯函数式、可复用、可直接单测。
- `app/api/health/route.ts`：容器健康检查端点（版本、uptime、限流存储类型，无敏感信息）。
- `Dockerfile` / `.dockerignore`：Node 22 + pnpm 多阶段构建、非 root、HEALTHCHECK。
- `docs/agent-builder-hunyuan-20261111/04-未闭环项决策与实施方案.md`：六项决策 ADR。
- `docs/05-.../003-生产部署定案与运行手册.md`、`docs/06-.../003-可观测性与运行日志手册.md`、`docs/07-.../003-执行引擎安全基线与SSRF加固.md`：替换占位 stub 为可执行手册。
- 测试：`rate-limit-store.test.ts`、`workflow-engine.test.ts`、`health.test.ts`；总数 202 → **224**。

### Changed

- `app/api/execute-workflow/route.ts`：605 行 → 约 100 行，仅保留鉴权、校验、SSE 封装；执行逻辑迁移至 `lib/workflow-engine.ts`。
- `imageGeneration` 节点：`generateText` 捞 `files` → AI SDK 7 `generateImage`（支持 `openai/`、`google/`、Gateway 前缀路由）。
- `audio` 节点：占位 → AI SDK 7 `generateSpeech`（`openai.speech`，返回 `audio/mpeg` data URL）。
- `embeddingModel` 节点：占位 → AI SDK 7 `embed`（向量 + 维度 + usage）。
- `structuredOutput` 节点：占位 → `generateText({ output: Output.object/array({ schema: jsonSchema(...) }) })`；v7 已移除旧 `generateObject`。
- `components/node-config-panel.tsx`：structuredOutput 增加 JSON Schema 与兜底 Prompt 配置。
- `lib/api-guard.ts`：改为异步 `checkRequest`，内部委托限流存储。
- `next.config.mjs`：开启 `output: "standalone"`，为执行端点声明 `X-Accel-Buffering: no` 与 `no-store`。
- `package.json` 版本 `0.1.0` → `0.1.2`；`.env.example` 补齐 Redis 限流与降级变量。

### Docs

- `docs/05` / `docs/06` / `docs/07` 的 README 索引同步新增手册；`docs/document_registry.json` 更新会话目录与新增文档清单。

### Known Limits

- 图片/音频以 data URL 走 SSE，长音频体积偏大，后续改对象存储 + 短 URL。
- 持久化/账号体系仍为 ADR（Postgres + Drizzle + Better Auth），未建表。
- `lib/code-generator.ts` 仍保留一份图遍历/插值逻辑，待统一复用。

---

## [v0.1.1] — 2026-11-11

> 首次完整技术调研后的 P0→P3 优先级修复版本。基线：`fd426d3`。

### Fixed

- **P0-1 / P0-2**：`conditional` 节点 100% 不可用、按 UI 提示写 `return` 的 `javascript` 节点必崩。
  - 根因：`lib/safe-executor.ts` 直接将代码拼接进 `vm.Script`，顶层 `return` 触发 `Illegal return statement`。
  - 方案：编译期探测顶层 return，自动切换脚本模式（尾表达式完成值）/ 函数模式（显式 return）；输入改为序列化字符串传入，移除宿主内置对象注入。
- **P2**：`interpolateVariables` 使用函数式替换，上游输出中的 `$&` / `$'` 不再被误解析。
- **P2**：`page.tsx` 移除 `setTimeout` + `document.querySelector().click()` 父子 DOM 反模式，改为 `autoRunToken` 驱动。
- **P2**：`audio` / `embeddingModel` / `structuredOutput` 占位节点输出显式 `notImplemented: true` 并产生告警日志。
- **P1**：图执行新增深度保护与下游 `visited` 集合，环图不再导致无限递归。
- **P2**：执行引擎 catch 分支由 `any` 收紧为 `unknown`，统一 `getErrorMessage()`；空 catch 补充降级说明。
- **P3**：`NODE_TYPES_LIST` 复核结论为**刻意 10 项**（面板设计），非缺陷，不做修改并已在审核报告中更正。

### Security

- **P0-3**：`POST /api/execute-workflow` 新增可选令牌鉴权（`WORKFLOW_API_TOKEN`）与按 IP 滑动窗口限流（默认 20 次/60 秒），401/429 携带 `Retry-After`。
- **P1**：SSRF 防护重写为 DNS 解析后 IP 判定，覆盖 `169.254.0.0/16` 云元数据、`0.0.0.0/8`、IPv6 本地/链路本地/IPv4 映射、十进制与十六进制 IP 变形；禁止 URL 内嵌凭据、禁止跟随重定向、限制 HTTP 方法白名单。
- **P1**：出站请求增加硬超时（默认 10s）与响应体上限（默认 1 MiB），拒绝非 JSON 响应。
- **P1**：请求体大小（512 KB）与图规模（200 节点 / 500 边）上限校验。
- **P0**：VM 沙箱不再注入宿主 `JSON` / `Object` 等内置对象，消除 `constructor.constructor` 越狱通道。
- 迁移提示：升级后若生产环境设置了 `WORKFLOW_API_TOKEN`，前端须在执行面板输入同一令牌（或配置 `NEXT_PUBLIC_WORKFLOW_API_TOKEN` 用于内部演示）。

### Added

- `lib/logger.ts`：JSON Lines 结构化日志，支持分级、requestId、敏感字段脱敏、长度/深度截断。
- `lib/api-guard.ts`：令牌鉴权与内存滑动窗口限流。
- `lib/url-guard.ts`：出站 URL 安全网关。
- `__tests__/lib/safe-executor.test.ts`、`url-guard.test.ts`、`api-guard.test.ts`、`logger.test.ts`、`__tests__/api/execute-workflow.test.ts`：补齐引擎与沙箱零覆盖（新增 67 个用例，总数 135 → 202）。
- `docs/agent-builder-hunyuan-20261111/`：会话四件套（审核报告 / 任务规划 / 执行日志 / 总结同步）。
- `docs/YYC3-文档与日志机制规范.md`、`docs/04-测试审核阶段/0402-质量审核/003-首次全量回归测试报告.md`、本 `CHANGELOG.md`。
- `.env.example` 补齐 Anthropic / xAI / 鉴权 / 限流 / 出站防护 / 日志环境变量。

### Changed

- `vitest.config.ts` 覆盖率纳入 `app/api/**`，测试环境 `LOG_LEVEL=silent`。
- `components/execution-panel.tsx` 增加访问令牌输入与 401/429 可读错误提示；`app/page.tsx` 传递 `autoRunToken`。
- `package.json` 5 个 `latest` 依赖钉死为实测版本；`@vitest/coverage-v8` 对齐 `vitest` 主版本（5.0.1），消除 peer 不匹配。
- README / docs 索引 / 文档注册表同步：修正版本号偏差、失效会话链接、部署限制与功能状态矩阵。

### Docs

- 详见 `docs/agent-builder-hunyuan-20261111/02-执行日志与进度跟踪.md`（逐操作记录）与 `03-总结文档与状态同步.md`（会话收尾）。

---

## [v0.1.0] — 2026-10-29

初始版本：可视化编排、SSE 执行引擎、12 种节点、10 语言 i18n、代码导出、CI 质量门禁。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v0.1.2 | 2026-11-11 | 未闭环项落地：限流外置、节点真实现、引擎抽离、部署定案 | YYC³ Team |
| v0.1.1 | 2026-11-11 | 首次调研后 P0→P3 修复与文档机制建立 | YYC³ Team |
| v0.1.0 | 2026-10-29 | 初始版本 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
