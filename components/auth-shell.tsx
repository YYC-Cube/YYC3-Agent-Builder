/**
 * file: components/auth-shell.tsx
 * description: 认证页壳组件 · 登录/注册页面布局壳
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [component],[ui],[auth]
 *
 * brief: 认证页壳组件，提供登录/注册页面的布局壳，支持桌面端右移与居中两种对齐方式。
 *
 * details:
 * - 登录页在桌面端右移；其他认证页居中
 * - 包含 BrandLogo 与 ThemeToggle
 * - 客户端组件（use client）
 *
 * dependencies: @/components/brand-logo, @/components/theme-toggle, next/link, react
 * exports: AuthShell
 * notes: align 参数支持 "center" | "right"
 */

import { BrandLogo } from "@/components/brand-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import type { ReactNode } from "react"

type AuthShellProps = {
  children: ReactNode
  /** 登录页在桌面端右移；其他认证页居中 */
  align?: "center" | "right"
}

export function AuthShell({ children, align = "center" }: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/yyc3-login-bg.png')] bg-cover bg-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/45 to-slate-950/10"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 px-5 py-5 md:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3 text-white">
            <BrandLogo
              size={42}
              priority
              className="ring-1 ring-white/25 shadow-lg shadow-blue-950/40"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide md:text-base">
                YYC³ Agent Builder
              </p>
              <p className="truncate text-[11px] text-white/70 md:text-xs">
                万象归元于云枢 · 深栈智启新纪元
              </p>
            </div>
          </Link>
          <ThemeToggle className="shrink-0 text-white hover:bg-white/10 hover:text-white" />
        </header>

        <div
          className={`flex flex-1 items-center px-4 pb-8 pt-2 sm:px-6 ${
            align === "right"
              ? "justify-center lg:justify-end lg:pr-[clamp(2rem,9vw,10rem)]"
              : "justify-center"
          }`}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-card/95 p-6 shadow-2xl backdrop-blur-xl md:max-w-[26rem]">
            {children}
          </div>
        </div>

        <footer className="relative z-10 px-5 pb-4 text-[11px] text-white/50 md:px-8">
          © 2026 YYC³（YanYuCloudCube™）· 言启象限 | 语枢未来
        </footer>
      </div>
    </main>
  )
}
