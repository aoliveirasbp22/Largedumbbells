// GET /api/cron/run-campaigns
//
// Vercel Cron hits this every minute. Finds all active enrollments where
// next_action_at <= now(), advances them, then fires the side effect (email).
//
// Critical design choice: we advance the enrollment BEFORE sending. If a send
// fails mid-flight (timeout, network), the enrollment is already moved on —
// we lose at most one email, never send duplicates.

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { renderTemplate } from '@/lib/template'

export const maxDuration = 60

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

async function claimAndAdvance(enrollment) {
  console.log('[cron-debug] claimAndAdvance start', { enrollmentId: enrollment.id, contact_id: enrollment.contact_id, current_step: enrollment.current_step })

  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', enrollment.campaign_id)
    .maybeSingle()

  if (!campaign || campaign.status !== 'active') {
    console.log('[cron-debug] campaign missing or not active', { campaign_id: enrollment.campaign_id, status: campaign?.status })
    await supabase.from('campaign_enrollments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .eq('status', 'active')
    return null
  }

  const { data: steps } = await supabase
    .from('email_campaign_steps')
    .select('*')
    .eq('campaign_id', enrollment.campaign_id)
    .order('position', { ascending: true })

  console.log('[cron-debug] steps loaded', { count: steps?.length, current_step: enrollment.current_step })

  if (!steps || enrollment.current_step >= steps.length) {
    console.log('[cron-debug] no steps or past end, marking completed')
    await supabase.from('campaign_enrollments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .eq('status', 'active')
    return null
  }

  const step = steps[enrollment.current_step]
  console.log('[cron-debug] step picked', { type: step.type, position: step.position, has_subject: !!step.subject, has_body: !!step.body })

  const isUuid = /^[0-9a-f-]{36}$/i.test(enrollment.contact_id)
  console.log('[cron-debug] isUuid check', { contact_id: enrollment.contact_id, isUuid })

  let lead = null
  if (isUuid) {
    const { data } = await supabase
      .from('leads').select('*').eq('id', enrollment.contact_id).maybeSingle()
    lead = data
  }
  console.log('[cron-debug] lead lookup', { found: !!lead, email: lead?.email })

  if (!lead) {
    await supabase.from('campaign_enrollments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .eq('status', 'active')
    return null
  }

  if (lead.unsubscribed || lead.bounced || lead.complained) {
    console.log('[cron-debug] lead suppressed', { unsubscribed: lead.unsubscribed, bounced: lead.bounced, complained: lead.complained })
    await supabase.from('campaign_enrollments')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .eq('status', 'active')
    return null
  }

  const nextStep = enrollment.current_step + 1
  const isLastStep = nextStep >= steps.length

  let nextActionAt
  if (step.type === 'wait') {
    const ms = (step.duration || 1) * (MS_PER_UNIT[step.unit] || MS_PER_UNIT.days)
    nextActionAt = new Date(Date.now() + ms)
  } else {
    nextActionAt = new Date()
  }

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
    .eq('current_step', enrollment.current_step)
    .eq('status', 'active')
    .select()
    .maybeSingle()

  if (claimErr) {
    console.error('[cron] claim+advance failed:', claimErr)
    return null
  }
  if (!claimed) {
    console.log('[cron-debug] claim returned null (another instance won)')
    return null
  }

  console.log('[cron-debug] claim successful, advanced to step', nextStep)
  return { enrollment: claimed, step, lead, campaign, isLastStep }
}

async function fireSideEffect({ step, lead, campaign, enrollmentId }) {
  console.log('[cron-debug] fireSideEffect start', { step_type: step.type, enrollmentId })

  if (step.type === 'wait') {
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

    console.log('[cron-debug] about to fetch send-email')
    console.log('[cron-debug] SITE_URL:', SITE_URL)
    console.log('[cron-debug] CRON_SECRET length:', CRON_SECRET.length)
    console.log('[cron-debug] to:', lead.email, 'leadId:', lead.id, 'subject:', subject)

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

      console.log('[cron-debug] send-email response status:', res.status)
      console.log('[cron-debug] send-email response body:', JSON.stringify(data).slice(0, 500))

      if (!res.ok || !data.ok) {
        console.error('[cron] send-email failed for enrollment', enrollmentId, {
          status: res.status,
          data,
        })
        return { action: 'send_failed', detail: data, httpStatus: res.status }
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
  console.log('[cron-debug] GET start. CRON_SECRET len:', CRON_SECRET.length, 'SITE_URL:', SITE_URL)

  const authHeader = req.headers.get('authorization') || ''
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }

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

  console.log('[cron-debug] due enrollments count:', due?.length || 0)

  if (!due || due.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const results = []
  for (const enr of due) {
    try {
      const claimed = await claimAndAdvance(enr)
      if (!claimed) {
        results.push({ id: enr.id, action: 'skipped_or_already_processed' })
        continue
      }
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