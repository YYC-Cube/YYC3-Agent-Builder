import { generateAISDKCode } from "@/lib/code-generator"
import type { Edge, Node as XYNode } from "@xyflow/react"
import { describe, expect, it } from "vitest"
import { execSync } from "node:child_process"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"

type CodeGenNode = XYNode<Record<string, any>>

function makeNode(id: string, type: string, data: Record<string, any> = {}): CodeGenNode {
  return { id, type, position: { x: 0, y: 0 }, data } as CodeGenNode
}

function makeEdge(source: string, target: string): Edge {
  return { id: `e-${source}-${target}`, source, target } as Edge
}

function compileGeneratedCode(code: string): { ok: boolean; error?: string } {
  const dir = mkdtempSync(join(process.cwd(), ".codegen-tmp-"))
  const file = join(dir, "workflow.ts")
  writeFileSync(file, code, "utf8")
  try {
    execSync(`npx tsc --noEmit --strict --esModuleInterop --moduleResolution node --target es2020 --module esnext --skipLibCheck "${file}"`, {
      stdio: "pipe",
      timeout: 60_000,
      cwd: process.cwd(),
    })
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: String(error) }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
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

  it("should generate tsc-compilable code for a full graph", () => {
    const nodes = [
      makeNode("1", "start"),
      makeNode("2", "prompt", { content: "Hello $input1" }),
      makeNode("3", "textModel", { model: "gpt-4", temperature: 0.7, maxTokens: 1000 }),
      makeNode("4", "conditional", { condition: "input1 === 'yes'" }),
      makeNode("5a", "end"),
      makeNode("5b", "end"),
      makeNode("6", "imageGeneration", { model: "gemini-2.5-flash-image" }),
      makeNode("7", "end"),
    ]
    const edges = [
      makeEdge("1", "2"),
      makeEdge("2", "3"),
      makeEdge("3", "4"),
      { id: "e-4-5a", source: "4", target: "5a", sourceHandle: "true" } as Edge,
      { id: "e-4-5b", source: "4", target: "5b", sourceHandle: "false" } as Edge,
      makeEdge("2", "6"),
      makeEdge("6", "7"),
    ]
    const code = generateAISDKCode(nodes, edges)
    const result = compileGeneratedCode(code)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      console.error("tsc error:\n", result.error)
    }
  })

  it("should generate tsc-compilable code for image generation", () => {
    const nodes = [makeNode("1", "start"), makeNode("2", "imageGeneration", {}), makeNode("3", "end")]
    const edges = [makeEdge("1", "2"), makeEdge("2", "3")]
    const code = generateAISDKCode(nodes, edges)
    const result = compileGeneratedCode(code)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      console.error("tsc error:\n", result.error)
    }
  })
})
