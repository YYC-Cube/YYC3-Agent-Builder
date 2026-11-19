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
  // 生成自包含 server.js + 精简 node_modules，供容器化部署使用；
  // `next start` 与 Vercel 部署不受影响。
  output: process.env.BUILD_TARGET === "pages" ? "export" : "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // 流式 SSE 经反代（nginx / LB）时必须关闭响应缓冲
  async headers() {
    return [
      {
        source: "/api/execute-workflow",
        headers: [
          { key: "X-Accel-Buffering", value: "no" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ]
  },
}

export default nextConfig
