// POST /api/twilio/token
//
// Generates a Twilio Voice access token for the browser dialer.
// The token's identity is set to the LOGGED-IN USER'S UUID, which
// becomes the From identity Twilio reports on every call this user makes.
// Voice/status webhooks read that identity back and write it to
// call_logs.called_by — that's how every call gets attributed.

import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 })
    }

    // Identity must be alphanumeric + dashes only (no other chars per Twilio rules).
    // UUIDs satisfy that, so we use the user.id directly.
    const identity = user.id

    const AccessToken = twilio.jwt.AccessToken
    const VoiceGrant  = AccessToken.VoiceGrant

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
      { identity, ttl: 3600 }
    )

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: false,
    })
    token.addGrant(voiceGrant)

    return NextResponse.json({
      ok:       true,
      token:    token.toJwt(),
      identity,
    })
  } catch (err) {
    console.error('[twilio:token] error:', err)
    return NextResponse.json({ ok: false, reason: 'token_failed', error: String(err) }, { status: 500 })
  }
}