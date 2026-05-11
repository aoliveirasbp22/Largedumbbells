import { supabase } from '@/lib/supabase'

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN

export async function POST(request) {
  const { psid, message, lead_id } = await request.json()

  try {
    // Send message via Meta Graph API
    const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text: message }
      })
    })

    if (!res.ok) {
      const err = await res.json()
      return Response.json({ error: err }, { status: 400 })
    }

    // Save message to Supabase
    await supabase.from('messages').insert({
      lead_id,
      direction: 'outbound',
      content: message
    })

    // Update lead status to responded
    await supabase.from('leads').update({
      status: 'responded',
      updated_at: new Date().toISOString()
    }).eq('id', lead_id)

    return Response.json({ success: true })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}