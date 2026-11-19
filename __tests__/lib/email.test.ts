import { getAppBaseUrl, sendMail } from "@/lib/email"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("事务邮件", () => {
  it("未配置 SMTP 时开发环境降级为预览，不发送", async () => {
    vi.stubEnv("SMTP_HOST", "")
    const result = await sendMail({ to: "u@example.com", subject: "Verify", text: "https://example.com/v" })
    expect(result.delivered).toBe(false)
  })

  it("生产环境缺少 SMTP 时拒绝发送，避免静默丢邮件", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("SMTP_HOST", "")
    await expect(
      sendMail({ to: "u@example.com", subject: "Verify", text: "https://example.com/v" }),
    ).rejects.toThrow(/SMTP is not configured/)
  })

  it("站点地址优先取 BETTER_AUTH_URL", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://agent.yyc3.vip")
    expect(getAppBaseUrl()).toBe("https://agent.yyc3.vip")
  })
})
