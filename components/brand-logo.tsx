/**
 * file: components/brand-logo.tsx
 * description: 品牌 Logo 组件 · 统一品牌图标引用
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [component],[ui],[brand]
 *
 * brief: 统一品牌 Logo 组件，避免各页面各自引用不同尺寸导致模糊或 404。
 *
 * details:
 * - 引用 /yyc3-icons/macos/AppIcon.iconset/icon_128x128.png
 * - 支持自定义尺寸、className 与优先加载
 * - 客户端组件（use client）
 *
 * dependencies: next/image
 * exports: BrandLogo
 * notes: size 默认 40，className 默认空，priority 默认 false
 */

import Image from "next/image"

type BrandLogoProps = {
  size?: number
  className?: string
  priority?: boolean
}

/** 统一品牌 Logo，避免各页面各自引用不同尺寸导致模糊/404 */
export function BrandLogo({ size = 40, className = "", priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/yyc3-icons/macos/AppIcon.iconset/icon_128x128.png"
      alt="YYC³"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-xl object-cover ${className}`}
    />
  )
}
