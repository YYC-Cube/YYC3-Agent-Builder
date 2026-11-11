import "@testing-library/jest-dom/vitest"
import { ReadableStream } from "node:stream/web"
import { TextDecoder, TextEncoder } from "node:util"

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
