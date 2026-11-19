import nodemailer, { type Transporter } from "nodemailer"
import { createLogger } from "@/lib/logger"

export type MailInput = {
  to: string
  subject: string
  text: string
}

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST
  if (!host) return null
  if (transporter) return transporter

  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  transporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  })

  return transporter
}

/**
 * 发送事务邮件。
 * - 未配置 SMTP：开发环境只记录预览（不发送），生产环境抛错。
 * - 调用方应 `void sendMail(...).catch(...)`，不要 await，避免时序攻击。
 */
export async function sendMail(input: MailInput): Promise<{ delivered: boolean }> {
  const client = getTransporter()

  if (!client) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured")
    }

    createLogger("email").info("email skipped (SMTP not configured, dev preview)", {
      to: input.to,
      subject: input.subject,
      preview: input.text.slice(0, 500),
    })
    return { delivered: false }
  }

  await client.sendMail({
    from: process.env.SMTP_FROM ?? "YYC3 <no-reply@yyc3.vip>",
    to: input.to,
    subject: input.subject,
    text: input.text,
  })

  return { delivered: true }
}

export function getAppBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3146"
}
