// POST /api/twilio/status
//
// Twilio POSTs here every time a call's status changes:
//   queued → initiated → ringing → in-progress → completed
//   (or → no-answer, busy, failed, canceled)
//
// We update the call_logs row keyed by Twilio's CallSid with the latest
// status, duration, and timestamps. Tomorrow's analytics dashboard reads
// directly from these rows.
//
// Twilio sends form-encoded data. Fields we care about:
//   - CallSid:        unique ID for the call (matches what we stored in /voice)
//   - CallStatus:     'initiated' | 'ringing' | 'in-progress' | 'completed' |
//                     'busy' | 'no-answer' | 'canceled' | 'failed'
//   - CallDuration:   total call time in seconds (only on 'completed')
//   - Timestamp:      ISO timestamp of this status event
//   - From, To:       the numbers (we already stored these but useful as fallback)
//                     For browser-initiated calls, From is "client:<UUID>"
//                     where the UUID is the setter's user.id.
//   - Direction:      'outbound-api' | 'outbound-dial' | 'inbound'
//   - Price:          how much the call cost (negative number, in USD by default)
//   - PriceUnit:      currency code
//
// This endpoint is in PUBLIC_PATHS so Twilio can reach it without our
// password gate blocking it.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Strip "client:" prefix from Twilio's From field and validate UUID format.
// Returns null for non-UUID identities (e.g. inbound calls where From is a phone number).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function parseCallerUserId(fromField) {
  if (!fromField) return null
  const raw = String(fromField).startsWith('client:')
    ? String(fromField).slice('client:'.length)
    : String(fromField)
  return UUID_RE.test(raw) ? raw : null
}

export async function POST(req) {
  try {
    const formData = await req.formData()
    const params = Object.fromEntries(formData.entries())

    const callSid    = params.CallSid
    const callStatus = params.CallStatus
    const duration   = params.CallDuration ? parseInt(params.CallDuration, 10) : null
    const price      = params.Price ? parseFloat(params.Price) : null
    const priceUnit  = params.PriceUnit || null
    const from       = params.From || null
    const to         = params.To || null
    const direction  = params.Direction || null
    const timestamp  = params.Timestamp || new Date().toISOString()
    const calledBy   = parseCallerUserId(from)

    if (!callSid) {
      console.error('[twilio/status] missing CallSid, params:', params)
      return NextResponse.json({ ok: false, reason: 'missing_call_sid' }, { status: 400 })
    }

    // Build the update payload. We only set fields that have values so
    // we don't accidentally null out data from a previous status event.
    const update = {
      status: callStatus,
    }
    if (duration !== null && !Number.isNaN(duration)) update.duration_seconds = duration
    if (price !== null && !Number.isNaN(price))       update.price = price
    if (priceUnit)                                     update.price_unit = priceUnit
    if (callStatus === 'completed' || callStatus === 'failed' ||
        callStatus === 'busy' || callStatus === 'no-answer' || callStatus === 'canceled') {
      update.ended_at = timestamp
    }

    // Try to update an existing row by CallSid. If none exists (e.g., status
    // event arrives before the /voice insert completed, or the call was
    // initiated outside our /voice flow), insert a new row.
    const { data: existing, error: selectErr } = await supabaseAdmin
      .from('call_logs')
      .select('id, lead_id, called_by')
      .eq('twilio_call_sid', callSid)
      .maybeSingle()

    if (selectErr) {
      console.error('[twilio/status] select error:', selectErr)
    }

    if (existing) {
      // Backfill called_by if the existing row doesn't have one and we now know it.
      if (!existing.called_by && calledBy) {
        update.called_by = calledBy
      }
      const { error: updateErr } = await supabaseAdmin
        .from('call_logs')
        .update(update)
        .eq('twilio_call_sid', callSid)
      if (updateErr) {
        console.error('[twilio/status] update error:', updateErr)
      }
    } else {
      // No row yet — insert one. Try to resolve lead_id by phone match.
      let leadId = null
      const target = direction === 'inbound' ? from : to
      const targetDigits = (target || '').replace(/\D/g, '')
      if (targetDigits) {
        try {
          const { data: leads } = await supabaseAdmin
            .from('leads')
            .select('id, phone')
            .not('phone', 'is', null)
            .limit(2000)
          const match = (leads || []).find(l => {
            const leadDigits = (l.phone || '').replace(/\D/g, '')
            return leadDigits && leadDigits.slice(-10) === targetDigits.slice(-10)
          })
          if (match) leadId = match.id
        } catch (err) {
          console.error('[twilio/status] lead lookup failed:', err)
        }
      }

      const { error: insertErr } = await supabaseAdmin.from('call_logs').insert({
        twilio_call_sid:  callSid,
        direction:        direction === 'inbound' ? 'inbound' : 'outbound',
        from_number:      from,
        to_number:        to,
        status:           callStatus,
        duration_seconds: update.duration_seconds ?? 0,
        started_at:       timestamp,
        ended_at:         update.ended_at ?? null,
        price:            update.price ?? null,
        price_unit:       update.price_unit ?? null,
        lead_id:          leadId,
        called_by:        calledBy,
      })
      if (insertErr) {
        console.error('[twilio/status] insert error:', insertErr)
      }
    }

    // Twilio doesn't care about the response body, just a 200.
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[twilio/status] fatal:', err)
    // Return 200 anyway — if we 500, Twilio will retry, which spams logs.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}