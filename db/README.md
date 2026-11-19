# YYC³ Agent Builder — 数据库迁移

> 阶段 A：账号 + 工作流 + 运行记录。Schema 源文件：`lib/db/schema.ts`。

## 命令

```bash
# 修改 schema 后生成迁移（不需要数据库连接）
pnpm db:generate

# 校验迁移链是否一致
pnpm db:check

# 应用迁移（需要 DATABASE_URL；建议先备份）
pnpm db:migrate

# 仅开发环境：直接推 schema 到库（不走迁移文件）
pnpm db:push

# 查看数据
pnpm db:studio
```

## 连接

```bash
# NAS 主库（已定案）
DATABASE_URL=postgres://yyc3_app:CHANGE_ME@100.65.172.88:5433/yyc3_agent?sslmode=prefer
# Mac 备库（只读/分析，可选）
DATABASE_REPLICA_URL=postgres://yyc3_ro:CHANGE_ME@100.87.159.21:5433/yyc3_agent?sslmode=prefer
DATABASE_POOL_MAX=10
```

驱动为 `postgres.js`，默认 `prepare: false`，兼容 PgBouncer transaction 模式。

## 表

| 表 | 用途 |
| --- | --- |
| `user` / `session` / `account` / `verification` | Better Auth 1.7.x 核心表（camelCase 列名，勿随意改名） |
| `workflows` | 工作流主表，`graph` JSONB + GIN |
| `workflow_versions` | 版本历史，`(workflow_id, version)` 唯一 |
| `runs` | 每次执行，`run_status` 枚举 + token/cost |
| `run_events` | SSE 事件回放，`(run_id, seq)` 唯一 |

## 迁移原则

1. **已应用的迁移不可修改**；改 schema → `db:generate` 生成新迁移。
2. 生产迁移前先 `pg_dump`，并在 staging/演练库先跑一遍。
3. 大表加索引用 `CREATE INDEX CONCURRENTLY`（需单独迁移并关闭事务）。
4. Better Auth 表名/列名变更必须同步 `betterAuth({ user: { modelName, fields } })`，否则运行时报 schema 校验失败。
5. `updated_at` 由数据库触发器维护；应用层更新时无需手动赋值。

## 手工执行（不使用 drizzle-kit migrate 时）

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0000_black_medusa.sql
```

> `user` 是保留字，手写 SQL 时需加引号：`select * from "user";`
