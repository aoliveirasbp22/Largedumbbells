// POST /api/auth — validates password, sets ld_auth cookie on success.
//
// Env vars required (set in Vercel):
//   SITE_PASSWORD       — the actual password the user types
//   SITE_PASSWORD_HASH  — opaque token stored in cookie + checked by middleware
//                         (set this to any random string ~32+ chars)

import { NextResponse } from 'next/server'

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { password } = body || {}
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const expected = process.env.SITE_PASSWORD
  const hash = process.env.SITE_PASSWORD_HASH

  // Diagnostic logs — visible in Vercel function logs
  console.log('[auth] expected length:', expected?.length, 'received length:', password?.length)
  console.log('[auth] hash defined:', !!hash)

  if (!expected || !hash) {
    console.error('[auth] Missing SITE_PASSWORD or SITE_PASSWORD_HASH env vars')
    return NextResponse.json({ ok: false, reason: 'env_missing' }, { status: 500 })
  }

  if (password !== expected) {
    console.log('[auth] Password mismatch')
    await new Promise(r => setTimeout(r, 300))
    return NextResponse.json({ ok: false, reason: 'wrong_password' }, { status: 401 })
  }

  console.log('[auth] Password OK, setting cookie')

  const res = NextResponse.json({ ok: true })
  // 90-day cookie
  res.cookies.set('ld_auth', hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  })
  return res
}

// GET /api/auth — logout (clears the cookie)
export async function GET() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('ld_auth', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  })
  return res
}