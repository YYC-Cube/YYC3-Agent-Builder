import {
  getDefaultNodeData,
  MINIMAP_NODE_COLORS,
  NODE_TYPES_LIST,
} from "@/lib/node-registry"
import { describe, expect, it } from "vitest"

describe("NODE_TYPES_LIST", () => {
  it("should have exactly 10 node types (palette items)", () => {
    expect(NODE_TYPES_LIST).toHaveLength(10)
  })

  it("should include all expected palette node types", () => {
    const types = NODE_TYPES_LIST.map((n) => n.type)
    // Palette items exclude structuredOutput (handled separately)
    expect(types).toContain("start")
    expect(types).toContain("prompt")
    expect(types).toContain("textModel")
    expect(types).toContain("imageGeneration")
    expect(types).toContain("httpRequest")
    expect(types).toContain("conditional")
    expect(types).toContain("javascript")
    expect(types).toContain("embeddingModel")
    expect(types).toContain("tool")
    expect(types).toContain("end")
  })

  it("should have required fields for each entry", () => {
    NODE_TYPES_LIST.forEach((entry) => {
      expect(entry).toHaveProperty("type")
      expect(entry).toHaveProperty("label")
      expect(entry).toHaveProperty("color")
      expect(entry).toHaveProperty("description")
      expect(typeof entry.type).toBe("string")
      expect(typeof entry.label).toBe("string")
      expect(typeof entry.color).toBe("string")
      expect(typeof entry.description).toBe("string")
    })
  })

  it("should have unique types", () => {
    const types = NODE_TYPES_LIST.map((n) => n.type)
    expect(new Set(types).size).toBe(types.length)
  })
})

describe("getDefaultNodeData", () => {
  it("should return default data for textModel", () => {
    const data = getDefaultNodeData("textModel")
    expect(data.model).toBe("openai/gpt-5")
    expect(data.temperature).toBe(0.7)
    expect(data.maxTokens).toBe(2000)
  })

  it("should return default data for embeddingModel", () => {
    const data = getDefaultNodeData("embeddingModel")
    expect(data.model).toBe("openai/text-embedding-3-small")
    expect(data.dimensions).toBe(1536)
  })

  it("should return default data for tool", () => {
    const data = getDefaultNodeData("tool")
    expect(data.name).toBe("customTool")
    expect(data.description).toBe("A custom tool")
  })

  it("should return default data for structuredOutput", () => {
    const data = getDefaultNodeData("structuredOutput")
    expect(data.schemaName).toBe("Schema")
    expect(data.mode).toBe("object")
  })

  it("should return default data for prompt", () => {
    const data = getDefaultNodeData("prompt")
    expect(data.content).toBe("Enter your prompt...")
  })

  it("should return default data for imageGeneration", () => {
    const data = getDefaultNodeData("imageGeneration")
    expect(data.model).toBe("gemini-2.5-flash-image")
    expect(data.aspectRatio).toBe("1:1")
    expect(data.outputFormat).toBe("png")
  })

  it("should return default data for audio", () => {
    const data = getDefaultNodeData("audio")
    expect(data.model).toBe("openai/tts-1")
    expect(data.voice).toBe("alloy")
    expect(data.speed).toBe(1.0)
  })

  it("should return default data for javascript", () => {
    const data = getDefaultNodeData("javascript")
    expect(data.code).toContain("return input1")
  })

  it("should return empty data for start", () => {
    const data = getDefaultNodeData("start")
    expect(data).toEqual({})
  })

  it("should return empty data for end", () => {
    const data = getDefaultNodeData("end")
    expect(data).toEqual({})
  })

  it("should return default data for conditional", () => {
    const data = getDefaultNodeData("conditional")
    expect(data.condition).toBe("input1 === 'value'")
  })

  it("should return default data for httpRequest", () => {
    const data = getDefaultNodeData("httpRequest")
    expect(data.url).toBe("https://api.example.com")
    expect(data.method).toBe("GET")
  })

  it("should return empty object for unknown type", () => {
    const data = getDefaultNodeData("unknown")
    expect(data).toEqual({})
  })
})

describe("MINIMAP_NODE_COLORS", () => {
  it("should have color for each palette node type plus structuredOutput and audio", () => {
    const paletteTypes = NODE_TYPES_LIST.map((n) => n.type)
    const colorKeys = Object.keys(MINIMAP_NODE_COLORS)
    // Every palette type should have a minimap color
    paletteTypes.forEach((type) => {
      expect(colorKeys).toContain(type)
    })
    // Additional types with colors but not in palette
    expect(colorKeys).toContain("structuredOutput")
    expect(colorKeys).toContain("audio")
  })

  it("should have valid oklch color format", () => {
    Object.values(MINIMAP_NODE_COLORS).forEach((color) => {
      expect(color).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/)
    })
  })

  it("should have exactly 12 color entries", () => {
    expect(Object.keys(MINIMAP_NODE_COLORS)).toHaveLength(12)
  })
})
