// /api/users
//
// Admin-only endpoint for managing setter accounts.
//
//   GET    /api/users            → list all users (profiles + auth metadata)
//   POST   /api/users            → create a new user
//   PATCH  /api/users/[id]       → update a user (handled in [id]/route.js)
//
// Auth gate:
//   - Caller must have a valid Supabase session
//   - Caller's profile.role must be 'admin'
//
// Uses the service role client (lib/supabase-admin) to create auth users
// since that requires elevated permissions.

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Helper: returns { user, profile } if the caller is an authenticated admin,
// or a NextResponse error if not.
async function requireAdmin() {
  const cookieStore = await cookies()

  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only in this context */ },
      },
    }
  )

  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 }) }
  }

  // Look up role from profiles
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    return { error: NextResponse.json({ ok: false, reason: 'no_profile' }, { status: 403 }) }
  }
  if (profile.role !== 'admin') {
    return { error: NextResponse.json({ ok: false, reason: 'not_admin' }, { status: 403 }) }
  }

  return { user, profile }
}

// ─── GET /api/users ────────────────────────────────────────────────────
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    // Profiles (our metadata)
    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, assignment, is_active, created_at')
      .order('created_at', { ascending: true })

    if (profilesErr) {
      console.error('[users:GET] profiles error:', profilesErr)
      return NextResponse.json({ ok: false, reason: 'db_error' }, { status: 500 })
    }

    // Auth users (for last_sign_in_at)
    // listUsers returns auth.users records including last_sign_in_at
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1, perPage: 1000,
    })
    if (authErr) {
      console.error('[users:GET] auth.listUsers error:', authErr)
      // Continue with profiles only; last_sign_in_at will just be null
    }

    const authMap = {}
    for (const u of (authData?.users || [])) {
      authMap[u.id] = u
    }

    const enriched = (profiles || []).map(p => ({
      ...p,
      last_sign_in_at: authMap[p.id]?.last_sign_in_at || null,
    }))

    return NextResponse.json({ ok: true, users: enriched })
  } catch (err) {
    console.error('[users:GET] fatal:', err)
    return NextResponse.json({ ok: false, reason: 'internal_error' }, { status: 500 })
  }
}

// ─── POST /api/users ───────────────────────────────────────────────────
// Body: { email, password, full_name, role?, assignment? }
export async function POST(req) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 })
  }

  const { email, password, full_name, role, assignment } = body || {}

  if (!email || !password || !full_name) {
    return NextResponse.json(
      { ok: false, reason: 'missing_field' },
      { status: 400 }
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, reason: 'invalid_email' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, reason: 'password_too_short' }, { status: 400 })
  }
  const finalRole = role === 'admin' ? 'admin' : 'setter'

  try {
    // Create the auth user.
    // The on_auth_user_created trigger automatically inserts a profile row,
    // but it doesn't know our custom fields (full_name, role, assignment).
    // We pass full_name through user_metadata so the trigger picks it up,
    // then update role/assignment after.
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,  // skip confirmation email
      user_metadata: { full_name: full_name.trim() },
    })

    if (createErr) {
      console.error('[users:POST] createUser error:', createErr)
      const reason = createErr.message?.includes('already')
        ? 'email_exists'
        : 'create_failed'
      return NextResponse.json(
        { ok: false, reason, error: createErr.message },
        { status: 400 }
      )
    }

    const newUserId = created.user.id

    // Update profile with role + assignment (trigger created the row with
    // role='setter' by default; we may need to override)
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name.trim(),
        role:      finalRole,
        assignment: assignment ? String(assignment).trim() : null,
      })
      .eq('id', newUserId)

    return NextResponse.json({
      ok: true,
      user: {
        id:         newUserId,
        email:      created.user.email,
        full_name:  full_name.trim(),
        role:       finalRole,
        assignment: assignment ? String(assignment).trim() : null,
      },
    })
  } catch (err) {
    console.error('[users:POST] fatal:', err)
    return NextResponse.json({ ok: false, reason: 'internal_error' }, { status: 500 })
  }
}