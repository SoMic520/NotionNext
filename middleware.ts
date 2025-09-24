// middleware.ts  （或 src/middleware.ts）
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkStrIsNotionId, getLastPartOfUrl } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import BLOG from './blog.config'

// 你的原 matcher 保留即可
export const config = {
  matcher: ['/((?!.*\\..*|_next|/sign-in|/auth).*)', '/', '/(api|trpc)(.*)']
}

const isTenantRoute = createRouteMatcher([
  '/user/organization-selector(.*)',
  '/user/orgid/(.*)',
  '/dashboard',
  '/dashboard/(.*)'
])

const isTenantAdminRoute = createRouteMatcher([
  '/admin/(.*)/memberships',
  '/admin/(.*)/domain'
])

// 未开启 Clerk 时走这里
const noAuthMiddleware = async (req: NextRequest, ev: any) => {
  const { pathname } = req.nextUrl

  // ① 白名单：/links 直接放行（兜底）
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
      console.error('Error fetching redirect.json:', err)
    }

    let lastPart = getLastPartOfUrl(pathname) as string
    if (checkStrIsNotionId(lastPart)) lastPart = idToUuid(lastPart)

    const mapTo = redirectJson[lastPart]
    if (lastPart && mapTo) {
      // ② 自我重定向保护：目标与当前一致时，不跳转（避免循环）
      const targetPath = '/' + String(mapTo).replace(/^\/+/, '')
      const now = pathname.replace(/\/+$/, '')
      const tgt = targetPath.replace(/\/+$/, '')
      if (tgt !== now) {
        const to = req.nextUrl.clone()
        to.pathname = targetPath
        console.log(`redirect from ${pathname} to ${to.pathname}`)
        return NextResponse.redirect(to, 308)
      }
    }
  }

  return NextResponse.next()
}

// 开启 Clerk 时走这里
const authMiddleware = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware((auth, req) => {
      const { userId } = auth()

      if (isTenantRoute(req)) {
        if (!userId) {
          const url = new URL('/sign-in', req.url)
          url.searchParams.set('redirectTo', req.url)
          return NextResponse.redirect(url)
        }
      }

      if (isTenantAdminRoute(req)) {
        auth().protect(has =>
          has({ permission: 'org:sys_memberships:manage' }) ||
          has({ permission: 'org:sys_domains_manage' })
        )
      }

      return NextResponse.next()
    })
  : noAuthMiddleware

// ③ 顶层导出：再加一道 /links 白名单（最先返回）
export default function middleware(req: NextRequest, ev: any) {
  const { pathname } = req.nextUrl
  if (pathname === '/links' || pathname === '/links/') {
    return NextResponse.next()
  }
  return (authMiddleware as any)(req, ev)
}
