/**
 * file: components/theme-provider.tsx
 * description: 主题提供者组件 · React 全局暗色/亮色主题包装
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [component],[ui],[theme]
 *
 * brief: 主题提供者组件，封装 next-themes，提供全局暗色/亮色主题切换。
 *
 * details:
 * - 封装 next-themes 的 ThemeProvider
 * - 透传所有 ThemeProviderProps 属性
 * - 客户端组件（use client）
 *
 * dependencies: react, next-themes
 * exports: ThemeProvider
 * notes: 与 oklch 色彩系统配合使用
 */

'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
