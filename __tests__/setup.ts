import "@testing-library/jest-dom/vitest"

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
