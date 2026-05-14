// GET /api/cron/run-campaigns
//
// Vercel Cron hits this every minute. Finds all active enrollments where
// next_action_at <= now(), processes their current step, advances them.
//
// Concurrency: we "claim" an enrollment by atomically pushing its
// next_action_at 5 minutes into the future before processing. If two
// cron instances fire simultaneously, only one will successfully claim
// each enrollment — the other gets nothing back from .select() and skips.
//
// Step processing:
//   - email: render template, call /api/send-email, advance position
//   - sms:   stub for now (Twilio not built yet)
//   - wait:  schedule next_action_at to now + duration, advance position

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { renderTemplate } from '@/lib/template'

const CRON_SECRET = process.env.CRON_SECRET || ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://largedumbbells.vercel.app'

const MS_PER_UNIT = {
  minutes: 60 * 1000,
  hours:   60 * 60 * 1000,
  days:    24 * 60 * 60 * 1000,
  weeks:   7 * 24 * 60 * 60 * 1000,
}

// How long to "lease" an enrollment while we process it. If processing
// crashes mid-flight, the lease expires and the enrollment becomes due again.
const CLAIM_LEASE_MS = 5 * 60 * 1000 // 5 minutes

function strip(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Atomically claim an enrollment by pushing next_action_at forward.
// Returns the fresh row if we won the race, or null if someone else got it.
async function claimEnrollment(enrollmentId, expectedNextActionAt) {
  const leaseUntil = new Date(Date.now() + CLAIM_LEASE_MS).toISOString()

  const { data, error } = await supabase
    .from('campaign_enrollments')
    .update({ next_action_at: leaseUntil })
    .eq('id', enrollmentId)
    .eq('next_action_at', expectedNextActionAt) // optimistic concurrency check
    .eq('status', 'active')
    .select()
    .maybeSingle()

  if (error) {
    console.error('[cron] claim failed:', error)
    return null
  }
  return data // null means another instance got there first, or status changed
}

async function processEnrollment(enrollment) {
  // Load the campaign and its steps
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', enrollment.campaign_id)
    .maybeSingle()

  if (!campaign || campaign.status !== 'active') {
    await supabase.from('campaign_enrollments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
    return { id: enrollment.id, action: 'paused_campaign_inactive' }
  }

  const { data: steps } = await supabase
    .from('email_campaign_steps')
    .select('*')
    .eq('campaign_id', enrollment.campaign_id)
    .order('position', { ascending: true })

  // Out of steps → complete
  if (!steps || enrollment.current_step >= steps.length) {
    await supabase.from('campaign_enrollments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
    return { id: enrollment.id, action: 'completed' }
  }

  const step = steps[enrollment.current_step]

  // Load the lead (contact_id must be a real uuid for cron to send)
  const isUuid = /^[0-9a-f-]{36}$/i.test(enrollment.contact_id)
  let lead = null
  if (isUuid) {
    const { data } = await supabase
      .from('leads').select('*').eq('id', enrollment.contact_id).maybeSingle()
    lead = data
  }
  if (!lead) {
    await supabase.from('campaign_enrollments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
    return { id: enrollment.id, action: 'no_lead_found', contact_id: enrollment.contact_id }
  }

  // Suppression check
  if (lead.unsubscribed || lead.bounced || lead.complained) {
    await supabase.from('campaign_enrollments')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
    return { id: enrollment.id, action: 'lead_suppressed' }
  }

  // ── Process by step type ──────────────────────────────────────────
  let nextActionAt = new Date()
  let sendFailed = false

  if (step.type === 'email') {
    if (!lead.email) {
      console.warn(`[cron] lead ${lead.id} has no email, skipping email step`)
    } else {
      const subject = renderTemplate(step.subject || '', lead)
      const html    = renderTemplate(step.body || '', lead)
      const text    = strip(html)

      try {
        const res = await fetch(`${SITE_URL}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': CRON_SECRET,
          },
          body: JSON.stringify({
            to: lead.email,
            subject,
            text,
            html,
            leadId: lead.id,
            fromName: campaign.from_name || 'Large Dumbbells',
            replyTo: campaign.from_email || undefined,
          }),
        })
        const rawBody = await res.text()
        let data
        try { data = JSON.parse(rawBody) } catch { data = { raw: rawBody.slice(0, 500) } }
        if (!res.ok || !data.ok) {
          console.error('[cron] send-email failed for enrollment', enrollment.id, {
            status: res.status,
            data,
          })
          sendFailed = true
        }
      } catch (err) {
        console.error('[cron] send-email threw for enrollment', enrollment.id, err)
        sendFailed = true
      }

      if (sendFailed) {
        // Release the lease so this gets retried in ~1 min (not the full 5)
        await supabase.from('campaign_enrollments')
          .update({
            next_action_at: new Date(Date.now() + 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', enrollment.id)
        return { id: enrollment.id, action: 'send_failed_will_retry' }
      }
    }
  } else if (step.type === 'sms') {
    console.log('[cron] sms step skipped (twilio not built yet) for enrollment', enrollment.id)
  } else if (step.type === 'wait') {
    const ms = (step.duration || 1) * (MS_PER_UNIT[step.unit] || MS_PER_UNIT.days)
    nextActionAt = new Date(Date.now() + ms)
  } else {
    console.warn('[cron] unknown step type', step.type)
  }

  // Advance to next step
  const nextStep = enrollment.current_step + 1
  const isLastStep = nextStep >= steps.length

  await supabase.from('campaign_enrollments')
    .update({
      current_step: nextStep,
      next_action_at: isLastStep ? null : nextActionAt.toISOString(),
      last_step_at: new Date().toISOString(),
      status: isLastStep ? 'completed' : 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollment.id)

  return {
    id: enrollment.id,
    action: 'advanced',
    step_type: step.type,
    new_position: nextStep,
    next_action_at: isLastStep ? null : nextActionAt.toISOString(),
  }
}

export async function GET(req) {
  // Vercel sends Authorization: Bearer <CRON_SECRET> for cron-triggered calls
  const authHeader = req.headers.get('authorization') || ''
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }

  // Fetch due enrollments
  const { data: due, error } = await supabase
    .from('campaign_enrollments')
    .select('*')
    .eq('status', 'active')
    .lte('next_action_at', new Date().toISOString())
    .limit(50)

  if (error) {
    console.error('[cron] fetch error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const results = []
  for (const enr of due) {
    try {
      // Atomically claim. If another instance already grabbed it, skip.
      const claimed = await claimEnrollment(enr.id, enr.next_action_at)
      if (!claimed) {
        results.push({ id: enr.id, action: 'skipped_already_claimed' })
        continue
      }
      const r = await processEnrollment(claimed)
      results.push(r)
    } catch (err) {
      console.error('[cron] processEnrollment threw:', err)
      results.push({ id: enr.id, action: 'threw', error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}