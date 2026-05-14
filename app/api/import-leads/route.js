// POST /api/import-leads
//
// Accepts a CSV body (text/csv). Parses, validates, and upserts rows into
// the `leads` table, keyed on ghl_contact_id so re-importing the same CSV
// updates existing rows instead of creating duplicates.
//
// Body: raw CSV text (Content-Type: text/csv)
// Query params:
//   ?dryRun=1  — parse + validate but don't write to DB
//
// Returns:
//   { ok, total, created, updated, skipped, errors: [...] }

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Papa from 'papaparse'

// Map varied CSV header names to our canonical lead columns.
// Match is case-insensitive and trims whitespace + linebreaks.
function normalizeHeader(h) {
  return (h || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

const HEADER_MAP = {
  'contact id':                                                                                          'ghl_contact_id',
  'first name':                                                                                          '_first_name',
  'last name':                                                                                           '_last_name',
  'phone':                                                                                               'phone',
  'email':                                                                                               'email',
  'created':                                                                                             'created_at',
  'date created':                                                                                        'created_at',
  'age':                                                                                                 'age',
  'country':                                                                                             'country',
  'what has been your biggest struggle with fitness currently':                                          'roadblock',
  'biggest struggle':                                                                                    'roadblock',
  'how much are you bothered by how you look/feel':                                                      'bothered_score',
  'bothered':                                                                                            'bothered_score',
  'bothered score':                                                                                      'bothered_score',
  'would you invest in a program you knew would get you the results you have always dreamed of?':        'would_invest',
  'would invest':                                                                                        'would_invest',
  'tags':                                                                                                '_tags',
  'tag':                                                                                                 '_tags',
}

function mapRow(row) {
  const out = {}
  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = HEADER_MAP[normalizeHeader(rawKey)]
    if (!key) continue
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue
    if (value === '' || value == null) continue
    out[key] = value
  }
  // Compose full name from first/last
  const fn = out._first_name || ''
  const ln = out._last_name || ''
  const name = [fn, ln].filter(Boolean).join(' ').trim()
  if (name) out.name = name
  delete out._first_name
  delete out._last_name

  // Coerce types
  if (out.age != null && out.age !== '') {
    const n = parseInt(out.age, 10)
    out.age = Number.isFinite(n) ? n : null
  }
  if (out.bothered_score != null && out.bothered_score !== '') {
    const n = parseInt(out.bothered_score, 10)
    out.bothered_score = Number.isFinite(n) ? n : null
  }
  // Normalize phone: strip non-digit/+ chars, keep leading +
  if (out.phone) {
    out.phone = String(out.phone).trim().replace(/[^\d+]/g, '')
  }
  // Normalize email: lowercase
  if (out.email) {
    out.email = String(out.email).trim().toLowerCase()
  }
  // created_at: pass through if it's an ISO string; otherwise leave for Postgres default
  if (out.created_at) {
    const d = new Date(out.created_at)
    out.created_at = Number.isFinite(d.getTime()) ? d.toISOString() : null
    if (!out.created_at) delete out.created_at
  }

  return out
}

async function authorize(req) {
  // Bypass if internal call
  const internalSecret = req.headers.get('x-internal-secret')
  if (internalSecret && internalSecret === process.env.CRON_SECRET) return true
  // Otherwise must be authenticated via password gate (cookie)
  // Since this route is protected by proxy.js, if we got here, we're authed
  return true
}

export async function POST(req) {
  if (!(await authorize(req))) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') === '1'

  const csvText = await req.text()
  if (!csvText || csvText.length < 10) {
    return NextResponse.json({ ok: false, reason: 'empty_csv' }, { status: 400 })
  }

  // Parse CSV
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h, // keep raw for HEADER_MAP normalization
  })

  if (parsed.errors && parsed.errors.length > 0) {
    // Don't fail outright on row-level parse warnings — capture and continue
    console.warn('[import-leads] parse warnings:', parsed.errors.slice(0, 5))
  }

  const rows = parsed.data || []
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, reason: 'no_rows' }, { status: 400 })
  }

  // Map to canonical shape, filter out rows missing the ghl_contact_id
  const mapped = []
  const errors = []
  for (let i = 0; i < rows.length; i++) {
    try {
      const m = mapRow(rows[i])
      if (!m.ghl_contact_id) {
        errors.push({ row: i + 2, reason: 'missing_contact_id' })
        continue
      }
      // Mark import source so we can distinguish later
      m.source = 'import'
      // Tags get applied to call_logs, not leads — extract and remove
      const tagsRaw = rows[i]['Tags'] || rows[i]['tags'] || rows[i]['Tag'] || rows[i]['tag'] || ''
      mapped.push({ lead: m, tagsRaw })
    } catch (err) {
      errors.push({ row: i + 2, reason: 'map_error', detail: String(err) })
    }
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      total: rows.length,
      to_process: mapped.length,
      sample: mapped.slice(0, 3).map(m => m.lead),
      errors,
    })
  }

  // ── Upsert leads in batches ──────────────────────────────────────────
  const BATCH = 100
  let created = 0
  let updated = 0
  let skipped = 0
  const importErrors = [...errors]

  // Look up which ghl_contact_ids already exist so we can count created vs updated
  const allIds = mapped.map(m => m.lead.ghl_contact_id)
  const { data: existing } = await supabase
    .from('leads')
    .select('id, ghl_contact_id')
    .in('ghl_contact_id', allIds)

  const existingMap = new Map((existing || []).map(e => [e.ghl_contact_id, e.id]))

  for (let i = 0; i < mapped.length; i += BATCH) {
    const batch = mapped.slice(i, i + BATCH).map(m => m.lead)
    const { data, error } = await supabase
      .from('leads')
      .upsert(batch, { onConflict: 'ghl_contact_id' })
      .select('id, ghl_contact_id')

    if (error) {
      console.error('[import-leads] upsert error:', error)
      importErrors.push({ batch_start: i, reason: 'upsert_error', detail: error.message })
      skipped += batch.length
      continue
    }

    for (const row of data || []) {
      if (existingMap.has(row.ghl_contact_id)) updated++
      else created++
    }
  }

  // ── Apply tags to call_logs for rows that had a tag ──────────────────
  // Re-query lead ids by ghl_contact_id (some may be brand new)
  const { data: allLeads } = await supabase
    .from('leads')
    .select('id, ghl_contact_id')
    .in('ghl_contact_id', allIds)

  const idMap = new Map((allLeads || []).map(l => [l.ghl_contact_id, l.id]))

  const callLogRows = []
  for (const { lead, tagsRaw } of mapped) {
    if (!tagsRaw) continue
    const leadId = idMap.get(lead.ghl_contact_id)
    if (!leadId) continue
    // GHL exports tags as comma-separated. Use the first one for now.
    const firstTag = String(tagsRaw).split(',').map(s => s.trim()).filter(Boolean)[0]
    if (!firstTag) continue
    callLogRows.push({
      lead_id: leadId,
      ghl_contact_id: lead.ghl_contact_id,
      tag: firstTag,
    })
  }

  let tagsApplied = 0
  if (callLogRows.length > 0) {
    // Upsert on lead_id (one call_log per lead)
    const { error: clErr } = await supabase
      .from('call_logs')
      .upsert(callLogRows, { onConflict: 'lead_id', ignoreDuplicates: false })
    if (clErr) {
      console.error('[import-leads] call_logs upsert error:', clErr)
      importErrors.push({ reason: 'call_logs_error', detail: clErr.message })
    } else {
      tagsApplied = callLogRows.length
    }
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    created,
    updated,
    skipped,
    tags_applied: tagsApplied,
    errors: importErrors.slice(0, 20),
  })
}