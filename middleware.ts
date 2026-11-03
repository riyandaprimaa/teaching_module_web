import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware ini hanya melindungi route /dashboard
// Auth state dicek di client side menggunakan AuthContext
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root ke dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}

