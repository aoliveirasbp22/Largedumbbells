// Enroll a lead in a campaign. Used by:
//   - Cron worker (no — it processes existing enrollments, doesn't create new)
//   - Manual enrollment via SQL or admin tool
//   - Future: Calls page tag-change handler (Phase 3)

import { supabase } from '@/lib/supabase'

export async function enrollLead({ leadId, campaignId }) {
  if (!leadId || !campaignId) {
    return { ok: false, reason: 'missing_params' }
  }

  // Don't double-enroll if there's already an active enrollment
  const { data: existing } = await supabase
    .from('campaign_enrollments')
    .select('id, status')
    .eq('contact_id', leadId)
    .eq('campaign_id', campaignId)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    return { ok: false, reason: 'already_enrolled', id: existing.id }
  }

  const { data, error } = await supabase
    .from('campaign_enrollments')
    .insert({
      campaign_id: campaignId,
      contact_id: leadId,
      current_step: 0,
      status: 'active',
      next_action_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[enroll] insert error:', error)
    return { ok: false, reason: 'db_error', error }
  }

  return { ok: true, id: data.id }
}

// Exit any active enrollments for a lead. Used by mailgun webhook when
// someone unsubscribes, and could be called when a lead books a call.
export async function exitEnrollments({ leadId, reason }) {
  if (!leadId) return { ok: false, reason: 'missing_lead' }

  const status = reason === 'booked'        ? 'booked'
               : reason === 'unsubscribed'  ? 'unsubscribed'
               : reason === 'completed'     ? 'completed'
               : 'completed'

  const { error } = await supabase
    .from('campaign_enrollments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('contact_id', leadId)
    .eq('status', 'active')

  if (error) console.error('[enroll] exit error:', error)
  return { ok: !error }
}