import { getRequestUser, type RequestUser } from "@/lib/auth"

export type RequireUserResult = { user: RequestUser } | { response: Response }

/** API 路由统一鉴权：未登录返回 401 JSON */
export async function requireUser(req: Request): Promise<RequireUserResult> {
  const user = await getRequestUser(req)
  if (!user) {
    return {
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { user }
}
