export const NODE_TYPES_LIST = [
  { type: "start", label: "Start", color: "bg-green-500", description: "Workflow entry point" },
  { type: "prompt", label: "Prompt", color: "bg-chart-5", description: "Input text or prompt" },
  { type: "textModel", label: "Text Model", color: "bg-primary", description: "Generate text with LLM" },
  { type: "imageGeneration", label: "Image Generation", color: "bg-chart-1", description: "Generate images" },
  { type: "httpRequest", label: "HTTP Request", color: "bg-blue-500", description: "Call external APIs" },
  { type: "conditional", label: "Conditional", color: "bg-purple-500", description: "Branch based on condition" },
  { type: "javascript", label: "JavaScript", color: "bg-yellow-500", description: "Execute custom JS code" },
  { type: "embeddingModel", label: "Embedding Model", color: "bg-chart-2", description: "Convert text to embeddings" },
  { type: "tool", label: "Tool", color: "bg-chart-4", description: "Custom function tool" },
  { type: "end", label: "End", color: "bg-red-500", description: "Workflow output" },
] as const

export function getDefaultNodeData(type: string): Record<string, any> {
  switch (type) {
    case "textModel":
      return { model: "openai/gpt-5", temperature: 0.7, maxTokens: 2000 }
    case "embeddingModel":
      return { model: "openai/text-embedding-3-small", dimensions: 1536 }
    case "tool":
      return { name: "customTool", description: "A custom tool" }
    case "structuredOutput":
      return { schemaName: "Schema", mode: "object" }
    case "prompt":
      return { content: "Enter your prompt..." }
    case "imageGeneration":
      return { model: "gemini-2.5-flash-image", aspectRatio: "1:1", outputFormat: "png" }
    case "audio":
      return { model: "openai/tts-1", voice: "alloy", speed: 1.0 }
    case "javascript":
      return { code: "// Access inputs as input1, input2, etc.\nreturn input1.toUpperCase()" }
    case "start":
      return {}
    case "end":
      return {}
    case "conditional":
      return { condition: "input1 === 'value'" }
    case "httpRequest":
      return { url: "https://api.example.com", method: "GET" }
    default:
      return {}
  }
}

export const MINIMAP_NODE_COLORS: Record<string, string> = {
  textModel: "oklch(0.65 0.25 265)",
  embeddingModel: "oklch(0.60 0.20 200)",
  tool: "oklch(0.75 0.20 80)",
  structuredOutput: "oklch(0.70 0.18 150)",
  prompt: "oklch(0.68 0.22 320)",
  imageGeneration: "oklch(0.72 0.22 180)",
  audio: "oklch(0.70 0.25 40)",
  javascript: "oklch(0.65 0.25 265)",
  start: "oklch(0.55 0.30 280)",
  end: "oklch(0.50 0.25 300)",
  conditional: "oklch(0.60 0.25 320)",
  httpRequest: "oklch(0.65 0.25 265)",
}
