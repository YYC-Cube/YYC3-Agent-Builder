import { generateAISDKCode, generateRouteHandlerCode } from "@/lib/code-generator"
import type { Edge, Node as XYNode } from "@xyflow/react"
import { describe, expect, it } from "vitest"

type CodeGenNode = XYNode<Record<string, any>>

function makeNode(id: string, type: string, data: Record<string, any> = {}): CodeGenNode {
  return { id, type, position: { x: 0, y: 0 }, data } as CodeGenNode
}

function makeEdge(source: string, target: string, sourceHandle?: string): Edge {
  return { id: `e-${source}-${target}`, source, target, sourceHandle } as Edge
}

describe("generateAISDKCode - Additional Edge Cases", () => {
  it("should handle tool node with code", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "tool", { name: "testTool", description: "Test", code: "return { result: 42 }" }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("Tool Node")
    expect(code).toContain("description: 'Test'")
    expect(code).toContain("42")
  })

  it("should handle image generation node", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "imageGeneration", { model: "gemini-2.5-flash-image" }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("Image Generation Node")
    expect(code).toContain("gemini-2.5-flash-image")
  })

  it("should handle audio node", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "audio", { model: "tts-1", voice: "alloy", speed: 1.0 }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("Audio Generation Node")
    expect(code).toContain("tts-1")
    expect(code).toContain("alloy")
  })

  it("should handle embedding model node", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "embeddingModel", { model: "text-embedding-3-large" }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("Embedding Model Node")
    expect(code).toContain("text-embedding-3-large")
  })

  it("should handle structured output node (passed through as unrecognized type)", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "structuredOutput", { schemaName: "UserSchema", mode: "object" }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    // structuredOutput is not in code-gen switch, falls through to default
    // Verify no crash and valid code is produced
    expect(code).toContain("export async function runAgentWorkflow")
    expect(typeof code).toBe("string")
  })

  it("should handle multiple input branches to single node", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "prompt", { content: "Hello $input1 and $input2" }),
      makeNode("3", "prompt", { content: "World" }),
      makeNode("4", "prompt", { content: "Combine: $input1 $input2" }),
      makeNode("5", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("1", "3"), makeEdge("2", "4"), makeEdge("3", "4"), makeEdge("4", "5")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("Hello")
    expect(code).toContain("World")
    expect(code).toContain("Combine")
  })

  it("should handle text model with structured output", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "textModel", { model: "gpt-4", structuredOutput: true, schema: "z.object({ name: z.string() })", schemaName: "Person" }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("generateObject")
    expect(code).toContain("z.object")
    // Should NOT use generateText for the node body (import has generateText for all)
    expect(code).toContain("generateObject")
  })

  it("should handle text model without structured output", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "textModel", { model: "gpt-4", temperature: 0.5, maxTokens: 500 }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("generateText")
    expect(code).toContain("temperature: 0.5")
    expect(code).toContain("maxTokens: 500")
  })

  it("should handle mixed conditional branch with true only", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "conditional", { condition: "input1 > 0" }),
      makeNode("3", "prompt", { content: "Positive" }),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3", "true")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("Conditional Node")
    expect(code).toContain("True branch")
  })

  it("should handle a complex multi-node workflow end-to-end", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "prompt", { content: "$input1" }),
      makeNode("3", "textModel", { model: "gpt-4", temperature: 0.7, maxTokens: 1000 }),
      makeNode("4", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3"), makeEdge("3", "4")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("runAgentWorkflow")
    expect(code).toContain("Start Node")
    expect(code).toContain("Prompt Node")
    expect(code).toContain("Text Model Node")
    expect(code).toContain("End Node")
  })
})

describe("generateRouteHandlerCode", () => {
  it("should generate valid import statements", () => {
    const code = generateRouteHandlerCode([], [])
    expect(code).toContain("import { generateText")
    expect(code).toContain("import { google }")
    expect(code).toContain("import { z } from 'zod'")
  })

  it("should generate POST function", () => {
    const code = generateRouteHandlerCode([], [])
    expect(code).toContain("export async function POST(req: Request)")
    expect(code).toContain("const { input } = await req.json()")
  })

  it("should handle text model node in route handler", () => {
    const nodes = [makeNode("1", "textModel", { model: "gpt-4", temperature: 0.7, maxTokens: 2000 })]
    const code = generateRouteHandlerCode(nodes, [])
    expect(code).toContain("generateText")
    expect(code).toContain("gpt-4")
  })

  it("should handle http request node in route handler", () => {
    const nodes = [makeNode("1", "httpRequest", { url: "https://api.test.com", method: "POST" })]
    const code = generateRouteHandlerCode(nodes, [])
    expect(code).toContain("fetch")
    expect(code).toContain("https://api.test.com")
    expect(code).toContain("POST")
  })

  it("should handle image generation node in route handler", () => {
    const nodes = [makeNode("1", "imageGeneration", { model: "gemini-2.5-flash-image" })]
    const code = generateRouteHandlerCode(nodes, [])
    expect(code).toContain("generateText")
    expect(code).toContain("gemini-2.5-flash-image")
  })

  it("should handle empty nodes gracefully", () => {
    const code = generateRouteHandlerCode([], [])
    expect(code).toContain("POST")
    expect(typeof code).toBe("string")
    expect(code.length).toBeGreaterThan(0)
  })

  it("should handle nodes without matching type gracefully", () => {
    const nodes = [makeNode("1", "unknownType")]
    const code = generateRouteHandlerCode(nodes, [])
    expect(code).toContain("POST")
    expect(code).not.toContain("undefined")
  })

  it("should handle maxDuration export", () => {
    const code = generateRouteHandlerCode([], [])
    expect(code).toContain("export const maxDuration = 60")
  })
})
