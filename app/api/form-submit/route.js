// POST /api/form-submit
//
// Receives a submission from the branded /form page, validates fields,
// rate limits, blocks honeypot bots, and creates a new row in the leads
// table with source = 'form'. After insert:
//   1. Fires handleTagChange() for campaign auto-enrollment
//   2. Notifies the setter via email if lead qualifies as "hot":
//      age >= 30, country in US/Canada, bothered_score >= 3

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { handleTagChange } from '@/lib/enrollments'

// Allowed fields (any other keys in the body are silently ignored)
const REQUIRED = [
  'first_name',
  'last_name',
  'country_code',
  'phone',
  'email',
  'age',
  'struggle',
  'bothered_score',
  'occupation',
  'country',
]

// In-memory rate limit map: IP -> array of submission timestamps.
// Note: this resets on every cold start (Vercel serverless), which is fine
// for our use case — we just want to stop hammer-spam in real time.
const submissionsByIp = new Map()
const RATE_LIMIT_MAX     = 5            // max submissions
const RATE_LIMIT_WINDOW  = 60 * 60 * 1000  // per hour

// Setter notification thresholds — change here if criteria shift
const SETTER_MIN_AGE         = 30
const SETTER_MIN_BOTHERED    = 3
const SETTER_COUNTRIES = new Set([
  'United States', 'USA', 'US', 'U.S.', 'U.S.A.',
  'Canada', 'CA',
])

function getIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

function isRateLimited(ip) {
  const now = Date.now()
  const recent = (submissionsByIp.get(ip) || []).filter(
    t => now - t < RATE_LIMIT_WINDOW
  )
  if (recent.length >= RATE_LIMIT_MAX) return true
  recent.push(now)
  submissionsByIp.set(ip, recent)
  return false
}

// Returns true if the lead meets the criteria for notifying the setter.
function isHotLead({ age, country, bothered }) {
  if (age < SETTER_MIN_AGE) return false
  if (bothered < SETTER_MIN_BOTHERED) return false
  if (!SETTER_COUNTRIES.has(country)) return false
  return true
}

