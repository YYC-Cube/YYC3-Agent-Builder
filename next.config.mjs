/**
 * YYC³ Agent Builder — Next.js Configuration
 *
 * Deployment:
 *   - Primary: Vercel (supports API routes natively)
 *   - Custom domain: agent.yyc3.vip (configured in Vercel dashboard)
 *   - CNAME in /public for DNS verification
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
