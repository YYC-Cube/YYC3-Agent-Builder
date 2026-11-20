/**
 * file: auth.ts
 * description: Better Auth 服务端实例 · 账号体系与会话管理
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [auth],[security],[better-auth],[session]
 *
 * brief: Better Auth 服务端实例，提供邮箱密码登录/注册/会话管理。
 *
 * details:
 * - Drizzle adapter + PostgreSQL，表结构见 lib/db/schema.ts（Better Auth 四表）
 * - 邮箱 + 密码登录；注册后必须验证邮箱才能登录
 * - 密码重置邮件；重置后吊销其它会话
 * - 认证端点启用速率限制，降低暴力破解风险
 *
 * dependencies: better-auth, better-auth/adapters/drizzle, better-auth/next-js, @/lib/db, @/lib/email, @/lib/logger
 * exports: auth (BetterAuth instance)
 * notes: 认证端点已启用速率限制
 */

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { getDb } from "@/lib/db"
import { account, session, user, verification } from "@/lib/db/schema"
import { getAppBaseUrl, sendMail } from "@/lib/email"
import { createLogger } from "@/lib/logger"

type AuthInstance = ReturnType<typeof betterAuth>

const log = createLogger("auth")
let instance: AuthInstance | null = null

function resolveSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV !== "production") {
    return "yyc3-dev-only-insecure-secret-change-me"
  }
  throw new Error("BETTER_AUTH_SECRET is required in production")
}

function resolveBaseUrl(): string {
  const configured = process.env.BETTER_AUTH_URL
  if (configured) return configured
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_URL is required in production")
  }
  return "http://localhost:3146"
}

export function getAuth(): AuthInstance {
  if (instance) return instance

  const baseURL = resolveBaseUrl()
  const trustedOrigins =
    process.env.NODE_ENV === "production" ? [baseURL] : [baseURL, "http://localhost:3146"]

  const created = betterAuth({
    baseURL,
    secret: resolveSecret(),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: targetUser, url }) => {
        // 不 await：避免通过响应时间探测邮箱是否存在
        void sendMail({
          to: targetUser.email,
          subject: "重置你的 YYC³ 密码",
          text: `你好 ${targetUser.name || targetUser.email}：\n\n请在 1 小时内打开以下链接重置密码：\n${url}\n\n如果这不是你的操作，请忽略本邮件。`,
        }).catch((error: unknown) => {
          log.error("failed to send reset password email", {
            error: error instanceof Error ? error.message : String(error),
          })
        })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user: targetUser, token }) => {
        const url = `${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`
        // 不 await：避免时序攻击
        void sendMail({
          to: targetUser.email,
          subject: "验证你的 YYC³ 邮箱",
          text: `你好 ${targetUser.name || targetUser.email}：\n\n请在 24 小时内打开以下链接验证邮箱：\n${url}\n\n如果这不是你的操作，请忽略本邮件。`,
        }).catch((error: unknown) => {
          log.error("failed to send verification email", {
            error: error instanceof Error ? error.message : String(error),
          })
        })
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 5 },
        "/send-verification-email": { window: 60, max: 5 },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins,
    plugins: [nextCookies()],
  })

  instance = created as unknown as AuthInstance
  return instance
}

export type RequestUser = {
  id: string
  email: string
  name: string
}

/** 从请求 cookie/header 解析登录用户；失败时返回 null（不阻断令牌模式） */
export async function getRequestUser(req: Request): Promise<RequestUser | null> {
  try {
    const result = await getAuth().api.getSession({ headers: req.headers })
    if (!result?.user) return null
    return { id: result.user.id, email: result.user.email, name: result.user.name }
  } catch (error) {
    log.warn("session lookup failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
