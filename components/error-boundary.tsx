/**
 * file: components/error-boundary.tsx
 * description: 全局错误边界组件 · React 错误捕获与降级 UI
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [component],[ui],[error-boundary]
 *
 * brief: 全局错误边界组件，捕获 React 渲染错误并提供降级 UI。
 *
 * details:
 * - 捕获子组件树中的渲染错误
 * - 显示降级 UI，包含 BrandLogo 与重试按钮
 * - 客户端组件（use client）
 *
 * dependencies: react, @/components/brand-logo, @/components/ui/button, lucide-react
 * exports: ErrorBoundary
 * notes: 仅捕获渲染阶段错误，不捕获事件处理程序或异步错误
 */

"use client"

import * as React from "react"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

type ErrorBoundaryProps = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-8">
          <BrandLogo size={48} />
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
          >
            Reload Page
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
