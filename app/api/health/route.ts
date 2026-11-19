import { getRateLimitStore } from "@/lib/rate-limit-store"
import { getDb, isDatabaseConfigured } from "@/lib/db"
import postgres from "postgres"
import Redis from "ioredis"

export const dynamic = "force-dynamic"

/**
 * 容器编排健康检查端点。
 * 只暴露非敏感运行态信息，不返回环境变量、密钥或依赖内部路径。
 * 探测主库与 Redis 连通性，任何依赖不可用时返回 degraded（503）。
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; error?: string }> = {
    service: { ok: true },
  }

  // 主库连通性探测（未配置 DATABASE_URL 时视为跳过，不阻断）
  if (isDatabaseConfigured()) {
    try {
      const client = postgres(process.env.DATABASE_URL!, {
        prepare: false,
        connect_timeout: 3000,
      })
      await client`SELECT 1`
      await client.end()
      checks.database = { ok: true }
    } catch (error) {
      checks.database = { ok: false, error: String(error) }
    }
  } else {
    checks.database = { ok: true, error: "not configured" }
  }

  // Redis 连通性探测（未配置 REDIS_URL 时视为跳过，不阻断）
  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    try {
      const client = new Redis(redisUrl, {
        lazyConnect: false,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
      })
      await client.ping()
      await client.quit()
      checks.redis = { ok: true }
    } catch (error) {
      checks.redis = { ok: false, error: String(error) }
    }
  } else {
    checks.redis = { ok: true, error: "not configured" }
  }

  const allOk = Object.values(checks).every((check) => check.ok)
  return Response.json(
    {
      status: allOk ? "ok" : "degraded",
      service: "yyc3-agent-builder",
      version: process.env.npm_package_version ?? "0.1.2",
      uptimeSeconds: Math.round(process.uptime()),
      rateLimitStore: getRateLimitStore().kind,
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: allOk ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
