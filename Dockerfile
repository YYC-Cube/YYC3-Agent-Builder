# syntax=docker/dockerfile:1
# file: Dockerfile
# description: 生产镜像 · Next.js standalone 输出，非 root 运行 + HEALTHCHECK
# author: YYC³ Team
# version: v1.0.0
# created: 2026-11-01
# updated: 2026-11-20
# status: active
# tags: [deploy],[docker],[image]
#
# brief: 生产镜像，使用 Next.js standalone 输出，非 root 用户运行 + HEALTHCHECK。
#
# details:
# - 基础镜像：node:22-alpine
# - 多阶段构建：base → deps → builder → runner
# - 非 root 用户运行，遵循容器安全最佳实践
# - HEALTHCHECK 探测 /api/health 端点
# - 构建：docker build -t yyc3-agent-builder:0.1.2 .
# - 运行：docker run -p 3000:3000 --env-file .env.production yyc3-agent-builder:0.1.2
#
# notes: standalone 输出适合容器化部署，`next start` 与 Vercel 部署不受影响

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# SIGTERM 由 Next.js 处理，编排平台请给 10–30s 排水期
CMD ["node", "server.js"]
