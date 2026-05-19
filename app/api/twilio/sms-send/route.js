// POST /api/twilio/sms-send
//
// Sends an outbound SMS via Twilio and logs it to the messages table.
// Called from the contact profile page when a setter sends a text.
//
// Body (JSON):
//   { leadId: uuid, to: '+1...', body: 'message text' }
//
// Returns:
//   { ok: true, messageId, twilioSid }   on success
//   { ok: false, reason: '...' }          on failure
//
// This route is NOT in PUBLIC_PATHS — it's called from the browser by an
// authenticated setter, so the password-gate cookie travels with the request.

import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken  = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      console.error('[twilio/sms-send] missing env vars')
      return NextResponse.json({ ok: false, reason: 'server_misconfigured' }, { status: 500 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 })
    }

    const { leadId, to, body: messageBody } = body || {}

    if (!to)          return NextResponse.json({ ok: false, reason: 'missing_to' }, { status: 400 })
    if (!messageBody) return NextResponse.json({ ok: false, reason: 'missing_body' }, { status: 400 })
    if (!leadId)      return NextResponse.json({ ok: false, reason: 'missing_lead_id' }, { status: 400 })

    // Normalize the destination to E.164 if it's not already prefixed with '+'.
    // Our leads table stores digits-only (e.g. "13055551234"); Twilio needs +13055551234.
    let normalizedTo = String(to).trim()
    if (!normalizedTo.startsWith('+')) {
      // Strip non-digits and prepend +
      const digits = normalizedTo.replace(/\D/g, '')
      if (digits.length < 7) {
        return NextResponse.json({ ok: false, reason: 'invalid_to' }, { status: 400 })
      }
      normalizedTo = '+' + digits
    }

    // Send via Twilio
    const client = twilio(accountSid, authToken)
    let twilioMsg
    try {
      twilioMsg = await client.messages.create({
        from: fromNumber,
        to:   normalizedTo,
        body: messageBody,
        // Status callback to update delivery state (optional but useful)
      })
    } catch (err) {
      console.error('[twilio/sms-send] twilio error:', err)
      // Log failed attempt to messages table for visibility
      try {
        await supabaseAdmin.from('messages').insert({
          lead_id:       leadId,
          channel:       'sms',
          direction:     'outbound',
          content:       messageBody,
          from_address:  fromNumber,
          to_address:    normalizedTo,
          status:        'failed',
          error_code:    String(err?.code ?? ''),
          error_message: String(err?.message ?? ''),
        })
      } catch {}
      return NextResponse.json(
        { ok: false, reason: 'twilio_error', error: err?.message || 'unknown' },
        { status: 502 }
      )
    }

    // Log the successful send to messages
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('messages')
      .insert({
        lead_id:      leadId,
        channel:      'sms',
        direction:    'outbound',
        content:      messageBody,
        external_id:  twilioMsg.sid,
        from_address: fromNumber,
        to_address:   normalizedTo,
        status:       twilioMsg.status || 'queued',
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('[twilio/sms-send] insert error:', insertErr)
      // Message was sent but we couldn't log it. Still return success to caller.
      return NextResponse.json({ ok: true, twilioSid: twilioMsg.sid, warning: 'log_failed' })
    }

    return NextResponse.json({
      ok: true,
      messageId: inserted.id,
      twilioSid: twilioMsg.sid,
      status:    twilioMsg.status,
    })
  } catch (err) {
    console.error('[twilio/sms-send] fatal:', err)
    return NextResponse.json({ ok: false, reason: 'internal_error' }, { status: 500 })
  }
}

function getOrigin(req) {
  // Build the origin for the status callback URL
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host  = req.headers.get('host')
  return `${proto}://${host}`
}