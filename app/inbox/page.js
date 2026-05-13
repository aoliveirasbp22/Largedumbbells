'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  STATUS_STYLES,
  Eyebrow, GoldRule, DisplayHeading, PageBackground, PageHeader, BrandButton, StatusPill,
  CornerBracket,
  useIsMobile,
} from '@/lib/brand'

// ─── Status config ────────────────────────────────────────────────────
const MANUAL_STATUSES = ['link sent', 'booked', 'disqualified']
const AUTO_STATUSES   = ['new', 'qualifying', 'ghosted']
const ALL_STATUSES    = [...AUTO_STATUSES, ...MANUAL_STATUSES]
const UNPIN_STATUSES  = ['booked', 'disqualified']

// ─── Helpers ──────────────────────────────────────────────────────────
function deriveStatus(lead, messages) {
  if (MANUAL_STATUSES.includes(lead.status)) return lead.status
  if (!messages || messages.length === 0) return lead.status
  const last = messages[messages.length - 1]
  const isInbound = last.direction === 'inbound'
  const hoursSince = (Date.now() - new Date(last.created_at).getTime()) / 36e5
  if (isInbound && hoursSince >= 24) return 'ghosted'
  if (messages.some(m => m.direction === 'outbound')) return 'qualifying'
  return 'new'
}

function needsReply(messages) {
  if (!messages || messages.length === 0) return false
  return messages[messages.length - 1].direction === 'inbound'
}

function isUnread(lead, messages) {
  if (!messages || messages.length === 0) return false
  const last = messages[messages.length - 1]
  if (last.direction !== 'inbound') return false
  if (!lead.last_read_at) return true
  return new Date(last.created_at) > new Date(lead.last_read_at)
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1)  return 'now'
  if (mins < 60) return `${mins}m`
  if (hrs  < 24) return `${hrs}h`
  return `${days}d`
}

function displayName(lead) {
  if (lead.ig_handle) return `@${lead.ig_handle}`
  if (lead.name)      return lead.name
  return 'Anonymous'
}

// ─── Sub-components ───────────────────────────────────────────────────
function PlatformIcon({ platform, size = 11 }) {
  if (platform === 'instagram') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <rect x="2" y="2" width="20" height="20" rx="5" stroke={BRAND.textMuted} strokeWidth="2"/>
        <circle cx="12" cy="12" r="4" stroke={BRAND.textMuted} strokeWidth="2"/>
        <circle cx="17.5" cy="6.5" r="1" fill={BRAND.textMuted}/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={BRAND.textMuted} style={{ flexShrink: 0 }}>
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
    </svg>
  )
}

function StarIcon({ filled, size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? BRAND.gold : 'none'}
      stroke={filled ? BRAND.gold : BRAND.textMuted}
      strokeWidth="2" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function DefaultAvatarIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill={BRAND.bgRaised} stroke={BRAND.borderStrong} strokeWidth="1"/>
      <circle cx="12" cy="9" r="3.5" fill={BRAND.textDim}/>
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" stroke={BRAND.textDim} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function Avatar({ lead, size = 28 }) {
  if (lead?.profile_pic_url) {
    return (
      <img
        src={lead.profile_pic_url}
        alt=""
        width={size}
        height={size}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          border: `1px solid ${BRAND.border}`,
        }}
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return <DefaultAvatarIcon size={size} />
}

