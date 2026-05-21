'use client'
// app/stats/page.js
//
// Per-user performance stats. Reads from call_logs grouped by called_by,
// joined with profiles for display info.
//
// Stats shown per setter:
//   - Dials Made   (count of outbound call_logs with twilio_call_sid)
//   - Answered     (status='completed' AND duration_seconds >= 15s
//                   to filter out voicemails / instant hangups)
//   - Booked       (tag='booked')
//   - Talk Time    (sum of duration_seconds)
//   - Answer Rate  (answered / dials)
//   - Book Rate    (booked / answered) — honest measure: of people who picked up,
//                   how many booked
//
// Filters: this week / this month / all time (matches home page UX)
//
// Admin-only at the API level — this page calls /api/users (admin gated)
// to fetch the user list. Non-admins see a forbidden state.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, DisplayHeading, GoldRule, PageBackground, PageHeader, BrandButton,
  CornerBracket,
  useIsMobile,
} from '@/lib/brand'


function getInitials(user) {
  const source = user.full_name || user.email || '?'
  const parts = source.split(/[\s.@]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function rangeStart(timeframe) {
  const now = new Date()
  const start = new Date(now)
  if (timeframe === 'weekly')  start.setDate(now.getDate() - 7)
  if (timeframe === 'monthly') start.setDate(now.getDate() - 30)
  if (timeframe === 'all')     return new Date(0)
  return start
}

function rangeLabel(timeframe) {
  if (timeframe === 'all') return 'All Time'
  const now = new Date()
  const opts = { month: 'short', day: 'numeric' }
  const start = new Date(now)
  if (timeframe === 'weekly')  start.setDate(now.getDate() - 6)
  if (timeframe === 'monthly') start.setDate(now.getDate() - 29)
  return `${start.toLocaleDateString('en-US', opts)} – ${now.toLocaleDateString('en-US', opts)}`
}

function formatTalkTime(seconds) {
  if (!seconds || seconds <= 0) return '0m'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

function pct(num, denom) {
  if (!denom || denom === 0) return null
  return Math.round((num / denom) * 100)
}

export default function StatsPage() {
  const isMobile = useIsMobile()
  const [timeframe, setTimeframe] = useState('weekly')
  const [users, setUsers]     = useState([])
  const [callLogs, setCallLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    setError('')
    try {
      // Get users via the admin-gated endpoint. Admins-only.
      const usersRes = await fetch('/api/users')
      if (!usersRes.ok) {
        if (usersRes.status === 403 || usersRes.status === 401) {
          setForbidden(true)
          setLoading(false)
          return
        }
        throw new Error(`users fetch failed (${usersRes.status})`)
      }
      const usersData = await usersRes.json()
      if (!usersData.ok) {
        if (usersData.reason === 'not_admin' || usersData.reason === 'no_profile') {
          setForbidden(true)
          setLoading(false)
          return
        }
        throw new Error(usersData.reason || 'users fetch failed')
      }
      setUsers(usersData.users || [])

      // Get call_logs (only ones with a Twilio CallSid — i.e. real calls,
      // not legacy tag-only rows). Reads from Supabase directly via the
      // authenticated client.
      const { data: logs, error: logsErr } = await supabase
        .from('call_logs')
        .select('id, called_by, status, duration_seconds, tag, started_at, last_contacted')
        .not('twilio_call_sid', 'is', null)
      if (logsErr) throw logsErr
      setCallLogs(logs || [])
    } catch (err) {
      console.error('[stats] fetch error:', err)
      setError(String(err.message || err))
    }
    setLoading(false)
  }

  // Compute stats per user, filtered by timeframe.
  const start = rangeStart(timeframe)
  const inRange = callLogs.filter(log => {
    const t = log.started_at ? new Date(log.started_at) : null
    if (!t) return false
    return t >= start
  })

  const userStats = users.map(user => {
    const logs = inRange.filter(log => log.called_by === user.id)
    const dials    = logs.length
    const answered = logs.filter(log => log.status === 'completed').length
    const booked   = logs.filter(log => log.tag === 'booked').length
    const talkTime = logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0)
    return {
      user,
      dials,
      answered,
      booked,
      talkTime,
      answerRate: pct(answered, dials),
      bookRate:   pct(booked, dials),  // booked / total dials
    }
  })

  if (forbidden) {
    return (
      <PageBackground style={{ minHeight: '100vh' }}>
        <PageHeader
          pageLabel="Performance Stats"
          leftSlot={
            <Link href="/calls" style={{ textDecoration: 'none' }}>
              <BrandButton variant="ghost" size="sm">← Calls</BrandButton>
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
        pageLabel="Performance Stats"
        leftSlot={
          <Link href="/calls" style={{ textDecoration: 'none' }}>
            <BrandButton variant="ghost" size="sm">
              {isMobile ? '←' : '← Calls'}
            </BrandButton>
          </Link>
        }
      />

      <div style={{
        padding: isMobile ? '20px 12px 32px' : '32px 32px 48px',
        maxWidth: 1200, margin: '0 auto',
      }}>

        {/* Section header + timeframe toggle */}
        <div style={{
          marginBottom: isMobile ? 18 : 28,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em' }}>
              Performance
            </Eyebrow>
            <DisplayHeading size={isMobile ? 26 : 34} style={{ letterSpacing: '0.02em' }}>
              Call <span style={{ color: BRAND.gold }}>Stats</span>
            </DisplayHeading>
            <GoldRule width={36} />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            alignSelf: isMobile ? 'stretch' : 'flex-end',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
          }}>
            <span style={{
              fontSize: 9, color: BRAND.textMuted, fontWeight: 600,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              fontFamily: FONT_BODY,
            }}>
              {rangeLabel(timeframe)}
            </span>
            <div style={{ display: 'flex', gap: 0, border: `1px solid ${BRAND.border}` }}>
              {[
                { key: 'weekly',  label: 'W' },
                { key: 'monthly', label: 'M' },
                { key: 'all',     label: 'All' },
              ].map((t, i) => {
                const active = timeframe === t.key
                return (
                  <button key={t.key}
                    onClick={() => setTimeframe(t.key)}
                    style={{
                      background: active ? BRAND.gold : 'transparent',
                      color: active ? '#000' : BRAND.textMuted,
                      border: 'none',
                      borderLeft: i > 0 ? `1px solid ${BRAND.border}` : 'none',
                      minWidth: 36, height: 30,
                      padding: '0 12px',
                      fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.1em',
                      cursor: 'pointer',
                      fontFamily: FONT_BODY,
                    }}>{t.label}</button>
                )
              })}
            </div>
          </div>
        </div>

        {loading && (
          <Eyebrow color={BRAND.textDim}>Loading stats...</Eyebrow>
        )}

        {error && !loading && (
          <p style={{
            fontSize: 11, color: BRAND.statusDisqualified,
            fontFamily: FONT_BODY, letterSpacing: '0.05em',
          }}>Error: {error}</p>
        )}

        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(480px, 1fr))',
            gap: isMobile ? 14 : 22,
          }}>
            {userStats.length === 0 && (
              <div style={{
                padding: 48, textAlign: 'center',
                background: BRAND.bgCard,
                border: `1px dashed ${BRAND.border}`,
              }}>
                <Eyebrow color={BRAND.textDim}>No Users Yet</Eyebrow>
              </div>
            )}
            {userStats.map(stats => (
              <PlayerCard key={stats.user.id} stats={stats} isMobile={isMobile} />
            ))}
          </div>
        )}
      </div>
    </PageBackground>
  )
}

