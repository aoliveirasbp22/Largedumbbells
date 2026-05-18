// POST /api/twilio/voice
//
// This is the Voice Request URL configured on our TwiML App.
// When the browser dialer initiates an outbound call, Twilio hits this
// endpoint to find out what to do. We respond with TwiML (XML) that
// tells Twilio: "dial this number, show our Twilio number as caller ID,
// and record the call."
//
// Twilio POSTs form-encoded data here. Key fields we use:
//   - From: the "identity" string from the access token (e.g., "setter")
//   - To:   the destination phone number, passed from the browser as a param
//
// We pass the destination as a custom parameter from the browser
// (params.To when calling device.connect()), and Twilio forwards it here.
//
// IMPORTANT: This endpoint must be publicly reachable. It's added to
// proxy.js PUBLIC_PATHS so the password gate doesn't block Twilio.

import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase-admin'

const VoiceResponse = twilio.twiml.VoiceResponse

export async function POST(req) {
  try {
    const formData = await req.formData()
    const params = Object.fromEntries(formData.entries())

    // The "To" param is set by the browser when calling device.connect({ params: { To: '+1...' } })
    const to = params.To
    const from = process.env.TWILIO_PHONE_NUMBER
    const callSid = params.CallSid

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

    // Log the call attempt to call_logs immediately. The status webhook
    // will fill in duration, final status, etc. We try to match it to a
    // lead by phone number (digits-only comparison).
    const toDigits = to.replace(/\D/g, '')
    let leadId = null
    try {
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('id, phone')
        .not('phone', 'is', null)
        .limit(2000)
      // Match on suffix to be tolerant of country-code prefix differences
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

    try {
      await supabaseAdmin.from('call_logs').insert({
        twilio_call_sid: callSid,
        direction:       'outbound',
        from_number:     from,
        to_number:       to,
        status:          'initiated',
        started_at:      new Date().toISOString(),
        lead_id:         leadId,
      })
    } catch (err) {
      // Don't fail the call if logging fails — the call still needs to happen.
      console.error('[twilio/voice] insert call_logs failed:', err)
    }

    // Dial the destination from our Twilio number.
    // - callerId: caller ID shown to the lead (must be a Twilio number we own)
    // - record: capture audio for later QA / coaching (kept off today per scope)
    // - timeout: how long to ring before giving up
    // - answerOnBridge: don't bill the caller until the lead picks up
    const dial = twiml.dial({
      callerId: from,
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
    // Always return valid TwiML even on error — Twilio expects XML.
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