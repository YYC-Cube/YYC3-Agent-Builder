/**
 * file: __tests__/lib/workflow-engine.test.ts
 * description: 工作流执行引擎测试 · 执行内核与变量插值验证
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [test],[engine],[workflow]
 *
 * brief: 工作流执行引擎测试，验证执行内核与变量插值功能。
 *
 * details:
 * - 验证按依赖顺序执行并回传 node_start/node_complete/日志
 * - 验证下游节点只收到有效分支的输入
 * - 验证 maxDepth 可覆盖并拦截环图
 * - 验证条件节点受限求值与 javascript 节点默认熔断
 *
 * dependencies: @/lib/workflow-engine, @xyflow/react, vitest
 * exports: 测试用例集
 * notes: 默认安全策略测试会修改 ENABLE_UNSAFE_CODE_NODES 环境变量
 */

import { executeWorkflow, interpolateVariables, type StreamUpdate } from "@/lib/workflow-engine"
import type { Edge, Node } from "@xyflow/react"
import { afterEach, describe, expect, it } from "vitest"

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

describe("executeWorkflow — 默认安全策略（未开启 VM 通道）", () => {
  afterEach(() => {
    process.env.ENABLE_UNSAFE_CODE_NODES = "true"
  })

  it("条件节点改用受限表达式求值", async () => {
    delete process.env.ENABLE_UNSAFE_CODE_NODES

    const log = await executeWorkflow({
      nodes: [
        node("n1", "start"),
        node("n2", "conditional", { condition: "input1 === 'Workflow started'" }, 1),
        node("n3", "end", {}, 2),
      ],
      edges: [edge("e1", "n1", "n2"), { id: "e2", source: "n2", target: "n3", sourceHandle: "true" } as Edge],
    })

    expect(log.map((item) => item.nodeId)).toContain("n3")
  })

  it("javascript 节点在未开启时明确失败", async () => {
    delete process.env.ENABLE_UNSAFE_CODE_NODES

    await expect(
      executeWorkflow({
        nodes: [node("n1", "start"), node("n2", "javascript", { code: "return 1" }, 1)],
        edges: [edge("e1", "n1", "n2")],
      }),
    ).rejects.toThrow(/disabled/)
  })
})
