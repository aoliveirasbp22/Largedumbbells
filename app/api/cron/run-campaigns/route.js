// GET /api/cron/run-campaigns
//
// Vercel Cron hits this every minute. Finds all active enrollments where
// next_action_at <= now(), advances them, then fires the side effect (email).
//
// Critical design choice: we advance the enrollment BEFORE sending. If a send
// fails mid-flight (timeout, network), the enrollment is already moved on —
// we lose at most one email, never send duplicates. Email duplication is far
// worse than a missed send (deliverability damage, complaints).

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { renderTemplate } from '@/lib/template'

export const maxDuration = 60 // Allow up to 60s per cron tick

const CRON_SECRET = process.env.CRON_SECRET || ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://largedumbbells.vercel.app'

const MS_PER_UNIT = {
  minutes: 60 * 1000,
  hours:   60 * 60 * 1000,
  days:    24 * 60 * 60 * 1000,
  weeks:   7 * 24 * 60 * 60 * 1000,
}

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

// Claim an enrollment and ATOMICALLY advance it past the current step in
// the same UPDATE. We compute the new state up front so the row reflects
// completion of this step before we fire any side effect.
//
// Returns { enrollment, step, lead, campaign, isLastStep } if we won the
// claim and have everything needed to fire the side effect, or null if
// another instance got there first / nothing to do.
async function claimAndAdvance(enrollment) {
  // Load campaign
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', enrollment.campaign_id)
    .maybeSingle()

  if (!campaign || campaign.status !== 'active') {
    await supabase.from('campaign_enrollments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .eq('status', 'active')
    return null
  }

  // Load steps
  const { data: steps } = await supabase
    .from('email_campaign_steps')
    .select('*')
    .eq('campaign_id', enrollment.campaign_id)
    .order('position', { ascending: true })

  if (!steps || enrollment.current_step >= steps.length) {
    await supabase.from('campaign_enrollments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .eq('status', 'active')
    return null
  }

  const step = steps[enrollment.current_step]

  // Load lead
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
      .eq('status', 'active')
    return null
  }

  // Suppression check
  if (lead.unsubscribed || lead.bounced || lead.complained) {
    await supabase.from('campaign_enrollments')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .eq('status', 'active')
    return null
  }

  // Compute the NEW state for this enrollment based on the step type
  const nextStep = enrollment.current_step + 1
  const isLastStep = nextStep >= steps.length

  let nextActionAt
  if (step.type === 'wait') {
    const ms = (step.duration || 1) * (MS_PER_UNIT[step.unit] || MS_PER_UNIT.days)
    nextActionAt = new Date(Date.now() + ms)
  } else {
    // email / sms: advance immediately so the next step runs on the next tick
    nextActionAt = new Date()
  }

  // ATOMIC CLAIM + ADVANCE in a single UPDATE.
  // The .eq('current_step', enrollment.current_step) is the concurrency check:
  // if any other instance already advanced this enrollment, our update affects
  // 0 rows and .maybeSingle() returns null.
  const { data: claimed, error: claimErr } = await supabase
    .from('campaign_enrollments')
    .update({
      current_step: nextStep,
      next_action_at: isLastStep ? null : nextActionAt.toISOString(),
      last_step_at: new Date().toISOString(),
      status: isLastStep ? 'completed' : 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollment.id)
    .eq('current_step', enrollment.current_step) // optimistic concurrency
    .eq('status', 'active')
    .select()
    .maybeSingle()

  if (claimErr) {
    console.error('[cron] claim+advance failed:', claimErr)
    return null
  }
  if (!claimed) {
    // Another instance got there first
    return null
  }

  return { enrollment: claimed, step, lead, campaign, isLastStep }
}

// Fire the side effect for a step. By the time this is called, the enrollment
// has already advanced — so failure here means a missed send (acceptable),
// not a duplicate (unacceptable).
async function fireSideEffect({ step, lead, campaign, enrollmentId }) {
  if (step.type === 'wait') {
    // No side effect for wait — already scheduled by the advance
    return { action: 'wait_scheduled' }
  }

  if (step.type === 'sms') {
    console.log('[cron] sms step skipped (twilio not built yet) for enrollment', enrollmentId)
    return { action: 'sms_skipped' }
  }

  if (step.type === 'email') {
    if (!lead.email) {
      console.warn(`[cron] lead ${lead.id} has no email, skipping email step`)
      return { action: 'no_email' }
    }

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
        console.error('[cron] send-email failed for enrollment', enrollmentId, {
          status: res.status,
          data,
        })
        return { action: 'send_failed', detail: data }
      }
      return { action: 'sent', mailgunId: data.mailgunId }
    } catch (err) {
      console.error('[cron] send-email threw for enrollment', enrollmentId, err)
      return { action: 'send_threw', error: String(err) }
    }
  }

  console.warn('[cron] unknown step type', step.type)
  return { action: 'unknown_step_type' }
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
      // Claim + advance in one shot — enrollment is now safely past this step
      const claimed = await claimAndAdvance(enr)
      if (!claimed) {
        results.push({ id: enr.id, action: 'skipped_or_already_processed' })
        continue
      }
      // Fire the side effect (send email, etc). Failure here = missed send,
      // not duplicate. Acceptable trade-off.
      const sideEffect = await fireSideEffect({
        step: claimed.step,
        lead: claimed.lead,
        campaign: claimed.campaign,
        enrollmentId: enr.id,
      })
      results.push({
        id: enr.id,
        step_type: claimed.step.type,
        advanced_to: claimed.enrollment.current_step,
        completed: claimed.isLastStep,
        ...sideEffect,
      })
    } catch (err) {
      console.error('[cron] outer loop threw:', err)
      results.push({ id: enr.id, action: 'threw', error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}