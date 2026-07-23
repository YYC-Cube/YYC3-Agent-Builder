# YYC³ Agent Builder — Visual AI Workflow Builder

> 言启千行代码，语枢万物智能

**YYC³ CloudPivot Intelli-Matrix** 可视化 AI 工作流编排平台，基于 Next.js 15 + React 19 + React Flow 构建的拖拽式节点编排系统，支持实时执行、代码导出与 10 种语言国际化。

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 15.5.7 |
| UI | React | 19.1.0 |
| 组件库 | shadcn/ui (new-york) | — |
| 原语 | Radix UI | 27+ 组件 |
| 样式 | Tailwind CSS v4 + oklch | 4.1.9 |
| 流程图 | @xyflow/react | latest |
| AI SDK | Vercel AI SDK (`ai`) + `@ai-sdk/google` | latest |
| 表单 | react-hook-form + zod | 7.60 / 4.4.3 |
| i18n | @yyc3/i18n-core | ^2.4.0 |
| 测试 | vitest + @testing-library/react | 4.1.6 |
| 包管理 | pnpm | — |
| 语言 | TypeScript 5 | strict mode |

## 项目结构

```
yyc3-agent-builder/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── demo-country/         # 演示 API（国家检测）
│   │   └── execute-workflow/     # 工作流执行 API（流式 SSE）
│   ├── globals.css               # 全局样式 + 主题变量（oklch）
│   ├── layout.tsx                # 根布局（Geist 字体 + Vercel Analytics）
│   ├── opengraph-image.tsx       # OG 图片生成（Edge Runtime）
│   └── page.tsx                  # 主页面（React Flow 画布）
├── components/
│   ├── nodes/                    # 12 种工作流节点组件
│   │   ├── start-node.tsx        # 入口节点
│   │   ├── end-node.tsx          # 出口节点
│   │   ├── prompt-node.tsx       # 提示词节点
│   │   ├── text-model-node.tsx   # 文本模型节点（LLM）
│   │   ├── conditional-node.tsx  # 条件分支节点
│   │   ├── http-request-node.tsx # HTTP 请求节点
│   │   ├── javascript-node.tsx   # JavaScript 执行节点
│   │   ├── image-generation-node.tsx # 图像生成节点
│   │   ├── audio-node.tsx        # 音频生成节点
│   │   ├── embedding-model-node.tsx  # 向量化节点
│   │   ├── tool-node.tsx         # 自定义工具节点
│   │   └── structured-output-node.tsx # 结构化输出节点
│   ├── ui/                       # shadcn/ui 组件库（56 组件）
│   ├── code-export-dialog.tsx    # 代码导出对话框
│   ├── error-boundary.tsx        # 全局错误边界
│   ├── execution-panel.tsx       # 执行面板（流式 SSE）
│   ├── language-switcher.tsx     # 语言切换器（10 种语言）
│   ├── node-config-panel.tsx     # 节点配置面板
│   ├── node-palette.tsx          # 节点面板（拖拽添加）
│   └── theme-provider.tsx        # 主题提供者（next-themes）
├── hooks/                        # 自定义 Hooks
│   ├── use-toast.ts              # Toast 通知
│   └── use-mobile.ts             # 移动端检测
├── lib/                          # 工具库
│   ├── i18n/                     # 国际化模块
│   │   ├── config.ts             # 10 种语言配置 + RTL
│   │   ├── provider.tsx          # I18nProvider + useI18n Hook
│   │   └── index.ts              # Barrel export
│   ├── code-generator.ts         # AI SDK 代码生成器
│   ├── node-utils.ts             # 节点工具函数
│   └── utils.ts                  # cn() 工具函数
├── locales/                      # 翻译文件（10 种语言）
│   ├── en/common.json            # 英文（120 keys）
│   ├── zh-CN/common.json         # 简体中文
│   ├── zh-TW/common.json         # 繁体中文
│   ├── ja/common.json            # 日语
│   ├── ko/common.json            # 韩语
│   ├── fr/common.json            # 法语
│   ├── de/common.json            # 德语
│   ├── es/common.json            # 西班牙语
│   ├── pt-BR/common.json         # 巴西葡萄牙语
│   └── ar/common.json            # 阿拉伯语（RTL）
├── __tests__/                    # 测试套件
│   ├── setup.ts                  # 测试环境配置
│   ├── helpers.ts                # 共享 mock + 翻译数据
│   ├── lib/                      # 单元测试
│   └── components/               # 组件测试
├── docs/                         # 项目文档
├── YYC3-Public/                  # 品牌/图标资源
├── public/                       # 静态资源
├── vitest.config.ts              # Vitest 配置
├── components.json               # shadcn/ui 配置
├── next.config.mjs               # Next.js 配置
├── tsconfig.json                 # TypeScript 配置
└── package.json                  # 项目配置
```

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 API Keys

