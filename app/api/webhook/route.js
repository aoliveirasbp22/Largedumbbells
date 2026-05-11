import { supabase } from '@/lib/supabase'

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
const TRIGGER_WORD = 'simple'
const BLUEPRINT_LINK = 'https://api.leadconnectorhq.com/widget/form/nyKDoOCsbzV2kwTLIS0h?notrack=true'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

export async function POST(request) {
  const body = await request.json()

  if (body.object === 'page' || body.object === 'instagram') {
    for (const entry of body.entry) {
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'comments') {
            const comment = change.value
            const commentText = comment.message?.toLowerCase() || ''
            if (commentText.includes(TRIGGER_WORD)) {
              await handleTrigger(comment.from.id, comment.from.name, 'facebook')
            }
          }
          if (change.field === 'messages') {
            const msg = change.value
            if (msg && !msg.is_echo) {
              await handleIncomingDM(msg)
            }
          }
        }
      }
      if (entry.messaging) {
        for (const msg of entry.messaging) {
          if (msg.message && !msg.message.is_echo) {
            await handleIncomingDM(msg)
          }
        }
      }
    }
  }

  return new Response('OK', { status: 200 })
}

async function handleTrigger(psid, name, platform) {
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('psid', psid)
    .single()

  if (!existing) {
    await supabase.from('leads').insert({
      psid,
      name,
      ig_handle: name,
      status: 'new',
      platform
    })

    // First message — blueprint link
    await sendDM(psid, `Hey there, here is the blueprint you requested 👇\n${BLUEPRINT_LINK}`)

    // Small delay then second message
    await delay(2000)

    // Second message — opening question
    await sendDM(psid, `As you look that over, what is currently your biggest struggle with fitness?`)
  }
}

async function handleIncomingDM(msg) {
  const psid = msg.sender.id
  const text = msg.message?.text
  if (!text) return

  const { data: lead } = await supabase
    .from('leads')
    .select('id, status')
    .eq('psid', psid)
    .single()

  if (lead) {
    const updates = {
      updated_at: new Date().toISOString()
    }

    // Save first reply as their roadblock
    if (lead.status === 'new') {
      updates.roadblock = text
      updates.status = 'qualifying'
    }

    await supabase.from('leads').update(updates).eq('id', lead.id)

    await supabase.from('messages').insert({
      lead_id: lead.id,
      direction: 'inbound',
      content: text
    })
  }
}

async function sendDM(psid, message) {
  const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: message }
    })
  })
  return res
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}