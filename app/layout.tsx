import { ErrorBoundary } from "@/components/error-boundary"
import { ThemeProvider } from "@/components/theme-provider"
import { I18nProvider } from "@/lib/i18n"
import { Analytics } from "@vercel/analytics/next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import type React from "react"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "YYC³ Agent Builder - Visual AI Workflow Builder",
    template: "%s | YYC³ Agent Builder",
  },
  description:
    "YYC³ CloudPivot Intelli-Matrix — Build powerful AI workflows visually with drag-and-drop nodes. Chain prompts, models, conditionals, and more. Export to production-ready AI SDK code.",
  keywords: [
    "YYC³",
    "CloudPivot",
    "Intelli-Matrix",
    "AI Agent Builder",
    "AI SDK",
    "workflow builder",
    "visual programming",
    "no-code",
    "low-code",
    "AI agents",
    "LLM",
    "OpenAI",
    "Gemini",
    "React Flow",
  ],
  authors: [{ name: "YYC³ CloudPivot" }],
  creator: "YYC³ CloudPivot",
  publisher: "YYC³ CloudPivot",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://yyc3-agent-builder.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "YYC³ Agent Builder - Visual AI Workflow Builder",
    description:
      "YYC³ CloudPivot Intelli-Matrix — Build powerful AI workflows visually with drag-and-drop nodes.",
    siteName: "YYC³ Agent Builder",
  },
  twitter: {
    card: "summary_large_image",
    title: "YYC³ Agent Builder - Visual AI Workflow Builder",
    description:
      "YYC³ CloudPivot Intelli-Matrix — Build powerful AI workflows visually with drag-and-drop nodes.",
    creator: "@yyc3",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  generator: "YYC³ CloudPivot Intelli-Matrix",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <I18nProvider>
            <ErrorBoundary>
              <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>}>{children}</Suspense>
            </ErrorBoundary>
          </I18nProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
