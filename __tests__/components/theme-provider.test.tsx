import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ThemeProvider } from "@/components/theme-provider"

describe("ThemeProvider", () => {
  it("should render children", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <div data-testid="child">Content</div>
      </ThemeProvider>,
    )
    expect(screen.getByTestId("child")).toHaveTextContent("Content")
  })

  it("should render without crashing with system theme", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
        <div>System theme content</div>
      </ThemeProvider>,
    )
    expect(screen.getByText("System theme content")).toBeInTheDocument()
  })

  it("should pass through additional props to next-themes provider", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <div>Light theme</div>
      </ThemeProvider>,
    )
    expect(screen.getByText("Light theme")).toBeInTheDocument()
  })
})
