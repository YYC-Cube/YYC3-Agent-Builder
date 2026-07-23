import "@testing-library/jest-dom/vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { I18nProvider, useI18n } from "@/lib/i18n/provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { SUPPORTED_LOCALES } from "@/lib/i18n/config"

function ShowLocale() {
  const { locale, t } = useI18n()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t("app.title")}</span>
    </div>
  )
}

const mockTranslations: Record<string, any> = {
  app: { title: "Test App Title" },
  common: { language: "Language" },
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

function mockFetch(data: Record<string, any> = mockTranslations) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString()
    if (url.includes("/locales/")) {
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } }))
    }
    return Promise.resolve(new Response(null, { status: 404 }))
  })
}

describe("I18nProvider", () => {
  it("should render children", async () => {
    mockFetch()
    render(
      <I18nProvider>
        <div>Child content</div>
      </I18nProvider>,
    )
    expect(screen.getByText("Child content")).toBeInTheDocument()
  })

  it("should default to en locale", async () => {
    mockFetch()
    render(
      <I18nProvider>
        <ShowLocale />
      </I18nProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en")
    })
  })

  it("should load saved locale from localStorage", async () => {
    localStorage.setItem("yyc3-agent-builder-locale", "ja")
    mockFetch()
    render(
      <I18nProvider>
        <ShowLocale />
      </I18nProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("ja")
    })
  })

  it("should ignore invalid saved locale", async () => {
    localStorage.setItem("yyc3-agent-builder-locale", "invalid-xx")
    mockFetch()
    render(
      <I18nProvider>
        <ShowLocale />
      </I18nProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en")
    })
  })

  it("should translate keys from loaded translations", async () => {
    mockFetch()
    render(
      <I18nProvider>
        <ShowLocale />
      </I18nProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId("translated")).toHaveTextContent("Test App Title")
    })
  })

  it("should throw when useI18n used outside provider", () => {
    expect(() => {
      render(<ShowLocale />)
    }).toThrow("useI18n must be used within an I18nProvider")
  })
})

describe("LanguageSwitcher", () => {
  it("should render globe icon button", async () => {
    mockFetch()
    render(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>,
    )
    const button = screen.getByRole("button", { name: /language/i })
    expect(button).toBeInTheDocument()
  })

  it("should show locale list when clicked", async () => {
    mockFetch()
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>,
    )

    const button = screen.getByRole("button", { name: /language/i })
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText("English")).toBeInTheDocument()
      expect(screen.getByText("简体中文")).toBeInTheDocument()
      expect(screen.getByText("日本語")).toBeInTheDocument()
    })
  })

  it("should show all 10 locales in dropdown", async () => {
    mockFetch()
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: /language/i }))

    await waitFor(() => {
      SUPPORTED_LOCALES.forEach((locale) => {
        expect(screen.getByText(locale.nativeName)).toBeInTheDocument()
      })
    })
  })
})
