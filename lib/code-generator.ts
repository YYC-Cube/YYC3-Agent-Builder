/**
 * file: code-generator.ts
 * description: AI SDK 代码生成器 · 从工作流图生成可编译的 AI SDK 生产代码
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [util],[codegen],[ai-sdk]
 *
 * brief: 从工作流节点图生成可编译的 AI SDK 生产级代码，支持 12 种节点类型。
 *
 * details:
 * - 输入：React Flow 的 nodes/edges 图结构
 * - 输出：可 tsc 编译的 TypeScript/AI SDK 代码字符串
 * - 修正 AI SDK 7 API：maxTokens → maxOutputTokens，generateText().files → generateImage
 * - 条件分支展开目标节点代码，支持 true/false 双路径
 * - 生成 runAgentWorkflow 函数，包含导入、模型调用、条件分支与结构化输出
 *
 * dependencies: @xyflow/react
 * exports: generateAISDKCode
 * notes: 生成代码需通过 tsc --noEmit 验证
 */

import type { Edge, Node as XYNode } from "@xyflow/react"

type CodeGenNode = XYNode<Record<string, any>>

export function generateAISDKCode(nodes: CodeGenNode[], edges: Edge[]): string {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const edgeMap = new Map<string, string[]>()

  edges.forEach((edge) => {
    if (!edgeMap.has(edge.source)) {
      edgeMap.set(edge.source, [])
    }
    edgeMap.get(edge.source)?.push(edge.target)
  })

  const incomingEdges = new Set(edges.map((e) => e.target))
  const entryNodes = nodes.filter((node) => !incomingEdges.has(node.id) || node.type === "start")

  let code = `import { generateText, embed, generateObject, generateImage, tool } from 'ai';\n`
  code += `import { google } from '@ai-sdk/google';\n`
  code += `import { openai } from '@ai-sdk/openai';\n`
  code += `import { z } from 'zod';\n\n`
  code += `export async function runAgentWorkflow(initialInput?: string) {\n`

  const processedNodes = new Set<string>()
  const nodeVariables = new Map<string, string>()

  const getInputVariables = (nodeId: string): string[] => {
    const inputEdges = edges.filter((e) => e.target === nodeId)
    return inputEdges.map((e) => nodeVariables.get(e.source) || '""').filter(Boolean)
  }

  const generateNodeCode = (nodeId: string, indent = "  "): string => {
    if (processedNodes.has(nodeId)) {
      return ""
    }
    processedNodes.add(nodeId)

    const node = nodeMap.get(nodeId)
    if (!node) return ""

    let nodeCode = ""
    const varName = `node_${nodeId.replace(/[^a-zA-Z0-9]/g, "_")}`
    nodeVariables.set(nodeId, varName)

    switch (node.type) {
      case "start":
        nodeCode += `${indent}// Start Node\n`
        nodeCode += `${indent}const ${varName} = initialInput || '';\n\n`
        break

      case "end":
        nodeCode += `${indent}// End Node\n`
        const endInputVars = getInputVariables(nodeId)
        const endInputVar = endInputVars.length > 0 ? endInputVars[0] : '""'
        nodeCode += `${indent}const ${varName} = ${endInputVar};\n`
        nodeCode += `${indent}return ${varName};\n\n`
        break

      case "prompt":
        nodeCode += `${indent}// Prompt Node\n`
        const inputVars = getInputVariables(nodeId)

        if (inputVars.length > 0) {
          const content = node.data.content || ""
          let interpolatedContent = content
          inputVars.forEach((inputVar, index) => {
            interpolatedContent = interpolatedContent.replace(
              new RegExp(`\\$input${index + 1}`, "g"),
              `\${${inputVar}}`,
            )
          })
          nodeCode += `${indent}const ${varName} = \`${interpolatedContent}\`;\n\n`
        } else {
          nodeCode += `${indent}const ${varName} = ${JSON.stringify(node.data.content || "")};\n\n`
        }
        break

      case "textModel":
        nodeCode += `${indent}// Text Model Node\n`
        const textInputVars = getInputVariables(nodeId)
        const textInputVar = textInputVars.length > 0 ? textInputVars[0] : '""'

        if (node.data.structuredOutput && node.data.schema) {
          nodeCode += `${indent}const ${varName}_schema = z.object(${node.data.schema});\n`
          nodeCode += `${indent}const ${varName}_result = await generateObject({\n`
          nodeCode += `${indent}  model: '${node.data.model || "openai/gpt-5-mini"}',\n`
          nodeCode += `${indent}  schema: ${varName}_schema,\n`
          nodeCode += `${indent}  prompt: ${textInputVar},\n`
          nodeCode += `${indent}});\n`
          nodeCode += `${indent}const ${varName} = JSON.stringify(${varName}_result.object);\n\n`
        } else {
          nodeCode += `${indent}const ${varName}_result = await generateText({\n`
          nodeCode += `${indent}  model: '${node.data.model || "openai/gpt-5-mini"}',\n`
          nodeCode += `${indent}  prompt: ${textInputVar},\n`
          nodeCode += `${indent}  temperature: ${node.data.temperature || 0.7},\n`
          nodeCode += `${indent}  maxOutputTokens: ${node.data.maxTokens || 2000},\n`
          nodeCode += `${indent}});\n`
          nodeCode += `${indent}const ${varName} = ${varName}_result.text;\n\n`
        }
        break

      case "imageGeneration":
        nodeCode += `${indent}// Image Generation Node\n`
        const imgInputVars = getInputVariables(nodeId)
        const imgInputVar = imgInputVars.length > 0 ? imgInputVars[0] : '""'

        const modelId = node.data.model || "gemini-2.5-flash-image"
        nodeCode += `${indent}const ${varName}_result = await generateImage({\n`
        nodeCode += `${indent}  model: google.image('${modelId}'),\n`
        nodeCode += `${indent}  prompt: ${imgInputVar},\n`
        nodeCode += `${indent}});\n`
        nodeCode += `${indent}const ${varName} = (${varName}_result.images ?? [${varName}_result.image].flat()).filter(Boolean).map((i: any) => i?.base64 ?? i) || [];\n\n`
        break

      case "audio":
        nodeCode += `${indent}// Audio Generation Node\n`
        const audioInputVars = getInputVariables(nodeId)
        const audioInputVar = audioInputVars.length > 0 ? audioInputVars[0] : '""'

        nodeCode += `${indent}// Note: Audio generation requires appropriate TTS setup\n`
        nodeCode += `${indent}const ${varName}_result = await fetch('https://api.openai.com/v1/audio/speech', {\n`
        nodeCode += `${indent}  method: 'POST',\n`
        nodeCode += `${indent}  headers: {\n`
        nodeCode += `${indent}    'Authorization': \`Bearer \${process.env.OPENAI_API_KEY}\`,\n`
        nodeCode += `${indent}    'Content-Type': 'application/json',\n`
        nodeCode += `${indent}  },\n`
        nodeCode += `${indent}  body: JSON.stringify({\n`
        nodeCode += `${indent}    model: '${node.data.model || "tts-1"}',\n`
        nodeCode += `${indent}    input: ${audioInputVar},\n`
        nodeCode += `${indent}    voice: '${node.data.voice || "alloy"}',\n`
        nodeCode += `${indent}    speed: ${node.data.speed || 1.0},\n`
        nodeCode += `${indent}  }),\n`
        nodeCode += `${indent}});\n`
        nodeCode += `${indent}const ${varName} = await ${varName}_result.arrayBuffer();\n\n`
        break

      case "embeddingModel":
        nodeCode += `${indent}// Embedding Model Node\n`
        const embInputVars = getInputVariables(nodeId)
        const embInputVar = embInputVars.length > 0 ? embInputVars[0] : '""'

        nodeCode += `${indent}const ${varName}_result = await embed({\n`
        nodeCode += `${indent}  model: openai.embedding('${node.data.model || "text-embedding-3-small"}'),\n`
        nodeCode += `${indent}  value: ${embInputVar},\n`
        nodeCode += `${indent}});\n`
        nodeCode += `${indent}const ${varName} = ${varName}_result.embedding;\n\n`
        break

      case "tool":
        nodeCode += `${indent}// Tool Node\n`
        const toolCode = node.data.code || "return { result: 'Tool executed' };"
        nodeCode += `${indent}const ${varName} = tool({\n`
        nodeCode += `${indent}  description: '${node.data.description || "A custom tool"}',\n`
        nodeCode += `${indent}  parameters: z.object({\n`
        nodeCode += `${indent}    input: z.string().describe('Input parameter'),\n`
        nodeCode += `${indent}  }),\n`
        nodeCode += `${indent}  execute: async ({ input }) => {\n`
        nodeCode += `${indent}    ${toolCode.split("\n").join(`\n${indent}    `)}\n`
        nodeCode += `${indent}  },\n`
        nodeCode += `${indent}});\n\n`
        break

      case "javascript":
        nodeCode += `${indent}// JavaScript Execution Node\n`
        const jsInputVars = getInputVariables(nodeId)
        const jsCode = node.data.code || "return input1;"

        nodeCode += `${indent}const ${varName} = (() => {\n`
        jsInputVars.forEach((inputVar, index) => {
          nodeCode += `${indent}  const input${index + 1} = ${inputVar};\n`
        })
        nodeCode += `${indent}  ${jsCode.split("\n").join(`\n${indent}  `)}\n`
        nodeCode += `${indent}})();\n\n`
        break

      case "httpRequest":
        nodeCode += `${indent}// HTTP Request Node\n`
        const httpInputVars = getInputVariables(nodeId)
        const url = node.data.url || "https://api.example.com"
        const method = node.data.method || "GET"

        nodeCode += `${indent}const ${varName}_response = await fetch('${url}', {\n`
        nodeCode += `${indent}  method: '${method}',\n`
        if (method !== "GET" && httpInputVars.length > 0) {
          nodeCode += `${indent}  headers: { 'Content-Type': 'application/json' },\n`
          nodeCode += `${indent}  body: JSON.stringify({ data: ${httpInputVars[0]} }),\n`
        }
        nodeCode += `${indent}});\n`
        nodeCode += `${indent}const ${varName} = await ${varName}_response.json();\n\n`
        break

      case "conditional":
        nodeCode += `${indent}// Conditional Node\n`
        const condInputVars = getInputVariables(nodeId)
        const condition = node.data.condition || "true"

        nodeCode += `${indent}const ${varName} = (() => {\n`
        condInputVars.forEach((inputVar, index) => {
          nodeCode += `${indent}  const input${index + 1} = ${inputVar};\n`
        })
        nodeCode += `${indent}  return ${condition};\n`
        nodeCode += `${indent}})();\n\n`

        // Handle branching
        const outgoingEdges = edges.filter((e) => e.source === nodeId)
        const trueEdge = outgoingEdges.find((e) => e.sourceHandle === "true")
        const falseEdge = outgoingEdges.find((e) => e.sourceHandle === "false")

        if (trueEdge || falseEdge) {
          nodeCode += `${indent}if (${varName}) {\n`
          if (trueEdge) {
            nodeCode += generateNodeCode(trueEdge.target, `${indent}  `)
          } else {
            nodeCode += `${indent}  // True branch: no target node\n`
          }
          nodeCode += `${indent}} else {\n`
          if (falseEdge) {
            nodeCode += generateNodeCode(falseEdge.target, `${indent}  `)
          } else {
            nodeCode += `${indent}  // False branch: no target node\n`
          }
          nodeCode += `${indent}}\n\n`
        }
        break
    }

    return nodeCode
  }

  const processNode = (nodeId: string): void => {
    const inputEdges = edges.filter((e) => e.target === nodeId)
    inputEdges.forEach((edge) => {
      if (!processedNodes.has(edge.source)) {
        processNode(edge.source)
      }
    })

    code += generateNodeCode(nodeId)

    const outputNodes = edgeMap.get(nodeId) || []
    outputNodes.forEach((targetId) => {
      if (!processedNodes.has(targetId)) {
        processNode(targetId)
      }
    })
  }

  entryNodes.forEach((node) => processNode(node.id))

  const endNode = nodes.find((n) => n.type === "end")
  const returnNode = endNode || nodes[nodes.length - 1]
  if (returnNode && !endNode) {
    const lastVar = nodeVariables.get(returnNode.id)
    if (lastVar) {
      code += `  return ${lastVar};\n`
    }
  }

  code += `}\n`

  return code
}

