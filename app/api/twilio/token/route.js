// POST /api/twilio/token
//
// Generates a short-lived (1 hour) Twilio Access Token that grants the
// browser dialer permission to make outbound voice calls through our
// TwiML App. The token is signed with our API Key, so we never have to
// expose the raw Auth Token to the browser.
//
// Flow:
//   1. Browser loads the dialer component on the contact profile page
//   2. Component calls fetch('/api/twilio/token', { method: 'POST' })
//   3. This route returns { token, identity }
//   4. Twilio Voice SDK in the browser uses the token to register a
//      "device" that can make calls
//
// The "identity" is the username Twilio uses to identify this browser
// client. For now we use a single fixed identity since auth ships
// tomorrow. Once we have setter accounts, identity = setter user id.

import { NextResponse } from 'next/server'
import twilio from 'twilio'

const AccessToken = twilio.jwt.AccessToken
const VoiceGrant  = AccessToken.VoiceGrant

export async function POST(req) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const apiKeySid  = process.env.TWILIO_API_KEY_SID
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID

    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      console.error('[twilio/token] missing env vars', {
        hasAccountSid: !!accountSid,
        hasApiKeySid:  !!apiKeySid,
        hasApiKeySecret: !!apiKeySecret,
        hasTwimlAppSid: !!twimlAppSid,
      })
      return NextResponse.json(
        { ok: false, reason: 'server_misconfigured' },
        { status: 500 }
      )
    }

    // For now, single fixed identity. Replace with setter user id when auth lands.
    const identity = 'setter'

    // Create the access token
    const token = new AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      {
        identity,
        ttl: 3600, // 1 hour, max is 24h
      }
    )

    // Grant: the browser can make outbound calls through our TwiML App,
    // and can receive incoming calls (we don't use this yet, but it costs
    // nothing to include and saves a code change later).
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    })
    token.addGrant(voiceGrant)

    return NextResponse.json({
      ok: true,
      identity,
      token: token.toJwt(),
    })
  } catch (err) {
    console.error('[twilio/token] error:', err)
    return NextResponse.json(
      { ok: false, reason: 'token_generation_failed' },
      { status: 500 }
    )
  }
}