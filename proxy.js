// Password gate proxy — Next.js 16's replacement for middleware.
// Protects every page except /login and the API routes that Meta + GHL hit.
//
// Set SITE_PASSWORD + SITE_PASSWORD_HASH in your Vercel environment variables.

import { NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/webhook',
  '/api/ghl-webhook',
  '/api/form-submit',
  '/form',
  '/privacy',
  '/terms',
  '/api/unsubscribe',
  '/api/mailgun-webhook',
  '/api/cron/run-campaigns',
]

const PUBLIC_PREFIXES = [
  '/_next',                 // Next.js static assets
  '/favicon',
  '/logo-large-dumbbells',  // Logo file
]

export function proxy(req) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  const auth = req.cookies.get('ld_auth')?.value
  const expected = process.env.SITE_PASSWORD_HASH

  if (auth && expected && auth === expected) {
    return NextResponse.next()
  }

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}