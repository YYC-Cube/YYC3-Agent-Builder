---
file: 003-执行引擎安全基线与SSRF加固.md
title: YYC³ Agent Builder 执行引擎安全基线与 SSRF 加固
description: 鉴权、限流、沙箱、出站网关、输入校验的威胁模型与验证证据
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-11
updated: 2026-11-11
status: published
tags: [安全, SSRF, 沙箱, 限流, 合规]
category: report
language: zh-CN
audience: security, developers, ops
complexity: advanced
---

# YYC³ Agent Builder 执行引擎安全基线与 SSRF 加固

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、威胁模型

| 威胁 | 载体 | 影响 | 现有控制 |
| --- | --- | --- | --- |
| API Key 盗刷 | 公开执行 API | 真实资金损失 | 令牌鉴权 + 滑动窗口限流 |
| SSRF 打内网/云元数据 | `httpRequest` 节点 | 凭证泄露、内网渗透 | DNS/IP 判定 + 禁重定向 + 方法白名单 |
| 沙箱逃逸 | `javascript` / `tool` / `conditional` | 宿主 RCE | VM 隔离 + 禁关键字 + 5s 超时 + 无宿主对象 |
| 资源耗尽 | 超大图 / 深环 / 超大响应 | OOM / 悬挂连接 | 512KB 请求体、200 节点、100 层、1MiB 响应、10s 超时 |
| 原型污染 | 节点 data 传参 | 逻辑污染 | 用户代码在独立上下文执行，不接触宿主对象 |
| 日志泄露 | 错误信息 | 凭证/隐私外泄 | 结构化日志 + 敏感字段脱敏 |

## 二、控制矩阵

| 层 | 控制 | 位置 | 验证 |
| --- | --- | --- | --- |
| 入口 | 令牌（`x-workflow-token` / Bearer） | `lib/api-guard.ts` | 401 用例 + 黑盒 |
| 入口 | 滑动窗口限流（Memory/Redis） | `lib/rate-limit-store.ts` | 429 + `Retry-After` 用例 |
| 入口 | 请求体 / 图规模上限 | `route.ts` | 400 / 413 用例 |
| 执行 | 环图深度保护 + visited | `lib/workflow-engine.ts` | `maximum execution depth` 用例 |
| 执行 | 沙箱双模式、禁 `require/process/eval` | `lib/safe-executor.ts` | 逃逸/黑名单用例 |
| 出站 | 协议/凭据/localhost/私网/IP 变形/DNS | `lib/url-guard.ts` | 29 个用例 |
| 出站 | 禁 3xx、方法白名单、10s 超时、1MiB | `lib/url-guard.ts` | 302/大小/超时用例 |
| 观测 | JSON Lines + 脱敏 | `lib/logger.ts` | 脱敏用例 |

## 三、SSRF 判定细节

1. 仅允许 `http:` / `https:`；拒绝 URL 内嵌凭据。
2. 拒绝 `localhost`、`*.localhost`、`*.local` 等本地后缀。
3. 若 hostname 是 IP 字面量，直接判定；否则 `dns.lookup(all, verbatim)` 后逐一判定（fail-closed）。
4. 私网/保留段：`10/8`、`172.16/12`、`192.168/16`、`127/8`、`0/8`、`169.254/16`（云元数据）、`100.64/10`、`224/4`、`240/4`；IPv6：`::1`、`fc00::/7`、`fe80::/10`、`::ffff:0:0/96` 映射地址（含十六进制写法）。
5. 请求使用 `redirect: "manual"`，3xx 直接拒绝，防止 302 绕过。
6. 响应体在流式读取中累加计数，超限立即中断。

**残留风险**：DNS rebinding（校验与连接之间的 TOCTOU 窗口）。缓解：出口防火墙白名单 + 生产网络策略；如需彻底消除需自定义 `undici` Agent 固定解析 IP。

## 四、沙箱边界

- 用户代码在 `node:vm` 新上下文中执行，仅注入 `__inputsJSON` 字符串；
- 输入经 `JSON.stringify` 序列化，宿主 `JSON/Object/Array` 不再暴露，`constructor.constructor` 无法取得宿主 `process`；
- 顶层 `return` 自动切换函数模式，无 `return` 保持脚本模式（尾表达式）；
- 5s V8 硬超时；代码长度 ≤ 5000；禁用 `require/process/import/eval/Function/global/child_process/fs/net/http/...`；
- **注意**：`vm` 不是安全边界，生产对不可信用户应叠加容器级隔离（独立进程/资源限制）。

## 五、合规与运维要求

- 生产必须设置 `WORKFLOW_API_TOKEN`，并定期轮换；
- 多实例必须使用 Redis 限流，且网关层二次限流；
- 日志保留满足审计要求，禁止记录 prompt 正文与音频/图片 base64；
- 发现沙箱逃逸或 SSRF 命中内网，立即下线执行 API 并走安全事件流程。

## 六、验证证据

| 用例 | 结果 |
| --- | --- |
| 未带令牌 | 401 |
| 超过限流 | 429 + `Retry-After` |
| `169.254.169.254` | 拒绝（SSRF protection） |
| `require("fs")` | 拒绝（forbidden pattern） |
| 环图 | 深度保护报错，不挂死 |
| 302 重定向 | 拒绝 |
| 5MB 响应 | 超限拒绝 |

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-11 | 安全基线与 SSRF 加固说明 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
