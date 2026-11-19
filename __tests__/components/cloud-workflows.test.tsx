import { CloudWorkflows } from "@/components/cloud-workflows"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

const useSession = vi.fn()

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => useSession() },
}))

const graph = { nodes: [], edges: [] }

describe("CloudWorkflows", () => {
  it("未登录时展示登录入口", async () => {
    useSession.mockReturnValue({ data: null })
    render(
      <CloudWorkflows graph={graph} workflowId={null} onLoad={vi.fn()} onWorkflowIdChange={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole("button", { name: /云端/ }))
    expect(screen.getByRole("link", { name: /去登录/ })).toHaveAttribute("href", "/login")
    expect(screen.getByText(/登录后可跨设备保存/)).toBeInTheDocument()
  })

  it("已登录时展示邮箱与保存入口", async () => {
    useSession.mockReturnValue({ data: { user: { email: "u@example.com" } } })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ workflows: [] }))))

    render(
      <CloudWorkflows graph={graph} workflowId={null} onLoad={vi.fn()} onWorkflowIdChange={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole("button", { name: /云端/ }))
    expect(await screen.findByText("u@example.com")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /保存/ })).toBeInTheDocument()
    expect(screen.getByText("暂无云端工作流")).toBeInTheDocument()

    vi.unstubAllGlobals()
  })
})
