---
file: YYC3-首次调研-问题分级与修复设计.md
title: YYC³ Agent Builder — 首次调研问题分级与修复完善优化补全设计
description: P0-P3 问题分级清单、根因、落地修复设计与实施状态
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-18
updated: 2026-11-18
status: stable
tags: [research, defect, fix-design, priority]
category: report
language: zh-CN
audience: developers,qa,managers
complexity: advanced
---

# YYC³ Agent Builder — 首次调研问题分级与修复完善优化补全设计

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

## 0. 分级定义

| 级别 | 定义 | 处置 |
| ---- | ---- | ---- |
| **P0 致命** | 可直接导致数据泄露/凭证外泄/服务不可用；或对外承诺与实现严重不符 | 立即停闸修复或书面风险接受 |
| **P1 严重** | 高危安全面、核心功能缺陷、不稳定执行 | 发布前必须修复或给出缓解 |
| **P2 一般** | 性能/可维护性/一致性缺陷，不阻断当前版本 | 排期修复 |
| **P3 优化** | 体验、告警、文档细节 | 迭代优化 |

**状态列**：✅ 已修复（本次执行）｜🔧 建议修复（需确认/排期）｜⏳ 待确认（C 编号对应采集报告确认清单）｜📋 已设计未执行（附方案）

---

## 1. P0 致命

| ID | 问题 | 根因 | 影响 | 状态 |
| ---- | ---- | ---- | ---- | ---- |
| P0-01 | SSRF 未拦截云元数据 `169.254.0.0/16` 与 IPv6 本地地址 | `validateUrl` 黑名单仅覆盖 IPv4 部分私网段 | 可读取云凭证（如 AWS metadata），横向穿透 | ✅ **已修复**：补全 `169.254.`/`::1`/`::`/`fc00:`/`fd00:`/`fe80:`；新增 12 条回归测试；门禁全绿 |
| P0-02 | 3 类节点（audio/embeddingModel/structuredOutput）占位实现却对外标 ✅ | 路由 switch 返回占位字符串（route.ts:361-394），README 特性矩阵标已实现 | 功能性误导，用户按文档使用后得到无意义输出 | ⏳ C-14：需产品确认实现排期或更正对外表述；**本次不改代码**（避免编造未承诺的实现） |

> 说明：P0-02 若确认"仅演示用途"，应降级为 P2 并修正 README；若确认"须可用"，则维持 P0 并排期实现。判断权在 C-14，不在本次调研。

---

## 2. P1 严重

| ID | 问题 | 根因 | 影响 | 状态 |
| ---- | ---- | ---- | ---- | ---- |
| P1-01 | `/api/execute-workflow` 无鉴权 | 路由直接 `POST` 无 middleware/token 校验 | 未授权调用付费模型（成本）、任意公网请求、VM 执行 | ⏳ C-13 + C-04：确认网络隔离或加鉴权 |
| P1-02 | VM 沙箱为 `node:vm` + 正则黑名单，非进程隔离 | `safe-executor.ts` 用 `vm.createContext`；Node 官方明确其不适合不可信代码 | `constructor` 链等潜在逃逸；正则误杀合法字符串 | 🔧 建议：确认鉴权后，评估迁移隔离执行（独立进程/容器/受限 runtime），**不擅自替换架构** |
| P1-03 | `fetch` 未禁重定向、无 DNS 解析后校验 | `route.ts:243` 直接 fetch | 302 到内网 / DNS 重绑定绕过 SSRF | 🔧 建议：加 `redirect:'error'` + 解析后 IP 复校（依赖 P1-01 决策） |
| P1-04 | 图执行无环检测、递归遍历 | `executeNode`/`processDownstream` 递归，无 visited 栈 | 循环连线 → 栈溢出/重复执行/耗尽 30s 预算 | 📋 **已设计未执行**：在 `executeNode` 入口维护 `executing:Set<nodeId>`，进入时检测，命中即抛 `Cycle detected: A->B->A` 并走 `node_error`；配套 TC-E05 红灯测试。**属执行引擎重构，待 C-06/C-13 确认后实施，避免超范围改动** |
| P1-05 | AI Provider 缺 key 时错误直出 | `S5` 错误信息入 SSE | 泄露内部端点/配置 | 🔧 建议：统一错误映射，对外输出 `MODEL_KEY_MISSING` 类码 |

---

## 3. P2 一般

