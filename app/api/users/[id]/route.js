// PATCH /api/users/[id]
//
// Admin-only. Updates a user's profile fields and optionally their password.
//
// Body (all optional):
//   { full_name, role, assignment, password }

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function requireAdmin() {
  const cookieStore = await cookies()

  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 }) }
  }
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

export async function PATCH(req, { params }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id: targetUserId } = await params
  if (!targetUserId) {
    return NextResponse.json({ ok: false, reason: 'missing_id' }, { status: 400 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 })
  }

  const { full_name, role, assignment, password } = body || {}

  // Validate role if provided
  let finalRole
  if (role !== undefined) {
    if (role !== 'admin' && role !== 'setter') {
      return NextResponse.json({ ok: false, reason: 'invalid_role' }, { status: 400 })
    }
    finalRole = role

    // Safety: don't let an admin demote the LAST admin (themselves out of admin pool)
    if (role === 'setter') {
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
      // Check if target was admin
      const { data: target } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', targetUserId)
        .single()
      if (target?.role === 'admin' && (count || 0) <= 1) {
        return NextResponse.json(
          { ok: false, reason: 'cannot_demote_last_admin' },
          { status: 400 }
        )
      }
    }
  }

  // Validate password if provided
  if (password !== undefined && password !== null && password !== '') {
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ ok: false, reason: 'password_too_short' }, { status: 400 })
    }
  }

  try {
    // 1. Update profile fields (if any)
    const profileUpdate = {}
    if (full_name !== undefined)  profileUpdate.full_name = String(full_name).trim()
    if (finalRole !== undefined)  profileUpdate.role = finalRole
    if (assignment !== undefined) profileUpdate.assignment = assignment ? String(assignment).trim() : null
    profileUpdate.updated_at = new Date().toISOString()

    if (Object.keys(profileUpdate).length > 1) {  // > 1 because updated_at always present
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', targetUserId)
      if (updateErr) {
        console.error('[users:PATCH] profile update error:', updateErr)
        return NextResponse.json({ ok: false, reason: 'profile_update_failed' }, { status: 500 })
      }
    }

    // 2. Update password (if provided) via admin API
    if (password) {
      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password }
      )
      if (pwErr) {
        console.error('[users:PATCH] password update error:', pwErr)
        return NextResponse.json({ ok: false, reason: 'password_update_failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[users:PATCH] fatal:', err)
    return NextResponse.json({ ok: false, reason: 'internal_error' }, { status: 500 })
  }
}