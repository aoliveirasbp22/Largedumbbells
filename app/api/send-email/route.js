// POST /api/send-email
//
// Sends a single email via Mailgun, logs it to the `messages` table.
// Returns the Mailgun message-id on success so callers can correlate
// later webhook events (delivered, bounced, complained).
//
// Required env vars:
//   MAILGUN_API_KEY    — sending key from Mailgun > Domain Settings > Sending keys
//   MAILGUN_DOMAIN     — the verified sending domain (e.g. largedumbbells.com)
//   MAILGUN_REGION     — 'US' (default) or 'EU'

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY
const MAILGUN_DOMAIN  = process.env.MAILGUN_DOMAIN
const MAILGUN_REGION  = (process.env.MAILGUN_REGION || 'US').toUpperCase()

const MAILGUN_BASE = MAILGUN_REGION === 'EU'
  ? 'https://api.eu.mailgun.net/v3'
  : 'https://api.mailgun.net/v3'

const DEFAULT_FROM_NAME = 'Large Dumbbells'
const DEFAULT_FROM_USER = 'hello'

export async function POST(req) {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.error('[send-email] Missing MAILGUN_API_KEY or MAILGUN_DOMAIN')
    return NextResponse.json({ ok: false, reason: 'env_missing' }, { status: 500 })
  }

  let body
  try { body = await req.json() }
  catch { return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 }) }

  const { to, subject, text, html, leadId, fromName, replyTo } = body || {}

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ ok: false, reason: 'invalid_to' }, { status: 400 })
  }
  if (!subject || typeof subject !== 'string') {
    return NextResponse.json({ ok: false, reason: 'missing_subject' }, { status: 400 })
  }
  if (!text && !html) {
    return NextResponse.json({ ok: false, reason: 'missing_body' }, { status: 400 })
  }

  if (leadId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, unsubscribed, bounced, complained')
      .eq('id', leadId)
      .maybeSingle()

    if (lead?.unsubscribed) return NextResponse.json({ ok: false, reason: 'unsubscribed' }, { status: 409 })
    if (lead?.bounced)      return NextResponse.json({ ok: false, reason: 'bounced' }, { status: 409 })
    if (lead?.complained)   return NextResponse.json({ ok: false, reason: 'complained' }, { status: 409 })
  }

  const form = new URLSearchParams()
  form.append('from', `${fromName || DEFAULT_FROM_NAME} <${DEFAULT_FROM_USER}@${MAILGUN_DOMAIN}>`)
  form.append('to', to)
  form.append('subject', subject)
  if (text) form.append('text', text)
  if (html) form.append('html', html)
  if (replyTo) form.append('h:Reply-To', replyTo)
  if (leadId) form.append('v:leadId', leadId)
  form.append('o:tag', 'crm')

  const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')
  const url = `${MAILGUN_BASE}/${MAILGUN_DOMAIN}/messages`

  let mgRes, mgRaw, mgData
  try {
    mgRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })
    mgRaw = await mgRes.text()
    try { mgData = JSON.parse(mgRaw) } catch { mgData = null }
  } catch (err) {
    console.error('[send-email] fetch failed:', err)
    return NextResponse.json({ ok: false, reason: 'network', error: String(err) }, { status: 502 })
  }

  if (!mgRes.ok) {
    console.error('[send-email] mailgun rejected:', {
      status: mgRes.status,
      raw: mgRaw,
      url,
      domain: MAILGUN_DOMAIN,
      region: MAILGUN_REGION,
      keyLength: MAILGUN_API_KEY.length,
      keyPrefix: MAILGUN_API_KEY.slice(0, 6),
    })
    return NextResponse.json(
      {
        ok: false,
        reason: 'mailgun_error',
        status: mgRes.status,
        raw: mgRaw,           // ← now we see Mailgun's actual message
        detail: mgData,
        debug: {
          url,
          domain: MAILGUN_DOMAIN,
          region: MAILGUN_REGION,
          keyLength: MAILGUN_API_KEY.length,
          keyPrefix: MAILGUN_API_KEY.slice(0, 6),
        }
      },
      { status: 502 }
    )
  }

  if (leadId) {
    const { error: logErr } = await supabase.from('messages').insert({
      lead_id: leadId,
      direction: 'outbound',
      channel: 'email',
      content: subject + '\n\n' + (text || html),
      external_id: mgData?.id || null,
    })
    if (logErr) console.error('[send-email] message log error:', logErr)
  }

  return NextResponse.json({
    ok: true,
    mailgunId: mgData?.id,
    message: mgData?.message,
  })
}