# 3. 启动开发服务器
pnpm dev

# 4. 构建生产版本
pnpm build

# 5. 运行测试
pnpm test

# 6. 测试监听模式
pnpm test:watch

# 7. 测试覆盖率
pnpm test:coverage

# 8. 代码检查
pnpm lint
```

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API Key（Gemini 模型/图像生成） | ✅ |
| `OPENAI_API_KEY` | OpenAI API Key（GPT 模型） | ⚠️ 按需 |

## 核心功能

### 工作流节点（12 种）

| 节点 | 类型标识 | 说明 |
|------|----------|------|
| Start | `start` | 工作流入口 |
| End | `end` | 工作流出口 |
| Prompt | `prompt` | 文本/提示词模板，支持 `$input1` 变量插值 |
| Text Model | `textModel` | LLM 文本生成（GPT/Claude/Grok） |
| Conditional | `conditional` | JavaScript 条件分支（TRUE/FALSE 双路） |
| HTTP Request | `httpRequest` | 外部 API 调用（GET/POST/PUT/DELETE/PATCH） |
| JavaScript | `javascript` | 自定义 JS 代码执行 |
| Image Generation | `imageGeneration` | 图像生成（Gemini Flash Image） |
| Audio | `audio` | 音频生成（TTS） |
| Embedding Model | `embeddingModel` | 文本向量化 |
| Tool | `tool` | 自定义工具函数 |
| Structured Output | `structuredOutput` | 结构化 JSON 输出 |

### 主要特性

- **可视化编排** — 拖拽节点 + 连线构建 AI 工作流
- **实时执行** — 流式 SSE 执行，实时反馈每个节点状态
- **代码导出** — 一键生成 AI SDK 可用代码（Workflow Function / Route Handler）
- **国际化** — 10 种语言全覆盖（中/英/日/韩/法/德/西/葡/阿）+ RTL 支持
- **工作流持久化** — 导入/导出 JSON 格式工作流
- **暗色主题** — 专为开发者设计的 oklch 色彩系统
- **响应式布局** — 支持移动端和桌面端
- **测试覆盖** — 80 个测试用例，覆盖 12 节点 + 5 面板 + 3 工具库

## 架构设计

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│   React Flow     │────▶│  Node Config  │────▶│  Code Generator  │
│   (Canvas UI)    │     │  (Panel)      │     │  (AI SDK Code)   │
└────────┬─────────┘     └──────────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────────┐
│  Execution Panel │────▶│  POST /api/execute-   │
│  (SSE Stream)    │◀────│  workflow (Streaming)  │
└──────────────────┘     └──────────────────────┘

┌──────────────────┐     ┌──────────────────────┐
│  I18nProvider     │────▶│  locales/{lang}/      │
│  (useI18n Hook)  │     │  common.json (120k)   │
└──────────────────┘     └──────────────────────┘
```

## 项目指标

| 指标 | 值 |
|------|-----|
| TypeScript 编译错误 | **0** |
| 测试用例 | **80 passed** |
| 测试文件 | **6** |
| 源代码行数 | **~10,317** |
| 测试代码行数 | **~843** |
| 组件总数 | **19 业务 + 56 UI** |
| Node 组件 | **12** |
| API Routes | **2** |
| 语言包 | **10 (120 keys each)** |
| 依赖数 | **54 deps + 15 devDeps** |

## 代码规范

- TypeScript strict mode — 0 编译错误
- shadcn/ui new-york 风格
- Tailwind CSS v4（oklch 色彩系统）
- ESLint + Prettier 格式化
- pnpm 包管理
- vitest 测试框架

## 许可

Private — YYC³ CloudPivot Intelli-Matrix