export function generateRouteHandlerCode(nodes: CodeGenNode[], edges: Edge[]): string {
  let code = `import { generateText, embed, generateObject } from 'ai';\n`
  code += `import { google } from '@ai-sdk/google';\n`
  code += `import { openai } from '@ai-sdk/openai';\n`
  code += `import { z } from 'zod';\n\n`
  code += `export const maxDuration = 60;\n\n`
  code += `export async function POST(req: Request) {\n`
  code += `  try {\n`
  code += `    const { input } = await req.json();\n\n`

  const hasTextModel = nodes.some((n) => n.type === "textModel")
  const hasImageGen = nodes.some((n) => n.type === "imageGeneration")
  const hasHttpRequest = nodes.some((n) => n.type === "httpRequest")

  if (hasHttpRequest) {
    const httpNode = nodes.find((n) => n.type === "httpRequest")
    if (httpNode) {
      code += `    // HTTP Request\n`
      code += `    const apiResponse = await fetch('${httpNode.data.url || "https://api.example.com"}', {\n`
      code += `      method: '${httpNode.data.method || "GET"}',\n`
      code += `    });\n`
      code += `    const apiData = await apiResponse.json();\n\n`
    }
  }

  if (hasTextModel) {
    const textNode = nodes.find((n) => n.type === "textModel")
    if (textNode) {
      code += `    // Text Generation\n`
      code += `    const result = await generateText({\n`
      code += `      model: '${textNode.data.model || "openai/gpt-5-mini"}',\n`
      code += `      prompt: input,\n`
      code += `      temperature: ${textNode.data.temperature || 0.7},\n`
      code += `      maxOutputTokens: ${textNode.data.maxTokens || 2000},\n`
      code += `    });\n\n`
    }
  }

  if (hasImageGen) {
    const imgNode = nodes.find((n) => n.type === "imageGeneration")
    if (imgNode) {
      code += `    // Image Generation\n`
      code += `    const imageResult = await generateImage({\n`
      code += `      model: google.image('${imgNode.data.model || "gemini-2.5-flash-image"}'),\n`
      code += `      prompt: input,\n`
      code += `    });\n`
      code += `    const images = (imageResult.images ?? [imageResult.image].flat()).filter(Boolean).map((i: any) => i?.base64 ?? i) || [];\n\n`
    }
  }

  code += `    return Response.json({ \n`
  if (hasTextModel) code += `      text: result.text,\n`
  if (hasImageGen) code += `      images,\n`
  if (hasHttpRequest) code += `      apiData,\n`
  code += `      success: true \n`
  code += `    });\n`
  code += `  } catch (error) {\n`
  code += `    console.error('Workflow error:', error);\n`
  code += `    return Response.json({ error: 'Workflow execution failed' }, { status: 500 });\n`
  code += `  }\n`
  code += `}\n`

  return code
}
