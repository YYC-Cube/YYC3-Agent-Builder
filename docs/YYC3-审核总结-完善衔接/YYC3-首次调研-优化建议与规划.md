---
file: YYC3-首次调研-优化建议与规划.md
title: YYC³ Agent Builder — 首次调研优化建议与规划
description: 确认项处置、分阶段优化路线、停闸规则与风险防控建议
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-18
updated: 2026-11-18
status: stable
tags: [planning, recommendation, roadmap, risk]
category: plan
language: zh-CN
audience: managers,developers,qa
complexity: intermediate
---

# YYC³ Agent Builder — 首次调研优化建议与规划

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

## 1. 规划原则

1. **确认优先**：C-01~C-15 未闭环前，不按假设实现（禁止自填默认值）。
2. **安全先行**：P0/P1 安全项排在功能优化之前。
3. **红灯先行**：新增防护先写失败测试，再实现。
4. **门禁不绕**：每批变更重跑 lint/tsc/test/build；失败即停闸。
5. **约束不破**：不引入 BaaS、不硬编码 IP/密钥、不切包管理、不改 workspace 架构、不造循环依赖、不省略生产级逻辑。

---

## 2. 确认清单处置计划（C-01~C-15）

| 编号 | 事项 | 责任方（建议） | 建议时限 | 不确认的后果 |
| ---- | ---- | ---- | ---- | ---- |
| C-01 | 用户画像 | 产品 | Sprint0+1 | 验收口径模糊 |
| C-02 | PG15+Redis 架构归属 | 架构 | Sprint0+1 | 数据层决策悬空 |
| C-03 | 工作流持久化需求 | 产品+架构 | Sprint1 | 刷新恢复/分享能力不明 |
| C-04 | 部署形态 | 运维 | **立即** | 鉴权/容灾方案无法定稿 |
| C-05 | 版本口径 SSOT | 维护者 | Sprint1 | 构建可复现性认知偏差 |
| C-06 | 是否迁移 `src/` 布局 | 架构 | Sprint2 | 标头脚本/别名路径规划受阻 |
| C-07 | pnpm 版本统一 | 维护者 | Sprint1 | CI 稳定性风险 |
| C-08 | 重复目录清理 | 开发 | Sprint2 | 双份维护成本 |
| C-09 | 干系人 RACI | 项目管理 | **立即** | 对接审批链不清 |
| C-10 | 发布周期 | 维护者 | Sprint1 | 门禁强度/回归范围不明 |
| C-11 | 反馈渠道 | 维护者 | Sprint1 | 缺陷闭环无入口 |
| C-12 | 已删验收文档去留 | 原作者 | **立即** | 文档闭环断裂 |
| C-13 | API 鉴权策略 | 产品+安全 | **立即** | 生产化闸口 |
| C-14 | 占位节点定性 | 产品 | **立即** | 对外承诺真实性 |
| C-15 | workspace 占位值 | 维护者 | Sprint1 | 原生模块构建行为 |

> "立即"项（C-04/09/12/13/14）构成 Sprint1 启动前置条件。

---

## 3. 分阶段优化路线

### Sprint 0 — 首次调研与止血（✅ 已完成 2026-11-18）
- [x] 四层信息采集 + 15 项确认清单
- [x] 六维穿透式诊断（现状/问题/影响）
- [x] 测试方案 + 通过/失败规则
- [x] **P0-01 SSRF 元数据/IPv6 修复 + 12 条回归测试**
- [x] .env.example 补全 XAI/Anthropic 声明
- [x] 双目录文档落盘
- [x] 门禁复验：147/147、tsc 0、lint 0、build 0

### Sprint 1 — 生产化闸口（阻塞项）
- [ ] 关闭 C-04 / C-13：确定部署边界 + 实施鉴权（环境变量注入密钥）
- [ ] 关闭 C-14：占位节点实现或文档更正
- [ ] P1-04 环检测：红灯测试 TC-E05 → 实现 `executing:Set` → 绿灯
- [ ] 关闭 C-12：验收文档去留
- [ ] 门禁全绿方可进入 Sprint2

### Sprint 2 — 安全加固与一致性
- [ ] P1-03 重定向/DNS 重绑定防护（TC-S05/S06）
- [ ] P1-02 VM 沙箱增强评估 + TC-S07/S08/S09
- [ ] P1-05 错误信息脱敏
- [ ] C-05/C-07 版本口径统一（README、packageManager）
- [ ] P2-07 节点元数据单一源（保持 palette=10 契约）
- [ ] P2-08 HTTP 超时/体积上限

### Sprint 3 — 可维护性收尾
- [ ] C-06 `src/` 布局评估
- [ ] C-08 重复目录清理
- [ ] P2-02 标头增量补全 + CI 检查脚本
- [ ] P2-12 部署/回滚/容灾文档（依赖 C-04）
- [ ] P3 项批量优化（act 警告、Edge runtime 迁移、demo-country 回退）

---

## 4. 停闸与风险防控规则

### 4.1 停闸触发
- 任一质量门禁 EXIT≠0。
- P0 用例失败或 P1 安全项未闭环且无书面风险接受。
- 发现测试被 `.skip`/`.todo` 删除以伪造通过。
- 触碰硬约束红线（见 4.2）立即回滚并停闸。

### 4.2 硬约束核查表（本次执行结果）

| 约束 | 本次核查 | 结果 |
| ---- | ---- | ---- |
| 禁止引入 Supabase/Firebase 等 BaaS | 未引入；无相关依赖 | ✅ 通过 |
| 禁止替换 PG15+Redis 自研数据架构 | 未改动数据层（本仓无该架构，已列 C-02） | ✅ 通过 |
| 禁止硬编码 Tailscale IP/密钥/凭证 | 未硬编码；SSRF 仅黑名单字面量；key 走 env | ✅ 通过 |
| 禁止切换包管理器 | 全程 pnpm，未改 lockfile 管理器 | ✅ 通过 |
| 禁止修改 pnpm workspace 架构 | `pnpm-workspace.yaml` 未改动（C-15） | ✅ 通过 |
| 禁止破坏单向依赖/引入循环依赖 | lib→components 仍 0 命中 | ✅ 通过 |
| 禁止编造不存在的内部接口/服务/配置 | 未新增任何接口，仅导出既有纯函数 | ✅ 通过 |
| 禁止省略异常处理/容灾/回滚 | 未删减任何错误处理；新增测试强化校验 | ✅ 通过 |
| 禁止未读文件就修改/超范围改动 | 所有改动文件先读后改；仅 2 文件 + 1 新增测试 | ✅ 通过 |
| 禁止把失败粉饰为通过/跳过停闸 | build 并发失败如实记录并等待重验 | ✅ 通过 |
| 禁止绕过安全钩子/密钥扫描/权限校验 | 未绕过任何钩子 | ✅ 通过 |

---

## 5. 验收与二次复核

本规划的落地情况由《YYC3-首次调研-协作对接手册.md》中的验收校验提示词支持二次复核与闭环整改。每次 Sprint 结束应重新运行全套门禁，并更新问题分级清单状态列。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-18 | 首次调研：确认清单处置计划、四阶段路线、停闸与硬约束核查表 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
