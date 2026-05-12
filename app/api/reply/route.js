import { supabase } from '@/lib/supabase'

const FB_PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
const IG_TOKEN      = process.env.META_IG_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN

export async function POST(request) {
  const { psid, message, lead_id } = await request.json()

  try {
    // Look up platform so we use the right token
    const { data: lead } = await supabase
      .from('leads')
      .select('platform')
      .eq('id', lead_id)
      .maybeSingle()

    const platform = lead?.platform || 'facebook'
    const token    = platform === 'instagram' ? IG_TOKEN : FB_PAGE_TOKEN

    // Send via Meta Graph API
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${token}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          recipient: { id: psid },
          message:   { text: message },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.json()
      return Response.json({ error: err }, { status: 400 })
    }

    // Save outbound message
    await supabase.from('messages').insert({
      lead_id,
      direction: 'outbound',
      content:   message,
    })

    // Mark as read (we just engaged) + bump updated_at so ghosted detection resets
    const now = new Date().toISOString()
    await supabase
      .from('leads')
      .update({ last_read_at: now, updated_at: now })
      .eq('id', lead_id)

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}