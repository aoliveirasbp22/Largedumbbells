import { supabase } from '@/lib/supabase'

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
const TRIGGER_WORD = 'GUIDE'

// Meta webhook verification
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

// Receive webhook events
export async function POST(request) {
  const body = await request.json()

  if (body.object === 'page' || body.object === 'instagram') {
    for (const entry of body.entry) {
      // Handle comments
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'comments') {
            const comment = change.value
            const commentText = comment.message?.toLowerCase() || ''
            if (commentText.includes(TRIGGER_WORD.toLowerCase())) {
              await handleTrigger(comment.from.id, comment.from.name, 'comment')
            }
          }
        }
      }
      // Handle DMs
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

async function handleTrigger(psid, name, source) {
  // Check if lead already exists
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('psid', psid)
    .single()

  if (!existing) {
    // Save new lead
    await supabase.from('leads').insert({
      psid,
      name,
      ig_handle: name,
      status: 'new',
      platform: source
    })

    // Send auto DM
    await sendDM(psid, `Hey! Here's your free blueprint 👇\n[YOUR LINK HERE]\n\nWhile you look through it — what's been your biggest struggle up to this point?`)
  }
}

async function handleIncomingDM(msg) {
  const psid = msg.sender.id
  const text = msg.message.text

  // Update lead status and save roadblock
  const { data: lead } = await supabase
    .from('leads')
    .select('id, status')
    .eq('psid', psid)
    .single()

  if (lead) {
    await supabase.from('leads').update({
      status: 'responded',
      roadblock: text,
      updated_at: new Date().toISOString()
    }).eq('id', lead.id)

    await supabase.from('messages').insert({
      lead_id: lead.id,
      direction: 'inbound',
      content: text
    })
  }
}

async function sendDM(psid, message) {
  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: message }
    })
  })
}