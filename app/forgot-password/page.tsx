"use client"

import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo:
        typeof window === "undefined" ? "/reset-password" : `${window.location.origin}/reset-password`,
    })

    setBusy(false)

    // 无论邮箱是否存在都返回通用提示，避免账号枚举
    if (result.error && result.error.status !== 400) {
      setError(result.error.message ?? "发送失败，请稍后重试")
      return
    }

    setSent(true)
  }

  return (
    <AuthShell>
      <div className="mb-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">找回密码</h1>
        <p className="mt-1 text-xs text-muted-foreground">输入注册邮箱，我们会发送重置链接</p>
      </div>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              如果该邮箱已注册，重置链接已发送。请检查收件箱与垃圾邮件目录。
            </p>
            <Button asChild className="w-full">
              <Link href="/login">返回登录</Link>
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                邮箱
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              发送重置链接
            </Button>
          </form>
        )}

      <div className="mt-6 border-t border-border pt-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回登录
        </Link>
      </div>
    </AuthShell>
  )
}
