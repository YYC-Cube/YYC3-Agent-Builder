export const SUPPORTED_LOCALES = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr" as const },
  { code: "zh-CN", name: "Chinese Simplified", nativeName: "简体中文", direction: "ltr" as const },
  { code: "zh-TW", name: "Chinese Traditional", nativeName: "繁體中文", direction: "ltr" as const },
  { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr" as const },
  { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr" as const },
  { code: "fr", name: "French", nativeName: "Français", direction: "ltr" as const },
  { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr" as const },
  { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr" as const },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", direction: "ltr" as const },
  { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl" as const },
] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"]
export type TextDirection = "ltr" | "rtl"

export const DEFAULT_LOCALE: LocaleCode = "en"
export const FALLBACK_LOCALE: LocaleCode = "en"
export const STORAGE_KEY = "yyc3-agent-builder-locale"

export function isRTL(locale: string): boolean {
  const loc = SUPPORTED_LOCALES.find((l) => l.code === locale)
  return loc?.direction === "rtl"
}

export function getLocaleDirection(locale: string): TextDirection {
  return isRTL(locale) ? "rtl" : "ltr"
}

export function getLocaleInfo(locale: string) {
  return SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0]
}
