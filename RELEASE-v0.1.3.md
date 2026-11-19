---
file: RELEASE-v0.1.3.md
title: YYC³ Agent Builder v0.1.3 发布说明
description: YYC³ Agent Builder 可视化 AI 工作流编排平台 v0.1.3 正式发布说明 —— 安全基线加固、开源级文档体系、P1 后续项落地与 CI 质量门禁
author: YYC³ Team <admin@0379.email>
version: v0.1.3
created: 2026-11-20
updated: 2026-11-20
status: stable
tags: [release, changelog, security, opensource]
category: report
language: zh-CN
audience: developers, maintainers, users, stakeholders
complexity: basic
license: MIT
copyright: Copyright (c) 2026 YanYuCloudCube™（YYC³）
---

# YYC³ Agent Builder v0.1.3 发布说明

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 📦 版本概览

| 项目 | 内容 |
|------|------|
| **版本号** | v0.1.3 |
| **发布日期** | 2026-11-20 |
| **前一版本** | v0.1.2（2026-11-11） |
| **许可证** | [MIT](./LICENSE) |
| **仓库** | https://github.com/YYC-Cube/YYC3-Agent-Builder |
| **合并分支** | `fix/security-untrusted-code` → `main` |
| **CI 状态** | ✅ Code Quality pass（ESLint 0 / tsc 0 / vitest 286 通过 / build 通过） |
| **包管理器** | pnpm@10.17.0（`package.json` `packageManager` 已固定） |
| **核心依赖** | Next.js 16.4.5 / React 19.1.0 / Tailwind CSS v4 / Vercel AI SDK 7.0.142 |

---

## 🔒 安全基线（重点）

| 安全项 | 变更 | 状态 |
|--------|------|------|
| 代码沙箱 | **默认熔断不可信代码执行**：`javascript` / `tool` 节点需显式 `ENABLE_UNSAFE_CODE_NODES=true` 才可执行；`conditional` 改用 `lib/expression-evaluator.ts` 受限表达式求值（白名单变量/方法/运算符，禁止 `constructor` / `__proto__` / `prototype` 与任意全局对象）。 | ✅ 新增 |
| 漏洞修复 | Next.js `16.4.2 → 16.4.5`，修复 `GHSA-mfr8-8qww-v76h` / `GHSA-vc7v-qv4w-wrv8`（moderate）。 | ✅ 修复 |
| Tailscale IP | 移除部署模板中的固定 Tailscale IP，改为 `CHANGE_ME_*` 占位；真实地址仅写入不入库的 `.env.production`。 | ✅ 修复 |
| CI 配置 | `package.json` 补充 `packageManager: pnpm@10.17.0`，修复 `pnpm/action-setup@v4` 无法读取版本导致的 CI 安装失败。 | ✅ 修复 |

> 注意：`node:vm` 不是安全边界（Node.js 官方声明），公网多租户场景不得依赖本沙箱，必须使用进程级或独立沙箱服务。

---

## 🛠️ P1 后续项落地

| 编号 | 内容 | 文件 |
|------|------|------|
| P1-1 | `run_events.payload` 存储 base64 图片/音频导致 DB 膨胀，改为递归截断，超阈值改为 `$mediaRef` 对象存储引用占位，设媒体上限与 TTL。 | `lib/runs/repository.ts` |
| P1-2 | `lib/code-generator.ts` 修正 `maxTokens → maxOutputTokens`（AI SDK 7 变更）；图片节点 `generateText().files → generateImage`；条件分支空实现补全；新增“生成物 tsc 可编译”测试。 | `lib/code-generator.ts`、`__tests__/lib/code-generator.test.ts` |
| P1-3 | README 及多处文档固定 Tailscale IP `100.65.172.88` / `100.87.159.21` 全部替换为 `CHANGE_ME_*` 占位。 | `README.md` |
| P1-4 | `docker-compose.prod.yml` 显式传入 `DATABASE_URL`、`WORKFLOW_API_TOKEN` 从 `env_file` 注入；`/api/health` 健康检查新增主库（`SELECT 1`）与 Redis（`PING`）探测，不可用返回 503。 | `deploy/docker-compose.prod.yml`、`app/api/health/route.ts` |
| P1-5 | 统一执行超时预算 28s；客户端断开透传 `AbortSignal` 取消进行中 AI 调用。 | `app/api/execute-workflow/route.ts`、`lib/workflow-engine.ts` |
| P1-6 | 文档移除 Supabase/Neon 表述（改为 PG15 自建，符合禁止 BaaS 约束）；README 指标漂移修正（API Routes 2→6、SSE 实际为 NDJSON、License `Private → MIT`）。 | `docs/.../04-未闭环项决策与实施方案.md`、`README.md` |

