// Password gate middleware — protects every page except /login and the API routes
// that Meta + GHL hit (those need to stay public).
//
// Set SITE_PASSWORD in your Vercel environment variables.
// Cookie 'ld_auth' is set on successful login and checked on every request.

import { NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',              // Login endpoint — must be reachable without cookie
  '/api/webhook',           // Meta webhook — must stay public
  '/api/ghl-webhook',       // GHL webhook (if used) — must stay public
  '/privacy',               // Required public by Meta for app review
  '/terms',                 // Required public by Meta for app review
]

const PUBLIC_PREFIXES = [
  '/_next',                 // Next.js static assets
  '/favicon',
  '/logo-large-dumbbells',  // Logo file
]

export function middleware(req) {
  const { pathname } = req.nextUrl

  // Always allow public paths
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Check auth cookie
  const auth = req.cookies.get('ld_auth')?.value
  const expected = process.env.SITE_PASSWORD_HASH

  if (auth && expected && auth === expected) {
    return NextResponse.next()
  }

  // Not authed → redirect to /login, preserve intended destination
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     * - Next.js internals (_next/static, _next/image)
     * - Favicon
     * - The public paths checked above
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}