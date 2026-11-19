/**
 * YYC³ · 数据库连接（阶段 A）
 * ================
 * - 主库：DATABASE_URL（NAS yyc3-45:5433）
 * - 只读：DATABASE_REPLICA_URL（Mac yyc3-22:5433，可选）
 * - 连接参数针对 PgBouncer（prepare: false）；未配置时不在模块加载期建连
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { schema } from "./schema"

export type Database = PostgresJsDatabase<typeof schema>
type SqlClient = ReturnType<typeof postgres>

const DEFAULT_POOL_MAX = 10

let primaryDb: Database | null = null
let replicaDb: Database | null = null
const clients: SqlClient[] = []

function poolMax(): number {
  const parsed = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_POOL_MAX
}

function createClient(url: string): SqlClient {
  const client = postgres(url, {
    max: poolMax(),
    idle_timeout: 20,
    connect_timeout: 10,
    // PgBouncer transaction 模式不支持预处理语句
    prepare: false,
  })
  clients.push(client)
  return client
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export function isReplicaConfigured(): boolean {
  return Boolean(process.env.DATABASE_REPLICA_URL)
}

export function getDb(): Database {
  if (primaryDb) return primaryDb

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not configured")
  }

  primaryDb = drizzle(createClient(url), { schema })
  return primaryDb
}

/** 读请求优先走备库；未配置备库时回退主库 */
export function getReadDb(): Database {
  const replicaUrl = process.env.DATABASE_REPLICA_URL
  if (!replicaUrl) return getDb()
  if (replicaDb) return replicaDb
  replicaDb = drizzle(createClient(replicaUrl), { schema })
  return replicaDb
}

/** 仅测试/脚本使用：关闭连接池 */
export async function closeDb(): Promise<void> {
  await Promise.all(clients.map((client) => client.end({ timeout: 5 })))
  clients.length = 0
  primaryDb = null
  replicaDb = null
}

/** 日志/健康检查用：隐藏连接串中的密码 */
export function redactDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.password) parsed.password = "***"
    return parsed.toString()
  } catch {
    return "<invalid-database-url>"
  }
}