function ChevronDown({ size = 10, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polyline points="6 9 12 15 18 9" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function StageDropdown({ activeStatus, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const s = STATUS_STYLES[activeStatus] || { bg: 'rgba(102,102,102,0.13)', color: BRAND.textMuted, border: 'rgba(102,102,102,0.33)' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: s.bg, color: s.color, border: `1px solid ${s.border}`,
          padding: '5px 12px',
          fontSize: 10, fontWeight: 700,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          fontFamily: FONT_BODY,
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', minWidth: 130, justifyContent: 'space-between',
        }}>
        <span>{activeStatus}</span>
        <ChevronDown size={10} color={s.color} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: BRAND.bgRaised, border: `1px solid ${BRAND.borderStrong}`,
          padding: 4, minWidth: 170, zIndex: 50,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          {ALL_STATUSES.map(st => {
            const ss = STATUS_STYLES[st]
            const isActive = st === activeStatus
            return (
              <button key={st}
                onClick={() => { onChange(st); setOpen(false) }}
                style={{
                  background: isActive ? ss.bg : 'transparent',
                  color: ss.color, border: 'none',
                  padding: '8px 10px',
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  fontFamily: FONT_BODY,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = BRAND.bgCardHover }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: ss.color, flexShrink: 0,
                }} />
                {st}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Mobile filter sheet ──────────────────────────────────────────────
function InboxFilterSheet({ open, onClose, filter, setFilter, pinnedCount }) {
  if (!open) return null
  const options = ['all', 'pinned', ...ALL_STATUSES]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: BRAND.bg,
          borderTop: `1px solid ${BRAND.borderGoldStrong}`,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.8)',
        }}>
        <CornerBracket position="tl" size={14} />
        <CornerBracket position="tr" size={14} />

        <div style={{
          padding: '18px 20px',
          borderBottom: `1px solid ${BRAND.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0,
          background: BRAND.bg,
          zIndex: 1,
        }}>
          <div>
            <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em', marginBottom: 6 }}>Filter</Eyebrow>
            <GoldRule width={24} />
          </div>
          <button onClick={onClose}
            style={{
              background: 'transparent', border: `1px solid ${BRAND.border}`,
              color: BRAND.textSecondary,
              padding: '6px 12px', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              fontFamily: FONT_BODY, cursor: 'pointer',
            }}>Close ✕</button>
        </div>

        <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map(f => {
            const active = filter === f
            return (
              <button key={f}
                onClick={() => { setFilter(f); onClose() }}
                style={{
                  background: active ? 'rgba(176, 131, 74, 0.13)' : 'transparent',
                  color: active ? BRAND.gold : BRAND.textSecondary,
                  border: `1px solid ${active ? BRAND.borderGoldStrong : BRAND.border}`,
                  padding: '12px 14px',
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  fontFamily: FONT_BODY,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  textAlign: 'left',
                }}>
                {f === 'pinned' && <StarIcon filled={active} size={12} />}
                <span style={{ flex: 1 }}>{f}</span>
                {f === 'pinned' && pinnedCount > 0 && (
                  <span style={{ fontSize: 9, opacity: 0.7 }}>({pinnedCount})</span>
                )}
                {active && <span>✓</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────
function useVisualViewportHeight() {
  // Returns the current usable viewport height (in px),
  // shrinking when the iOS keyboard appears.
  const [h, setH] = useState(typeof window !== 'undefined' ? window.innerHeight : 0)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return
    const vv = window.visualViewport
    const update = () => setH(vv.height)
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return h
}

export default function DMInbox() {
  const isMobile = useIsMobile()
  const [leads,        setLeads]        = useState([])
  const [leadMessages, setLeadMessages] = useState({})
  const [selectedLead, setSelectedLead] = useState(null)
  const [reply,        setReply]        = useState('')
  const [filter,       setFilter]       = useState('all')
  const [search,       setSearch]       = useState('')
  const [sending,      setSending]      = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => { fetchLeads() }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('inboxState')
      if (!saved) return
      const state = JSON.parse(saved)
      if (state.search !== undefined) setSearch(state.search)
      if (state.filter)               setFilter(state.filter)
      // On mobile, always start on the list view — don't auto-open last convo
      const onMobile = typeof window !== 'undefined' && window.innerWidth < 768
      if (state.selectedLeadId && !onMobile) {
        window.__pendingSelectedLeadId = state.selectedLeadId
      }
    } catch (err) {
      console.error('Inbox state restore error:', err)
    }
  }, [])

  useEffect(() => {
    if (leads.length > 0 && window.__pendingSelectedLeadId) {
      const lead = leads.find(l => l.id === window.__pendingSelectedLeadId)
      if (lead) setSelectedLead(lead)
      window.__pendingSelectedLeadId = null
    }
  }, [leads])

  useEffect(() => {
    try {
      localStorage.setItem('inboxState', JSON.stringify({
        search, filter,
        selectedLeadId: selectedLead?.id || null,
      }))
    } catch (err) {
      console.error('Inbox state save error:', err)
    }
  }, [search, filter, selectedLead])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [leadMessages, selectedLead])

  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new
        setLeadMessages(prev => {
          const existing = prev[msg.lead_id] || []
          if (existing.find(m => m.id === msg.id)) return prev
          return { ...prev, [msg.lead_id]: [...existing, msg] }
        })
        setLeads(prev => {
          if (prev.find(l => l.id === msg.lead_id)) return prev
          fetchLeads()
          return prev
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchLeads() {
    const { data: leadsData    } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    const { data: messagesData } = await supabase.from('messages').select('*').order('created_at', { ascending: true })

    const msgMap = {}
    messagesData?.forEach(msg => {
      if (!msgMap[msg.lead_id]) msgMap[msg.lead_id] = []
      msgMap[msg.lead_id].push(msg)
    })

    setLeads(leadsData || [])
    setLeadMessages(msgMap)
  }

  async function selectLead(lead) {
    setSelectedLead(lead)
    const now = new Date().toISOString()
    await supabase.from('leads').update({ last_read_at: now }).eq('id', lead.id)
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, last_read_at: now } : l))
  }

  async function updateStatus(leadId, status) {
    const updates = { status }
    if (UNPIN_STATUSES.includes(status)) {
      updates.pinned = false
    }
    await supabase.from('leads').update(updates).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l))
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => ({ ...prev, ...updates }))
    }
  }

  async function togglePin(leadId, currentlyPinned, e) {
    if (e) e.stopPropagation()
    const next = !currentlyPinned
    await supabase.from('leads').update({ pinned: next }).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pinned: next } : l))
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => ({ ...prev, pinned: next }))
    }
  }

  async function sendReply() {
    if (!reply.trim() || !selectedLead || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/reply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          psid:    selectedLead.psid,
          message: reply,
          lead_id: selectedLead.id,
        }),
      })
      if (res.ok) {
        const text   = reply
        const newMsg = {
          id:         Date.now(),
          lead_id:    selectedLead.id,
          direction:  'outbound',
          content:    text,
          created_at: new Date().toISOString(),
        }
        setReply('')
        setLeadMessages(prev => ({
          ...prev,
          [selectedLead.id]: [...(prev[selectedLead.id] || []), newMsg],
        }))
      }
    } catch (err) {
      console.error(err)
    }
    setSending(false)
  }

  const leadsWithStatus = leads.map(lead => {
    const derived = deriveStatus(lead, leadMessages[lead.id])
    if (derived !== lead.status && AUTO_STATUSES.includes(derived)) {
      supabase.from('leads').update({ status: derived }).eq('id', lead.id).then(() => {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: derived } : l))
      })
    }
    return { ...lead, status: derived }
  })

  const filtered = leadsWithStatus.filter(l => {
    if (filter === 'pinned') {
      if (!l.pinned) return false
    } else if (filter !== 'all') {
      if (l.status !== filter) return false
    }
    if (search) {
      const s = search.toLowerCase()
      return (
        l.name?.toLowerCase().includes(s) ||
        l.ig_handle?.toLowerCase().includes(s)
      )
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const aUnread = isUnread(a, leadMessages[a.id])
    const bUnread = isUnread(b, leadMessages[b.id])
    if (aUnread && !bUnread) return -1
    if (!aUnread && bUnread) return 1
    const aLast = leadMessages[a.id]?.at(-1)?.created_at || a.created_at
    const bLast = leadMessages[b.id]?.at(-1)?.created_at || b.created_at
    return new Date(bLast) - new Date(aLast)
  })

  const selectedMessages = selectedLead ? (leadMessages[selectedLead.id] || []) : []
  const activeStatus     = selectedLead ? deriveStatus(selectedLead, selectedMessages) : null

  const needsReplyCount  = leadsWithStatus.filter(l => needsReply(leadMessages[l.id])).length
  const pinnedCount      = leadsWithStatus.filter(l => l.pinned).length

  // Active window: 30 days from last activity
  const ACTIVE_WINDOW_DAYS = 30
  const activeCutoff = new Date()
  activeCutoff.setDate(activeCutoff.getDate() - ACTIVE_WINDOW_DAYS)

  const activeLeads = leadsWithStatus.filter(l => {
    const msgs = leadMessages[l.id] || []
    const lastActivity = msgs.length > 0
      ? new Date(msgs[msgs.length - 1].created_at)
      : new Date(l.created_at)
    return lastActivity >= activeCutoff
  })

  const statMessagesSent = activeLeads.length
  const statQualifying   = activeLeads.filter(l => l.status === 'qualifying' || l.status === 'new').length

  const stats = [
    { label: 'Messages Sent', value: statMessagesSent, color: BRAND.gold },
    { label: 'Qualifying',    value: statQualifying,   color: BRAND.statusNew },
  ]

  return (
    <PageBackground style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      <PageHeader
        pageLabel={isMobile && selectedLead ? null : 'DM Pipeline'}
        leftSlot={
          isMobile && selectedLead ? (
            <button
              onClick={() => setSelectedLead(null)}
              style={{
                background: 'transparent',
                border: `1px solid ${BRAND.border}`,
                color: BRAND.gold,
                padding: '6px 10px',
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: FONT_BODY,
                cursor: 'pointer',
              }}>
              ← Inbox
            </button>
          ) : (
            <Link href="/" style={{ textDecoration: 'none' }}>
              <BrandButton variant="ghost" size="sm">
                {isMobile ? '←' : '← Home'}
              </BrandButton>
            </Link>
          )
        }
        rightSlot={
          <Link href="/analytics" style={{ textDecoration: 'none' }}>
            <BrandButton variant="ghost" size="sm" style={{ color: BRAND.statusNew, borderColor: 'rgba(74,144,217,0.33)' }}>
              {isMobile ? 'Stats →' : 'Analytics →'}
            </BrandButton>
          </Link>
        }
      />

      {/* Mini stat ribbon (hidden on mobile when viewing a conversation) */}
      {!(isMobile && selectedLead) && (
        <div style={{
          padding: isMobile ? '10px 12px' : '14px 24px',
          background: BRAND.bg,
          flexShrink: 0,
        }}>
          <div style={{
            position: 'relative',
            background: BRAND.bgCard,
            border: `1px solid ${BRAND.border}`,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'stretch',
            flexDirection: isMobile ? 'column' : 'row',
            overflow: 'hidden',
          }}>
            <CornerBracket position="tl" size={14} />
            <CornerBracket position="tr" size={14} />
            <CornerBracket position="bl" size={14} />
            <CornerBracket position="br" size={14} />

            {/* Stats row (2-col on mobile) */}
            <div style={{
              display: isMobile ? 'grid' : 'contents',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'none',
              gap: isMobile ? 1 : 0,
              background: isMobile ? BRAND.border : 'transparent',
            }}>
              {stats.map((s, idx) => (
                <div key={s.label} style={{
                  flex: isMobile ? 'initial' : 1,
                  padding: isMobile ? '14px 16px' : '18px 24px',
                  borderRight: !isMobile && idx < stats.length - 1 ? `1px solid ${BRAND.border}` : 'none',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 6,
                  background: BRAND.bgCard,
                  transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${s.color}aa, transparent)`,
                    opacity: 0.5,
                  }} />
                  <p style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: isMobile ? 26 : 30, fontWeight: 400, color: s.color,
                    lineHeight: 1, letterSpacing: '0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    margin: 0,
                  }}>
                    {s.value}
                  </p>
                  <Eyebrow color={BRAND.textMuted} style={{ letterSpacing: '0.2em', fontSize: 9 }}>
                    {s.label}
                  </Eyebrow>
                </div>
              ))}
            </div>

            {/* Window label cell */}
            <div style={{
              padding: isMobile ? '10px 14px' : '18px 24px',
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              justifyContent: isMobile ? 'center' : 'center',
              alignItems: isMobile ? 'center' : 'flex-end',
              gap: isMobile ? 10 : 6,
              background: BRAND.bgRaised,
              borderLeft: !isMobile ? `1px solid ${BRAND.border}` : 'none',
              borderTop: isMobile ? `1px solid ${BRAND.border}` : 'none',
              minWidth: isMobile ? 0 : 180,
            }}>
              <Eyebrow color={BRAND.textMuted} style={{ fontSize: 9, letterSpacing: '0.25em' }}>
                Active Window
              </Eyebrow>
              <span style={{
                fontSize: 11, color: BRAND.textPrimary, fontWeight: 500,
                fontFamily: FONT_BODY,
                letterSpacing: '0.05em',
              }}>
                · Last {ACTIVE_WINDOW_DAYS} days
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Inbox content */}
      <div style={{
        display: 'flex',
        background: BRAND.bg,
        height: isMobile
          ? (selectedLead ? 'calc(100dvh - 70px)' : 'calc(100dvh - 240px)')
          : 'calc(100vh - 240px)',
        minHeight: isMobile ? 400 : 500,
        flex: isMobile ? 1 : 'initial',
      }}>

        {/* ── Sidebar / list ── */}
        <div style={{
          width: isMobile ? '100%' : 300,
          display: isMobile && selectedLead ? 'none' : 'flex',
          flexDirection: 'column',
          borderRight: !isMobile ? `1px solid ${BRAND.border}` : 'none',
          flexShrink: 0,
          background: BRAND.bgCard,
        }}>

          <div style={{ padding: 12, borderBottom: `1px solid ${BRAND.border}` }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="SEARCH NAME OR HANDLE…"
              style={{
                width: '100%',
                background: BRAND.bgInput,
                color: BRAND.textPrimary,
                border: `1px solid ${BRAND.border}`,
                padding: '8px 12px',
                fontSize: 10,
                letterSpacing: '0.15em',
                fontFamily: FONT_BODY,
                outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = BRAND.borderGoldStrong }}
              onBlur={e => { e.target.style.borderColor = BRAND.border }}
            />
          </div>

          <div style={{ padding: 12, borderBottom: `1px solid ${BRAND.border}` }}>
            {isMobile ? (
              <button
                onClick={() => setFilterSheetOpen(true)}
                style={{
                  width: '100%',
                  background: filter === 'all' ? 'transparent' : 'rgba(176, 131, 74, 0.13)',
                  color: filter === 'all' ? BRAND.textSecondary : BRAND.gold,
                  border: `1px solid ${filter === 'all' ? BRAND.border : BRAND.borderGoldStrong}`,
                  padding: '10px 14px',
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  fontFamily: FONT_BODY,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {filter === 'pinned' && <StarIcon filled size={10} />}
                  Filter: {filter}
                </span>
                <span>▾</span>
              </button>
            ) : (
              <>
                <Eyebrow color={BRAND.textDim} style={{ marginBottom: 8, fontSize: 9, letterSpacing: '0.3em' }}>Filter</Eyebrow>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['all', 'pinned', ...ALL_STATUSES].map(f => {
                    const active = filter === f
                    return (
                      <button key={f} onClick={() => setFilter(f)}
                        style={{
                          background:  active ? BRAND.gold : 'transparent',
                          color:       active ? '#000' : BRAND.textMuted,
                          border:      `1px solid ${active ? BRAND.gold : BRAND.border}`,
                          padding:     '4px 8px',
                          fontSize:    9,
                          fontWeight:  700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontFamily:  FONT_BODY,
                          cursor:      'pointer',
                          display:     'flex', alignItems: 'center', gap: 4,
                          transition:  'all 0.15s',
                        }}>
                        {f === 'pinned' && <StarIcon filled={active} size={9} />}
                        {f}
                        {f === 'pinned' && pinnedCount > 0 && (
                          <span style={{ fontSize: 8, opacity: active ? 0.7 : 1 }}>
                            ({pinnedCount})
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {needsReplyCount > 0 && (
            <div style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${BRAND.border}`,
              background: BRAND.goldFaint,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: 999,
                background: BRAND.gold, flexShrink: 0,
                boxShadow: `0 0 8px ${BRAND.gold}`,
              }} />
              <span style={{
                fontSize: 10, color: BRAND.gold,
                fontWeight: 700, letterSpacing: '0.15em',
                textTransform: 'uppercase', fontFamily: FONT_BODY,
              }}>
                {needsReplyCount} Waiting On Your Reply
              </span>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sorted.length === 0 && (
              <p style={{
                fontSize: 11, color: BRAND.textDim, padding: 16,
                fontFamily: FONT_BODY,
              }}>No leads found</p>
            )}
            {sorted.map(lead => {
              const msgs       = leadMessages[lead.id] || []
              const lastMsg    = msgs.at(-1)
              const unread     = isUnread(lead, msgs)
              const isSelected = selectedLead?.id === lead.id
              return (
                <div key={lead.id} onClick={() => selectLead(lead)}
                  style={{
                    padding: '12px 14px',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${BRAND.border}`,
                    background: isSelected ? BRAND.bgRaised : 'transparent',
                    borderLeft: isSelected ? `2px solid ${BRAND.gold}` : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = BRAND.bgCardHover }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <button
                      onClick={e => togglePin(lead.id, lead.pinned, e)}
                      style={{
                        background: 'transparent', border: 'none', padding: 0,
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        flexShrink: 0,
                      }}
                      title={lead.pinned ? 'Unpin' : 'Pin'}>
                      <StarIcon filled={!!lead.pinned} size={12} />
                    </button>
                    <PlatformIcon platform={lead.platform} />
                    <Avatar lead={lead} size={24} />
                    <span style={{
                      flex: 1,
                      fontSize: 12, fontWeight: 500,
                      color: unread ? BRAND.textPrimary : BRAND.textSecondary,
                      fontFamily: FONT_BODY,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      letterSpacing: '0.01em',
                    }}>
                      {displayName(lead)}
                    </span>
                    <span style={{
                      fontSize: 9, color: BRAND.textDim, flexShrink: 0,
                      fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                      fontFamily: FONT_BODY,
                    }}>
                      {timeAgo(lastMsg?.created_at || lead.created_at)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingLeft: 4 }}>
                    {lastMsg ? (
                      <p style={{
                        flex: 1,
                        fontSize: 11,
                        color: unread ? BRAND.textPrimary : BRAND.textMuted,
                        fontFamily: FONT_BODY,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {lastMsg.direction === 'outbound' ? 'You: ' : ''}{lastMsg.content}
                      </p>
                    ) : (
                      <p style={{
                        flex: 1, fontSize: 11, color: BRAND.textDim,
                        fontFamily: FONT_BODY, fontStyle: 'italic',
                      }}>No messages yet</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <StatusPill status={lead.status} size="xs" />
                      {unread && (
                        <div style={{
                          width: 6, height: 6, borderRadius: 999,
                          background: BRAND.gold,
                          boxShadow: `0 0 6px ${BRAND.gold}`,
                        }} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Main message panel ── */}
        <div style={{
          flex: 1,
          display: isMobile && !selectedLead ? 'none' : 'flex',
          flexDirection: 'column',
          minWidth: 0,
          maxWidth: '100%',
          width: isMobile ? '100%' : 'auto',
          overflow: 'hidden',
        }}>
          {/* Mobile conversation header - replaces PageHeader when in convo view */}
          {isMobile && selectedLead && (
            <div style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${BRAND.border}`,
              background: BRAND.bgCard,
              display: 'flex', alignItems: 'center', gap: 10,
              flexShrink: 0,
            }}>
              <button
                onClick={() => setSelectedLead(null)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${BRAND.border}`,
                  color: BRAND.gold,
                  padding: '6px 10px',
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  fontFamily: FONT_BODY,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}>← Inbox</button>
              <Avatar lead={selectedLead} size={28} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 600,
                    color: BRAND.textPrimary, fontFamily: FONT_BODY,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{displayName(selectedLead)}</p>
                  <PlatformIcon platform={selectedLead.platform} />
                </div>
              </div>
              <StageDropdown
                activeStatus={activeStatus}
                onChange={st => updateStatus(selectedLead.id, st)}
              />
            </div>
          )}

          {!selectedLead ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              <img
                src="/logo-large-dumbbells.png"
                alt=""
                style={{ width: 64, height: 64, opacity: 0.15 }}
              />
              <Eyebrow color={BRAND.textDim} style={{ fontSize: 10, letterSpacing: '0.35em' }}>
                Select a lead to view the conversation
              </Eyebrow>
            </div>
          ) : (
            <>
              {/* Contact bar (desktop only — mobile has its own above) */}
              {!isMobile && (
                <div style={{
                  padding: '14px 24px',
                  borderBottom: `1px solid ${BRAND.border}`,
                  background: BRAND.bgCard,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 8,
                  flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <Avatar lead={selectedLead} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 600,
                          color: BRAND.textPrimary, fontFamily: FONT_BODY,
                          letterSpacing: '0.01em',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {displayName(selectedLead)}
                        </p>
                        <button onClick={e => togglePin(selectedLead.id, selectedLead.pinned, e)}
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                          title={selectedLead.pinned ? 'Unpin' : 'Pin'}>
                          <StarIcon filled={!!selectedLead.pinned} size={14} />
                        </button>
                        <PlatformIcon platform={selectedLead.platform} />
                      </div>
                      {selectedLead.platform && (
                        <Eyebrow color={BRAND.textDim} style={{ fontSize: 8, letterSpacing: '0.25em', marginTop: 3 }}>
                          {selectedLead.platform}
                        </Eyebrow>
                      )}
                    </div>
                  </div>

                  <StageDropdown
                    activeStatus={activeStatus}
                    onChange={st => updateStatus(selectedLead.id, st)}
                  />
                </div>
              )}

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: isMobile ? 14 : 20,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {selectedMessages.length === 0 && (
                  <p style={{
                    fontSize: 11, textAlign: 'center', marginTop: 32,
                    color: BRAND.textDim, fontFamily: FONT_BODY,
                    letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
                  }}>No messages yet</p>
                )}
                {selectedMessages.map((msg, i) => {
                  const isOut    = msg.direction === 'outbound'
                  const prev     = selectedMessages[i - 1]
                  const showTime = !prev ||
                    (new Date(msg.created_at) - new Date(prev.created_at)) > 30 * 60 * 1000
                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <p style={{
                          fontSize: 9, textAlign: 'center', margin: '12px 0',
                          color: BRAND.textDim,
                          letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
                          fontFamily: FONT_BODY,
                        }}>
                          {new Date(msg.created_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit', hour12: true,
                          })}
                        </p>
                      )}
                      <div style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '10px 14px',
                          fontSize: 13,
                          background:   isOut ? BRAND.gold : BRAND.bgRaised,
                          color:        isOut ? '#000' : BRAND.textPrimary,
                          borderRadius: isOut ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                          lineHeight:   1.5,
                          fontFamily:   FONT_BODY,
                          border: isOut ? 'none' : `1px solid ${BRAND.border}`,
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div style={{
                padding: isMobile ? 10 : 16,
                borderTop: `1px solid ${BRAND.border}`,
                background: BRAND.bgCard,
                display: 'flex', gap: isMobile ? 8 : 12,
                flexShrink: 0,
                alignItems: 'flex-end',
              }}>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder={isMobile ? 'Type your reply…' : 'Type your reply… (⌘↵ to send)'}
                  style={{
                    flex: 1,
                    background: BRAND.bgInput,
                    color: BRAND.textPrimary,
                    border: `1px solid ${BRAND.border}`,
                    padding: isMobile ? '10px 12px' : '10px 14px',
                    fontSize: isMobile ? 16 : 13,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: FONT_BODY,
                    lineHeight: 1.4,
                  }}
                  rows={isMobile ? 1 : 2}
                  onFocus={e => { e.target.style.borderColor = BRAND.borderGoldStrong }}
                  onBlur={e => { e.target.style.borderColor = BRAND.border }}
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) sendReply() }}
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()}
                  style={{
                    padding: isMobile ? '0 16px' : '0 24px',
                    background: sending || !reply.trim() ? 'transparent' : BRAND.gold,
                    color:      sending || !reply.trim() ? BRAND.textDim : '#000',
                    border:     `1px solid ${sending || !reply.trim() ? BRAND.border : BRAND.gold}`,
                    fontSize:   10,
                    fontWeight: 700,
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    fontFamily: FONT_BODY,
                    cursor:     sending || !reply.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (sending || !reply.trim()) return
                    e.currentTarget.style.boxShadow = `0 0 24px ${BRAND.goldGlow}`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = 'none'
                  }}>
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <InboxFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filter={filter}
        setFilter={setFilter}
        pinnedCount={pinnedCount}
      />
    </PageBackground>
  )
}