// Fire-and-forget setter notification. Never throws — logs and moves on.
async function notifySetter(req, lead) {
  const setterEmail = process.env.SETTER_EMAIL
  if (!setterEmail) {
    console.warn('[form-submit] SETTER_EMAIL not set, skipping notification')
    return
  }

  const baseUrl =
    process.env.APP_BASE_URL ||
    `https://${req.headers.get('host') || 'largedumbbells.vercel.app'}`
  const leadUrl = `${baseUrl}/calls/${lead.id}`

  const subject = `🔥 New qualified lead: ${lead.name}`

  const text = [
    `New qualified lead just came in from the form.`,
    ``,
    `Name:      ${lead.name}`,
    `Age:       ${lead.age}`,
    `Country:   ${lead.country}`,
    `Bothered:  ${lead.bothered_score}/5`,
    `Phone:     +${lead.phone}`,
    `Email:     ${lead.email}`,
    `Job:       ${lead.occupation}`,
    ``,
    `Struggle:`,
    lead.roadblock,
    ``,
    `Open in CRM: ${leadUrl}`,
  ].join('\n')

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px">
      <h2 style="margin:0 0 16px">🔥 New qualified lead</h2>
      <p style="margin:0 0 20px;color:#555">
        A hot lead just came in from the form. Reach out before they cool off.
      </p>
      <table style="border-collapse:collapse;font-size:14px;line-height:1.6">
        <tr><td style="padding-right:16px;color:#888">Name</td><td><strong>${escapeHtml(lead.name)}</strong></td></tr>
        <tr><td style="padding-right:16px;color:#888">Age</td><td>${lead.age}</td></tr>
        <tr><td style="padding-right:16px;color:#888">Country</td><td>${escapeHtml(lead.country)}</td></tr>
        <tr><td style="padding-right:16px;color:#888">Bothered</td><td>${lead.bothered_score}/5</td></tr>
        <tr><td style="padding-right:16px;color:#888">Phone</td><td>+${escapeHtml(lead.phone)}</td></tr>
        <tr><td style="padding-right:16px;color:#888">Email</td><td>${escapeHtml(lead.email)}</td></tr>
        <tr><td style="padding-right:16px;color:#888">Job</td><td>${escapeHtml(lead.occupation)}</td></tr>
      </table>
      <p style="margin:20px 0 8px;color:#888;font-size:13px">Struggle</p>
      <p style="margin:0 0 24px;padding:12px;background:#f5f5f5;border-radius:6px;font-size:14px">
        ${escapeHtml(lead.roadblock)}
      </p>
      <a href="${leadUrl}"
         style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
        Open in CRM →
      </a>
    </div>
  `

  try {
    const res = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: setterEmail,
        subject,
        text,
        html,
        // No leadId on purpose: this is internal staff mail, not marketing.
        // Skips suppression checks and the unsubscribe footer.
      }),
    })
    if (!res.ok) {
      const raw = await res.text()
      console.error('[form-submit] setter notify failed:', res.status, raw)
    }
  } catch (err) {
    console.error('[form-submit] setter notify threw:', err)
  }
}

// Minimal HTML escape for values dropped into the email template.
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req) {
  // ── Parse JSON body ─────────────────────────────────────────────────────
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 })
  }

  // ── Honeypot: if 'website' field is filled, silently accept-and-discard ─
  // Bots fill all visible inputs. We hide a 'website' field with CSS, so
  // only bots fill it. Return 200 so the bot thinks it worked.
  if (body.website && body.website.trim()) {
    return NextResponse.json({ ok: true }) // silently drop
  }

  // ── Rate limit by IP ───────────────────────────────────────────────────
  const ip = getIp(req)
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, reason: 'rate_limited' },
      { status: 429 }
    )
  }

  // ── Validate required fields ────────────────────────────────────────────
  for (const field of REQUIRED) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return NextResponse.json(
        { ok: false, reason: 'missing_field', field },
        { status: 400 }
      )
    }
  }

  // ── Type checks ────────────────────────────────────────────────────────
  const age = parseInt(body.age, 10)
  if (Number.isNaN(age) || age < 13 || age > 100) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_age' },
      { status: 400 }
    )
  }

  const bothered = parseInt(body.bothered_score, 10)
  if (Number.isNaN(bothered) || bothered < 1 || bothered > 5) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_bothered_score' },
      { status: 400 }
    )
  }

  // Light email shape check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_email' },
      { status: 400 }
    )
  }

  // ── Phone normalization ───────────────────────────────────────────────
  // Build E.164-ish: country_code (digits only) + phone (digits only).
  // No leading +. This matches what Meta DM ingestion + Calls page timezone
  // lookup expect: a string of pure digits with the country code at the front.
  const countryCodeDigits = String(body.country_code).replace(/\D/g, '')
  const phoneDigits       = String(body.phone).replace(/\D/g, '')

  if (countryCodeDigits.length < 1 || countryCodeDigits.length > 4) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_country_code' },
      { status: 400 }
    )
  }
  if (phoneDigits.length < 6 || phoneDigits.length > 15) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_phone' },
      { status: 400 }
    )
  }

  const fullPhone = countryCodeDigits + phoneDigits

  // ── Compose insert payload ─────────────────────────────────────────────
  const fullName = `${String(body.first_name).trim()} ${String(body.last_name).trim()}`.trim()
  const countryStr = String(body.country).trim()

  const insertPayload = {
    name:           fullName,
    email:          String(body.email).trim().toLowerCase(),
    phone:          fullPhone,
    age,
    roadblock:      String(body.struggle).trim(),
    bothered_score: bothered,
    occupation:     String(body.occupation).trim(),
    country:        countryStr,
    status:         'new',
    source:         'form',
    platform:       null,   // not a Meta lead
    psid:           null,   // not a Meta lead (column is now nullable)
  }

  // ── Insert into Supabase ────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('leads')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error) {
    console.error('[form-submit] insert error:', error)
    return NextResponse.json(
      { ok: false, reason: 'db_error' },
      { status: 500 }
    )
  }

  // ── Auto-enroll: fire the same side effect as if a tag had been set to ──
  // 'uncalled'. handleTagChange() filters by trigger_source, so this only
  // enrolls form-fill leads in campaigns specifically targeting source='form'.
  // We don't fail the response if enrollment errors — lead is already inserted.
  try {
    await handleTagChange(data.id, 'uncalled')
  } catch (err) {
    console.error('[form-submit] enrollment side effect failed:', err)
    // Continue — lead is already inserted, success response still valid
  }

  // ── Setter notification: hot leads only ────────────────────────────────
  // Fire-and-forget. We don't await it for the response because the form
  // user shouldn't wait on Mailgun — but we DO await with a short timeout
  // so serverless functions don't terminate before the request completes.
  if (isHotLead({ age, country: countryStr, bothered })) {
    try {
      await notifySetter(req, {
        id: data.id,
        name: insertPayload.name,
        email: insertPayload.email,
        phone: insertPayload.phone,
        age,
        roadblock: insertPayload.roadblock,
        bothered_score: bothered,
        occupation: insertPayload.occupation,
        country: countryStr,
      })
    } catch (err) {
      console.error('[form-submit] setter notify outer threw:', err)
    }
  }

  return NextResponse.json({ ok: true, leadId: data.id })
}