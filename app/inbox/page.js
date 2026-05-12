'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// ─── Status config ────────────────────────────────────────────────────────────

const MANUAL_STATUSES = ['link sent', 'booked', 'disqualified']
const AUTO_STATUSES   = ['new', 'qualifying', 'ghosted']
const ALL_STATUSES    = [...AUTO_STATUSES, ...MANUAL_STATUSES]

const STATUS_STYLES = {
  new:          { bg: '#378ADD22', color: '#378ADD' },
  qualifying:   { bg: '#F0A50022', color: '#F0A500' },
  ghosted:      { bg: '#66666622', color: '#666'    },
  'link sent':  { bg: '#9B59B622', color: '#9B59B6' },
  booked:       { bg: '#2ECC7122', color: '#2ECC71' },
  disqualified: { bg: '#E74C3C22', color: '#E74C3C' },
}

const UNPIN_STATUSES = ['booked', 'disqualified']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveStatus(lead, messages) {
  if (MANUAL_STATUSES.includes(lead.status)) return lead.status
  if (!messages || messages.length === 0) return lead.status

  const last        = messages[messages.length - 1]
  const isInbound   = last.direction === 'inbound'
  const hoursSince  = (Date.now() - new Date(last.created_at).getTime()) / 36e5

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
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs  < 24) return `${hrs}h ago`
  return `${days}d ago`
}

function currentRangeStart(timeframe) {
  const now = new Date()
  const start = new Date(now)
  if (timeframe === 'daily')   start.setHours(0,0,0,0)
  if (timeframe === 'weekly')  start.setDate(now.getDate() - 7)
  if (timeframe === 'monthly') start.setDate(now.getDate() - 30)
  return start
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#33333322', color: '#888' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

function PlatformIcon({ platform }) {
  if (platform === 'instagram') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="#888" strokeWidth="2"/>
        <circle cx="12" cy="12" r="4" stroke="#888" strokeWidth="2"/>
        <circle cx="17.5" cy="6.5" r="1" fill="#888"/>
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#888" style={{ flexShrink: 0 }}>
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
    </svg>
  )
}

