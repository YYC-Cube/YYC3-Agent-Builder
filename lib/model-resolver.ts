import { anthropic } from "@ai-sdk/anthropic"
import { google } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

/**
 * file: model-resolver.ts
 * description: 多 provider 模型解析器 · provider/model 格式解析为 AI SDK 模型对象
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [util],[ai],[model],[resolver]
 *
 * brief: 将 "provider/model" 格式的模型 ID 解析为 AI SDK 模型对象，支持多 provider。
 *
 * details:
 * - 支持 openai/gpt-5、google/gemini-2.5-flash、anthropic/claude-3 等格式
 * - 解析失败时抛出明确错误，提示期望的 provider/model 格式
 * - 返回 AI SDK 统一的 LanguageModel 接口对象
 *
 * dependencies: @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/openai, ai
 * exports: resolveModel
 * notes: 模型 ID 必须包含斜杠分隔 provider 与 model 名称
 */
export function resolveModel(modelId: string): LanguageModel {
  const slashIndex = modelId.indexOf("/")
  if (slashIndex === -1) {
    throw new Error(`Invalid model ID format: "${modelId}". Expected "provider/model".`)
  }

  const provider = modelId.slice(0, slashIndex)
  const modelName = modelId.slice(slashIndex + 1)

  if (!modelName) {
    throw new Error(`Invalid model ID format: "${modelId}". Missing model name after "/".`)
  }

  switch (provider) {
    case "openai":
      return createOpenAI()(modelName)
    case "google":
    case "gemini":
      return google(modelName)
    case "anthropic":
    case "claude":
      return anthropic(modelName)
    case "xai":
      // xAI Grok 通过 OpenAI 兼容接口调用
      return createOpenAI({
        baseURL: "https://api.x.ai/v1",
        apiKey: process.env.XAI_API_KEY,
      })(modelName)
    default:
      throw new Error(
        `Unsupported AI provider: "${provider}". Supported: openai, google, anthropic, xai.`,
      )
  }
}
