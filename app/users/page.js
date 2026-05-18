'use client'
// app/users/page.js
//
// Admin-only user management page.
// - Lists all users (admin + setter) with last login and created date
// - "Add User" button opens a create form (full name + email + password + role + assignment)
// - Click any row to edit name / role / assignment (password is NOT editable here;
//   resets are handled in the Supabase dashboard)
// - "Copy invite" button on each row produces a shareable login message

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, DisplayHeading, GoldRule, PageBackground, PageHeader, BrandButton,
  CornerBracket,
  useIsMobile,
} from '@/lib/brand'

const SITE_URL = (typeof window !== 'undefined' && window.location.origin) || ''

function timeAgo(dateStr) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hrs < 24)   return `${hrs}h ago`
  if (days < 30)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getInitials(user) {
  const source = user.full_name || user.email || '?'
  const parts = source.split(/[\s.@]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export default function UsersPage() {
  const isMobile = useIsMobile()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.reason === 'not_admin' || data.reason === 'no_profile') {
          setForbidden(true)
        } else {
          setError(data.reason || 'Failed to load users')
        }
        setUsers([])
      } else {
        setUsers(data.users || [])
      }
    } catch (err) {
      setError(String(err))
    }
    setLoading(false)
  }

  async function handleCreated() {
    setShowCreate(false)
    await fetchUsers()
  }
  async function handleEdited() {
    setEditingUser(null)
    await fetchUsers()
  }

  function copyInvite(user, password) {
    const loginUrl = `${SITE_URL}/login`
    const lines = [
      `Hey ${user.full_name || ''} — your access to the Large Dumbbells CRM is set up.`,
      ``,
      `Login: ${loginUrl}`,
      `Email: ${user.email}`,
    ]
    if (password) lines.push(`Password: ${password}`)
    lines.push(``)
    lines.push(`Change your password once you're in.`)
    const text = lines.join('\n')
    navigator.clipboard.writeText(text)
    setCopiedId(user.id)
    setTimeout(() => setCopiedId(prev => prev === user.id ? null : prev), 1800)
  }

  if (forbidden) {
    return (
      <PageBackground style={{ minHeight: '100vh' }}>
        <PageHeader
          pageLabel="User Management"
          leftSlot={
            <Link href="/" style={{ textDecoration: 'none' }}>
              <BrandButton variant="ghost" size="sm">← Home</BrandButton>
            </Link>
          }
        />
        <div style={{
          padding: 80, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 16,
        }}>
          <Eyebrow color={BRAND.statusDisqualified} style={{ fontSize: 11, letterSpacing: '0.3em' }}>
            Admin Access Required
          </Eyebrow>
          <p style={{
            fontSize: 12, color: BRAND.textMuted,
            fontFamily: FONT_BODY, letterSpacing: '0.02em',
            maxWidth: 360, textAlign: 'center', lineHeight: 1.5,
          }}>
            You need an admin role to manage users. Ask an admin to grant you access.
          </p>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <BrandButton variant="primary" size="md">← Back To Home</BrandButton>
          </Link>
        </div>
      </PageBackground>
    )
  }

  return (
    <PageBackground style={{ minHeight: '100vh' }}>
      <PageHeader
        pageLabel="User Management"
        leftSlot={
          <Link href="/" style={{ textDecoration: 'none' }}>
            <BrandButton variant="ghost" size="sm">
              {isMobile ? '←' : '← Home'}
            </BrandButton>
          </Link>
        }
        rightSlot={
          <BrandButton
            variant="solid"
            size="sm"
            onClick={() => setShowCreate(true)}>
            {isMobile ? '+ Add' : '+ Add User'}
          </BrandButton>
        }
      />

      <div style={{
        padding: isMobile ? '20px 12px 32px' : '32px 32px 48px',
        maxWidth: 980, margin: '0 auto',
      }}>

        {/* Section header */}
        <div style={{
          marginBottom: isMobile ? 18 : 28,
          display: 'flex', flexDirection: 'column',
          gap: 10,
        }}>
          <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em' }}>
            Personnel
          </Eyebrow>
          <DisplayHeading size={isMobile ? 26 : 34} style={{ letterSpacing: '0.02em' }}>
            Large Dumbbells <span style={{ color: BRAND.gold }}>Team</span>
          </DisplayHeading>
          <GoldRule width={36} />
        </div>

        {loading && (
          <Eyebrow color={BRAND.textDim}>Loading users...</Eyebrow>
        )}

        {error && !loading && (
          <p style={{
            fontSize: 11, color: BRAND.statusDisqualified,
            fontFamily: FONT_BODY, letterSpacing: '0.05em',
          }}>
            Error: {error}
          </p>
        )}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14 }}>
            {users.length === 0 && (
              <div style={{
                padding: 48, textAlign: 'center',
                background: BRAND.bgCard,
                border: `1px dashed ${BRAND.border}`,
              }}>
                <Eyebrow color={BRAND.textDim} style={{ fontSize: 10, letterSpacing: '0.25em' }}>
                  No Users Yet
                </Eyebrow>
              </div>
            )}
            {users.map(u => (
              <UserCard
                key={u.id}
                user={u}
                onEdit={() => setEditingUser(u)}
                onCopy={() => copyInvite(u, null)}
                copied={copiedId === u.id}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onCancel={() => setShowCreate(false)}
          onCreated={handleCreated}
          copyInvite={copyInvite}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onCancel={() => setEditingUser(null)}
          onSaved={handleEdited}
        />
      )}
    </PageBackground>
  )
}

