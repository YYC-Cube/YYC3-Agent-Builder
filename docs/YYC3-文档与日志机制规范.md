---
file: YYC3-文档与日志机制规范.md
title: YYC³ Agent Builder 文档与日志机制规范
description: 上下文存档 · 执行日志 · 变更日志 · 运行时结构化日志的统一机制
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-11
updated: 2026-11-11
status: stable
tags: [standard, documentation, logging, handoff]
category: policy
language: zh-CN
audience: developers, ai-tutors, stakeholders
complexity: intermediate
---

# YYC³ Agent Builder 文档与日志机制规范

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

## 一、机制目标

依据《YYC3-团队通用-开发文档》§2「文档存档体系」与 §3「执行流程」，为本仓库固化两类日志：

| 类型 | 载体 | 用途 | 更新时机 |
| --- | --- | --- | --- |
| **协作日志（人读）** | `docs/{项目}-{导师}-{日期}/02-执行日志与进度跟踪.md` | 记录每次代码/配置变更的动机、范围、验证结果 | 每次操作实时追加 |
| **运行时日志（机读）** | `lib/logger.ts` → stdout/stderr JSON Lines | 记录请求、节点执行、安全拒绝、异常，供平台采集 | 每次请求自动输出 |

## 二、会话工作目录（固定四件套）

```
docs/{项目名}-{导师标识}-{YYYYMMDD}/
├── 00-项目现状审核报告.md       # 首次接触项目必做，基于代码实证
├── 01-任务规划与节点目标.md     # 按 P0→P3 分解任务与验收标准
├── 02-执行日志与进度跟踪.md     # 实时追加，含验证结果
├── 03-总结文档与状态同步.md     # 会话收尾，含下次起点与 TOP 3
└── attachments/                 # 可选：截图、测试数据
```

本次会话目录：`docs/agent-builder-hunyuan-20261111/`

**命名约束**：目录名与文件名使用 ASCII `YYC3`；正文品牌统一 `YYC³`；所有 md 必须含 YAML Front Matter（字段顺序见《YYC3-团队通用-标头标尾》§2）、品牌标头、变更历史与版权标尾。

## 三、协作日志条目格式（02 文档）

```markdown
### {YYYY-MM-DD HH:MM} - {操作摘要}

**操作类型**: Bug修复 / 新增功能 / 重构 / 配置变更 / 文档
**涉及文件**: `path/file.ts:Lx-Ly`
**操作详情**: 做了什么、为什么（关联问题编号 P0-1 等）
**验证结果**: 命令 + 实测输出（禁止写「应该通过」）
**当前状态**: ✅ 成功 / ⚠️ 有警告 / ❌ 失败 / 🔒 阻塞
**下一步**: 紧接的动作
```

**红线**：不记录真实密钥、Token、完整请求体；敏感值一律写 `${ENV_VAR_NAME}` 或 `[REDACTED]`。

## 四、项目级变更日志

根目录 `CHANGELOG.md` 采用 Keep a Changelog 结构，按版本倒序，分组 `Added / Changed / Fixed / Security / Docs`。
每次合并 `main` 前必须更新；P0 修复须在 `Security` 或 `Fixed` 中标注影响面与迁移步骤。

## 五、运行时结构化日志（`lib/logger.ts`）

### 5.1 输出格式

```json
{"ts":"2026-11-11T06:00:00.000Z","level":"info","module":"execute-workflow","requestId":"a1b2c3d4","message":"workflow execution started","nodeCount":3,"edgeCount":2}
```

| 字段 | 说明 |
| --- | --- |
| `ts` | ISO 8601 UTC |
| `level` | `debug` / `info` / `warn` / `error` |
| `module` | 产生日志的模块名 |
| `requestId` | 单次请求贯穿标识，由 `createLogger` 生成、`child()` 继承 |
| `message` | 简短动作描述 |
| 其余 | 结构化上下文，自动脱敏 |

### 5.2 强制约束

1. **脱敏**：键名匹配 `authorization / token / apiKey / password / secret / cookie / x-workflow-token` 等一律输出 `[REDACTED]`；字符串超 2000 字符截断；对象深度上限 4。
2. **分级**：`LOG_LEVEL` 支持 `debug|info|warn|error|silent`，默认 `info`；测试环境设 `silent` 避免噪声。
3. **不落盘**：服务端只写 stdout/stderr，禁止在应用内写日志文件（避免容器无状态丢失与权限问题）。
4. **禁止记录**：完整工作流 payload、用户输入原文、模型响应正文、API Key。
5. **安全事件必记**：401/429、SSRF 拒绝、沙箱拒绝、节点执行失败，级别 ≥ `warn`。

### 5.3 使用方式

```ts
import { createLogger } from "@/lib/logger"

const log = createLogger("execute-workflow")
log.info("workflow execution started", { nodeCount: nodes.length })
log.warn("request rejected", { status: 401, clientId })
```

## 六、文档同步检查清单（每次 PR）

- [ ] 代码行为变化 → README 对应章节已更新
- [ ] 新增环境变量 → `.env.example` 与 README「配置参考」已更新
- [ ] 新增/删除文档 → `docs/README.md` 索引与 `docs/document_registry.json` 已更新
- [ ] 功能/安全修复 → `CHANGELOG.md` 已记录
- [ ] 本次会话 → `02-执行日志` 与 `03-总结文档` 已同步
- [ ] 全部 md 的 Front Matter / 标头标尾 / 品牌写法合规

## 七、环境变量清单

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `LOG_LEVEL` | `info` | 运行时日志级别 |
| `WORKFLOW_API_TOKEN` | 未设置（开发态开放） | 执行 API 访问令牌 |
| `WORKFLOW_RATE_LIMIT_MAX` | `20` | 每窗口每 IP 最大请求数 |
| `WORKFLOW_RATE_LIMIT_WINDOW_MS` | `60000` | 限流窗口（毫秒） |
| `WORKFLOW_HTTP_TIMEOUT_MS` | `10000` | 出站 HTTP 超时 |
| `WORKFLOW_HTTP_MAX_BYTES` | `1048576` | 出站响应体上限 |

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-11 | 建立文档四件套、变更日志与运行时结构化日志机制 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
