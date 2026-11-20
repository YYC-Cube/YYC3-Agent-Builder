/**
 * file: __tests__/setup.ts
 * description: 测试环境设置 · jsdom 与 Web Streams Polyfill
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [test],[setup],[vitest]
 *
 * brief: 测试环境设置，注入 jsdom 与 Web Streams Polyfill，配置全局测试环境变量。
 *
 * details:
 * - 测试默认开启 ENABLE_UNSAFE_CODE_NODES，以覆盖历史代码路径
 * - 安全默认值（关闭）由 safe-executor / expression-evaluator 用例显式验证
 * - jsdom 不提供 Web Streams / TextEncoder，API 路由测试需要这些运行时能力
 *
 * dependencies: @testing-library/jest-dom/vitest, vitest
 * exports: 无（全局设置）
 * notes: 仅在测试环境中使用
 */

import "@testing-library/jest-dom/vitest"
import { ReadableStream } from "node:stream/web"
import { TextDecoder, TextEncoder } from "node:util"

// 测试默认开启 VM 兼容通道，以覆盖历史代码路径；
// 安全默认值（关闭）由 safe-executor / expression-evaluator 用例显式验证。
process.env.ENABLE_UNSAFE_CODE_NODES = "true"

// jsdom 不提供 Web Streams / TextEncoder，API 路由测试需要这些运行时能力
if (typeof globalThis.ReadableStream === "undefined") {
  Object.defineProperty(globalThis, "ReadableStream", { value: ReadableStream, configurable: true })
}
if (typeof globalThis.TextEncoder === "undefined") {
  Object.defineProperty(globalThis, "TextEncoder", { value: TextEncoder, configurable: true })
}
if (typeof globalThis.TextDecoder === "undefined") {
  Object.defineProperty(globalThis, "TextDecoder", { value: TextDecoder, configurable: true })
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as any

class DOMMatrixReadOnlyMock {
  identity = true
  is2D = true
  isIdentity = true
  toString() { return "matrix(1, 0, 0, 1, 0, 0)" }
}

globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyMock as any

// Mock window.matchMedia for next-themes
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
