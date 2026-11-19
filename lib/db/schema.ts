/**
 * YYC³ · 持久化 Schema（阶段 A）
 * ================
 * - 账号表严格对齐 Better Auth 1.7.x：user / session / account / verification（camelCase 列名）
 * - 业务表：workflows / workflow_versions / runs / run_events
 * - 图数据用 JSONB + GIN；运行事件用 bigserial + (run_id, seq) 唯一约束
 *
 * 账号表不要随意改列名：Better Auth 默认按 Drizzle 属性名映射。
 * 如需改表名/列名，必须在 betterAuth 配置的 modelName/fields 中同步声明。
 */

import { relations, sql } from "drizzle-orm"
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export type WorkflowGraph = {
  nodes: unknown[]
  edges: unknown[]
  [key: string]: unknown
}

/* ------------------------------------------------------------------ */
/* Better Auth 核心表                                                   */
/* ------------------------------------------------------------------ */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("user_created_at_idx").on(table.createdAt)],
)

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_expires_at_idx").on(table.expiresAt),
  ],
)

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }),
    scope: text("scope"),
    idToken: text("idToken"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("account_provider_account_uq").on(table.providerId, table.accountId),
    index("account_user_id_idx").on(table.userId),
  ],
)

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
)

/* ------------------------------------------------------------------ */
/* 业务表                                                              */
/* ------------------------------------------------------------------ */

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    graph: jsonb("graph").$type<WorkflowGraph>().notNull().default(sql`'{}'::jsonb`),
    version: integer("version").notNull().default(1),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workflows_owner_updated_idx").on(table.ownerId, table.updatedAt.desc()),
    index("workflows_graph_gin_idx").using("gin", table.graph),
  ],
)

export const workflowVersions = pgTable(
  "workflow_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    graph: jsonb("graph").$type<WorkflowGraph>().notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("workflow_versions_workflow_version_uq").on(table.workflowId, table.version),
    index("workflow_versions_created_at_idx").on(table.workflowId, table.createdAt.desc()),
  ],
)

export const runStatusEnum = pgEnum("run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
])

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    status: runStatusEnum("status").notNull().default("queued"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    error: text("error"),
    tokenUsage: jsonb("token_usage").notNull().default(sql`'{}'::jsonb`),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
  },
  (table) => [
    index("runs_workflow_started_idx").on(table.workflowId, table.startedAt.desc()),
    index("runs_user_started_idx").on(table.userId, table.startedAt.desc()),
    index("runs_status_idx").on(table.status),
  ],
)

export const runEvents = pgTable(
  "run_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    nodeId: text("node_id"),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("run_events_run_seq_uq").on(table.runId, table.seq),
    index("run_events_run_id_idx").on(table.runId),
  ],
)

/* ------------------------------------------------------------------ */
/* Relations（Better Auth joins 需要；业务关系按需扩展）                 */
/* ------------------------------------------------------------------ */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  workflows: many(workflows),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const workflowRelations = relations(workflows, ({ one, many }) => ({
  owner: one(user, { fields: [workflows.ownerId], references: [user.id] }),
  versions: many(workflowVersions),
  runs: many(runs),
}))

export const workflowVersionRelations = relations(workflowVersions, ({ one }) => ({
  workflow: one(workflows, { fields: [workflowVersions.workflowId], references: [workflows.id] }),
  author: one(user, { fields: [workflowVersions.createdBy], references: [user.id] }),
}))

export const runRelations = relations(runs, ({ one, many }) => ({
  workflow: one(workflows, { fields: [runs.workflowId], references: [workflows.id] }),
  user: one(user, { fields: [runs.userId], references: [user.id] }),
  events: many(runEvents),
}))

export const runEventRelations = relations(runEvents, ({ one }) => ({
  run: one(runs, { fields: [runEvents.runId], references: [runs.id] }),
}))

export const schema = {
  user,
  session,
  account,
  verification,
  workflows,
  workflowVersions,
  runs,
  runEvents,
  userRelations,
  sessionRelations,
  accountRelations,
  workflowRelations,
  workflowVersionRelations,
  runRelations,
  runEventRelations,
}
