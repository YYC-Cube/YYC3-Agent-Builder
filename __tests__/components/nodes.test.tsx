import AudioNode from "@/components/nodes/audio-node"
import ConditionalNode from "@/components/nodes/conditional-node"
import EmbeddingModelNode from "@/components/nodes/embedding-model-node"
import EndNode from "@/components/nodes/end-node"
import HttpRequestNode from "@/components/nodes/http-request-node"
import ImageGenerationNode from "@/components/nodes/image-generation-node"
import JavaScriptNode from "@/components/nodes/javascript-node"
import PromptNode from "@/components/nodes/prompt-node"
import StartNode from "@/components/nodes/start-node"
import StructuredOutputNode from "@/components/nodes/structured-output-node"
import TextModelNode from "@/components/nodes/text-model-node"
import ToolNode from "@/components/nodes/tool-node"
import { I18nProvider } from "@/lib/i18n/provider"
import "@testing-library/jest-dom/vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { ReactFlow } from "@xyflow/react"
import { beforeEach, describe, expect, it } from "vitest"
import { setupFetchMock } from "../helpers"

beforeEach(() => {
  setupFetchMock()
})

function wrap(children: React.ReactNode) {
  return (
    <I18nProvider>
      <ReactFlow>{children}</ReactFlow>
    </I18nProvider>
  )
}

const baseProps = { id: "test", type: "test" as string, selected: false, dragging: false, zIndex: 0, selectable: true, deletable: true, draggable: true, isConnectable: true, positionAbsoluteX: 0, positionAbsoluteY: 0 }

describe("StartNode", () => {
  it("renders label and description", async () => {
    render(wrap(<StartNode {...baseProps} data={{}} type="start" />))
    await waitFor(() => {
      expect(screen.getByText("Start")).toBeInTheDocument()
      expect(screen.getByText("Workflow entry point")).toBeInTheDocument()
    })
  })

  it("shows running indicator when status is running", async () => {
    render(wrap(<StartNode {...baseProps} data={{ status: "running" }} type="start" />))
    await waitFor(() => {
      expect(screen.getByText("Starting...")).toBeInTheDocument()
    })
  })

  it("has a source handle", async () => {
    const { container } = render(wrap(<StartNode {...baseProps} data={{}} type="start" />))
    await waitFor(() => {
      expect(screen.getByText("Start")).toBeInTheDocument()
    })
    const handles = container.querySelectorAll(".react-flow__handle")
    expect(handles.length).toBeGreaterThan(0)
  })
})

describe("EndNode", () => {
  it("renders label and description", async () => {
    render(wrap(<EndNode {...baseProps} data={{}} type="end" />))
    await waitFor(() => {
      expect(screen.getByText("End")).toBeInTheDocument()
      expect(screen.getByText("Workflow output")).toBeInTheDocument()
    })
  })

  it("displays string output", async () => {
    render(wrap(<EndNode {...baseProps} data={{ output: "Hello World" }} type="end" />))
    await waitFor(() => {
      expect(screen.getByText("Final Output:")).toBeInTheDocument()
      expect(screen.getByText("Hello World")).toBeInTheDocument()
    })
  })

  it("displays JSON output for objects", async () => {
    render(wrap(<EndNode {...baseProps} data={{ output: { key: "val" } }} type="end" />))
    await waitFor(() => {
      expect(screen.getByText(/"key"/)).toBeInTheDocument()
    })
  })
})

describe("PromptNode", () => {
  it("renders content", async () => {
    render(wrap(<PromptNode {...baseProps} data={{ content: "Test prompt" }} type="prompt" />))
    await waitFor(() => {
      expect(screen.getByText("Prompt")).toBeInTheDocument()
      expect(screen.getByText("Test prompt")).toBeInTheDocument()
    })
  })

  it("shows running state", async () => {
    render(wrap(<PromptNode {...baseProps} data={{ content: "test", status: "running" }} type="prompt" />))
    await waitFor(() => {
      expect(screen.getByText("Running...")).toBeInTheDocument()
    })
  })

  it("shows output", async () => {
    render(wrap(<PromptNode {...baseProps} data={{ content: "test", output: "result" }} type="prompt" />))
    await waitFor(() => {
      expect(screen.getByText("result")).toBeInTheDocument()
    })
  })
})

describe("TextModelNode", () => {
  it("renders model name", async () => {
    render(wrap(<TextModelNode {...baseProps} data={{ model: "gpt-4", temperature: 0.7, maxTokens: 1000 }} type="textModel" />))
    await waitFor(() => {
      expect(screen.getByText("Text Model")).toBeInTheDocument()
      expect(screen.getByText("gpt-4")).toBeInTheDocument()
      expect(screen.getByText("0.7")).toBeInTheDocument()
      expect(screen.getByText("1000")).toBeInTheDocument()
    })
  })

  it("shows structured output schema", async () => {
    render(wrap(<TextModelNode {...baseProps} data={{ model: "gpt-4", temperature: 0.7, maxTokens: 1000, structuredOutput: true, schemaName: "MySchema" }} type="textModel" />))
    await waitFor(() => {
      expect(screen.getByText("MySchema")).toBeInTheDocument()
    })
  })
})

