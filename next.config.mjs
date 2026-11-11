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
  // 生成自包含 server.js + 精简 node_modules，供容器化部署使用；
  // `next start` 与 Vercel 部署不受影响。
  output: "standalone",
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
