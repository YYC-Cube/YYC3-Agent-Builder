/**
 * file: next.config.mjs
 * description: Next.js 配置 · 输出模式与构建目标控制
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [config],[nextjs],[build]
 *
 * brief: Next.js 配置，控制输出模式与构建目标。
 *
 * details:
 * - 主要部署：Vercel（原生支持 API 路由）
 * - GitHub Pages：仅静态导出，设置 BUILD_TARGET=pages 启用 output: "export"
 *   API 路由排除在 Pages 构建之外（静态托管无法服务 POST/streaming 处理器）
 *   工作流通过 /api/execute-workflow 需要 Vercel 部署
 * - 自定义域名：agent.yyc3.vip（CNAME 在 /public 中用于 DNS 验证）
 * - output: standalone（容器化部署），pages 时为 export
 *
 * dependencies: next
 * exports: nextConfig
 * notes: TypeScript 构建错误不被忽略（ignoreBuildErrors: false）
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
