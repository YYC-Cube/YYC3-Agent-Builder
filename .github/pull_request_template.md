---
name: Pull Request
about: 提交代码或文档变更
title: "[type](scope): description"
labels: []
assignees: ""
---

## 📋 概述

简要描述本次 PR 的变更内容。

关联 Issue：#（如有）

## 🔍 变更类型

- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化
- [ ] 安全修复
- [ ] 其他（请说明）

## ✅ 质量门禁

提交前请确保全部通过：

- [ ] `pnpm install`（pnpm@10.17.0）
- [ ] `pnpm lint`（ESLint — 0 警告）
- [ ] `npx tsc --noEmit`（TypeScript — 0 错误，strict mode）
- [ ] `pnpm test`（Vitest — 全部通过）
- [ ] `pnpm build`（Next.js 生产构建 — 无错误）

## 📝 代码规范

- [ ] 新增/修改文件包含 YYC³ 团队代码标头（JSDoc）
- [ ] 标签按 **类型 → 功能 → 模块** 排列
- [ ] 无硬编码密钥/IP/凭证
- [ ] 无循环依赖
- [ ] 异常处理、容灾与回滚机制完整

## 📄 文档

- [ ] README 已更新（如有用户可见变更）
- [ ] 配置参考 / 环境变量已更新（如有新变量）
- [ ] 相关文档 YAML front matter 已对齐团队标准

## 🧪 测试

- [ ] 新增/修改功能有对应测试用例
- [ ] 测试覆盖率无显著下降

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