---

## 📖 开源级文档体系（新增）

| 文档 | 用途 | 路径 |
|------|------|------|
| 行为准则 | 社区行为准则，报告渠道 `admin@0379.email` | `./CODE_OF_CONDUCT.md` |
| 贡献指南 | 开源级贡献流程：问题提交、代码贡献、审查与发布 | `./CONTRIBUTING.md` |
| 安全政策 | 漏洞私密报告、响应时限、安全基线控制矩阵 | `./SECURITY.md` |
| 问题模板 | Bug 报告 / 功能建议 | `.github/ISSUE_TEMPLATE/bug_report.md`、`.github/ISSUE_TEMPLATE/feature_request.md` |
| PR 模板 | 贡献协作检查清单（质量门禁、代码规范、文档、测试） | `.github/pull_request_template.md` |
| README 重构 | 徽章设计、可视化交互体系、文档架构地图、MIT 许可证、项目指标 | `./README.md` |
| package.json 元数据 | `description`、`author`、`license: MIT`、`repository`、`keywords`（17 个标签）、`funding` | `./package.json` |

---

## 🏗️ 技术栈快照

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | Next.js (App Router) | 16.4.5 | React 全栈框架 |
| UI 引擎 | React | 19.1.0 | 声明式 UI |
| 组件库 | shadcn/ui (new-york) | — | 56 个 Radix UI 组件 |
| 样式 | Tailwind CSS v4 + oklch | 4.1.9 | 原子化 CSS |
| 流程图 | @xyflow/react | 12.12.0 | 节点编辑器 |
| AI SDK | Vercel AI SDK (`ai`) | 7.0.142 | 统一 AI 调用 |
| 测试 | vitest | 5.1.0 | 单元 + 组件 + API 路由测试 |
| 包管理 | pnpm | 10.17.0 | `packageManager` 已固定 |
| 类型 | TypeScript | 5.x | strict 模式 |

---

## 📈 代码质量指标

| 指标 | 结果 | 标准 |
|------|------|------|
| TypeScript 编译错误 | **0** ✅ | strict mode |
| ESLint Warnings | **0** ✅ | `--max-warnings 0` |
| 测试通过数 | **286/286** ✅ | vitest 5.1.0 |
| 生产构建 | **通过** ✅ | `pnpm build`（standalone） |
| CI 质量门禁 | **pass** ✅ | ESLint → tsc → vitest → build |

---

## 🚀 快速开始

```bash
# 1. 克隆仓库
git clone git+https://github.com/YYC-Cube/YYC3-Agent-Builder.git
cd YYC3-Agent-Builder

# 2. 安装依赖（pnpm@10.17.0）
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 API Keys；生产环境务必设置 WORKFLOW_API_TOKEN

# 4. 启动开发服务器
pnpm dev        # → http://localhost:3146

# 5. 验证质量门禁
pnpm lint         # ESLint — 0 warnings
npx tsc --noEmit  # TypeScript — 0 errors
pnpm test         # Vitest — 全部通过
pnpm build        # Next.js 生产构建 — 无错误
```

---

## 🔗 相关链接

- [项目首页](https://github.com/YYC-Cube/YYC3-Agent-Builder)
- [问题反馈](https://github.com/YYC-Cube/YYC3-Agent-Builder/issues)
- [贡献指南](./CONTRIBUTING.md)
- [安全政策](./SECURITY.md)
- [行为准则](./CODE_OF_CONDUCT.md)
- [变更日志](./CHANGELOG.md)
- [官方站点](https://agent.yyc3.vip)

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v0.1.3 | 2026-11-20 | 安全基线加固、开源级文档体系、P1 后续项落地、CI 质量门禁 | YYC³ Team |
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
