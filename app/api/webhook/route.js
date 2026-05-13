import { supabase } from '@/lib/supabase'

const VERIFY_TOKEN   = process.env.META_VERIFY_TOKEN
const FB_PAGE_TOKEN  = process.env.META_PAGE_ACCESS_TOKEN
const IG_TOKEN       = process.env.META_IG_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN

const TRIGGER_WORD   = 'simple'
const BLUEPRINT_LINK = 'https://api.leadconnectorhq.com/widget/form/nyKDoOCsbzV2kwTLIS0h?notrack=true'

const FIRST_MESSAGE  = `Hey my friend, here is the blueprint you requested 👇\n${BLUEPRINT_LINK}`
const SECOND_MESSAGE = `While I have you here, what's been your biggest struggle with fitness lately?`

const DM_DELAY_MS    = 2000

// Window (in seconds) within which an echo of an identical outbound message
// is treated as a duplicate of one the CRM just sent itself.
const ECHO_DEDUPE_WINDOW_SEC = 60

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
    for (const change of entry.changes || []) {
      if (change.field === 'comments') {
        const comment     = change.value
        const commentText = comment?.text?.toLowerCase() || comment?.message?.toLowerCase() || ''
        const fromId      = comment?.from?.id
        const fromName    = comment?.from?.username || comment?.from?.name

        if (commentText.includes(TRIGGER_WORD) && fromId) {
          await handleTrigger({ psid: fromId, name: fromName, platform: 'instagram' })
        }
      }

      if (change.field === 'feed') {
        const v = change.value || {}
        if (v.item === 'comment' && v.verb === 'add') {
          const commentText = (v.message || '').toLowerCase()
          const fromId      = v.from?.id
          const fromName    = v.from?.name

          if (commentText.includes(TRIGGER_WORD) && fromId) {
            await handleTrigger({ psid: fromId, name: fromName, platform: 'facebook' })
          }
        }
      }

      if (change.field === 'messages') {
        const msg = change.value
        if (msg) {
          if (msg.is_echo) {
            await handleEchoDM(msg, platform)
          } else {
            await handleIncomingDM(msg, platform)
          }
        }
      }
    }

    for (const msg of entry.messaging || []) {
      if (msg.message) {
        if (msg.message.is_echo) {
          await handleEchoDM(msg, platform)
        } else {
          await handleIncomingDM(msg, platform)
        }
      }
    }
  }

  return new Response('OK', { status: 200 })
}

// ─── Fetch profile info from Meta ────────────────────────────────────────────
async function fetchProfile(psid, platform) {
  const token  = platform === 'instagram' ? IG_TOKEN : FB_PAGE_TOKEN
  const fields = platform === 'instagram'
    ? 'name,username,profile_pic'
    : 'name,first_name,last_name,profile_pic'

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${psid}?fields=${fields}&access_token=${token}`
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('fetchProfile error:', err)
      return {}
    }
    const data = await res.json()
    return {
      name:            data.name || null,
      username:        data.username || null,
      profile_pic_url: data.profile_pic || null,
    }
  } catch (err) {
    console.error('fetchProfile exception:', err)
    return {}
  }
}

// ─── Handle a comment trigger ────────────────────────────────────────────────
async function handleTrigger({ psid, name, platform }) {
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('psid', psid)
    .maybeSingle()

  if (existing) return

  const profile = await fetchProfile(psid, platform)

  const { data: newLead, error: leadErr } = await supabase
    .from('leads')
    .insert({
      psid,
      name:            profile.name || name || null,
      ig_handle:       platform === 'instagram' ? (profile.username || name || null) : null,
      profile_pic_url: profile.profile_pic_url,
      status:          'new',
      platform,
    })
    .select()
    .single()

  if (leadErr || !newLead) {
    console.error('Failed to create lead:', leadErr)
    return
  }

  await sendDM({ psid, platform, message: FIRST_MESSAGE })
  await saveOutboundMessage(newLead.id, FIRST_MESSAGE)

  await delay(DM_DELAY_MS)

  await sendDM({ psid, platform, message: SECOND_MESSAGE })
  await saveOutboundMessage(newLead.id, SECOND_MESSAGE)
}

// ─── Handle an incoming DM ───────────────────────────────────────────────────
async function handleIncomingDM(msg, platform) {
  const psid = msg.sender?.id
  const text = msg.message?.text
  if (!psid || !text) return

  let { data: lead } = await supabase
    .from('leads')
    .select('id, status, platform, profile_pic_url, name, ig_handle')
    .eq('psid', psid)
    .maybeSingle()

  if (!lead) {
    const profile = await fetchProfile(psid, platform)
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        psid,
        name:            profile.name,
        ig_handle:       platform === 'instagram' ? profile.username : null,
        profile_pic_url: profile.profile_pic_url,
        status:          'new',
        platform,
      })
      .select()
      .single()
    if (error || !newLead) {
      console.error('Failed to create lead from incoming DM:', error)
      return
    }
    lead = newLead
  } else if (!lead.profile_pic_url || !lead.name) {
    // Backfill if missing
    const profile = await fetchProfile(psid, platform)
    if (profile.profile_pic_url || profile.name || profile.username) {
      await supabase
        .from('leads')
        .update({
          name:            lead.name || profile.name,
          ig_handle:       lead.ig_handle || (platform === 'instagram' ? profile.username : null),
          profile_pic_url: lead.profile_pic_url || profile.profile_pic_url,
        })
        .eq('id', lead.id)
    }
  }

  await supabase.from('messages').insert({
    lead_id:   lead.id,
    direction: 'inbound',
    content:   text,
  })

  const updates = { updated_at: new Date().toISOString() }
  if (lead.status === 'new') {
    updates.roadblock = text
  }
  if (!lead.platform) updates.platform = platform

  await supabase.from('leads').update(updates).eq('id', lead.id)
}

// ─── Handle an echo (outbound DM Kyle sent from any client) ─────────────────
// Meta echoes back every outbound message — including ones we send via /api/reply.
// We dedupe by checking if an identical outbound message exists for this lead
// within the last ECHO_DEDUPE_WINDOW_SEC seconds.
async function handleEchoDM(msg, platform) {
  // For echoes: sender is the page; recipient is the lead
  const recipientPsid = msg.recipient?.id
  const text          = msg.message?.text

  if (!recipientPsid || !text) return

  // Look up the lead this echo was sent TO
  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('psid', recipientPsid)
    .maybeSingle()

  if (!lead) {
    // No matching lead — Kyle DM'd someone who isn't in the CRM yet.
    // Skip; nothing to attach the message to.
    return
  }

  // Dedupe: was an identical outbound message logged in the last 60s?
  const cutoff = new Date(Date.now() - ECHO_DEDUPE_WINDOW_SEC * 1000).toISOString()
  const { data: recentDupes } = await supabase
    .from('messages')
    .select('id')
    .eq('lead_id', lead.id)
    .eq('direction', 'outbound')
    .eq('content', text)
    .gte('created_at', cutoff)
    .limit(1)

  if (recentDupes && recentDupes.length > 0) {
    // Already logged by /api/reply (or a previous webhook delivery) — skip
    return
  }

  // Genuine new outbound from Kyle's mobile app — log it
  await supabase.from('messages').insert({
    lead_id:   lead.id,
    direction: 'outbound',
    content:   text,
  })

  await supabase
    .from('leads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', lead.id)
}

// ─── Send a DM via the right Meta endpoint based on platform ─────────────────
async function sendDM({ psid, platform, message }) {
  const token = platform === 'instagram' ? IG_TOKEN : FB_PAGE_TOKEN
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