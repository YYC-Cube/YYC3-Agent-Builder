import ForgotPasswordPage from "@/app/forgot-password/page"
import ResetPasswordPage from "@/app/reset-password/page"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

const { requestPasswordReset, resetPassword } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: { requestPasswordReset, resetPassword },
}))

afterEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, "", "/")
})

describe("找回密码页", () => {
  it("提交后展示通用提示，避免账号枚举", async () => {
    requestPasswordReset.mockResolvedValue({ data: {}, error: null })
    render(<ForgotPasswordPage />)

    await userEvent.type(screen.getByLabelText("邮箱"), "u@example.com")
    await userEvent.click(screen.getByRole("button", { name: /发送重置链接/ }))

    expect(await screen.findByText(/如果该邮箱已注册/)).toBeInTheDocument()
    expect(requestPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ email: "u@example.com" }),
    )
  })
})

describe("重置密码页", () => {
  it("从 URL 读取 token 并提交新密码", async () => {
    window.history.replaceState({}, "", "/reset-password?token=test-token")
    resetPassword.mockResolvedValue({ data: {}, error: null })

    render(<ResetPasswordPage />)

    await waitFor(() => expect(screen.getByLabelText("新密码")).toBeInTheDocument())
    await userEvent.type(screen.getByLabelText("新密码"), "new-password-123")
    await userEvent.type(screen.getByLabelText("确认新密码"), "new-password-123")
    await userEvent.click(screen.getByRole("button", { name: /保存新密码/ }))

    expect(await screen.findByText(/密码已重置/)).toBeInTheDocument()
    expect(resetPassword).toHaveBeenCalledWith({
      newPassword: "new-password-123",
      token: "test-token",
    })
  })

  it("缺少 token 时提示重新申请", async () => {
    window.history.replaceState({}, "", "/reset-password")
    render(<ResetPasswordPage />)

    expect(await screen.findByText(/链接无效或已过期/)).toBeInTheDocument()
  })
})
