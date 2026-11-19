"use client"

import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { CheckCircle2, Loader2, MailX } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

type Status = "verifying" | "success" | "error"

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>("verifying")
  const [message, setMessage] = useState("正在验证邮箱…")

  useEffect(() => {
    let cancelled = false

    async function verify() {
      // 让状态更新发生在微任务中，避免在 effect 内同步 setState
      await Promise.resolve()
      if (cancelled) return

      const token = new URLSearchParams(window.location.search).get("token")
      if (!token) {
        setStatus("error")
        setMessage("验证链接缺少 token，请重新发送验证邮件。")
        return
      }

      const result = await authClient.verifyEmail({ query: { token } })
      if (cancelled) return

      if (result.error) {
        setStatus("error")
        setMessage(result.error.message ?? "验证失败，链接可能已过期。")
        return
      }

      setStatus("success")
      setMessage("邮箱已验证，可以登录了。")
    }

    void verify()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AuthShell>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {status === "verifying" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
          {status === "success" && <CheckCircle2 className="h-6 w-6 text-primary" />}
          {status === "error" && <MailX className="h-6 w-6 text-destructive" />}
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-foreground">邮箱验证</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>

        {status !== "verifying" && (
          <div className="mt-6 space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">去登录</Link>
            </Button>
            {status === "error" && (
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">返回登录并重新发送</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </AuthShell>
  )
}
