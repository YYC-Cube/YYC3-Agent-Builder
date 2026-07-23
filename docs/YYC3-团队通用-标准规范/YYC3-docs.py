#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
file: YYC3-docs.py
description: YYC³ Document Template Engine — Agent Builder Project Adaptation
author: YanYuCloudCube Team
version: v3.1.0
created: 2026-05-01
updated: 2026-05-19
copyright: Copyright (c) 2026 YYC3
license: MIT
"""

import os
import sys
import json
import hashlib
import datetime
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class DocumentType(Enum):
    MAIN = "main"
    README = "readme"
    ROOT_README = "root_readme"
    RESERVED = "reserved"
    TEMPLATE = "template"


@dataclass
class DocumentMetadata:
    file_name: str
    description: str
    author: str = "YanYuCloudCube Team"
    version: str = "v3.1.0"
    created: str = field(default_factory=lambda: datetime.datetime.now().strftime("%Y-%m-%d"))
    updated: str = field(default_factory=lambda: datetime.datetime.now().strftime("%Y-%m-%d"))
    status: str = "published"
    tags: List[str] = field(default_factory=list)
    checksum: str = ""
    parent_doc: str = ""
    related_docs: List[str] = field(default_factory=list)


class YYC3TemplateEngine:
    BRAND_HEADER = """> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***"""

    BRAND_FOOTER = """<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for the Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

**© 2025-2026 YYC³ Team. All Rights Reserved.**
</div>"""

    CORE_PHILOSOPHY = """## 核心理念

**五高架构**：高可用 | 高性能 | 高安全 | 高扩展 | 高智能
**五标体系**：标准化 | 规范化 | 自动化 | 可视化 | 智能化
**五化转型**：流程化 | 数字化 | 生态化 | 工具化 | 服务化
**五维评估**：时间维 | 空间维 | 属性维 | 事件维 | 关联维"""

    def __init__(self, output_dir: str = "docs"):
        self.output_dir = Path(output_dir)
        self.document_registry: Dict[str, DocumentMetadata] = {}
        self.traceability_chain: List[Dict] = []
        self.today = datetime.datetime.now().strftime("%Y-%m-%d")

    def generate_checksum(self, content: str) -> str:
        return hashlib.sha256(content.encode('utf-8')).hexdigest()[:16]

    def save_document(self, content: str, output_path: str) -> bool:
        try:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            logger.info(f"  ✅ 已生成: {output_path}")
            return True
        except Exception as e:
            logger.error(f"  ❌ 生成失败: {output_path} — {e}")
            return False

    def _frontmatter(self, file_name: str, description: str, tags: List[str],
                     status: str = "published", version: str = "v1.0.0") -> str:
        tag_str = ','.join(tags)
        return f"""---
file: {file_name}
description: {description}
author: YanYuCloudCube Team
version: {version}
created: {self.today}
updated: {self.today}
status: {status}
tags: [{tag_str}]
category: report
language: zh-CN
---"""

    def generate_readme(self, dir_name: str, dir_desc: str, doc_list: List[Dict]) -> str:
        doc_table_rows = ""
        for idx, doc in enumerate(doc_list, 1):
            name = doc.get('name', '')
            desc = doc.get('desc', '')
            tags = doc.get('tags', '')
            link = f"[{name}]({name})"
            doc_table_rows += f"| {idx} | {link} | {desc} | {tags} |\n"

        return f"""{self._frontmatter('README.md', f'{dir_name} 目录文档索引', ['文档索引', 'README'])}

{self.BRAND_HEADER}

---

# {dir_name}

{self.CORE_PHILOSOPHY}

---

## 目录概述

{dir_desc}

---

## 文档索引

| 序号 | 文档名称 | 描述 | 标签 |
|------|----------|------|------|
{doc_table_rows}
---

{self.BRAND_FOOTER}
"""

    def generate_audit_report(self) -> str:
        return f"""{self._frontmatter('00-项目现状审核报告.md', 'YYC³ Agent Builder 现状审核报告', ['审核', '分析', '基线'], version='v1.0.0')}

{self.BRAND_HEADER}

---

# 📊 项目现状审核报告

## 基本信息

