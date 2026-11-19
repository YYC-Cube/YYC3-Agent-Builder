import {
  closeDb,
  getDb,
  isDatabaseConfigured,
  isReplicaConfigured,
  redactDatabaseUrl,
} from "@/lib/db"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(async () => {
  vi.unstubAllEnvs()
  await closeDb()
})

describe("数据库连接 — 配置与安全", () => {
  it("未配置 DATABASE_URL 时不建连，getDb 抛出明确错误", () => {
    vi.stubEnv("DATABASE_URL", "")
    expect(isDatabaseConfigured()).toBe(false)
    expect(() => getDb()).toThrow(/DATABASE_URL is not configured/)
  })

  it("配置后识别主库与只读副本", () => {
    vi.stubEnv("DATABASE_URL", "postgres://yyc3_app:secret@127.0.0.1:5433/yyc3_agent")
    vi.stubEnv("DATABASE_REPLICA_URL", "postgres://yyc3_ro:secret@127.0.0.2:5433/yyc3_agent")
    expect(isDatabaseConfigured()).toBe(true)
    expect(isReplicaConfigured()).toBe(true)
  })

  it("redactDatabaseUrl 隐藏密码且保留主机/库名", () => {
    const redacted = redactDatabaseUrl("postgres://yyc3_app:super-secret@100.65.172.88:5433/yyc3_agent?sslmode=prefer")
    expect(redacted).not.toContain("super-secret")
    expect(redacted).toContain("100.65.172.88:5433")
    expect(redacted).toContain("yyc3_agent")
  })

  it("非法连接串不抛异常", () => {
    expect(redactDatabaseUrl("not-a-url")).toBe("<invalid-database-url>")
  })
})
