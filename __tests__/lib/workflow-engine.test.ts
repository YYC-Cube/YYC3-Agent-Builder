import { executeWorkflow, interpolateVariables, type StreamUpdate } from "@/lib/workflow-engine"
import type { Edge, Node } from "@xyflow/react"
import { describe, expect, it } from "vitest"

function node(id: string, type: string, data: Record<string, unknown> = {}, x = 0): Node {
  return { id, type, data, position: { x, y: 0 } } as Node
}

function edge(id: string, source: string, target: string): Edge {
  return { id, source, target } as Edge
}

describe("interpolateVariables", () => {
  it("替换多个占位符且保留字面量 $& 序列", () => {
    const result = interpolateVariables("A $input1 B $input2 C", ["X$&Y", { n: 1 }])
    expect(result).toBe('A X$&Y B {"n":1} C')
  })
})

describe("executeWorkflow — 引擎内核", () => {
  it("按依赖顺序执行并回传 node_start / node_complete / 日志", async () => {
    const updates: StreamUpdate[] = []
    const log = await executeWorkflow({
      nodes: [
        node("n1", "start"),
        node("n2", "prompt", { content: "Hi $input1" }, 1),
        node("n3", "javascript", { code: "return input1.length" }, 2),
      ],
      edges: [edge("e1", "n1", "n2"), edge("e2", "n2", "n3")],
      onUpdate: (update) => updates.push(update),
    })

    expect(log.map((item) => item.nodeId)).toEqual(["n1", "n2", "n3"])
    expect(updates.filter((item) => item.type === "node_start")).toHaveLength(3)
    expect(updates.filter((item) => item.type === "node_complete")).toHaveLength(3)
    expect(log[2]?.output).toBe("Hi Workflow started".length)
  })

  it("下游节点只收到有效分支的输入", async () => {
    const log = await executeWorkflow({
      nodes: [
        node("n1", "start"),
        node("n2", "conditional", { condition: "input1.length > 100" }, 1),
        node("n3", "prompt", { content: "TRUE" }, 2),
        node("n4", "prompt", { content: "FALSE" }, 3),
      ],
      edges: [
        edge("e1", "n1", "n2"),
        { id: "e2", source: "n2", target: "n3", sourceHandle: "true" } as Edge,
        { id: "e3", source: "n2", target: "n4", sourceHandle: "false" } as Edge,
      ],
    })

    const ids = log.map((item) => item.nodeId)
    expect(ids).toContain("n4")
    expect(ids).not.toContain("n3")
  })

  it("maxDepth 可覆盖并拦截环图", async () => {
    await expect(
      executeWorkflow({
        nodes: [node("n0", "start"), node("a", "prompt", { content: "A" }, 1), node("b", "prompt", { content: "B" }, 2)],
        edges: [edge("e0", "n0", "a"), edge("e1", "a", "b"), edge("e2", "b", "a")],
        maxDepth: 2,
      }),
    ).rejects.toThrow(/maximum execution depth/)
  })
})
