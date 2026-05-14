// POST /api/form-submit
//
// Receives a submission from the branded /form page, validates fields,
// rate limits, blocks honeypot bots, and creates a new row in the leads
// table with source = 'form'.

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Allowed fields (any other keys in the body are silently ignored)
const REQUIRED = [
  'first_name',
  'last_name',
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

  // Light phone check (at least 7 digits after stripping non-numerics)
  const phoneDigits = String(body.phone).replace(/\D/g, '')
  if (phoneDigits.length < 7) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_phone' },
      { status: 400 }
    )
  }

  // ── Compose insert payload ─────────────────────────────────────────────
  const fullName = `${String(body.first_name).trim()} ${String(body.last_name).trim()}`.trim()

  const insertPayload = {
    name:           fullName,
    email:          String(body.email).trim().toLowerCase(),
    phone:          String(body.phone).trim(),
    age,
    roadblock:      String(body.struggle).trim(),
    bothered_score: bothered,
    occupation:     String(body.occupation).trim(),
    country:        String(body.country).trim(),
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

  return NextResponse.json({ ok: true, leadId: data.id })
}