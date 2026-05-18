// proxy.js — Supabase Auth session gate.
//
// Replaces the legacy single-password gate. Now checks for a valid
// Supabase Auth session cookie. If none, redirects to /login.
//
// Public paths (no auth required) are listed below — these are webhooks
// hit by external services (Twilio, Meta, Mailgun) and pages that need
// to be reachable without login (/form, /privacy, /terms).
//
// Required env vars (set in Vercel):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',           // legacy login endpoint — leave public so old form doesn't 500 in transit
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/callback',
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

export async function proxy(req) {
  const { pathname } = req.nextUrl

  // Server-to-server internal calls bypass the gate
  const internalSecret = req.headers.get('x-internal-secret')
  if (internalSecret && internalSecret === process.env.CRON_SECRET) {
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Build a response we can attach refreshed cookies to.
  const res = NextResponse.next()

  // Create a server-side Supabase client that reads/writes cookies
  // on the incoming request and outgoing response.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // getUser() validates the session token with Supabase's auth server.
  // If invalid or absent, returns null.
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return res
  }

  // No valid session — redirect to login, preserve the intended path.
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}