import { supabase } from './supabase'

// Tags that exit the lead from all active campaigns.
// - booked: they bought, don't pester
// - not interested: they said no, respect it
const EXIT_TAGS = ['booked', 'not interested']

/**
 * Handle campaign enrollment side effects after a tag changes.
 *
 * Rules:
 * 1. One campaign at a time per contact — if already in an active campaign, no new enrollments
 * 2. Don't re-enroll in a campaign the contact already completed
 * 3. EXIT_TAGS (e.g. "booked", "not interested") remove the contact from all active campaigns
 * 4. After exit logic runs, the new tag can still trigger a fresh enrollment
 *    (so "booked" can pull them out of nurture AND enroll them in a booked-confirmation campaign)
 * 5. If a campaign has trigger_source set, the lead's source must match — otherwise no enrollment
 *    (so "Form Submit" with trigger_source='form' only enrolls form fillers, not import/DM leads)
 *
 * @param {string} contactId - lead UUID
 * @param {string} newTag    - The tag that was just applied
 */
export async function handleTagChange(contactId, newTag) {
  try {
    // ─── Step 1: If new tag is an exit tag, mark all active enrollments as 'removed' ──
    if (EXIT_TAGS.includes(newTag)) {
      await supabase
        .from('campaign_enrollments')
        .update({ status: 'removed', updated_at: new Date().toISOString() })
        .eq('contact_id', contactId)
        .eq('status', 'active')
    }

    // ─── Step 2: Find active campaigns whose trigger matches this tag ──
    const { data: matchingCampaigns, error: campErr } = await supabase
      .from('email_campaigns')
      .select('id, name, status, trigger_tag, trigger_source')
      .eq('trigger_tag', newTag)
      .eq('status', 'active')

    if (campErr) {
      console.error('Campaign lookup error:', campErr)
      return
    }

    if (!matchingCampaigns || matchingCampaigns.length === 0) {
      return // No campaigns match this tag, nothing to enroll
    }

    // ─── Step 3: Load the lead to check source against trigger_source filter ──
    // We need this BEFORE checking current enrollments so we can early-exit if
    // no campaign would accept this lead anyway.
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('id, source')
      .eq('id', contactId)
      .maybeSingle()

    if (leadErr || !lead) {
      console.error('Lead lookup error:', leadErr)
      return
    }

    // Filter campaigns by source match. NULL trigger_source = matches any source.
    const sourceMatchingCampaigns = matchingCampaigns.filter(c =>
      !c.trigger_source || c.trigger_source === lead.source
    )

    if (sourceMatchingCampaigns.length === 0) {
      return // No campaigns match both tag and source
    }

    // ─── Step 4: Check current enrollments for this contact ──
    const { data: existing } = await supabase
      .from('campaign_enrollments')
      .select('campaign_id, status')
      .eq('contact_id', contactId)

    const existingByCampaign = {}
    ;(existing || []).forEach(e => {
      // Track the most recent status per campaign
      existingByCampaign[e.campaign_id] = e.status
    })

    // Is the contact currently in any active campaign? (Rule: one at a time)
    const inActiveCampaign = Object.values(existingByCampaign).includes('active')
    if (inActiveCampaign) {
      return // They're already running a campaign, don't start another
    }

    // ─── Step 5: For each matching campaign, enroll if not previously completed ──
    for (const campaign of sourceMatchingCampaigns) {
      const prevStatus = existingByCampaign[campaign.id]

      // Skip if they previously completed or were already in this campaign
      if (prevStatus === 'completed' || prevStatus === 'booked' || prevStatus === 'removed') {
        continue
      }

      // Enroll them — fresh start at step 0
      await supabase
        .from('campaign_enrollments')
        .insert({
          campaign_id:  campaign.id,
          contact_id:   contactId,
          current_step: 0,
          status:       'active',
          next_action_at: new Date().toISOString(), // fire on next cron tick
        })

      console.log(`Enrolled ${contactId} in campaign "${campaign.name}"`)

      // Rule 1: One campaign at a time. If we just enrolled in one, stop.
      break
    }
  } catch (err) {
    console.error('Enrollment side effect error:', err)
  }
}