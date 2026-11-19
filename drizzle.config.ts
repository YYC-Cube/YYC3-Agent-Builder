import "dotenv/config"
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // generate 不需要真实连接；migrate/push/studio 必须提供 DATABASE_URL
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
})
