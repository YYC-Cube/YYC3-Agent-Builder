import { CodeExportDialog } from "@/components/code-export-dialog"
import { ErrorBoundary } from "@/components/error-boundary"
import { ExecutionPanel } from "@/components/execution-panel"
import { NodePalette } from "@/components/node-palette"
import { I18nProvider } from "@/lib/i18n/provider"
import "@testing-library/jest-dom/vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { setupFetchMock } from "../helpers"

beforeEach(() => {
  setupFetchMock()
})

function wrap(children: React.ReactNode) {
  return <I18nProvider>{children}</I18nProvider>
}

describe("NodePalette", () => {
  it("renders palette title", async () => {
    const onAddNode = vi.fn()
    render(wrap(<NodePalette onAddNode={onAddNode} />))
    await waitFor(() => {
      expect(screen.getByText("Add Nodes")).toBeInTheDocument()
    })
  })

  it("renders all 10 node types", async () => {
    const onAddNode = vi.fn()
    render(wrap(<NodePalette onAddNode={onAddNode} />))
    await waitFor(() => {
      expect(screen.getByText("Start")).toBeInTheDocument()
      expect(screen.getByText("Prompt")).toBeInTheDocument()
      expect(screen.getByText("Text Model")).toBeInTheDocument()
      expect(screen.getByText("Image Generation")).toBeInTheDocument()
      expect(screen.getByText("HTTP Request")).toBeInTheDocument()
      expect(screen.getByText("Conditional")).toBeInTheDocument()
      expect(screen.getByText("JavaScript")).toBeInTheDocument()
      expect(screen.getByText("Embedding Model")).toBeInTheDocument()
      expect(screen.getByText("Tool")).toBeInTheDocument()
      expect(screen.getByText("End")).toBeInTheDocument()
    })
  })

  it("calls onAddNode when a node card is clicked", async () => {
    const onAddNode = vi.fn()
    const user = userEvent.setup()
    render(wrap(<NodePalette onAddNode={onAddNode} />))

    await waitFor(() => {
      expect(screen.getByText("Start")).toBeInTheDocument()
    })

    const startCard = screen.getByText("Start").closest("[draggable]")
    expect(startCard).toBeTruthy()
    await user.click(startCard!)
    expect(onAddNode).toHaveBeenCalledWith("start")
  })

  it("renders cards as draggable", async () => {
    const onAddNode = vi.fn()
    render(wrap(<NodePalette onAddNode={onAddNode} />))
    await waitFor(() => {
      const cards = screen.getAllByRole("generic").filter((el) => el.getAttribute("draggable") === "true")
      expect(cards.length).toBe(10)
    })
  })
})

describe("ExecutionPanel", () => {
  it("renders panel title and run button", async () => {
    const onClose = vi.fn()
    render(wrap(<ExecutionPanel nodes={[]} edges={[]} onClose={onClose} />))
    await waitFor(() => {
      expect(screen.getByText("Execution")).toBeInTheDocument()
      expect(screen.getByText("Run")).toBeInTheDocument()
    })
  })

  it("disables run button when no nodes", async () => {
    const onClose = vi.fn()
    render(wrap(<ExecutionPanel nodes={[]} edges={[]} onClose={onClose} />))
    await waitFor(() => {
      expect(screen.getByText("Run")).toBeInTheDocument()
    })
    const btn = screen.getByText("Run").closest("button")!
    expect(btn).toBeDisabled()
  })

  it("enables run button when nodes exist", async () => {
    const onClose = vi.fn()
    const nodes = [{ id: "1", type: "start", position: { x: 0, y: 0 }, data: {} }]
    render(wrap(<ExecutionPanel nodes={nodes as any} edges={[]} onClose={onClose} />))
    await waitFor(() => {
      expect(screen.getByText("Run")).toBeInTheDocument()
    })
    const btn = screen.getByText("Run").closest("button")!
    expect(btn).not.toBeDisabled()
  })

  it("calls onClose when close button clicked", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { container } = render(wrap(<ExecutionPanel nodes={[]} edges={[]} onClose={onClose} />))
    await waitFor(() => {
      expect(screen.getByText("Execution")).toBeInTheDocument()
    })
    const closeBtn = container.querySelector("aside button")
    await user.click(closeBtn!)
    expect(onClose).toHaveBeenCalled()
  })
})

describe("CodeExportDialog", () => {
  it("renders dialog when open", async () => {
    const onOpenChange = vi.fn()
    render(wrap(<CodeExportDialog open={true} onOpenChange={onOpenChange} nodes={[]} edges={[]} />))
    await waitFor(() => {
      expect(screen.getByText("Export Code")).toBeInTheDocument()
    })
  })

  it("renders workflow and route tabs", async () => {
    const onOpenChange = vi.fn()
    render(wrap(<CodeExportDialog open={true} onOpenChange={onOpenChange} nodes={[]} edges={[]} />))
    await waitFor(() => {
      expect(screen.getByText("Workflow")).toBeInTheDocument()
      expect(screen.getByText("Route Handler")).toBeInTheDocument()
    })
  })

  it("renders copy and download buttons", async () => {
    const onOpenChange = vi.fn()
    render(wrap(<CodeExportDialog open={true} onOpenChange={onOpenChange} nodes={[]} edges={[]} />))
    await waitFor(() => {
      expect(screen.getByText("Copy")).toBeInTheDocument()
      expect(screen.getByText("Download")).toBeInTheDocument()
    })
  })
})

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(<ErrorBoundary><div>Child content</div></ErrorBoundary>)
    expect(screen.getByText("Child content")).toBeInTheDocument()
  })

  it("renders error UI when child throws", () => {
    const ThrowingComponent = () => {
      throw new Error("Test error message")
    }

    vi.spyOn(console, "error").mockImplementation(() => { })

    render(<ErrorBoundary><ThrowingComponent /></ErrorBoundary>)
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    expect(screen.getByText("Test error message")).toBeInTheDocument()
    expect(screen.getByText("Reload Page")).toBeInTheDocument()

    vi.restoreAllMocks()
  })

  it("renders custom fallback when provided", () => {
    const ThrowingComponent = () => {
      throw new Error("boom")
    }

    vi.spyOn(console, "error").mockImplementation(() => { })

    render(<ErrorBoundary fallback={<div>Custom fallback</div>}><ThrowingComponent /></ErrorBoundary>)
    expect(screen.getByText("Custom fallback")).toBeInTheDocument()
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument()

    vi.restoreAllMocks()
  })
})
