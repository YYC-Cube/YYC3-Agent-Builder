import { getRateLimitStore } from "@/lib/rate-limit-store"

export const dynamic = "force-dynamic"

/**
 * 容器编排健康检查端点。
 * 只暴露非敏感运行态信息，不返回环境变量、密钥或依赖内部路径。
 */
export async function GET() {
  return Response.json(
    {
      status: "ok",
      service: "yyc3-agent-builder",
      version: process.env.npm_package_version ?? "0.1.2",
      uptimeSeconds: Math.round(process.uptime()),
      rateLimitStore: getRateLimitStore().kind,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
