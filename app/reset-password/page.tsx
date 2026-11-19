"use client"

import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function parseToken() {
      // 让状态更新发生在微任务中，避免在 effect 内同步 setState
      await Promise.resolve()
      if (cancelled) return

      const params = new URLSearchParams(window.location.search)
      if (params.get("error") === "INVALID_TOKEN") {
        setInvalid(true)
        return
      }
      const value = params.get("token")
      if (!value) {
        setInvalid(true)
        return
      }
      setToken(value)
    }

    void parseToken()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("密码至少 8 位")
      return
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致")
      return
    }
    if (!token) {
      setInvalid(true)
      return
    }

    setBusy(true)
    const result = await authClient.resetPassword({ newPassword: password, token })
    setBusy(false)

    if (result.error) {
      setError(result.error.message ?? "重置失败，链接可能已过期")
      return
    }

    setDone(true)
  }

  return (
    <AuthShell>
      <div className="mb-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">重置密码</h1>
        <p className="mt-1 text-xs text-muted-foreground">设置新的登录密码</p>
      </div>

        {invalid ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">链接无效或已过期。</p>
            <Button asChild className="w-full">
              <Link href="/forgot-password">重新申请重置链接</Link>
            </Button>
          </div>
        ) : done ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">密码已重置，请使用新密码登录。</p>
            <Button asChild className="w-full">
              <Link href="/login">去登录</Link>
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                新密码
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 8 位"
                minLength={8}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm" className="text-sm font-medium text-foreground">
                确认新密码
              </label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="再次输入"
                minLength={8}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存新密码
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
