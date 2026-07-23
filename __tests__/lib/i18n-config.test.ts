import { describe, expect, it } from "vitest"
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  STORAGE_KEY,
  SUPPORTED_LOCALES,
  getLocaleDirection,
  getLocaleInfo,
  isRTL,
} from "@/lib/i18n/config"

describe("i18n config", () => {
  describe("SUPPORTED_LOCALES", () => {
    it("should have exactly 10 locales", () => {
      expect(SUPPORTED_LOCALES).toHaveLength(10)
    })

    it("should include all expected locale codes", () => {
      const codes = SUPPORTED_LOCALES.map((l) => l.code)
      expect(codes).toContain("en")
      expect(codes).toContain("zh-CN")
      expect(codes).toContain("zh-TW")
      expect(codes).toContain("ja")
      expect(codes).toContain("ko")
      expect(codes).toContain("fr")
      expect(codes).toContain("de")
      expect(codes).toContain("es")
      expect(codes).toContain("pt-BR")
      expect(codes).toContain("ar")
    })

    it("should have required fields for each locale", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        expect(locale).toHaveProperty("code")
        expect(locale).toHaveProperty("name")
        expect(locale).toHaveProperty("nativeName")
        expect(locale).toHaveProperty("direction")
        expect(["ltr", "rtl"]).toContain(locale.direction)
      })
    })

    it("should have only Arabic as RTL", () => {
      const rtlLocales = SUPPORTED_LOCALES.filter((l) => l.direction === "rtl")
      expect(rtlLocales).toHaveLength(1)
      expect(rtlLocales[0].code).toBe("ar")
    })
  })

  describe("constants", () => {
    it("DEFAULT_LOCALE should be en", () => {
      expect(DEFAULT_LOCALE).toBe("en")
    })

    it("FALLBACK_LOCALE should be en", () => {
      expect(FALLBACK_LOCALE).toBe("en")
    })

    it("STORAGE_KEY should be defined", () => {
      expect(STORAGE_KEY).toBe("yyc3-agent-builder-locale")
    })
  })

  describe("isRTL", () => {
    it("should return true for Arabic", () => {
      expect(isRTL("ar")).toBe(true)
    })

    it("should return false for English", () => {
      expect(isRTL("en")).toBe(false)
    })

    it("should return false for Chinese", () => {
      expect(isRTL("zh-CN")).toBe(false)
    })

    it("should return false for unknown locale", () => {
      expect(isRTL("unknown")).toBe(false)
    })
  })

  describe("getLocaleDirection", () => {
    it("should return rtl for Arabic", () => {
      expect(getLocaleDirection("ar")).toBe("rtl")
    })

    it("should return ltr for English", () => {
      expect(getLocaleDirection("en")).toBe("ltr")
    })

    it("should return ltr for unknown locale", () => {
      expect(getLocaleDirection("unknown")).toBe("ltr")
    })
  })

  describe("getLocaleInfo", () => {
    it("should return correct info for known locale", () => {
      const info = getLocaleInfo("ja")
      expect(info.code).toBe("ja")
      expect(info.name).toBe("Japanese")
      expect(info.nativeName).toBe("日本語")
      expect(info.direction).toBe("ltr")
    })

    it("should return first locale (en) for unknown locale", () => {
      const info = getLocaleInfo("unknown")
      expect(info.code).toBe("en")
    })

    it("should return Arabic info with RTL", () => {
      const info = getLocaleInfo("ar")
      expect(info.code).toBe("ar")
      expect(info.direction).toBe("rtl")
    })
  })
})
