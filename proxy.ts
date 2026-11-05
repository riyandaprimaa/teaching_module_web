import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Proxy ini hanya menangani redirect root ke /dashboard
// Proteksi data dilakukan server-side di API routes (lib/api-auth.ts)
// & Firestore Security Rules, bukan di client side.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root ke dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}
