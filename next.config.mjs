/**
 * YYC³ Agent Builder — Next.js Configuration
 *
 * Deployment:
 *   - Primary: Vercel (supports API routes natively)
 *   - GitHub Pages: static export only — set BUILD_TARGET=pages to enable
 *     `output: "export"`. API routes are excluded from the Pages build
 *     (static hosting cannot serve POST/streaming handlers); workflows run
 *     via /api/execute-workflow require the Vercel deployment.
 *   - Custom domain: agent.yyc3.vip (CNAME in /public for DNS verification)
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.BUILD_TARGET === "pages" ? { output: "export" } : {}),
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