| 属性 | 值 |
|------|-----|
| **项目名称** | YYC³ Agent Builder (CloudPivot Intelli-Matrix) |
| **审核日期** | {self.today} |
| **审核范围** | 全局深度审计 |
| **项目版本** | v0.1.0 |

## 一、技术栈识别

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Next.js (App Router) | 15.5.7 | 全栈框架 |
| UI | React | 19.1.0 | 用户界面 |
| 组件库 | shadcn/ui (new-york) | — | UI 组件系统 |
| 原语 | Radix UI | 27+组件 | 无障碍原语 |
| 样式 | Tailwind CSS v4 + oklch | 4.1.9 | 原子化CSS |
| 流程图 | @xyflow/react | latest | 可视化画布 |
| AI SDK | Vercel AI SDK + @ai-sdk/google | latest | AI模型调用 |
| 表单 | react-hook-form + zod | 7.60 / 4.4.3 | 表单校验 |
| i18n | @yyc3/i18n-core | 2.3.0 | 国际化（待集成） |

## 二、代码质量评估

### ✅ 符合标准

- TypeScript strict 模式
- shadcn/ui new-york 风格规范
- Tailwind CSS v4 oklch 色彩系统
- 纯 App Router 架构
- ErrorBoundary + Suspense 全局错误处理
- SSRF 基础防护 + JS 沙箱验证
- Vercel Analytics 集成

### ⚠️ 需改进

1. 无 i18n 国际化 — 所有 UI 文本硬编码英文
2. 无测试覆盖 — 零测试文件
3. 无文档架构体系
4. page.tsx 文件过大，需拆分
5. node-palette 与 node-registry 重复定义
6. 模型名称硬编码为不存在版本 (gpt-5)

### 🔴 安全风险

1. JS 沙箱 `new Function()` 可被绕过
2. API 无认证/授权机制
3. SSRF 防护不完整

## 三、综合评分

| 维度 | 得分 |
|------|------|
| 技术架构 | 82/100 |
| 代码质量 | 72/100 |
| 功能完整性 | 68/100 |
| DevOps 成熟度 | 45/100 |
| 性能与安全 | 60/100 |
| 业务价值 | 85/100 |
| **总分** | **68.7** |

**审核结论**: ⚠️ 有条件通过 — 需整改后复评

---

{self.BRAND_FOOTER}
"""

    def generate_task_plan(self) -> str:
        return f"""{self._frontmatter('01-任务规划与节点目标.md', 'YYC³ Agent Builder 开发规划', ['规划', '里程碑', '路线图'], version='v1.0.0')}

{self.BRAND_HEADER}

---

# 📋 任务规划与节点目标

## 总体目标

基于审核报告分三阶段完成：文档架构体系建立 → i18n 全局覆盖 → 安全加固与质量提升

## 阶段一：文档架构体系建立

| 节点 | 目标 | 交付物 | 状态 |
|------|------|--------|------|
| M1.1 | 适配模版引擎 | YYC3-docs.py + template_config.yaml | ✅ |
| M1.2 | 生成文档架构 | docs/ 完整目录结构 | ✅ |
| M1.3 | 审核报告归档 | 00-项目现状审核报告.md | ✅ |

## 阶段二：i18n 全局覆盖

| 节点 | 目标 | 交付物 | 状态 |
|------|------|--------|------|
| M2.1 | 安装 @yyc3/i18n-core | package.json 更新 | ⬜ |
| M2.2 | 创建翻译文件结构 | locales/ 10种语言包 | ⬜ |
| M2.3 | 创建 I18nProvider | lib/i18n/ 配置 | ⬜ |
| M2.4 | 提取硬编码文本 | 所有组件 t() 替换 | ⬜ |
| M2.5 | 语言切换 UI | LanguageSwitcher 组件 | ⬜ |
| M2.6 | RTL 支持 | 阿拉伯语布局适配 | ⬜ |

## 阶段三：安全加固与质量提升

| 节点 | 目标 | 交付物 | 状态 |
|------|------|--------|------|
| M3.1 | JS 沙箱加固 | 安全执行环境 | ⬜ |
| M3.2 | API 认证机制 | 认证中间件 | ⬜ |
| M3.3 | 测试体系建立 | 核心测试用例 | ⬜ |
| M3.4 | 大文件拆分重构 | page.tsx 模块化 | ⬜ |

