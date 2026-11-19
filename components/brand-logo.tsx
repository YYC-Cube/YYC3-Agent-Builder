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
