// GET /api/unsubscribe?lead=<uuid>&token=<hmac>
//
// Public endpoint people click from email footers. Verifies the HMAC token,
// flips leads.unsubscribed=true, returns a branded confirmation page.
//
// Also handles POST for Mailgun's List-Unsubscribe=One-Click (RFC 8058),
// which Gmail/Apple Mail use for the native "Unsubscribe" button.

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyUnsubToken } from '@/lib/unsubscribe'

const BRAND_GOLD = '#B0834A'

function page({ ok, message, name }) {
  const heading = ok ? 'You\'re unsubscribed' : 'Something went wrong'
  const sub = ok
    ? (name ? `${name}, we won't email you again.` : `We won't email you again.`)
    : message

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
  <style>
    html, body { margin: 0; padding: 0; background: #0a0a0a; color: #f4f4f4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Geist, sans-serif;
      min-height: 100vh; }
    .wrap { max-width: 480px; margin: 0 auto; padding: 80px 24px;
      display: flex; flex-direction: column; align-items: center; text-align: center; }
    .brand { color: ${BRAND_GOLD}; letter-spacing: 0.2em; font-size: 12px;
      text-transform: uppercase; margin-bottom: 48px; font-weight: 600; }
    h1 { font-family: Anton, Impact, sans-serif; font-weight: 400;
      font-size: 36px; letter-spacing: 0.02em; text-transform: uppercase;
      margin: 0 0 16px; }
    p { font-size: 16px; line-height: 1.5; color: #b8b8b8; margin: 0; }
    .box { border: 1px solid #2a2a2a; padding: 40px 32px; width: 100%;
      box-sizing: border-box; position: relative; }
    .box::before, .box::after { content: ''; position: absolute; width: 12px; height: 12px;
      border-color: ${BRAND_GOLD}; }
    .box::before { top: -1px; left: -1px; border-top: 2px solid; border-left: 2px solid; }
    .box::after { bottom: -1px; right: -1px; border-bottom: 2px solid; border-right: 2px solid; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">Large Dumbbells</div>
    <div class="box">
      <h1>${heading}</h1>
      <p>${sub}</p>
    </div>
  </div>
</body>
</html>`,
    {
      status: ok ? 200 : 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  )
}

async function unsubscribe(leadId, token) {
  if (!leadId || !token) {
    return { ok: false, message: 'Missing parameters.' }
  }
  if (!verifyUnsubToken(leadId, token)) {
    return { ok: false, message: 'Invalid or expired link.' }
  }

  const { data: lead, error: selErr } = await supabase
    .from('leads')
    .select('id, name, unsubscribed')
    .eq('id', leadId)
    .maybeSingle()

  if (selErr || !lead) {
    return { ok: false, message: 'Subscriber not found.' }
  }

  if (!lead.unsubscribed) {
    const { error: updErr } = await supabase
      .from('leads')
      .update({ unsubscribed: true, updated_at: new Date().toISOString() })
      .eq('id', leadId)

    if (updErr) {
      console.error('[unsubscribe] update failed:', updErr)
      return { ok: false, message: 'Could not process. Try again.' }
    }
  }

  return { ok: true, name: lead.name || null }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const leadId = searchParams.get('lead')
  const token = searchParams.get('token')
  const result = await unsubscribe(leadId, token)
  return page(result)
}

// Mailgun's List-Unsubscribe=One-Click (RFC 8058) sends a POST
export async function POST(req) {
  const { searchParams } = new URL(req.url)
  const leadId = searchParams.get('lead')
  const token = searchParams.get('token')
  const result = await unsubscribe(leadId, token)
  return NextResponse.json({ ok: result.ok })
}