// ─── User card ────────────────────────────────────────────────────────
function UserCard({ user, onEdit, onCopy, copied, isMobile }) {
  const [hovered, setHovered] = useState(false)
  const isAdmin = user.role === 'admin'
  const roleColor = isAdmin ? BRAND.gold : BRAND.statusNew
  const initials = getInitials(user)

  return (
    <div
      onClick={onEdit}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: hovered ? BRAND.bgCardHover : BRAND.bgCard,
        border: `1px solid ${hovered ? BRAND.borderGold : BRAND.border}`,
        padding: isMobile ? '16px 16px' : '22px 26px',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 14 : 22,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: hovered ? `0 0 24px ${BRAND.goldFaint}` : 'none',
      }}>

      <CornerBracket position="tl" size={12} />
      <CornerBracket position="tr" size={12} />
      <CornerBracket position="bl" size={12} />
      <CornerBracket position="br" size={12} />

      {/* Monogram tile — square with brand corner brackets */}
      <div style={{
        position: 'relative',
        width: isMobile ? 52 : 64,
        height: isMobile ? 52 : 64,
        flexShrink: 0,
        background: isAdmin ? 'rgba(176, 131, 74, 0.10)' : BRAND.bgRaised,
        border: `1px solid ${isAdmin ? BRAND.borderGoldStrong : BRAND.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isAdmin ? `0 0 16px ${BRAND.goldGlow}` : 'none',
      }}>
        <CornerBracket position="tl" size={7} color={isAdmin ? BRAND.gold : BRAND.borderGold} />
        <CornerBracket position="tr" size={7} color={isAdmin ? BRAND.gold : BRAND.borderGold} />
        <CornerBracket position="bl" size={7} color={isAdmin ? BRAND.gold : BRAND.borderGold} />
        <CornerBracket position="br" size={7} color={isAdmin ? BRAND.gold : BRAND.borderGold} />
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontSize: isMobile ? 20 : 24,
          color: isAdmin ? BRAND.gold : BRAND.textPrimary,
          letterSpacing: '0.03em',
          textShadow: isAdmin ? `0 0 12px ${BRAND.goldGlow}` : 'none',
          lineHeight: 1,
        }}>{initials}</span>
      </div>

      {/* Identity column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT_DISPLAY,
          fontSize: isMobile ? 18 : 22,
          color: BRAND.textPrimary,
          letterSpacing: '0.01em',
          lineHeight: 1.15,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {user.full_name || user.email.split('@')[0]}
        </div>

        <div style={{
          fontSize: 11, color: BRAND.textMuted,
          fontFamily: FONT_BODY, letterSpacing: '0.04em',
          marginTop: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {user.email}
        </div>

        {user.assignment && (
          <div style={{
            display: 'inline-block',
            marginTop: 10,
            fontSize: 9, fontWeight: 700,
            color: BRAND.gold,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            padding: '3px 9px',
            background: 'rgba(176, 131, 74, 0.08)',
            border: `1px solid ${BRAND.borderGold}`,
            fontFamily: FONT_BODY,
          }}>
            {user.assignment}
          </div>
        )}
      </div>

      {/* Metadata column (desktop only) */}
      {!isMobile && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          fontSize: 9,
          fontFamily: FONT_BODY,
          letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600,
          minWidth: 160, textAlign: 'right',
        }}>
          <div>
            <span style={{ color: BRAND.textDim }}>Last Login</span>
            <div style={{ color: BRAND.textSecondary, marginTop: 3, letterSpacing: '0.1em' }}>
              {timeAgo(user.last_sign_in_at)}
            </div>
          </div>
          <div>
            <span style={{ color: BRAND.textDim }}>Joined</span>
            <div style={{ color: BRAND.textSecondary, marginTop: 3, letterSpacing: '0.1em' }}>
              {formatDate(user.created_at)}
            </div>
          </div>
        </div>
      )}

      {/* Role badge + copy button */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end', gap: 10,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 9,
          padding: '5px 11px',
          background: `${roleColor}15`,
          color: roleColor,
          border: `1px solid ${roleColor}55`,
          fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase',
          fontFamily: FONT_BODY,
        }}>{user.role}</span>

        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            onClick={e => { e.stopPropagation(); onCopy() }}
            title="Copy invite message"
            style={{
              color: BRAND.textDim,
              background: 'transparent',
              border: `1px solid ${BRAND.border}`,
              padding: '5px 11px',
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: FONT_BODY,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = BRAND.gold
              e.currentTarget.style.borderColor = BRAND.borderGoldStrong
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = BRAND.textDim
              e.currentTarget.style.borderColor = BRAND.border
            }}>
            Copy Invite
          </button>
          {copied && (
            <span style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)', right: 0,
              background: BRAND.gold, color: '#000',
              padding: '4px 10px', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              fontFamily: FONT_BODY, whiteSpace: 'nowrap',
              pointerEvents: 'none', zIndex: 20,
              boxShadow: `0 0 12px ${BRAND.goldGlow}`,
            }}>Copied</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal shell ──────────────────────────────────────────────────────
function ModalShell({ title, onCancel, children, footer }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: BRAND.bgCard,
          border: `1px solid ${BRAND.borderStrong}`,
          padding: '28px 32px',
          maxWidth: 460,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}>
        <CornerBracket position="tl" size={14} />
        <CornerBracket position="tr" size={14} />
        <CornerBracket position="bl" size={14} />
        <CornerBracket position="br" size={14} />

        <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em', marginBottom: 8 }}>
          {title}
        </Eyebrow>
        <GoldRule width={24} />

        <div style={{ marginTop: 18 }}>
          {children}
        </div>

        <div style={{
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          marginTop: 22, paddingTop: 18,
          borderTop: `1px solid ${BRAND.border}`,
        }}>
          {footer}
        </div>
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, type = 'text', required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Eyebrow color={BRAND.textMuted} style={{ fontSize: 9, letterSpacing: '0.25em', marginBottom: 6 }}>
        {label}{required && ' *'}
      </Eyebrow>
      <input
        type={type}
        value={value}
        onChange={onChange}
        style={{
          width: '100%',
          background: BRAND.bgInput,
          color: BRAND.textPrimary,
          border: `1px solid ${BRAND.border}`,
          padding: '10px 12px',
          fontSize: 14,
          outline: 'none',
          fontFamily: FONT_BODY,
          letterSpacing: '0.02em',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = BRAND.borderGoldStrong }}
        onBlur={e => { e.target.style.borderColor = BRAND.border }}
      />
    </div>
  )
}

function RoleField({ value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Eyebrow color={BRAND.textMuted} style={{ fontSize: 9, letterSpacing: '0.25em', marginBottom: 6 }}>
        Role
      </Eyebrow>
      <div style={{ display: 'flex', gap: 0, border: `1px solid ${BRAND.border}` }}>
        {[
          { val: 'setter', label: 'Setter' },
          { val: 'admin',  label: 'Admin' },
        ].map((opt, i) => {
          const active = value === opt.val
          return (
            <button key={opt.val} type="button"
              onClick={() => onChange(opt.val)}
              style={{
                flex: 1,
                background: active ? BRAND.gold : 'transparent',
                color: active ? '#000' : BRAND.textMuted,
                border: 'none',
                borderLeft: i > 0 ? `1px solid ${BRAND.border}` : 'none',
                padding: '10px 14px',
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: FONT_BODY,
                cursor: 'pointer',
              }}>{opt.label}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────
function CreateUserModal({ onCancel, onCreated, copyInvite }) {
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [role, setRole]           = useState('setter')
  const [assignment, setAssignment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [created, setCreated]     = useState(null)

  async function submit() {
    if (submitting) return
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
          assignment: assignment.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.reason === 'email_exists') setError('That email is already in use.')
        else if (data.reason === 'invalid_email') setError('Invalid email address.')
        else if (data.reason === 'password_too_short') setError('Password must be at least 8 characters.')
        else setError(data.error || data.reason || 'Failed to create user.')
        setSubmitting(false)
        return
      }
      setCreated(data.user)
    } catch (err) {
      setError(String(err))
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <ModalShell
        title="User Created"
        onCancel={onCreated}
        footer={
          <>
            <BrandButton
              variant="ghost" size="md"
              onClick={() => { copyInvite(created, password) }}>
              Copy Invite
            </BrandButton>
            <BrandButton
              variant="solid" size="md"
              onClick={onCreated}>
              Done
            </BrandButton>
          </>
        }>
        <p style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 22, color: BRAND.textPrimary,
          marginBottom: 12,
          letterSpacing: '0.01em',
        }}>
          {created.full_name} added.
        </p>
        <p style={{
          fontSize: 11, color: BRAND.textMuted,
          fontFamily: FONT_BODY, lineHeight: 1.6,
          marginBottom: 14,
        }}>
          Save the password somewhere safe — it won't be shown again. Resets
          are handled in the Supabase dashboard.
        </p>
        <div style={{
          background: BRAND.bgRaised,
          border: `1px solid ${BRAND.border}`,
          padding: '12px 14px',
          fontSize: 12,
          color: BRAND.textSecondary,
          fontFamily: FONT_BODY,
          letterSpacing: '0.02em',
          lineHeight: 1.7,
        }}>
          <div><span style={{ color: BRAND.textDim }}>Email:</span> {created.email}</div>
          <div><span style={{ color: BRAND.textDim }}>Password:</span> {password}</div>
          {created.assignment && (
            <div><span style={{ color: BRAND.textDim }}>Assignment:</span> {created.assignment}</div>
          )}
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell
      title="Add User"
      onCancel={onCancel}
      footer={
        <>
          <BrandButton variant="ghost" size="md" onClick={onCancel}>Cancel</BrandButton>
          <BrandButton
            variant="solid" size="md"
            onClick={submit}
            disabled={submitting || !fullName || !email || !password}>
            {submitting ? 'Creating…' : 'Create User'}
          </BrandButton>
        </>
      }>
      <FormField
        label="Full Name" required
        value={fullName} onChange={e => setFullName(e.target.value)}
      />
      <FormField
        label="Email" type="email" required
        value={email} onChange={e => setEmail(e.target.value)}
      />
      <FormField
        label="Temporary Password" type="text" required
        value={password} onChange={e => setPassword(e.target.value)}
      />
      <RoleField value={role} onChange={setRole} />
      <FormField
        label="Assignment"
        value={assignment} onChange={e => setAssignment(e.target.value)}
      />
      {error && (
        <p style={{
          fontSize: 11, color: BRAND.statusDisqualified, marginTop: 8,
          fontFamily: FONT_BODY,
          letterSpacing: '0.05em', fontWeight: 600,
        }}>{error}</p>
      )}
    </ModalShell>
  )
}

// ─── Edit modal ───────────────────────────────────────────────────────
// No password change. Resets happen in the Supabase dashboard.
function EditUserModal({ user, onCancel, onSaved }) {
  const [fullName, setFullName]   = useState(user.full_name || '')
  const [role, setRole]           = useState(user.role || 'setter')
  const [assignment, setAssignment] = useState(user.assignment || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError('')

    const body = {
      full_name: fullName.trim(),
      role,
      assignment: assignment.trim() || null,
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.reason === 'cannot_demote_last_admin') setError("Can't demote the last admin.")
        else setError(data.error || data.reason || 'Failed to update user.')
        setSubmitting(false)
        return
      }
      onSaved()
    } catch (err) {
      setError(String(err))
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title="Edit User"
      onCancel={onCancel}
      footer={
        <>
          <BrandButton variant="ghost" size="md" onClick={onCancel}>Cancel</BrandButton>
          <BrandButton
            variant="solid" size="md"
            onClick={submit}
            disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </BrandButton>
        </>
      }>
      <p style={{
        fontSize: 11, color: BRAND.textDim,
        fontFamily: FONT_BODY,
        letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
        marginBottom: 18,
      }}>
        {user.email}
      </p>

      <FormField
        label="Full Name"
        value={fullName} onChange={e => setFullName(e.target.value)}
      />
      <RoleField value={role} onChange={setRole} />
      <FormField
        label="Assignment"
        value={assignment} onChange={e => setAssignment(e.target.value)}
      />
      {error && (
        <p style={{
          fontSize: 11, color: BRAND.statusDisqualified, marginTop: 8,
          fontFamily: FONT_BODY,
          letterSpacing: '0.05em', fontWeight: 600,
        }}>{error}</p>
      )}
    </ModalShell>
  )
}