describe("ConditionalNode", () => {
  it("renders condition expression", async () => {
    render(wrap(<ConditionalNode {...baseProps} data={{ condition: "input1 > 0" }} type="conditional" />))
    await waitFor(() => {
      expect(screen.getByText("Conditional")).toBeInTheDocument()
      expect(screen.getByText("input1 > 0")).toBeInTheDocument()
    })
  })

  it("shows TRUE result", async () => {
    render(wrap(<ConditionalNode {...baseProps} data={{ condition: "t", output: true }} type="conditional" />))
    await waitFor(() => {
      expect(screen.getByText("✓ TRUE")).toBeInTheDocument()
    })
  })

  it("shows FALSE result", async () => {
    render(wrap(<ConditionalNode {...baseProps} data={{ condition: "t", output: false }} type="conditional" />))
    await waitFor(() => {
      expect(screen.getByText("✗ FALSE")).toBeInTheDocument()
    })
  })
})

describe("HttpRequestNode", () => {
  it("renders URL and method", async () => {
    render(wrap(<HttpRequestNode {...baseProps} data={{ url: "https://api.test.com", method: "POST" }} type="httpRequest" />))
    await waitFor(() => {
      expect(screen.getByText("HTTP Request")).toBeInTheDocument()
      expect(screen.getByText("POST")).toBeInTheDocument()
      expect(screen.getByText("https://api.test.com")).toBeInTheDocument()
    })
  })
})

describe("JavaScriptNode", () => {
  it("renders code", async () => {
    render(wrap(<JavaScriptNode {...baseProps} data={{ code: "return 1 + 1" }} type="javascript" />))
    await waitFor(() => {
      expect(screen.getByText("JavaScript")).toBeInTheDocument()
      expect(screen.getByText("return 1 + 1")).toBeInTheDocument()
    })
  })
})

describe("ImageGenerationNode", () => {
  it("renders model and aspect ratio", async () => {
    render(wrap(<ImageGenerationNode {...baseProps} data={{ model: "dall-e-3", aspectRatio: "16:9" }} type="imageGeneration" />))
    await waitFor(() => {
      expect(screen.getByText("Image Generation")).toBeInTheDocument()
      expect(screen.getByText("dall-e-3")).toBeInTheDocument()
      expect(screen.getByText("16:9")).toBeInTheDocument()
    })
  })
})

describe("AudioNode", () => {
  it("renders model and voice", async () => {
    render(wrap(<AudioNode {...baseProps} data={{ model: "tts-1", voice: "alloy" }} type="audio" />))
    await waitFor(() => {
      expect(screen.getByText("Audio Generation")).toBeInTheDocument()
      expect(screen.getByText("tts-1")).toBeInTheDocument()
      expect(screen.getByText("alloy")).toBeInTheDocument()
    })
  })
})

describe("ToolNode", () => {
  it("renders name and description", async () => {
    render(wrap(<ToolNode {...baseProps} data={{ name: "MyTool", description: "A test tool" }} type="tool" />))
    await waitFor(() => {
      expect(screen.getByText("Tool")).toBeInTheDocument()
      expect(screen.getByText("MyTool")).toBeInTheDocument()
      expect(screen.getByText("A test tool")).toBeInTheDocument()
    })
  })

  it("shows code indicator", async () => {
    render(wrap(<ToolNode {...baseProps} data={{ name: "T", description: "d", code: "return 1" }} type="tool" />))
    await waitFor(() => {
      expect(screen.getByText("Code")).toBeInTheDocument()
    })
  })
})

describe("EmbeddingModelNode", () => {
  it("renders model and dimensions", async () => {
    render(wrap(<EmbeddingModelNode {...baseProps} data={{ model: "text-embedding-3-small", dimensions: 3072 }} type="embeddingModel" />))
    await waitFor(() => {
      expect(screen.getByText("Embedding Model")).toBeInTheDocument()
      expect(screen.getByText("text-embedding-3-small")).toBeInTheDocument()
      expect(screen.getByText("3072")).toBeInTheDocument()
    })
  })

  it("shows selected border", async () => {
    const { container } = render(wrap(<EmbeddingModelNode {...baseProps} data={{ model: "test" }} type="embeddingModel" selected={true} />))
    await waitFor(() => {
      expect(container.querySelector(".border-primary")).toBeInTheDocument()
    })
  })
})

describe("StructuredOutputNode", () => {
  it("renders schema name and mode", async () => {
    render(wrap(<StructuredOutputNode {...baseProps} data={{ schemaName: "PersonSchema", mode: "object" }} type="structuredOutput" />))
    await waitFor(() => {
      expect(screen.getByText("Structured Output")).toBeInTheDocument()
      expect(screen.getByText("PersonSchema")).toBeInTheDocument()
      expect(screen.getByText("object")).toBeInTheDocument()
    })
  })
})
