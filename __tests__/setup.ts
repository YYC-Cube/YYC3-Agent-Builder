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
