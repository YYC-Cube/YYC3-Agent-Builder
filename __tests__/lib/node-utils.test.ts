import { describe, expect, it } from "vitest"
import { getStatusColor } from "@/lib/node-utils"

describe("getStatusColor", () => {
  it("should return yellow classes for running status", () => {
    const result = getStatusColor("running", false)
    expect(result).toContain("border-yellow-500")
    expect(result).toContain("shadow-yellow-500/50")
  })

  it("should return green classes for completed status", () => {
    const result = getStatusColor("completed", false)
    expect(result).toContain("border-green-500")
    expect(result).toContain("shadow-green-500/50")
  })

  it("should return red classes for error status", () => {
    const result = getStatusColor("error", false)
    expect(result).toContain("border-red-500")
    expect(result).toContain("shadow-red-500/50")
  })

  it("should return primary classes for selected idle node", () => {
    const result = getStatusColor("idle", true)
    expect(result).toContain("border-primary")
    expect(result).toContain("shadow-lg")
  })

  it("should return border-border for unselected idle node", () => {
    const result = getStatusColor("idle", false)
    expect(result).toContain("border-border")
  })

  it("should handle undefined status as idle", () => {
    const result = getStatusColor(undefined, false)
    expect(result).toContain("border-border")
  })

  it("should handle undefined status with selected=true", () => {
    const result = getStatusColor(undefined, true)
    expect(result).toContain("border-primary")
  })

  it("should prioritize status over selected", () => {
    const runningSelected = getStatusColor("running", true)
    expect(runningSelected).toContain("border-yellow-500")
    expect(runningSelected).not.toContain("border-primary")

    const errorSelected = getStatusColor("error", true)
    expect(errorSelected).toContain("border-red-500")
    expect(errorSelected).not.toContain("border-primary")
  })
})
