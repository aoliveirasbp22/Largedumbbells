// POST /api/mailgun-webhook
//
// Mailgun fires delivery/engagement events here. We:
//   - verify the signature using MAILGUN_WEBHOOK_SIGNING_KEY
//   - on bounced/complained/unsubscribed: flip leads.* suppression flag
//   - on every event with a Mailgun message-id: update messages row
//
// Required env vars:
//   MAILGUN_WEBHOOK_SIGNING_KEY — from Mailgun > API security > HTTP webhook signing key
//
// Configure in Mailgun: Send > Webhooks > Domain-level > add URL for events:
//   delivered, permanent_fail, complained, unsubscribed
// pointing to https://largedumbbells.vercel.app/api/mailgun-webhook

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

const SIGNING_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY || ''

function verifySignature({ timestamp, token, signature }) {
  if (!SIGNING_KEY || !timestamp || !token || !signature) return false
  // Reject events older than 15 minutes (replay protection)
  const ageSec = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (Number.isNaN(ageSec) || ageSec > 900) return false

  const expected = crypto
    .createHmac('sha256', SIGNING_KEY)
    .update(timestamp + token)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8')
    )
  } catch {
    return false
  }
}

export async function POST(req) {
  let payload
  try { payload = await req.json() }
  catch { return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 }) }

  const sig = payload?.signature
  const data = payload?.['event-data']

  if (!sig || !data) {
    return NextResponse.json({ ok: false, reason: 'malformed' }, { status: 400 })
  }

  if (!verifySignature(sig)) {
    console.warn('[mailgun-webhook] bad signature')
    return NextResponse.json({ ok: false, reason: 'bad_signature' }, { status: 401 })
  }

  const event = data.event
  const messageId = data.message?.headers?.['message-id'] || null
  const recipient = data.recipient || null
  // We pass leadId via v:leadId variable in send-email
  const leadId = data['user-variables']?.leadId || null

  console.log('[mailgun-webhook]', event, {
    recipient,
    leadId,
    messageId,
    rawMessageId: data.message?.headers?.['message-id'],
    storage_message_id: data.message?.storage?.key,
    id: data.id,
  })

// ── Update leads suppression flags ─────────────────────────────────
  if (leadId) {
    const patch = { updated_at: new Date().toISOString() }
    if (event === 'failed' && data.severity === 'permanent') patch.bounced = true
    if (event === 'complained') patch.complained = true
    if (event === 'unsubscribed') patch.unsubscribed = true

    if (Object.keys(patch).length > 1) {
      const { error } = await supabase.from('leads').update(patch).eq('id', leadId)
      if (error) console.error('[mailgun-webhook] lead update error:', error)

      // If lead got suppressed, exit any active enrollments
      const exitStatus = patch.unsubscribed ? 'unsubscribed' : 'completed'
      const { error: enrErr } = await supabase
        .from('campaign_enrollments')
        .update({ status: exitStatus, updated_at: new Date().toISOString() })
        .eq('contact_id', leadId)
        .eq('status', 'active')
      if (enrErr) console.error('[mailgun-webhook] enrollment exit error:', enrErr)
    }
  }

  // ── Update messages row by external_id (the Mailgun message-id) ────
  // Mailgun returns the id WITH <angle brackets> when sending, but strips
  // them in webhook events. Try both formats to match either.
  if (messageId) {
    const bracketed = `<${messageId}>`
    const { error } = await supabase
      .from('messages')
      .update({
        delivery_status: event, // e.g. 'delivered', 'failed', 'complained', 'unsubscribed'
        delivery_updated_at: new Date().toISOString(),
      })
      .in('external_id', [messageId, bracketed])

    // Don't blow up if columns don't exist yet — log and continue
    if (error && !/column .* does not exist/i.test(error.message)) {
      console.error('[mailgun-webhook] message update error:', error)
    }
  }

  return NextResponse.json({ ok: true })
}