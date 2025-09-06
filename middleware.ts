// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 只匹配非 /api、非静态资源
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}

export function middleware (_req: NextRequest) {
  return NextResponse.next()
}
