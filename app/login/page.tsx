"use client"

import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { ArrowLeft, Loader2, MailCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Mode = "signin" | "signup"

export default function LoginPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [mode, setMode] = useState<Mode>("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNeedsVerification(false)

    if (mode === "signup") {
      const result = await authClient.signUp.email({ email, password, name: name.trim() })
      setBusy(false)

      if (result.error) {
        setError(result.error.message ?? "注册失败，请重试")
        return
      }

      // 注册后必须验证邮箱，不直接登录
      setVerificationSent(true)
      return
    }

    const result = await authClient.signIn.email({ email, password })
    setBusy(false)

    if (result.error) {
      if (result.error.status === 403) {
        setNeedsVerification(true)
        setError("邮箱尚未验证，请先打开验证邮件中的链接。")
        return
      }
      setError(result.error.message ?? "登录失败，请检查邮箱与密码")
      return
    }

    router.push("/")
    router.refresh()
  }

  async function handleResendVerification() {
    setBusy(true)
    setError(null)

    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/login`,
    })

    setBusy(false)

    if (result.error) {
      setError(result.error.message ?? "发送失败，请稍后重试")
      return
    }

    setVerificationSent(true)
  }

  return (
    <AuthShell align="right">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">欢迎回来</h1>
        <p className="mt-1 text-xs text-muted-foreground">登录后可将工作流保存到云端</p>
      </div>

        {session?.user ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              已登录：<span className="font-medium text-foreground">{session.user.email}</span>
            </p>
            <Button className="w-full" onClick={() => router.push("/")}>
              返回画布
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await authClient.signOut()
                router.refresh()
              }}
            >
              退出登录
            </Button>
          </div>
        ) : verificationSent ? (
          <div className="space-y-4 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <p className="text-sm text-foreground">
              验证邮件已发送至 <span className="font-medium">{email}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              请打开邮件中的链接完成验证；未收到可检查垃圾邮件或重新发送。
            </p>
            <Button className="w-full" variant="outline" onClick={handleResendVerification} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              重新发送验证邮件
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setVerificationSent(false)
                setMode("signin")
              }}
            >
              返回登录
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  昵称
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="YYC3 User"
                  required
                  autoComplete="name"
                />
              </div>
            )}

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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  密码
                </label>
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                  忘记密码？
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 8 位"
                minLength={8}
                maxLength={128}
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {needsVerification && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendVerification}
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                重新发送验证邮件
              </Button>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "登录" : "注册"}
            </Button>

            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin")
                setError(null)
                setNeedsVerification(false)
              }}
            >
              {mode === "signin" ? "没有账号？注册" : "已有账号？登录"}
            </button>
          </form>
        )}

      <div className="mt-6 border-t border-border pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回画布（匿名试用）
        </Link>
      </div>
    </AuthShell>
  )
}
