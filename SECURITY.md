---
file: SECURITY.md
title: YYC³ Agent Builder 安全政策
description: YYC³ Agent Builder 漏洞披露与安全响应政策，面向安全研究员与贡献者
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-20
updated: 2026-11-20
status: stable
tags: [security, policy, vulnerability]
category: policy
language: zh-CN
audience: security-researchers, contributors, maintainers
complexity: intermediate
license: MIT
copyright: Copyright (c) 2026 YanYuCloudCube™（YYC³）
---

# YYC³ Agent Builder 安全政策

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

## 支持的版本

| 版本 | 状态 | 说明 |
|------|------|------|
| 0.1.x | ✅ 支持 | 当前活跃开发线，接收安全修复 |
| < 0.1.0 | ❌ 不支持 | 已停止维护，建议升级至最新版本 |

我们仅为最新发行版提供安全补丁。旧版本不再接收安全更新，请及时升级。

---

## 报告漏洞

### 6.1 报告渠道

请勿在公开 Issue 中披露安全漏洞。将安全问题通过以下私密渠道报告：

- 电子邮件：`admin@0379.email`
- 邮件主题建议：`[SECURITY] YYC³ Agent Builder - <漏洞简述>`

### 6.2 报告内容

为便于快速定位与修复，请在报告中尽可能包含：

- 漏洞标题与简要描述
- 受影响的版本与组件（如 `lib/safe-executor.ts`、`app/api/execute-workflow/route.ts`）
- 复现步骤与 PoC（如适用）
- 潜在影响范围（数据泄露、远程代码执行、权限绕过等）
- 修复建议（如有）

### 6.3 响应时限

| 阶段 | 时限 | 说明 |
|------|------|------|
| 收到确认 | 2 个工作日 | 维护团队确认收到报告 |
| 初步评估 | 5 个工作日 | 给出漏洞严重程度与可复现性判断 |
| 修复计划 | 10 个工作日 | 提供修复方案或临时缓解措施 |
| 补丁发布 | 视严重程度而定 | 严重漏洞优先发布补丁版本 |

我们将在处理过程中与报告人保持沟通，并在修复完成后在 `CHANGELOG.md` 与 GitHub Release Notes 中致谢（除非报告人要求匿名）。

---

## 安全基线（项目已实施）

| 能力 | 实现 | 状态 |
|------|------|------|
| 执行 API 鉴权 | `WORKFLOW_API_TOKEN` + 定时常数时间比较 | ✅ 已接入 |
| 滑动窗口限流 | 内存 / Redis，默认 20 次/60s/IP，401/429 | ✅ 已接入 |
| SSRF 防护 | DNS 解析后逐 IP 判定、禁重定向、方法白名单、超时与大小上限 | ✅ 已加固 |
| 代码沙箱 | 默认熔断：`javascript`/`tool` 需显式 `ENABLE_UNSAFE_CODE_NODES=true`；`conditional` 走受限表达式求值（无 eval/Function/全局对象） | ✅ 已加固 |
| 日志脱敏 | JSON Lines + 敏感字段脱敏，不记录完整 payload 与模型响应正文 | ✅ 已接入 |
| 容器健康检查 | `/api/health` 探测主库与 Redis 连通性 | ✅ 已接入 |

> 注意：`node:vm` 不是安全边界（Node.js 官方声明），公网多租户场景不得依赖本沙箱，必须使用进程级或独立沙箱服务。

---

## 漏洞披露

经维护团队确认并修复后，漏洞详情将在补丁发布后通过 `CHANGELOG.md` 与 GitHub Security Advisories 公开披露。感谢所有以负责任方式披露安全问题的研究员。

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
