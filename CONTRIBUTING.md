---
file: CONTRIBUTING.md
title: YYC³ Agent Builder 贡献指南
description: YYC³ Agent Builder 开源级贡献指南 —— 问题提交、代码贡献、文档规范、审查与发布流程
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-20
updated: 2026-11-20
status: stable
tags: [contributing, guide, develop]
category: guide
language: zh-CN
audience: contributors, maintainers
complexity: intermediate
license: MIT
copyright: Copyright (c) 2026 YanYuCloudCube™（YYC³）
---

# YYC³ Agent Builder 贡献指南

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

欢迎参与 YYC³ Agent Builder 的贡献！我们感谢每一位贡献者的投入，无论是提交问题、改进文档、编写代码还是参与讨论。

本指南适用于所有向本项目提交贡献的个人与团队。请在发起贡献前完整阅读。

---

## 1. 行为准则

本项目遵循 [YYC³ 社区行为准则](./CODE_OF_CONDUCT.md)。参与本项目即表示您同意遵守该准则。请阅读并理解其中的标准，以确保我们共同维护一个友好、开放、包容的社区。

---

## 2. 如何贡献

### 2.1 报告问题（Bug / 功能建议）

在提交新问题前，请先检查 [Issues](https://github.com/YYC-Cube/YYC3-Agent-Builder/issues) 是否已有相关讨论。

若未找到，请使用 `.github/ISSUE_TEMPLATE/` 中的模板创建问题，并包含：

- 清晰的标题与描述
- 复现步骤（针对 Bug）
- 预期行为与实际行为
- 环境信息（Node 版本、pnpm 版本、操作系统、浏览器）
- 相关截图或日志（如适用）

### 2.2 提交代码（Pull Request）

我们欢迎代码贡献，但所有 PR 必须通过质量门禁。请遵循以下流程：

1. **Fork 仓库**：在 GitHub 上 Fork 本仓库到您的账号。
2. **创建分支**：从 `main` 分支拉出特性分支，命名规范为 `type/简短描述`（如 `feat/xxx-node`、`fix/xxx-issue`）。
3. **开发**：遵循项目代码规范，所有新增/修改文件需包含 [YYC³ 团队代码标头规范](./docs/YYC3-团队通用-标规文档/YYC3-团队通用-开发标准.md) 定义的 JSDoc 标头。
4. **本地验证**：提交前务必全部通过以下命令：

```bash
pnpm install          # 安装依赖（pnpm@10.17.0）
pnpm lint             # ESLint — 0 警告
npx tsc --noEmit      # TypeScript — 0 错误（strict mode）
pnpm test             # Vitest — 全部通过
pnpm build            # Next.js 生产构建 — 无错误
```

5. **提交 PR**：向 `main` 分支发起 Pull Request，描述变更内容、关联的 Issue 编号及测试结果。

### 2.3 提交文档

所有 Markdown 文档必须包含 [YYC³ 团队标头规范](./docs/YYC3-团队通用-标规文档/YYC3-团队通用-标头标尾.md) 定义的 YAML Front Matter，必填字段包括：

| 字段 | 说明 |
|------|------|
| `file` | 与磁盘文件名完全一致（ASCII `YYC3` 形式） |
| `title` | 与正文 H1 标题一致 |
| `description` | 简洁描述，不超过 50 字 |
| `author` | `YYC³ Team <admin@0379.email>` |
| `version` | 语义化版本号（SemVer） |
| `created` / `updated` | `YYYY-MM-DD` |
| `status` | `draft` / `active` / `stable` 等 |
| `tags` | 合法 YAML 流式序列 `[标签1, 标签2, 标签3]` |
| `category` | `general` / `technical` / `api` / `project` / `design` / `guide` / `policy` |
| `language` | `zh-CN` / `en-US` / `ja-JP` |

---

## 3. 开发规范

### 3.1 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 16.4.5 |
| UI 引擎 | React | 19.1.0 |
| 样式 | Tailwind CSS v4（oklch） | 4.1.9 |
| 包管理 | pnpm | 10.17.0（`package.json` 中 `packageManager`） |
| 测试 | Vitest + React Testing Library | 5.1.0 |
| 类型 | TypeScript strict mode | 5.x |

### 3.2 代码风格

- 使用 TypeScript strict mode，禁止 `any`（除非有明确理由并注释）
- 组件采用 PascalCase 命名，Hook 采用 `useXxx` 驼峰命名
- 使用 shadcn/ui new-york 风格 + Radix UI 原语
- 所有代码文件包含 JSDoc 标头，标签按 **类型 → 功能 → 模块** 排列
- ESLint + Prettier 统一格式，`--max-warnings 0`

### 3.3 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

[可选正文]

[可选脚注]
```

示例：

```
feat(core): 新增条件分支受限表达式求值器
fix(core): 修复 Next.js 16.4.2 moderate 漏洞，升级至 16.4.5
docs(readme): 对齐开源级标准，补全贡献/安全/行为准则文件
```

---

## 4. 审查与合并流程

### 4.1 PR 审查清单

每个 PR 在合并前必须满足：

- [ ] CI 质量门禁全部通过（ESLint → tsc → vitest → build）
- [ ] 代码覆盖率无显著下降
- [ ] 新增/修改功能有对应测试用例
- [ ] 文档已更新（README / API 参考 / 配置参考）
- [ ] 无循环依赖，无硬编码密钥/IP/凭证
- [ ] 异常处理、容灾与回滚机制完整

### 4.2 合并权限

- 维护者可直接合并通过 CI 的 PR
- 外部贡献者的 PR 需至少一名维护者 Review 并 Approve
- 涉及安全、数据库架构、部署配置的变更需两名维护者 Approve

---

## 5. 发布与版本

本项目遵循 [语义化版本 (SemVer 2.0.0)](https://semver.org/)：

- `PATCH`：内容修正 / Bug 修复
- `MINOR`：新增向下兼容功能
- `MAJOR`：结构重组 / 不兼容变更

每个版本对应 Git Tag 与 `CHANGELOG.md` 条目。

---

## 6. 联系方式

- 问题与建议：[GitHub Issues](https://github.com/YYC-Cube/YYC3-Agent-Builder/issues)
- 行为准则举报：`admin@0379.email`
- 官方站点：https://agent.yyc3.vip

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-20 | 初始版本，对齐 YYC³ 标头标尾规范 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
