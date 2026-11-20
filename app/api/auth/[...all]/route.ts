/**
 * file: app/api/auth/[...all]/route.ts
 * description: Better Auth 认证端点 · 登录/注册/会话/密码重置
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [api],[auth],[better-auth]
 *
 * brief: Better Auth 认证端点，提供登录、注册、会话管理与密码重置功能。
 *
 * details:
 * - 邮箱 + 密码登录；注册后必须验证邮箱才能登录
 * - 密码重置邮件；重置后吊销其它会话
 * - 认证端点启用速率限制，降低暴力破解风险
 * - 支持 Better Auth 所有标准认证路由（[...all]）
 *
 * dependencies: @/lib/auth
 * exports: GET/POST (auth handler)
 * notes: 认证端点已启用速率限制
 */

import { getAuth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return getAuth().handler(request)
}

export async function POST(request: Request) {
  return getAuth().handler(request)
}
