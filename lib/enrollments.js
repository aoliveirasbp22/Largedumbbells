import { supabase } from './supabase'

// Tags that exit the lead from all active campaigns
const EXIT_TAGS = ['booked']

/**
 * Handle campaign enrollment side effects after a tag changes.
 *
 * Rules:
 * 1. One campaign at a time per contact — if already in an active campaign, no new enrollments
 * 2. Don't re-enroll in a campaign the contact already completed
 * 3. EXIT_TAGS (e.g. "booked") remove the contact from all active campaigns
 * 4. After exit logic runs, the new tag can still trigger a fresh enrollment
 *    (so "booked" can pull them out of nurture AND enroll them in a booked-confirmation campaign)
 *
 * @param {string} contactId - GHL contact ID
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
      .select('id, name, status, trigger_tag')
      .eq('trigger_tag', newTag)
      .eq('status', 'active')

    if (campErr) {
      console.error('Campaign lookup error:', campErr)
      return
    }

    if (!matchingCampaigns || matchingCampaigns.length === 0) {
      return // No campaigns match this tag, nothing to enroll
    }

    // ─── Step 3: Check current enrollments for this contact ──
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

    // ─── Step 4: For each matching campaign, enroll if not previously completed ──
    for (const campaign of matchingCampaigns) {
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
        })

      console.log(`Enrolled ${contactId} in campaign "${campaign.name}"`)

      // Rule 1: One campaign at a time. If we just enrolled in one, stop.
      break
    }
  } catch (err) {
    console.error('Enrollment side effect error:', err)
  }
}