function StarIcon({ filled, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? '#B8935A' : 'none'}
      stroke={filled ? '#B8935A' : '#666'}
      strokeWidth="2" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

const DumbbellIcon = ({ size = 28, opacity = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
    <rect x="2"  y="10" width="3"  height="4" rx="1" fill="#B8935A"/>
    <rect x="19" y="10" width="3"  height="4" rx="1" fill="#B8935A"/>
    <rect x="5"  y="8"  width="2"  height="8" rx="1" fill="#B8935A"/>
    <rect x="17" y="8"  width="2"  height="8" rx="1" fill="#B8935A"/>
    <rect x="7"  y="11" width="10" height="2" rx="1" fill="#B8935A"/>
  </svg>
)

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DMInbox() {
  const [leads,        setLeads]        = useState([])
  const [leadMessages, setLeadMessages] = useState({})
  const [selectedLead, setSelectedLead] = useState(null)
  const [reply,        setReply]        = useState('')
  const [filter,       setFilter]       = useState('all')
  const [search,       setSearch]       = useState('')
  const [sending,      setSending]      = useState(false)
  const [timeframe,    setTimeframe]    = useState('daily')
  const messagesEndRef = useRef(null)

  useEffect(() => { fetchLeads() }, [])


  // ─── Restore state on mount ────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('inboxState')
      if (!saved) return
      const state = JSON.parse(saved)
      if (state.search !== undefined) setSearch(state.search)
      if (state.filter)               setFilter(state.filter)
      if (state.timeframe)            setTimeframe(state.timeframe)
      if (state.selectedLeadId)       {
        // Will be applied once leads load
        window.__pendingSelectedLeadId = state.selectedLeadId
      }
    } catch (err) {
      console.error('Inbox state restore error:', err)
    }
  }, [])

  // ─── Apply pending selected lead once leads load ────────────
  useEffect(() => {
    if (leads.length > 0 && window.__pendingSelectedLeadId) {
      const lead = leads.find(l => l.id === window.__pendingSelectedLeadId)
      if (lead) setSelectedLead(lead)
      window.__pendingSelectedLeadId = null
    }
  }, [leads])

  // ─── Save state on every change ────────────
  useEffect(() => {
    try {
      localStorage.setItem('inboxState', JSON.stringify({
        search, filter, timeframe,
        selectedLeadId: selectedLead?.id || null,
      }))
    } catch (err) {
      console.error('Inbox state save error:', err)
    }
  }, [search, filter, timeframe, selectedLead])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [leadMessages, selectedLead])

  // Real-time subscription
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

  // ── Derived data ─────────────────────────────────────────────────────────────
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

  // Stat snapshot — uses leads created in the timeframe
  const rangeStart = currentRangeStart(timeframe)
  const inRange = leadsWithStatus.filter(l => new Date(l.created_at) >= rangeStart)
  const statMessages   = inRange.length
  const statQualifying = inRange.filter(l => l.status === 'qualifying' || l.status === 'new').length
  const statLinkSent   = inRange.filter(l => l.status === 'link sent').length
  const statBooked     = inRange.filter(l => l.status === 'booked').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#0a0a0a', fontFamily: 'sans-serif' }}>

      {/* Top header bar */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid #1a1a1a',
        background: '#111',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <Link href="/"
          style={{
            background: '#1a1a1a', color: '#B8935A',
            border: '1px solid #B8935A44', padding: '6px 12px',
            borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none',
          }}>← Home</Link>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DumbbellIcon size={24} />
            <h1 style={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: 16, color: '#B8935A' }}>
              LARGE DUMBBELLS
            </h1>
          </div>
          <p style={{ fontSize: 11, color: '#fff', fontWeight: 500, letterSpacing: '0.08em' }}>
            DM PIPELINE
          </p>
        </div>

        <Link href="/analytics"
          style={{
            background: '#1a1a1a', color: '#378ADD',
            border: '1px solid #378ADD44', padding: '6px 14px',
            borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          📊 Analytics →
        </Link>
      </div>

      {/* Stat snapshot row */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #1a1a1a',
        background: '#0d0d0d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          {[
            { label: 'Messages',   value: statMessages,   color: '#B8935A' },
            { label: 'Qualifying', value: statQualifying, color: '#378ADD' },
            { label: 'Link Sent',  value: statLinkSent,   color: '#9B59B6' },
            { label: 'Booked',     value: statBooked,     color: '#2ECC71' },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{
                fontSize: 9, color: '#666', marginTop: 4,
                textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
              }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div style={{
          display: 'flex', gap: 4,
          position: 'absolute', right: 24, top: '50%',
          transform: 'translateY(-50%)',
        }}>
          {[
            { key: 'daily',   label: 'Daily' },
            { key: 'weekly',  label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
          ].map(t => (
            <button key={t.key} onClick={() => setTimeframe(t.key)}
              style={{
                background: timeframe === t.key ? '#B8935A' : 'transparent',
                color: timeframe === t.key ? '#000' : '#666',
                border: `1px solid ${timeframe === t.key ? '#B8935A' : '#333'}`,
                padding: '4px 12px', borderRadius: 6,
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Inbox content */}
      <div className="flex font-sans" style={{ background: '#0a0a0a', height: 'calc(100vh - 200px)', minHeight: 500 }}>

        {/* ── Sidebar ── */}
        <div className="w-72 flex flex-col border-r flex-shrink-0" style={{ background: '#111', borderColor: '#222' }}>

          <div className="p-3 border-b" style={{ borderColor: '#222' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or handle…"
              className="w-full text-xs px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333' }}
            />
          </div>

          <div className="p-3 border-b" style={{ borderColor: '#222' }}>
            <div className="flex flex-wrap gap-1">
              {['all', 'pinned', ...ALL_STATUSES].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                  style={{
                    background:  filter === f ? '#B8935A' : '#1a1a1a',
                    color:       filter === f ? '#000' : '#888',
                    border:      '1px solid',
                    borderColor: filter === f ? '#B8935A' : '#333',
                  }}>
                  {f === 'pinned' && <StarIcon filled={filter === f} size={10} />}
                  {f}
                  {f === 'pinned' && pinnedCount > 0 && (
                    <span style={{ fontSize: '10px', opacity: filter === f ? 0.7 : 1 }}>
                      ({pinnedCount})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {needsReplyCount > 0 && (
            <div className="px-3 py-2 border-b flex items-center gap-2"
              style={{ borderColor: '#222', background: '#B8935A11' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: '#B8935A', boxShadow: '0 0 6px #B8935A' }} />
              <span className="text-xs" style={{ color: '#B8935A' }}>
                {needsReplyCount} waiting on your reply
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {sorted.length === 0 && (
              <p className="text-xs p-4" style={{ color: '#555' }}>No leads found</p>
            )}
            {sorted.map(lead => {
              const msgs       = leadMessages[lead.id] || []
              const lastMsg    = msgs.at(-1)
              const unread     = isUnread(lead, msgs)
              const isSelected = selectedLead?.id === lead.id
              return (
                <div key={lead.id} onClick={() => selectLead(lead)}
                  className="p-3 cursor-pointer border-b transition-all"
                  style={{
                    borderColor: '#1a1a1a',
                    background:  isSelected ? '#1a1a1a' : 'transparent',
                    borderLeft:  isSelected ? '2px solid #B8935A' : '2px solid transparent',
                  }}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <button
                          onClick={e => togglePin(lead.id, lead.pinned, e)}
                          className="flex-shrink-0 flex items-center justify-center"
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                          title={lead.pinned ? 'Unpin' : 'Pin'}>
                          <StarIcon filled={!!lead.pinned} size={13} />
                        </button>
                        <PlatformIcon platform={lead.platform} />
                        <span className="font-medium text-sm truncate flex-1"
                          style={{ color: unread ? '#e0e0e0' : '#888' }}>
                          {lead.name || lead.ig_handle || '—'}
                        </span>
                        <span className="text-xs flex-shrink-0" style={{ color: '#444' }}>
                          {timeAgo(lastMsg?.created_at || lead.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        {lastMsg ? (
                          <p className="text-xs truncate flex-1" style={{ color: '#555' }}>
                            {lastMsg.direction === 'outbound' ? 'You: ' : ''}{lastMsg.content}
                          </p>
                        ) : (
                          <p className="text-xs flex-1" style={{ color: '#444' }}>No messages yet</p>
                        )}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <StatusBadge status={lead.status} />
                          {unread && (
                            <div className="w-2 h-2 rounded-full"
                              style={{ background: '#B8935A', boxShadow: '0 0 6px #B8935A' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Main message panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedLead ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <DumbbellIcon size={48} opacity={0.1} />
              <p className="text-sm" style={{ color: '#444' }}>Select a lead to view the conversation</p>
            </div>
          ) : (
            <>
              {/* Contact bar */}
              <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0"
                style={{ background: '#0f0f0f', borderColor: '#1a1a1a' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: '#B8935A22', color: '#B8935A', border: '1px solid #B8935A44' }}>
                    {(selectedLead.name || selectedLead.ig_handle || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => togglePin(selectedLead.id, selectedLead.pinned, e)}
                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                        title={selectedLead.pinned ? 'Unpin' : 'Pin'}>
                        <StarIcon filled={!!selectedLead.pinned} size={14} />
                      </button>
                      <PlatformIcon platform={selectedLead.platform} />
                      <p className="font-semibold text-sm" style={{ color: '#e0e0e0' }}>
                        {selectedLead.name || selectedLead.ig_handle}
                      </p>
                    </div>
                    <p className="text-xs" style={{ color: '#555' }}>
                      {selectedLead.ig_handle && `@${selectedLead.ig_handle}`}
                      {selectedLead.platform && ` · ${selectedLead.platform}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={activeStatus} />
                  <select
                    value={activeStatus}
                    onChange={e => updateStatus(selectedLead.id, e.target.value)}
                    className="text-xs px-3 py-1.5 rounded"
                    style={{ background: '#1a1a1a', color: '#B8935A', border: '1px solid #B8935A44' }}>
                    <optgroup label="Auto">
                      {AUTO_STATUSES.map(s => (
                        <option key={s} value={s} disabled style={{ color: '#555' }}>{s}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Manual">
                      {MANUAL_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Roadblock */}
              {selectedLead.roadblock && (
                <div className="mx-4 mt-3 p-3 rounded-lg flex-shrink-0"
                  style={{ background: '#B8935A11', border: '1px solid #B8935A33' }}>
                  <p className="text-xs font-bold mb-1 tracking-wider" style={{ color: '#B8935A' }}>BIGGEST STRUGGLE</p>
                  <p className="text-sm" style={{ color: '#ccc' }}>{selectedLead.roadblock}</p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {selectedMessages.length === 0 && (
                  <p className="text-xs text-center mt-8" style={{ color: '#444' }}>No messages yet</p>
                )}
                {selectedMessages.map((msg, i) => {
                  const isOut    = msg.direction === 'outbound'
                  const prev     = selectedMessages[i - 1]
                  const showTime = !prev ||
                    (new Date(msg.created_at) - new Date(prev.created_at)) > 30 * 60 * 1000
                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <p className="text-xs text-center my-2" style={{ color: '#333' }}>
                          {new Date(msg.created_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit', hour12: true,
                          })}
                        </p>
                      )}
                      <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-sm px-4 py-2.5 text-sm"
                          style={{
                            background:   isOut ? '#B8935A' : '#1a1a1a',
                            color:        isOut ? '#000' : '#ccc',
                            borderRadius: isOut ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                            lineHeight:   1.5,
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
              <div className="p-4 border-t flex gap-3 flex-shrink-0"
                style={{ background: '#111', borderColor: '#222' }}>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Type your reply… (⌘↵ to send)"
                  className="flex-1 text-sm resize-none rounded-lg px-3 py-2 focus:outline-none"
                  style={{ background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333' }}
                  rows={2}
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) sendReply() }}
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()}
                  className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: sending || !reply.trim() ? '#2a2a2a' : '#B8935A',
                    color:      sending || !reply.trim() ? '#444'    : '#000',
                    cursor:     sending || !reply.trim() ? 'not-allowed' : 'pointer',
                  }}>
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}