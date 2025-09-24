import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkStrIsNotionId, getLastPartOfUrl } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import BLOG from './blog.config'

// 保持你原来的 matcher（全站），我们用白名单来放行 /links
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

// 未启用 Clerk 的逻辑（包含 UUID_REDIRECT）
const noAuthMiddleware = async (req: NextRequest) => {
  const { pathname } = req.nextUrl

  // ① 强力白名单：/links（含带尾斜杠、带查询）一律放行
  if (pathname === '/links' || pathname === '/links/') {
    return NextResponse.next()
  }

  if (BLOG['UUID_REDIRECT']) {
    let redirectJson: Record<string, string> = {}
    try {
      const res = await fetch(`${req.nextUrl.origin}/redirect.json`)
      if (res.ok) redirectJson = (await res.json()) as Record<string, string>
    } catch (err) {
      console.error('Error fetching redirect.json:', err)
    }

    let lastPart = getLastPartOfUrl(pathname) as string
    if (checkStrIsNotionId(lastPart)) lastPart = idToUuid(lastPart)

    const mapTo = redirectJson[lastPart]
    if (lastPart && mapTo) {
      // ② 自重定向保护：目标与当前一致（或仅尾斜杠差异）→ 不跳转，避免循环
      const targetPath = '/' + String(mapTo).replace(/^\/+/, '')
      const now = pathname.replace(/\/+$/, '')
      const tgt = targetPath.replace(/\/+$/, '')
      if (tgt !== now) {
        const to = req.nextUrl.clone()
        to.pathname = targetPath
        return NextResponse.redirect(to, 308)
      }
    }
  }

  return NextResponse.next()
}

const authMiddleware = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware((auth, req) => {
      const { userId } = auth()

      if (req.nextUrl.pathname === '/links' || req.nextUrl.pathname === '/links/') {
        return NextResponse.next()
      }

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

// ③ 顶层再加一道白名单（确保任何情况 /links 都先放行）
export default function middleware(req: NextRequest, ev: any) {
  const { pathname } = req.nextUrl
  if (pathname === '/links' || pathname === '/links/') {
    return NextResponse.next()
  }
  return (authMiddleware as any)(req, ev)
}
