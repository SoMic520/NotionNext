// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkStrIsNotionId, getLastPartOfUrl } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import BLOG from './blog.config'

/**
 * Next.js Middleware 匹配范围
 * （保持你原来的 matcher，不动）
 */
export const config = {
  // 注意：这里不需要把 /links 写进 matcher；白名单在下面统一处理
  matcher: ['/((?!.*\\..*|_next|/sign-in|/auth).*)', '/', '/(api|trpc)(.*)']
}

// 需要登录的路由
const isTenantRoute = createRouteMatcher([
  '/user/organization-selector(.*)',
  '/user/orgid/(.*)',
  '/dashboard',
  '/dashboard/(.*)'
])

// 需要管理员权限的路由
const isTenantAdminRoute = createRouteMatcher([
  '/admin/(.*)/memberships',
  '/admin/(.*)/domain'
])

/**
 * 未启用 Clerk（或无鉴权）时的中间件
 * - 这里可能会启用 UUID_REDIRECT（Notion 页面 UUID → slug 映射）
 */
const noAuthMiddleware = async (req: NextRequest, ev: any) => {
  // ✅ 兜底白名单：/links 直接放行，避免进入任何重写/跳转逻辑
  const pathname = req.nextUrl.pathname
  if (pathname === '/links' || pathname === '/links/') {
    return NextResponse.next()
  }

  if (BLOG['UUID_REDIRECT']) {
    let redirectJson: Record<string, string> = {}
    try {
      const response = await fetch(`${req.nextUrl.origin}/redirect.json`)
      if (response.ok) {
        redirectJson = (await response.json()) as Record<string, string>
      }
    } catch (err) {
      console.error('Error fetching static file:', err)
    }

    let lastPart = getLastPartOfUrl(req.nextUrl.pathname) as string
    if (checkStrIsNotionId(lastPart)) {
      lastPart = idToUuid(lastPart)
    }

    if (lastPart && redirectJson[lastPart]) {
      const redirectToUrl = req.nextUrl.clone()
      redirectToUrl.pathname = '/' + redirectJson[lastPart]
      console.log(`redirect from ${req.nextUrl.pathname} to ${redirectToUrl.pathname}`)
      return NextResponse.redirect(redirectToUrl, 308)
    }
  }

  return NextResponse.next()
}

/**
 * 启用 Clerk 时的中间件
 */
const authMiddleware = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware((auth, req) => {
      const { userId } = auth()

      // 登录保护
      if (isTenantRoute(req)) {
        if (!userId) {
          const url = new URL('/sign-in', req.url)
          url.searchParams.set('redirectTo', req.url)
          return NextResponse.redirect(url)
        }
      }

      // 管理员权限保护
      if (isTenantAdminRoute(req)) {
        auth().protect(has => {
          return (
            has({ permission: 'org:sys_memberships:manage' }) ||
            has({ permission: 'org:sys_domains_manage' })
          )
        })
      }

      return NextResponse.next()
    })
  : noAuthMiddleware

/**
 * ✅ 顶层导出：统一做 /links 白名单早退
 * - /links 直接放行
 * - 其他路径交给原中间件（鉴权 / UUID 重定向等）
 */
export default function middleware(req: NextRequest, ev: any) {
  const { pathname } = req.nextUrl

  // 白名单：确保 /links 刷新直达，不参与 slug/UUID 重写，也不触发循环跳转
  if (pathname === '/links' || pathname === '/links/') {
    return NextResponse.next()
  }

  // 其余路径按原逻辑处理
  return (authMiddleware as any)(req, ev)
}
