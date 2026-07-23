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
  metadataBase: new URL("https://agent.yyc3.vip"),
  icons: {
    icon: [
      { url: "/yyc3/Web%20App/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/yyc3/Web%20App/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/yyc3/Web%20App/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192",
        url: "/yyc3/Web%20App/android-chrome-192.png",
        sizes: "192x192",
      },
      {
        rel: "android-chrome-512",
        url: "/yyc3/Web%20App/android-chrome-512.png",
        sizes: "512x512",
      },
    ],
  },
  manifest: "/yyc3/Web%20App/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "YYC³ Agent Builder - Visual AI Workflow Builder",
    description:
      "YYC³ CloudPivot Intelli-Matrix — Build powerful AI workflows visually with drag-and-drop nodes.",
    siteName: "YYC³ Agent Builder",
    images: [
      {
        url: "/Family-002.png",
        width: 1200,
        height: 630,
        alt: "YYC³ Agent Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YYC³ Agent Builder - Visual AI Workflow Builder",
    description:
      "YYC³ CloudPivot Intelli-Matrix — Build powerful AI workflows visually with drag-and-drop nodes.",
    creator: "@yyc3",
    images: ["/Family-002.png"],
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
