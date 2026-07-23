import { generateAISDKCode } from "@/lib/code-generator"
import type { Edge, Node as XYNode } from "@xyflow/react"
import { describe, expect, it } from "vitest"

type CodeGenNode = XYNode<Record<string, any>>

function makeNode(id: string, type: string, data: Record<string, any> = {}): CodeGenNode {
  return { id, type, position: { x: 0, y: 0 }, data } as CodeGenNode
}

function makeEdge(source: string, target: string): Edge {
  return { id: `e-${source}-${target}`, source, target } as Edge
}

describe("generateAISDKCode", () => {
  it("should generate valid import statements", () => {
    const nodes = [makeNode("1", "start"), makeNode("2", "end")]
    const edges = [makeEdge("1", "2")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("import { generateText")
    expect(code).toContain("import { google } from '@ai-sdk/google'")
    expect(code).toContain("import { z } from 'zod'")
  })

  it("should generate a function named runAgentWorkflow", () => {
    const nodes = [makeNode("1", "start"), makeNode("2", "end")]
    const edges = [makeEdge("1", "2")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("export async function runAgentWorkflow")
  })

  it("should handle start node", () => {
    const nodes = [makeNode("1", "start"), makeNode("2", "end")]
    const edges = [makeEdge("1", "2")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("Start Node")
    expect(code).toContain("initialInput")
  })

  it("should handle empty nodes and edges", () => {
    const code = generateAISDKCode([], [])
    expect(code).toContain("runAgentWorkflow")
    expect(typeof code).toBe("string")
    expect(code.length).toBeGreaterThan(0)
  })

  it("should handle text model node", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "textModel", { model: "gpt-4", temperature: 0.7, maxTokens: 1000 }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("generateText")
  })

  it("should handle prompt node with content", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "prompt", { content: "Hello $input1" }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("Hello")
  })

  it("should handle conditional node", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "conditional", { condition: "input1 === 'yes'" }),
      makeNode("3a", "end"),
      makeNode("3b", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3a"), makeEdge("2", "3b")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("Conditional Node")
    expect(code).toContain("input1 === 'yes'")
  })

  it("should handle http request node", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "httpRequest", { url: "https://api.example.com", method: "GET" }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("https://api.example.com")
  })

  it("should handle javascript node with code", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "javascript", { code: "return input1.toUpperCase()" }),
      makeNode("3", "end"),
    ]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    expect(code).toContain("toUpperCase")
  })
})
