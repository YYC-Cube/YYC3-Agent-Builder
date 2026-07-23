import "@testing-library/jest-dom/vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { I18nProvider, useI18n } from "@/lib/i18n/provider"

const mockEnTranslations = { app: { title: "App Title EN" } }
const mockJaTranslations = { app: { title: "App Title JA" } }

function ShowAll() {
  const { locale, t, direction, locales, isRTL } = useI18n()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="direction">{direction}</span>
      <span data-testid="translated">{t("app.title")}</span>
      <span data-testid="isRTL">{String(isRTL)}</span>
      <span data-testid="localeCount">{locales.length}</span>
      <span data-testid="missingKey">{t("missing.key")}</span>
      <span data-testid="parametrized">{t("app.title", { name: "Test" })}</span>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

function mockFetchWithVariants() {
  vi.spyOn(globalThis, "fetch").mockImplementation((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString()
    if (url.includes("/locales/en/common.json")) {
      return Promise.resolve(
        new Response(JSON.stringify(mockEnTranslations), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
    }
    if (url.includes("/locales/ja/common.json")) {
      return Promise.resolve(
        new Response(JSON.stringify(mockJaTranslations), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
    }
    return Promise.resolve(new Response(null, { status: 404 }))
  })
}

describe("I18nProvider - Internal Logic", () => {
  it("should provide English as default locale", async () => {
    mockFetchWithVariants()
    render(
      <I18nProvider>
        <ShowAll />
      </I18nProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en")
      expect(screen.getByTestId("direction")).toHaveTextContent("ltr")
      expect(screen.getByTestId("isRTL")).toHaveTextContent("false")
    })
  })

  it("should load correct translations for locale", async () => {
    localStorage.setItem("yyc3-agent-builder-locale", "ja")
    mockFetchWithVariants()
    render(
      <I18nProvider>
        <ShowAll />
      </I18nProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("ja")
      expect(screen.getByTestId("translated")).toHaveTextContent("App Title JA")
    })
  })

  it("should return the key itself for missing translations", async () => {
    mockFetchWithVariants()
    render(
      <I18nProvider>
        <ShowAll />
      </I18nProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("missingKey")).toHaveTextContent("missing.key")
    })
  })

  it("should handle translation fetch failure gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"))
    render(
      <I18nProvider>
        <ShowAll />
      </I18nProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en")
    })
  })
})

describe("useI18n hook", () => {
  it("should throw when used outside provider", () => {
    const TestComp = () => {
      useI18n()
      return null
    }
    expect(() => render(<TestComp />)).toThrow("useI18n must be used within an I18nProvider")
  })
})