// ─── Player card ──────────────────────────────────────────────────────
function PlayerCard({ stats, isMobile }) {
  const { user, dials, answered, booked, talkTime, answerRate, bookRate } = stats
  const [hovered, setHovered] = useState(false)
  const isAdmin = user.role === 'admin'
  const initials = getInitials(user)
  const roleColor = isAdmin ? BRAND.gold : BRAND.statusNew

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: BRAND.bgCard,
        border: `1px solid ${hovered ? BRAND.borderGold : BRAND.border}`,
        padding: isMobile ? '18px 16px' : '24px 26px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 16 : 20,
        transition: 'all 0.2s ease',
        boxShadow: hovered ? `0 0 24px ${BRAND.goldFaint}` : 'none',
      }}>

      <CornerBracket position="tl" size={14} />
      <CornerBracket position="tr" size={14} />
      <CornerBracket position="bl" size={14} />
      <CornerBracket position="br" size={14} />

      {/* Top row: monogram + name + role */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 18 }}>
        <div style={{
          position: 'relative',
          width: isMobile ? 56 : 72,
          height: isMobile ? 56 : 72,
          flexShrink: 0,
          background: isAdmin ? 'rgba(176, 131, 74, 0.12)' : BRAND.bgRaised,
          border: `1px solid ${isAdmin ? BRAND.borderGoldStrong : BRAND.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isAdmin ? `0 0 18px ${BRAND.goldGlow}` : 'none',
        }}>
          <CornerBracket position="tl" size={8} color={isAdmin ? BRAND.gold : BRAND.borderGold} />
          <CornerBracket position="tr" size={8} color={isAdmin ? BRAND.gold : BRAND.borderGold} />
          <CornerBracket position="bl" size={8} color={isAdmin ? BRAND.gold : BRAND.borderGold} />
          <CornerBracket position="br" size={8} color={isAdmin ? BRAND.gold : BRAND.borderGold} />
          <span style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? 22 : 28,
            color: isAdmin ? BRAND.gold : BRAND.textPrimary,
            letterSpacing: '0.04em',
            textShadow: isAdmin ? `0 0 14px ${BRAND.goldGlow}` : 'none',
            lineHeight: 1,
          }}>{initials}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? 20 : 26,
            color: BRAND.textPrimary,
            letterSpacing: '0.01em',
            lineHeight: 1.1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user.full_name || user.email.split('@')[0]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, padding: '3px 9px',
              background: `${roleColor}15`,
              color: roleColor,
              border: `1px solid ${roleColor}55`,
              fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
              fontFamily: FONT_BODY,
            }}>{user.role}</span>
            {user.assignment && (
              <span style={{
                fontSize: 9, color: BRAND.textMuted,
                fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
                fontFamily: FONT_BODY,
              }}>{user.assignment}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1,
        background: BRAND.border,
        padding: 1,
      }}>
        <StatTile label="Dials"     value={dials}    color={BRAND.gold} />
        <StatTile label="Answered"  value={answered} color={BRAND.statusNew} />
        <StatTile label="Booked"    value={booked}   color={BRAND.statusBooked} />
        <StatTile label="Talk Time" value={formatTalkTime(talkTime)} color={BRAND.statusLinkSent} isText />
      </div>

      {/* Rate bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <RateBar label="Answer Rate" value={answerRate} color={BRAND.statusNew} />
        <RateBar label="Book Rate"   value={bookRate}   color={BRAND.statusBooked}
          sublabel="OF DIALS" />
      </div>
    </div>
  )
}

function StatTile({ label, value, color, isText }) {
  return (
    <div style={{
      background: BRAND.bgRaised,
      padding: '14px 14px 12px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${color}aa, transparent)`,
        opacity: 0.55,
      }} />
      <p style={{
        fontFamily: FONT_DISPLAY,
        fontSize: isText ? 18 : 28,
        fontWeight: 400,
        color,
        lineHeight: 1,
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
        margin: 0,
      }}>{value}</p>
      <Eyebrow color={BRAND.textMuted} style={{ marginTop: 8, letterSpacing: '0.22em', fontSize: 9 }}>
        {label}
      </Eyebrow>
    </div>
  )
}

function RateBar({ label, value, color, sublabel }) {
  const hasData = value !== null && value !== undefined
  const displayValue = hasData ? value : 0
  const widthPct = Math.min(displayValue, 100)
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 6, gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <Eyebrow color={BRAND.textMuted} style={{ fontSize: 10, letterSpacing: '0.25em' }}>
            {label}
          </Eyebrow>
          {sublabel && (
            <span style={{
              fontSize: 8, color: BRAND.textDim,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              fontFamily: FONT_BODY, fontWeight: 600,
            }}>{sublabel}</span>
          )}
        </div>
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 18,
          color: hasData ? color : BRAND.textDim,
          letterSpacing: '0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {hasData ? `${value}%` : '—'}
        </span>
      </div>
      <div style={{
        height: 4,
        background: BRAND.bgRaised,
        border: `1px solid ${BRAND.border}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0,
          width: `${widthPct}%`,
          background: hasData ? color : 'transparent',
          boxShadow: hasData ? `0 0 8px ${color}88` : 'none',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}