---

{self.BRAND_FOOTER}
"""

    def generate_execution_log(self) -> str:
        return f"""{self._frontmatter('02-执行日志与进度跟踪.md', 'YYC³ Agent Builder 执行日志', ['日志', '进度', '跟踪'], version='v1.0.0')}

{self.BRAND_HEADER}

---

# 📝 执行日志与进度跟踪

## {self.today} — 文档架构初始化

**操作类型**: 初始化
**操作详情**: 基于 YYC³ 模版引擎生成项目文档架构

**验证结果**:
- [x] 模版引擎适配完成
- [x] 文档目录结构生成
- [x] 审核报告生成

**当前状态**: ✅ 成功

---

## 进度总览

| 任务 | 计划状态 | 实际状态 | 偏差 |
|------|----------|----------|------|
| Phase 1: 文档架构 | 100% | 100% | 0% |
| Phase 2: i18n覆盖 | 0% | 0% | 0% |
| Phase 3: 安全加固 | 0% | 0% | 0% |

---

{self.BRAND_FOOTER}
"""

    def generate_summary(self) -> str:
        return f"""{self._frontmatter('03-总结文档与状态同步.md', 'YYC³ Agent Builder 会话总结', ['总结', '交接', '同步'], version='v1.0.0')}

{self.BRAND_HEADER}

---

# 📝 会话总结与状态同步

## 会话信息

| 属性 | 值 |
|------|-----|
| **会话日期** | {self.today} |
| **主要工作** | 项目审核 + 文档架构建立 |

## ✅ 已完成任务

1. 全链路深度代码审核
2. 项目现状审核报告生成
3. 文档架构体系建立
4. 任务规划与节点目标

## 🔄 进行中任务

1. i18n 全局覆盖方案设计
2. @yyc3/i18n-core 集成准备

## 当前优先级 TOP 3

1. **[P0]** 集成 @yyc3/i18n-core 实现国际化
2. **[P1]** 增强 JS 沙箱安全性
3. **[P1]** 建立测试体系

---

{self.BRAND_FOOTER}
"""

    def generate_phase_readme(self, phase_dir: str, phase_desc: str, docs: List[Dict]) -> str:
        return self.generate_readme(phase_dir, phase_desc, docs)

    def generate_reserved_doc(self, title: str, desc: str) -> str:
        return f"""{self._frontmatter(f'{title}.md', desc, ['预留文档'], status='reserved')}

{self.BRAND_HEADER}

---

# {title}

> 本文档为预留文档，内容待填充。

---

