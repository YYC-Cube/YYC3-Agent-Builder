/**
 * file: components/theme-toggle.tsx
 * description: 主题切换按钮 · 明/暗色模式手动切换
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [component],[ui],[theme]
 *
 * brief: 主题切换按钮，支持明/暗色模式手动切换，保证 SSR/CSR 首屏一致。
 *
 * details:
 * - 使用 next-themes useTheme 获取与设置主题
 * - 使用 useSyncExternalStore 避免水合不匹配
 * - 客户端组件（use client）
 *
 * dependencies: react, next-themes, @/components/ui/button, lucide-react
 * exports: ThemeToggle
 * notes: useSyncExternalStore 保证 SSR/CSR 首屏一致
 */

"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/** 明/暗切换；useSyncExternalStore 保证 SSR/CSR 首屏一致，避免水合不匹配 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const { resolvedTheme, setTheme } = useTheme()

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={className} aria-label="切换主题" disabled>
        <Sun className="h-4 w-4 opacity-0" />
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
      title={isDark ? "切换到浅色模式" : "切换到深色模式"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
