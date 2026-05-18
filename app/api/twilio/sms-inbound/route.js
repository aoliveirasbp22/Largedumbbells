// POST /api/twilio/sms-inbound
//
// Twilio POSTs here when a lead replies to our Twilio number with an SMS.
// We log the message, match it to a lead by phone number, and return
// empty TwiML so Twilio doesn't auto-respond.
//
// Fields Twilio sends (form-encoded):
//   - MessageSid:  unique Twilio ID for this message
//   - From:        sender's phone number (E.164, e.g. +13055551234)
//   - To:          our Twilio number
//   - Body:        the text the lead sent
//   - NumMedia:    count of MMS attachments (we don't handle media yet)
//
// Auto-handling of STOP/UNSUBSCRIBE:
//   Twilio automatically handles STOP/UNSUBSCRIBE for us — once a number
//   sends STOP, Twilio blocks all future outbound messages to that number
//   and we'd get a 21610 error if we tried. We also flag the lead in our
//   own DB so the UI can show "unsubscribed" status.
//
// This endpoint is in PUBLIC_PATHS so Twilio can reach it.

import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MessagingResponse = twilio.twiml.MessagingResponse

const STOP_WORDS = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit']

export async function POST(req) {
  try {
    const formData = await req.formData()
    const params = Object.fromEntries(formData.entries())

    const messageSid = params.MessageSid
    const from       = params.From      // sender (lead)
    const to         = params.To        // our Twilio number
    const messageBody = params.Body || ''
    const numMedia   = parseInt(params.NumMedia || '0', 10)

    // Try to match this number to a lead.
    // Our leads.phone is stored as digits-only (e.g. "13055551234")
    // Twilio sends E.164 (e.g. "+13055551234")
    const fromDigits = (from || '').replace(/\D/g, '')
    let leadId = null
    if (fromDigits) {
      try {
        const { data: leads } = await supabaseAdmin
          .from('leads')
          .select('id, phone')
          .not('phone', 'is', null)
          .limit(2000)
        const match = (leads || []).find(l => {
          const leadDigits = (l.phone || '').replace(/\D/g, '')
          return leadDigits && leadDigits.slice(-10) === fromDigits.slice(-10)
        })
        if (match) leadId = match.id
      } catch (err) {
        console.error('[twilio/sms-inbound] lead lookup failed:', err)
      }
    }

    // Log the inbound message
    try {
      await supabaseAdmin.from('messages').insert({
        lead_id:      leadId,
        channel:      'sms',
        direction:    'inbound',
        body:         messageBody,
        external_id:  messageSid,
        from_address: from,
        to_address:   to,
        status:       'received',
      })
    } catch (err) {
      console.error('[twilio/sms-inbound] insert error:', err)
    }

    // Handle STOP / UNSUBSCRIBE: flag the lead. Twilio already blocks
    // outbound to this number automatically, but we want our UI to reflect it.
    const normalized = messageBody.trim().toLowerCase()
    if (leadId && STOP_WORDS.includes(normalized)) {
      try {
        await supabaseAdmin
          .from('leads')
          .update({ unsubscribed: true })
          .eq('id', leadId)
      } catch (err) {
        console.error('[twilio/sms-inbound] unsubscribe update failed:', err)
      }
    }

    // Return empty TwiML — we don't auto-respond. Setters will reply
    // manually from the CRM.
    const twiml = new MessagingResponse()
    return new Response(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    console.error('[twilio/sms-inbound] fatal:', err)
    // Still return empty TwiML so Twilio doesn't think we're broken
    const twiml = new MessagingResponse()
    return new Response(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}