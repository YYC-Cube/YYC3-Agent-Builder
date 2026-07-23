import { anthropic } from "@ai-sdk/anthropic"
import { google } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

/**
 * 将 "provider/model" 格式的模型 ID 解析为 AI SDK 模型对象
 * @example resolveModel("openai/gpt-5") → openai("gpt-5")
 * @example resolveModel("google/gemini-2.5-flash") → google("gemini-2.5-flash")
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
