"use client"

import { createAuthClient } from "better-auth/react"

/**
 * 浏览器端 Better Auth client。
 * 默认使用当前站点 origin；如需跨域部署，设置 NEXT_PUBLIC_APP_URL。
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

export const { signIn, signUp, signOut, useSession } = authClient
