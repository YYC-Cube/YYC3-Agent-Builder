import { cn } from "@/lib/utils"
import { describe, expect, it } from "vitest"

describe("cn (className utility)", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("should handle conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible")
    expect(cn("base", true && "active")).toBe("base active")
  })

  it("should handle undefined and null", () => {
    expect(cn("a", undefined, "b", null)).toBe("a b")
  })

  it("should merge tailwind classes correctly (override)", () => {
    // twMerge will keep the last conflicting class
    const result = cn("px-4", "px-2")
    expect(result).toBe("px-2")
  })

  it("should handle empty inputs", () => {
    expect(cn()).toBe("")
  })

  it("should handle class-variance-authority output", () => {
    const variant = "primary"
    const result = cn("btn", `btn-${variant}`, variant === "primary" && "btn-primary-active")
    expect(result).toContain("btn")
    expect(result).toContain("btn-primary")
    expect(result).toContain("btn-primary-active")
  })

  it("should handle array arguments", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c")
  })

  it("should handle object arguments", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz")
  })

  it("should handle deeply nested arrays", () => {
    expect(cn("a", ["b", ["c", "d"]])).toBe("a b c d")
  })
})
