// middleware.ts  或  src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// 只在需要鉴权的路径执行中间件：dashboard / admin / user
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/user/:path*']
}

// 这些匹配器只会在上述 matcher 路径下触发
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

const mw = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
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
  : () => NextResponse.next()

export default mw
