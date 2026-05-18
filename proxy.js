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
  '/api/send-email',
  '/form',
  '/form/thanks',
  '/privacy',
  '/terms',
  '/api/unsubscribe',
  '/api/mailgun-webhook',
  '/api/cron/run-campaigns',
  '/api/twilio/voice',
  '/api/twilio/status',
  '/api/twilio/sms-inbound',
]

const PUBLIC_PREFIXES = [
  '/_next',
  '/favicon',
  '/logo-large-dumbbells',
]

export function proxy(req) {
  const { pathname } = req.nextUrl

  // Server-to-server internal calls bypass the gate
  const internalSecret = req.headers.get('x-internal-secret')
  if (internalSecret && internalSecret === process.env.CRON_SECRET) {
    return NextResponse.next()
  }

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