| ID | 问题 | 根因 | 影响 | 状态 |
| ---- | ---- | ---- | ---- | ---- |
| P2-01 | 路由 489 行"上帝路由"，无独立 API 测试 | 五职责集中于单文件 | 难维护、难单测 | 📋 建议抽取 `lib/workflow-engine.ts`（待确认） |
| P2-02 | 代码标头合规率 0%（抽查 5/5 缺失） | 规范未接入 CI/hook | 可追溯性弱 | 🔧 建议：先补 `lib/**` 与新增测试文件标头，再增量推广；接入 script 检查（不擅自批量改用户文件） |
| P2-03 | 版本漂移：README vs package.json | 文档未随依赖更新 | 可复现性认知偏差 | ⏳ C-05：确认 SSOT 后同步 |
| P2-04 | `.env.example` 缺 XAI/Anthropic key | 文档遗漏 | 按文档配置后模型静默失败 | ✅ **已修复**：补声明（占位值，无真实密钥） |
| P2-05 | `pnpm-workspace.yaml` 占位值 `set this to true or false` | 疑似未替换模板 | 原生模块构建行为不明 | ⏳ C-15：**硬约束禁止改 workspace 架构，本次未改** |
| P2-06 | `latest` 漂浮依赖 | package.json 用 latest | `pnpm update` 引入未评审大版本 | 🔧 建议：锁文件已固定当前版本，建议后续钉版本（需 C-05） |
| P2-07 | 节点元数据四份手工同步 | palette 10 / 配色 12 / 组件 12 / switch 12 | 不一致风险 | 🔧 建议：生成单一节点定义源；**注意 palette=10 是测试契约，不可直接改** |
| P2-08 | 执行串行、HTTP 无超时/体积上限 | 顺序 await、裸 fetch | 复杂图延迟叠加、资源占用峰值 | 🔧 建议：加 `AbortSignal.timeout` + 响应体积上限；并行调度需评估 |
| P2-09 | 错误信息直出 SSE | `error.message` 未脱敏 | 辅助攻击测绘 | 同 P1-05 |
| P2-10 | 重复目录 `locales/` vs `public/locales/`、`hooks/` vs `components/ui/` | 迁移残留 | 维护双份、来源不明 | ⏳ C-08：确认权威目录后清理 |
| P2-11 | 验收文档目录 `reports/` 空 + 大量文件已删未提交 | 既有工作区状态 | 文档闭环断裂 | ⏳ C-12：**非本次产生，不予触碰** |
| P2-12 | 无部署/回滚/容灾文档 | 仓库未见 | 生产级必备缺失 | ⏳ C-04：确认环境后补 |

---

## 4. P3 优化

| ID | 问题 | 状态 |
| ---- | ---- | ---- |
| P3-01 | i18n Provider 测试 `act(...)` 警告 | 🔧 补 act 包裹 |
| P3-02 | build `Edge Runtime is deprecated` 警告 | 🔧 评估改 `nodejs` runtime（注意会影响静态生成） |
| P3-03 | `demo-country` 信任 `x-vercel-ip-country` 头 | 🔧 演示用途，低优先 |
| P3-04 | 无 Husky/git hook | 🔧 C-06 后评估引入 |
| P3-05 | base64 图像入 SSE 消息体过大 | 🔧 评估改 URL 引用 |
| P3-06 | `tsconfig target: ES6` 与实际现代语法 | 📋 评估提升 target |

---

## 5. 本次已执行修复清单（可核验）

| 序号 | 变更文件 | 变更内容 | 约束核查 | 验证 |
| ---- | ---- | ---- | ---- | ---- |
| F1 | `app/api/execute-workflow/route.ts` | `validateUrl` 扩展拦截 `169.254.`/`::1`/`::`/`fc00:`/`fd00:`/`fe80:`，hostname 去方括号归一化 | 未引入 BaaS、未硬编码 IP（仅黑名单）、未改 workspace、未切包管理、无循环依赖 | 12 条新测试通过 |
| F2 | `app/api/execute-workflow/route.ts` | `validateUrl` 导出为 `export function`（供测试引用，纯函数，不改行为） | 同上 | tsc/lint 0 |
| F3 | `.env.example` | 补 `ANTHROPIC_API_KEY` / `XAI_API_KEY` 占位声明 | 仅占位符，无真实凭证；符合环境变量注入 | 文档变更，无门禁影响 |
| F4 | `__tests__/lib/ssrf-validation.test.ts`（新增） | 12 条正向/反向 SSRF 回归测试 | 含完整 JSDoc 标头（符合标规） | 147/147 通过 |

**未执行项及原因**：P1-01/02/03（需 C-13/C-04 决策，避免编造鉴权/隔离架构）；P1-04（执行引擎重构，避免超范围改动，已给设计）；P0-02（需 C-14 产品决策）；P2-05（硬约束禁止改 workspace）；P2-11（既有工作区改动不触碰）。

---

## 6. 修复设计原则（对后续实施者）

1. **先确认后动手**：所有 ⏳ 项在确认清单闭环前不得按假设实现。
2. **红灯先行**：P1-04 环检测、P1-03 重定向防护须先写失败测试再实现。
3. **不破坏契约**：`NODE_TYPES_LIST` 长度 10 为测试固化契约；扩节点以"注册表生成"方式做，而非改断言。
4. **保留生产级逻辑**：任何修复不得省略异常处理、容灾/回滚路径；鉴权方案须含密钥环境变量注入（禁止硬编码）。
5. **门禁不绕过**：每批修复后重跑 lint/tsc/test/build，失败即停闸，禁止 `.skip` 粉饰。
6. **单向依赖**：新增模块仅 `components→lib`，禁止 `lib→components` 反向引用。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-18 | 首次调研：P0-P3 分级清单、根因分析、修复设计与本次执行记录 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
