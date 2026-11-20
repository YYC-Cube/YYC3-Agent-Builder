/**
 * file: components/language-switcher.tsx
 * description: 语言切换组件 · 10 种语言国际化切换
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [component],[ui],[i18n]
 *
 * brief: 语言切换组件，提供 10 种语言的国际化切换。
 *
 * details:
 * - 支持 10 种语言切换，含阿拉伯语 RTL
 * - 使用 i18n useI18n Hook 获取当前语言与可用语言列表
 * - 客户端组件（use client）
 *
 * dependencies: @/lib/i18n, lucide-react, @/components/ui/dropdown-menu, @/components/ui/button, react
 * exports: LanguageSwitcher
 * notes: 语言列表由 i18n 配置决定
 */

"use client"

import { useI18n } from "@/lib/i18n"
import { Check, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageSwitcher() {
  const { locale, setLocale, t, locales } = useI18n()

  const currentLocale = locales.find((l) => l.code === locale) || locales[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t("common.language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => setLocale(loc.code)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-xs opacity-60">{loc.code.toUpperCase()}</span>
              <span>{loc.nativeName}</span>
            </span>
            {locale === loc.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
