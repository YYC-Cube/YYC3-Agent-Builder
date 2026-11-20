/**
 * file: app/api/demo-country/route.ts
 * description: 演示 API 路由 · 国家信息查询示例
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [api],[demo],[example]
 *
 * brief: 演示 API 路由，提供国家信息查询示例接口。
 *
 * details:
 * - 演示用 API，用于验证工作流 HTTP 集成功能
 * - 返回国家信息 JSON 响应
 *
 * dependencies: 无外部依赖
 * exports: GET (demo-country)
 * notes: 仅用于演示和测试目的
 */

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== 'production') { 
    return Response.json({
      country: 'US',
      message: `Hello from US!`,
    })
  }
  
  const country = request.headers.get('x-vercel-ip-country');
  return Response.json({
    country,
    message: `Hello from ${country}!`,
  })
}
