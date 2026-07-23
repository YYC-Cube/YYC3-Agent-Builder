"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  STORAGE_KEY,
  SUPPORTED_LOCALES,
  getLocaleDirection,
  isRTL,
  type LocaleCode,
  type TextDirection,
} from "./config"

type TranslationData = Record<string, any>

function getNestedValue(obj: TranslationData, path: string): string {
  const keys = path.split(".")
  let current: any = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return path
    }
    current = current[key]
  }
  return typeof current === "string" ? current : path
}

type I18nContextValue = {
  locale: LocaleCode
  direction: TextDirection
  setLocale: (locale: LocaleCode) => void
  t: (key: string, params?: Record<string, string | number>) => string
  locales: typeof SUPPORTED_LOCALES
  isRTL: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

const translationCache = new Map<string, TranslationData>()

async function loadTranslations(locale: string): Promise<TranslationData> {
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!
  }

  try {
    const response = await fetch(`/locales/${locale}/common.json`)
    if (!response.ok) {
      throw new Error(`Failed to load translations for ${locale}`)
    }
    const data = await response.json()
    translationCache.set(locale, data)
    return data
  } catch {
    if (locale !== FALLBACK_LOCALE) {
      return loadTranslations(FALLBACK_LOCALE)
    }
    return {}
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as LocaleCode | null
      if (saved && SUPPORTED_LOCALES.some((l) => l.code === saved)) {
        return saved
      }
    }
    return DEFAULT_LOCALE
  })
  const [translations, setTranslations] = useState<TranslationData>({})
  const [fallbackTranslations, setFallbackTranslations] = useState<TranslationData>({})

  useEffect(() => {
    loadTranslations(DEFAULT_LOCALE).then(setFallbackTranslations)
  }, [])

  useEffect(() => {
    loadTranslations(locale).then(setTranslations)
  }, [locale])

  useEffect(() => {
    const dir = getLocaleDirection(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }, [locale])

  const setLocale = useCallback((newLocale: LocaleCode) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations, key)
      if (value === key) {
        value = getNestedValue(fallbackTranslations, key)
      }

      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replace(`{${paramKey}}`, String(paramValue))
        }
      }

      return value
    },
    [translations, fallbackTranslations],
  )

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction: getLocaleDirection(locale),
      setLocale,
      t,
      locales: SUPPORTED_LOCALES,
      isRTL: isRTL(locale),
    }),
    [locale, setLocale, t],
  )

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

export { I18nContext }