{self.BRAND_FOOTER}
"""

    def generate_full_structure(self, project_root: str) -> None:
        docs_dir = Path(project_root) / "docs"
        logger.info("=" * 60)
        logger.info("YYC³ Agent Builder — 文档架构生成")
        logger.info(f"输出目录: {docs_dir}")
        logger.info("=" * 60)

        structure = {
            "00-项目总览索引": {
                "desc": "YYC³ Agent Builder 项目全局视图与导航",
                "docs": [
                    {"name": "001-项目总览手册.md", "desc": "项目立项核心依据与目标范围", "tags": "[总览],[项目]"},
                    {"name": "002-文档架构导航.md", "desc": "文档体系导航与索引", "tags": "[导航],[索引]"},
                    {"name": "003-快速开始指南.md", "desc": "项目快速启动与使用指南", "tags": "[指南],[开始]"},
                    {"name": "004-核心概念词典.md", "desc": "Agent Builder 核心概念与术语定义", "tags": "[概念],[术语]"},
                    {"name": "005-版本更新日志.md", "desc": "项目版本迭代与变更记录", "tags": "[日志],[版本]"},
                ]
            },
            "01-启动规划阶段": {
                "desc": "项目启动与规划管理",
                "subcategories": {
                    "0101-项目规划": {
                        "docs": [
                            {"name": "001-项目章程与愿景.md", "desc": "CloudPivot Intelli-Matrix 立项核心依据", "tags": "[章程],[愿景]"},
                            {"name": "002-项目范围说明书.md", "desc": "可视化 AI 工作流编排平台范围边界", "tags": "[范围],[边界]"},
                            {"name": "003-项目里程碑计划.md", "desc": "阶段里程碑与任务拆解", "tags": "[里程碑],[计划]"},
                            {"name": "004-项目资源规划.md", "desc": "资源统筹分配", "tags": "[资源],[规划]"},
                        ]
                    },
                    "0102-需求规划": {
                        "docs": [
                            {"name": "001-业务需求分析.md", "desc": "可视化 AI 工作流编排核心需求", "tags": "[需求],[业务]"},
                            {"name": "002-用户需求调研报告.md", "desc": "目标用户痛点与期望分析", "tags": "[调研],[用户]"},
                            {"name": "003-产品需求文档PRD.md", "desc": "12种节点类型功能规格与验收标准", "tags": "[PRD],[功能]"},
                            {"name": "004-需求优先级矩阵.md", "desc": "需求优先级评估排序", "tags": "[优先级],[矩阵]"},
                        ]
                    },
                    "0103-可行性分析": {
                        "docs": [
                            {"name": "001-技术可行性分析.md", "desc": "Next.js 15 + React 19 + React Flow 技术风险评估", "tags": "[可行性],[技术]"},
                            {"name": "002-经济可行性分析.md", "desc": "成本效益分析", "tags": "[可行性],[经济]"},
                        ]
                    },
                }
            },
            "02-项目设计阶段": {
                "desc": "系统架构与详细设计",
                "subcategories": {
                    "0201-架构设计": {
                        "docs": [
                            {"name": "001-系统架构总览图.md", "desc": "React Flow Canvas + Node Config + Code Generator 三层架构", "tags": "[架构],[总览]"},
                            {"name": "002-技术选型论证报告.md", "desc": "Next.js 15 / shadcn/ui / @xyflow/react / AI SDK 选型依据", "tags": "[选型],[技术]"},
                            {"name": "003-工作流引擎设计.md", "desc": "12种节点类型拓扑排序执行引擎", "tags": "[引擎],[工作流]"},
                            {"name": "004-节点系统设计.md", "desc": "12种节点类型设计文档", "tags": "[节点],[设计]"},
                        ]
                    },
                    "0202-详细设计": {
                        "docs": [
                            {"name": "001-API接口设计.md", "desc": "execute-workflow SSE 流式 API 设计", "tags": "[API],[接口]"},
                            {"name": "002-代码生成器设计.md", "desc": "AI SDK 代码生成逻辑", "tags": "[代码生成],[设计]"},
                            {"name": "003-i18n国际化设计.md", "desc": "@yyc3/i18n-core 集成方案", "tags": "[i18n],[国际化]"},
                            {"name": "004-主题系统设计.md", "desc": "oklch 色彩体系 + next-themes", "tags": "[主题],[色彩]"},
                        ]
                    },
                }
            },
            "03-开发实施阶段": {
                "desc": "代码开发与实施",
                "subcategories": {
                    "0301-开发环境": {
                        "docs": [
                            {"name": "001-开发环境搭建指南.md", "desc": "pnpm + Node.js + Next.js 15 环境配置", "tags": "[环境],[搭建]"},
                            {"name": "002-多环境配置规范.md", "desc": "dev/staging/production 环境隔离", "tags": "[环境],[规范]"},
                        ]
                    },
                    "0302-开发规范": {
                        "docs": [
                            {"name": "001-Git工作流规范.md", "desc": "分支管理策略", "tags": "[Git],[规范]"},
                            {"name": "002-代码提交规范.md", "desc": "Conventional Commits 格式", "tags": "[提交],[规范]"},
                            {"name": "003-组件开发规范.md", "desc": "shadcn/ui + Radix UI 组件开发标准", "tags": "[组件],[规范]"},
                        ]
                    },
                    "0303-i18n实施": {
                        "docs": [
                            {"name": "001-i18n集成指南.md", "desc": "@yyc3/i18n-core 集成步骤", "tags": "[i18n],[集成]"},
                            {"name": "002-翻译文件规范.md", "desc": "10种语言包文件结构与命名", "tags": "[翻译],[规范]"},
                            {"name": "003-RTL适配指南.md", "desc": "阿拉伯语等 RTL 语言适配", "tags": "[RTL],[适配]"},
                        ]
                    },
                }
            },
            "04-测试审核阶段": {
                "desc": "质量保障与审核",
                "subcategories": {
                    "0401-测试策略": {
                        "docs": [
                            {"name": "001-测试策略总纲.md", "desc": "Vitest + React Testing Library 测试方案", "tags": "[测试],[策略]"},
                            {"name": "002-节点组件测试规范.md", "desc": "12种节点类型测试用例设计", "tags": "[测试],[节点]"},
                        ]
                    },
                    "0402-质量审核": {
                        "docs": [
                            {"name": "001-代码质量审核标准.md", "desc": "TypeScript strict + ESLint 质量度量", "tags": "[质量],[审核]"},
                            {"name": "002-质量门禁标准.md", "desc": "CI/CD 质量准入准出标准", "tags": "[门禁],[标准]"},
                        ]
                    },
                }
            },
            "05-交付部署阶段": {
                "desc": "项目交付与部署",
                "subcategories": {
                    "0501-交付管理": {
                        "docs": [
                            {"name": "001-交付物清单.md", "desc": "Agent Builder 交付物列表", "tags": "[交付],[清单]"},
                            {"name": "002-交付验收标准.md", "desc": "验收标准定义", "tags": "[验收],[标准]"},
                        ]
                    },
                    "0502-部署方案": {
                        "docs": [
                            {"name": "001-Vercel部署指南.md", "desc": "Vercel 平台部署配置", "tags": "[Vercel],[部署]"},
                        ]
                    },
                }
            },
            "06-运维保障阶段": {
                "desc": "系统运维与保障",
                "subcategories": {
                    "0601-运维策略": {
                        "docs": [
                            {"name": "001-运维策略总纲.md", "desc": "运维整体方案", "tags": "[运维],[策略]"},
                            {"name": "002-监控告警方案.md", "desc": "Vercel Analytics + 自定义监控", "tags": "[监控],[告警]"},
                        ]
                    },
                }
            },
            "07-合规安全保障": {
                "desc": "安全与合规管理",
                "subcategories": {
                    "0701-安全管理": {
                        "docs": [
                            {"name": "001-安全开发规范.md", "desc": "JS沙箱安全 + SSRF防护 + API认证", "tags": "[安全],[开发]"},
                            {"name": "002-API安全规范.md", "desc": "execute-workflow 接口安全加固方案", "tags": "[API],[安全]"},
                        ]
                    },
                }
            },
            "08-资产知识管理": {
                "desc": "资产与知识管理",
                "subcategories": {
                    "0801-资产管理": {
                        "docs": [
                            {"name": "001-技术资产清单.md", "desc": "技术栈资产与许可证列表", "tags": "[资产],[清单]"},
                        ]
                    },
                }
            },
            "09-智能演进优化": {
                "desc": "持续演进与优化",
                "subcategories": {
                    "0901-演进规划": {
                        "docs": [
                            {"name": "001-持续改进计划.md", "desc": "基于五维评估的优化方案", "tags": "[改进],[演进]"},
                            {"name": "002-AI能力扩展规划.md", "desc": "更多 AI 模型与节点类型扩展", "tags": "[AI],[扩展]"},
                        ]
                    },
                }
            },
        }

        total_docs = 0

        session_dir = docs_dir / "agent-builder-expert-20260519"
        session_dir.mkdir(parents=True, exist_ok=True)

        logger.info("\n📌 生成会话文档...")
        self.save_document(self.generate_audit_report(), session_dir / "00-项目现状审核报告.md")
        self.save_document(self.generate_task_plan(), session_dir / "01-任务规划与节点目标.md")
        self.save_document(self.generate_execution_log(), session_dir / "02-执行日志与进度跟踪.md")
        self.save_document(self.generate_summary(), session_dir / "03-总结文档与状态同步.md")
        total_docs += 4

        logger.info("\n📌 生成阶段文档架构...")
        for phase_dir, phase_data in structure.items():
            phase_path = docs_dir / phase_dir
            phase_path.mkdir(parents=True, exist_ok=True)

            all_phase_docs = []

            if 'docs' in phase_data:
                for doc in phase_data['docs']:
                    doc_path = phase_path / doc['name']
                    self.save_document(
                        self.generate_reserved_doc(doc['name'].replace('.md', ''), doc['desc']),
                        doc_path
                    )
                    all_phase_docs.append(doc)
                    total_docs += 1

            if 'subcategories' in phase_data:
                for sub_dir, sub_data in phase_data['subcategories'].items():
                    sub_path = phase_path / sub_dir
                    sub_path.mkdir(parents=True, exist_ok=True)

                    sub_docs = sub_data.get('docs', [])
                    for doc in sub_docs:
                        doc_path = sub_path / doc['name']
                        self.save_document(
                            self.generate_reserved_doc(doc['name'].replace('.md', ''), doc['desc']),
                            doc_path
                        )
                        all_phase_docs.append(doc)
                        total_docs += 1

                    sub_readme = self.generate_phase_readme(sub_dir, sub_data.get('desc', ''), sub_docs)
                    self.save_document(sub_readme, sub_path / "README.md")
                    total_docs += 1

            phase_readme = self.generate_phase_readme(phase_dir, phase_data['desc'], all_phase_docs)
            self.save_document(phase_readme, phase_path / "README.md")
            total_docs += 1

        root_readme_docs = [
            {"name": "00-项目总览索引/README.md", "desc": "项目全局视图与导航", "tags": "[总览]"},
            {"name": "01-启动规划阶段/README.md", "desc": "项目启动与规划管理", "tags": "[规划]"},
            {"name": "02-项目设计阶段/README.md", "desc": "系统架构与详细设计", "tags": "[设计]"},
            {"name": "03-开发实施阶段/README.md", "desc": "代码开发与实施", "tags": "[开发]"},
            {"name": "04-测试审核阶段/README.md", "desc": "质量保障与审核", "tags": "[测试]"},
            {"name": "05-交付部署阶段/README.md", "desc": "项目交付与部署", "tags": "[交付]"},
            {"name": "06-运维保障阶段/README.md", "desc": "系统运维与保障", "tags": "[运维]"},
            {"name": "07-合规安全保障/README.md", "desc": "安全与合规管理", "tags": "[安全]"},
            {"name": "08-资产知识管理/README.md", "desc": "资产与知识管理", "tags": "[资产]"},
            {"name": "09-智能演进优化/README.md", "desc": "持续演进与优化", "tags": "[演进]"},
            {"name": "agent-builder-expert-20260519/", "desc": "本次审核会话工作目录", "tags": "[会话]"},
        ]
        root_readme = self.generate_readme(
            "YYC³ Agent Builder — 文档中心",
            "YYC³ CloudPivot Intelli-Matrix 可视化 AI 工作流编排平台 — 完整项目文档体系，遵循「五高五标五化五维」标准。",
            root_readme_docs
        )
        self.save_document(root_readme, docs_dir / "README.md")
        total_docs += 1

        registry = {
            "project": "YYC³ Agent Builder",
            "version": "v0.1.0",
            "generated_at": datetime.datetime.now().isoformat(),
            "total_documents": total_docs,
            "structure_version": "v3.1.0",
            "phases": list(structure.keys()),
        }
        self.save_document(json.dumps(registry, ensure_ascii=False, indent=2), docs_dir / "document_registry.json")

        logger.info("\n" + "=" * 60)
        logger.info(f"✅ 文档架构生成完成！")
        logger.info(f"   总文档数: {total_docs}")
        logger.info(f"   阶段目录: {len(structure)} 个")
        logger.info(f"   输出路径: {docs_dir}")
        logger.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(description='YYC³ 文档模版引擎 — Agent Builder 项目适配')
    parser.add_argument('--output', '-o', default=None, help='输出目录 (默认: 项目根目录/docs)')
    parser.add_argument('--generate', '-g', action='store_true', help='生成完整文档架构')
    parser.add_argument('--project-root', '-p', default=None, help='项目根目录')

    args = parser.parse_args()

    project_root = args.project_root or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = args.output or os.path.join(project_root, "docs")

    engine = YYC3TemplateEngine(output_dir)

    if args.generate:
        engine.generate_full_structure(project_root)
    else:
        logger.info("使用 --generate 或 -g 参数生成完整文档架构")
        logger.info(f"示例: python YYC3-docs.py -g -p /path/to/project")


if __name__ == "__main__":
    main()
