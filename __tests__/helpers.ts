import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

const mockTranslations: Record<string, any> = {
  app: { title: "Agent Builder", subtitle: "Build AI agent workflows" },
  toolbar: { run: "Run", export: "Export", clear: "Clear", language: "Language" },
  nodes: {
    start: { label: "Start", description: "Workflow entry point", starting: "Starting..." },
    end: { label: "End", description: "Workflow output" },
    prompt: { label: "Prompt", description: "Template with variables", placeholder: "Enter your prompt..." },
    textModel: { label: "Text Model", description: "Generate text with LLM", running: "Running", output: "Output", temperature: "Temperature", maxTokens: "Max Tokens", structured: "Structured" },
    conditional: { label: "Conditional", description: "Branch based on condition", condition: "Condition", evaluating: "Evaluating...", result: "Result" },
    javascript: { label: "JavaScript", description: "Execute custom code" },
    imageGeneration: { label: "Image Generation", description: "Generate images" },
    audio: { label: "Audio Generation", description: "Text to speech" },
    embeddingModel: { label: "Embedding Model" },
    tool: { label: "Tool", description: "Custom Tool" },
    structuredOutput: { label: "Structured Output" },
    httpRequest: { label: "HTTP Request" },
  },
  config: {
    title: "Node Configuration",
    start: { hint: "The Start node marks the entry point." },
    end: { hint: "The End node marks the final output." },
    conditional: { condition: "Condition (JavaScript)", conditionHint: "Write a JavaScript expression." },
    httpRequest: { url: "URL", urlHint: "Use $input1 to interpolate.", method: "Method" },
    textModel: { model: "Model", temperature: "Temperature", maxTokens: "Max Tokens" },
    javascript: { code: "Code" },
    audio: { voice: "Voice" },
    imageGeneration: { aspectRatio: "Aspect Ratio" },
    embeddingModel: { dimensions: "Dimensions" },
    structuredOutput: { mode: "Mode" },
  },
  execution: { title: "Execution", running: "Running...", finalOutput: "Final Output" },
  export: { title: "Export Code", description: "Export your workflow", workflowTab: "Workflow", routeTab: "Route Handler", workflowDesc: "Workflow code", routeDesc: "Route handler code", copy: "Copy", copied: "Copied!", download: "Download" },
  palette: { title: "Add Nodes" },
  error: { title: "Error", retry: "Retry" },
  common: { language: "Language", close: "Close", cancel: "Cancel", save: "Save" },
}

export function setupFetchMock() {
  vi.spyOn(globalThis, "fetch").mockImplementation((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString()
    if (url.includes("/locales/")) {
      return Promise.resolve(
        new Response(JSON.stringify(mockTranslations), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
    }
    return Promise.resolve(new Response(null, { status: 404 }))
  })
}

export { mockTranslations }
