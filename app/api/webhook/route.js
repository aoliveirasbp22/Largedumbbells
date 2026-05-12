import { supabase } from '@/lib/supabase'

const VERIFY_TOKEN   = process.env.META_VERIFY_TOKEN
const FB_PAGE_TOKEN  = process.env.META_PAGE_ACCESS_TOKEN
const IG_TOKEN       = process.env.META_IG_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN

const TRIGGER_WORD   = 'simple'
const BLUEPRINT_LINK = 'https://api.leadconnectorhq.com/widget/form/nyKDoOCsbzV2kwTLIS0h?notrack=true'

const FIRST_MESSAGE  = `Hey my friend, here is the blueprint you requested 👇\n${BLUEPRINT_LINK}`
const SECOND_MESSAGE = `While I have you here, what's been your biggest struggle with fitness lately?`

const DM_DELAY_MS    = 2000

// ─── Verification (GET) ──────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ─── Webhook events (POST) ────────────────────────────────────────────────────
export async function POST(request) {
  const body = await request.json()

  if (body.object !== 'page' && body.object !== 'instagram') {
    return new Response('OK', { status: 200 })
  }

  const platform = body.object === 'instagram' ? 'instagram' : 'facebook'

  for (const entry of body.entry || []) {
    // Comment-based triggers + Instagram messages via changes
    for (const change of entry.changes || []) {
      if (change.field === 'comments') {
        const comment     = change.value
        const commentText = comment?.message?.toLowerCase() || ''
        const fromId      = comment?.from?.id
        const fromName    = comment?.from?.name || comment?.from?.username

        if (commentText.includes(TRIGGER_WORD) && fromId) {
          await handleTrigger({ psid: fromId, name: fromName, platform })
        }
      }
      if (change.field === 'messages') {
        const msg = change.value
        if (msg && !msg.is_echo) {
          await handleIncomingDM(msg, platform)
        }
      }
    }

    // Standard Messenger / IG DM events
    for (const msg of entry.messaging || []) {
      if (msg.message && !msg.message.is_echo) {
        await handleIncomingDM(msg, platform)
      }
    }
  }

  return new Response('OK', { status: 200 })
}

// ─── Handle a comment trigger ────────────────────────────────────────────────
async function handleTrigger({ psid, name, platform }) {
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('psid', psid)
    .maybeSingle()

  if (existing) return // already handled this person

  const { data: newLead, error: leadErr } = await supabase
    .from('leads')
    .insert({
      psid,
      name,
      ig_handle: name,
      status:    'new',
      platform,
    })
    .select()
    .single()

  if (leadErr || !newLead) {
    console.error('Failed to create lead:', leadErr)
    return
  }

  // First message — blueprint form link
  await sendDM({ psid, platform, message: FIRST_MESSAGE })
  await saveOutboundMessage(newLead.id, FIRST_MESSAGE)

  await delay(DM_DELAY_MS)

  // Second message — opening question
  await sendDM({ psid, platform, message: SECOND_MESSAGE })
  await saveOutboundMessage(newLead.id, SECOND_MESSAGE)
}

// ─── Handle an incoming DM ───────────────────────────────────────────────────
async function handleIncomingDM(msg, platform) {
  const psid = msg.sender?.id
  const text = msg.message?.text
  if (!psid || !text) return

  // Find or create the lead
  let { data: lead } = await supabase
    .from('leads')
    .select('id, status, platform')
    .eq('psid', psid)
    .maybeSingle()

  if (!lead) {
    // Someone messaged us directly without using a comment trigger
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        psid,
        status:   'new',
        platform,
      })
      .select()
      .single()
    if (error || !newLead) {
      console.error('Failed to create lead from incoming DM:', error)
      return
    }
    lead = newLead
  }

  // Save inbound message
  await supabase.from('messages').insert({
    lead_id:   lead.id,
    direction: 'inbound',
    content:   text,
  })

  // Save roadblock if this is the first reply after the auto-question
  const updates = { updated_at: new Date().toISOString() }
  if (lead.status === 'new') {
    updates.roadblock = text
    // We don't manually set status — it'll be derived as 'qualifying' in the inbox
    // since the lead now has both outbound and inbound messages
  }

  // Bump platform if we didn't have it before
  if (!lead.platform) updates.platform = platform

  await supabase.from('leads').update(updates).eq('id', lead.id)
}

// ─── Send a DM via the right Meta endpoint based on platform ─────────────────
async function sendDM({ psid, platform, message }) {
  const token = platform === 'instagram' ? IG_TOKEN : FB_PAGE_TOKEN
  // Both endpoints currently work via graph.facebook.com /me/messages
  // when using a Page or IG Business token. If you migrate to the Instagram
  // Messaging API, change this URL to graph.instagram.com/v21.0/me/messages.
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${token}`

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        recipient: { id: psid },
        message:   { text: message },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('sendDM error:', err)
    }
    return res
  } catch (err) {
    console.error('sendDM exception:', err)
  }
}

// ─── Save an outbound message to Supabase ────────────────────────────────────
async function saveOutboundMessage(leadId, content) {
  await supabase.from('messages').insert({
    lead_id:   leadId,
    direction: 'outbound',
    content,
  })
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}