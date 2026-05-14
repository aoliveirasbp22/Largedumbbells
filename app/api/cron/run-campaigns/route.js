// GET /api/cron/run-campaigns
//
// Vercel Cron hits this every minute. Finds all active enrollments where
// next_action_at <= now(), processes their current step, advances them.
//
// Step processing:
//   - email: render template, call /api/send-email, advance position, set next_action_at to now
//   - sms:   stub for now (Twilio not built yet) — skip and advance
//   - wait:  schedule next_action_at to now + duration, advance position
//
// When a lead runs out of steps, status flips to 'completed'.
//
// Authentication: Vercel Cron sends a signed Authorization header.
// In production, we verify CRON_SECRET matches.

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

async function processEnrollment(enrollment) {
  // Load the campaign and its steps
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', enrollment.campaign_id)
    .maybeSingle()

  if (!campaign || campaign.status !== 'active') {
    // Campaign deleted or paused — pause this enrollment
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

  // Load the lead (contact_id may be uuid for new flow, or text for GHL legacy)
  // Try uuid first
  let lead = null
  const isUuid = /^[0-9a-f-]{36}$/i.test(enrollment.contact_id)
  if (isUuid) {
    const { data } = await supabase
      .from('leads').select('*').eq('id', enrollment.contact_id).maybeSingle()
    lead = data
  }
  // Fallback for GHL-legacy enrollments: skip — we can't email without a real lead record
  if (!lead) {
    await supabase.from('campaign_enrollments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
    return { id: enrollment.id, action: 'no_lead_found', contact_id: enrollment.contact_id }
  }

  // Check suppression: if lead has unsubscribed/bounced/complained, exit
  if (lead.unsubscribed || lead.bounced || lead.complained) {
    await supabase.from('campaign_enrollments')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
    return { id: enrollment.id, action: 'lead_suppressed' }
  }

  // ── Process by step type ──────────────────────────────────────────
  let nextActionAt = new Date()

  if (step.type === 'email') {
    if (!lead.email) {
      // No email address — skip this step but advance
      console.warn(`[cron] lead ${lead.id} has no email, skipping email step`)
    } else {
      const subject = renderTemplate(step.subject || '', lead)
      const html    = renderTemplate(step.body || '', lead)
      const text    = strip(html)

      try {
        const res = await fetch(`${SITE_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        const data = await res.json().catch(() => ({}))
        if (!data.ok) {
          console.error('[cron] send-email failed for enrollment', enrollment.id, data)
          // Don't advance — try again next cycle. But cap retries via a future field.
          return { id: enrollment.id, action: 'send_failed', detail: data }
        }
      } catch (err) {
        console.error('[cron] send-email threw for enrollment', enrollment.id, err)
        return { id: enrollment.id, action: 'send_threw', error: String(err) }
      }
    }
  } else if (step.type === 'sms') {
    // SMS not yet implemented — skip the step, log it
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
  // Verify cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const authHeader = req.headers.get('authorization') || ''
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }

  // Fetch due enrollments — uses our partial index for speed
  const { data: due, error } = await supabase
    .from('campaign_enrollments')
    .select('*')
    .eq('status', 'active')
    .lte('next_action_at', new Date().toISOString())
    .limit(50) // batch size — don't try to do everything at once

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
      const r = await processEnrollment(enr)
      results.push(r)
    } catch (err) {
      console.error('[cron] processEnrollment threw:', err)
      results.push({ id: enr.id, action: 'threw', error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}