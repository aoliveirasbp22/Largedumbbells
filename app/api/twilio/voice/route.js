// POST /api/twilio/voice
//
// This is the Voice Request URL configured on our TwiML App.
// When the browser dialer initiates an outbound call, Twilio hits this
// endpoint to find out what to do. We respond with TwiML (XML) that
// tells Twilio: "dial this number, show our Twilio number as caller ID,
// and record the call."
//
// Twilio POSTs form-encoded data here. Key fields we use:
//   - From:    the access-token identity, prefixed "client:" by Twilio
//              (e.g. "client:ad67de18-bd90-4903-bc29-b9933500e728")
//   - To:      the destination phone number, passed from the browser as a param
//   - CallSid: Twilio's unique id for this call
//
// We pass the destination as a custom parameter from the browser
// (params.To when calling device.connect()), and Twilio forwards it here.
//
// IMPORTANT: This endpoint must be publicly reachable. It's added to
// proxy.js PUBLIC_PATHS so the password gate doesn't block Twilio.

import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase-admin'

const VoiceResponse = twilio.twiml.VoiceResponse

// Extract the user's UUID from Twilio's "From" field.
// Twilio sends client identities prefixed with "client:" — strip it and
// validate the remainder looks like a UUID. Anything else returns null.
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

    const to = params.To
    const fromNumber = process.env.TWILIO_PHONE_NUMBER
    const callSid = params.CallSid
    const calledBy = parseCallerUserId(params.From)

    const twiml = new VoiceResponse()

    if (!to) {
      // No destination provided — say something and hang up so the
      // browser hears a clear error instead of dead silence.
      twiml.say(
        { voice: 'alice' },
        'No destination phone number was provided. Goodbye.'
      )
      twiml.hangup()
      return new Response(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Match the destination number to a lead by phone (digits-only suffix)
    const toDigits = to.replace(/\D/g, '')
    let leadId = null
    try {
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('id, phone')
        .not('phone', 'is', null)
        .limit(2000)
      const match = (leads || []).find(l => {
        const leadDigits = (l.phone || '').replace(/\D/g, '')
        if (!leadDigits) return false
        const a = leadDigits.slice(-10)
        const b = toDigits.slice(-10)
        return a && b && a === b
      })
      if (match) leadId = match.id
    } catch (err) {
      console.error('[twilio/voice] lead lookup failed:', err)
    }

    // Insert the initial call_logs row with attribution.
    try {
      await supabaseAdmin.from('call_logs').insert({
        twilio_call_sid: callSid,
        direction:       'outbound',
        from_number:     fromNumber,
        to_number:       to,
        status:          'initiated',
        started_at:      new Date().toISOString(),
        lead_id:         leadId,
        called_by:       calledBy,  // user UUID, or null if not a valid client identity
      })
    } catch (err) {
      // Don't fail the call if logging fails — the call still needs to happen.
      console.error('[twilio/voice] insert call_logs failed:', err)
    }

    // Dial the destination from our Twilio number.
    const dial = twiml.dial({
      callerId: fromNumber,
      timeout: 30,
      answerOnBridge: true,
      // record: 'record-from-answer-dual', // enable later when recording ships
    })
    dial.number(to)

    return new Response(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    console.error('[twilio/voice] fatal:', err)
    const twiml = new VoiceResponse()
    twiml.say(
      { voice: 'alice' },
      'An error occurred. Please try again.'
    )
    twiml.hangup()
    return new Response(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}