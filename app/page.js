'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStartDate(timeframe) {
  const d = new Date()
  if (timeframe === 'daily')   { d.setHours(0, 0, 0, 0); return d }
  if (timeframe === 'weekly')  { d.setDate(d.getDate() - 7); return d }
  if (timeframe === 'monthly') { d.setDate(d.getDate() - 30); return d }
  return new Date(0)
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs  < 24) return `${hrs}hr ago`
  return `${days}d ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const DumbbellIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2"  y="10" width="3"  height="4" rx="1" fill="#B8935A"/>
    <rect x="19" y="10" width="3"  height="4" rx="1" fill="#B8935A"/>
    <rect x="5"  y="8"  width="2"  height="8" rx="1" fill="#B8935A"/>
    <rect x="17" y="8"  width="2"  height="8" rx="1" fill="#B8935A"/>
    <rect x="7"  y="11" width="10" height="2" rx="1" fill="#B8935A"/>
  </svg>
)

const TimeframePicker = ({ value, onChange }) => (
  <div className="flex gap-1">
    {['daily', 'weekly', 'monthly'].map(t => (
      <button key={t} onClick={() => onChange(t)}
        className="text-xs px-2 py-1 rounded"
        style={{
          background:  value === t ? '#B8935A' : '#1a1a1a',
          color:       value === t ? '#000' : '#555',
          border:      '1px solid',
          borderColor: value === t ? '#B8935A' : '#222',
        }}>
        {t}
      </button>
    ))}
  </div>
)

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-lg p-4" style={{ background: '#0d0d0d', border: '1px solid #222' }}>
      <p className="text-xs mb-2" style={{ color: '#555' }}>{label}</p>
      <p className="text-4xl font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const calledTags   = ['called once', 'called twice', 'called three times', 'call back', 'not interested', 'booked']
const answeredTags = ['call back', 'not interested', 'booked']

export default function Home() {
  const [leads,         setLeads]         = useState([])
  const [msgMap,        setMsgMap]        = useState({}) // { [lead_id]: Message[] }
  const [callLogs,      setCallLogs]      = useState({}) // { [ghl_contact_id]: log }
  const [ghlContacts,   setGhlContacts]   = useState([])
  const [dmTimeframe,   setDmTimeframe]   = useState('weekly')
  const [callTimeframe, setCallTimeframe] = useState('weekly')
  const [loading,       setLoading]       = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [leadsRes, messagesRes, logsRes, ghlRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('messages').select('*').order('created_at', { ascending: true }),
        supabase.from('call_logs').select('*'),
        fetch('/api/ghl-contacts'),
      ])

      const ghlData = await ghlRes.json()

      // Build message map { lead_id → messages[] sorted asc }
      const map = {}
      messagesRes.data?.forEach(m => {
        if (!map[m.lead_id]) map[m.lead_id] = []
        map[m.lead_id].push(m)
      })

      // Build call logs map { ghl_contact_id → log }
      const logsMap = {}
      logsRes.data?.forEach(log => { logsMap[log.ghl_contact_id] = log })

      setLeads(leadsRes.data || [])
      setMsgMap(map)
      setCallLogs(logsMap)
      setGhlContacts(ghlData.contacts || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // ── DM Pipeline stats (timeframe-scoped) ─────────────────────────────────────
  const dmStart  = getStartDate(dmTimeframe)
  const dmLeads  = leads.filter(l => new Date(l.created_at) >= dmStart)
  const dmStats  = {
    sent:       dmLeads.length,
    qualifying: dmLeads.filter(l => l.status === 'qualifying').length,
    linkSent:   dmLeads.filter(l => l.status === 'link sent').length,
    booked:     dmLeads.filter(l => l.status === 'booked').length,
  }

  // ── Call Pipeline stats — current tag state, not events ──────────────────────
  const callStart    = getStartDate(callTimeframe)
  const callContacts = ghlContacts.filter(c => new Date(c.dateAdded) >= callStart)
  const callStats    = {
    total:    callContacts.length,
    called:   callContacts.filter(c => calledTags.includes(callLogs[c.id]?.tag || 'uncalled')).length,
    answered: callContacts.filter(c => answeredTags.includes(callLogs[c.id]?.tag || 'uncalled')).length,
    booked:   callContacts.filter(c => (callLogs[c.id]?.tag || 'uncalled') === 'booked').length,
  }

  // ── Needs Your Reply ──────────────────────────────────────────────────────────
  // Any lead where the last message is inbound (we haven't replied yet)
  // Excludes ghosted, booked, disqualified
  const excludedStatuses = ['ghosted', 'booked', 'disqualified']
  const allWaiting = leads
    .filter(l => {
      if (excludedStatuses.includes(l.status)) return false
      const msgs = msgMap[l.id] || []
      if (msgs.length === 0) return false
      return msgs[msgs.length - 1].direction === 'inbound'
    })
    .map(l => {
      const msgs    = msgMap[l.id] || []
      const lastMsg = msgs[msgs.length - 1]
      return { ...l, lastMsg }
    })
    .sort((a, b) => new Date(b.lastMsg?.created_at) - new Date(a.lastMsg?.created_at))

  const waitingCount   = allWaiting.length
  const displayedLeads = allWaiting.slice(0, 6)
  const hiddenCount    = waitingCount - displayedLeads.length

  return (
    <div className="flex-1 flex flex-col min-h-screen" style={{ background: '#0a0a0a' }}>

      {/* Brand header */}
      <div className="flex flex-col items-center justify-center py-6 border-b" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex items-center gap-3 mb-1">
          <DumbbellIcon size={32} />
          <h1 className="font-bold tracking-widest text-xl" style={{ color: '#B8935A' }}>LARGE DUMBBELLS</h1>
          <DumbbellIcon size={32} />
        </div>
        <p className="text-xs tracking-widest" style={{ color: '#444' }}>PIPELINE DASHBOARD</p>
      </div>

      <div className="flex-1 flex flex-col p-6 gap-5">
        {loading ? (
          <p className="text-sm" style={{ color: '#555' }}>Loading dashboard...</p>
        ) : (
          <>
            {/* DM Pipeline */}
            <div className="rounded-xl p-6" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-bold tracking-widest" style={{ color: '#B8935A' }}>DM PIPELINE</p>
                <TimeframePicker value={dmTimeframe} onChange={setDmTimeframe} />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Messages Sent" value={dmStats.sent}       color="#B8935A" />
                <StatCard label="Qualifying"    value={dmStats.qualifying} color="#F0A500" />
                <StatCard label="Link Sent"     value={dmStats.linkSent}   color="#9B59B6" />
                <StatCard label="Booked"        value={dmStats.booked}     color="#2ECC71" />
              </div>
              <Link href="/analytics" className="mt-3 text-xs inline-block" style={{ color: '#333' }}>
                View full analytics →
              </Link>
            </div>

            {/* Call Pipeline */}
            <div className="rounded-xl p-6" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-bold tracking-widest" style={{ color: '#B8935A' }}>CALL PIPELINE</p>
                <TimeframePicker value={callTimeframe} onChange={setCallTimeframe} />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Leads" value={callStats.total}    color="#B8935A" />
                <StatCard label="Called"      value={callStats.called}   color="#378ADD" />
                <StatCard label="Answered"    value={callStats.answered} color="#9B59B6" />
                <StatCard label="Booked"      value={callStats.booked}   color="#2ECC71" />
              </div>
              <Link href="/calls" className="mt-3 text-xs inline-block" style={{ color: '#333' }}>
                View call list →
              </Link>
            </div>

            {/* Needs Your Reply */}
            <div className="rounded-xl p-6" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-bold tracking-widest" style={{ color: '#B8935A' }}>NEEDS YOUR REPLY</p>
                  {waitingCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: '#B8935A22', color: '#B8935A', border: '1px solid #B8935A44' }}>
                      {waitingCount} waiting
                    </span>
                  )}
                </div>
                <Link href="/inbox"
                  className="text-xs px-3 py-1.5 rounded"
                  style={{ background: '#1a1a1a', color: '#B8935A', border: '1px solid #B8935A44' }}>
                  Open inbox →
                </Link>
              </div>

              {waitingCount === 0 ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#2ECC71' }} />
                  <p className="text-sm" style={{ color: '#555' }}>You're all caught up — no leads waiting on a reply.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {displayedLeads.map(lead => (
                      <Link href="/inbox" key={lead.id}
                        className="flex items-center gap-4 p-3 rounded-lg transition-all"
                        style={{ background: '#0d0d0d', border: '1px solid #222' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#B8935A33'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: '#B8935A22', color: '#B8935A', border: '1px solid #B8935A44' }}>
                          {(lead.name || lead.ig_handle || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
                              {lead.name || lead.ig_handle}
                            </p>
                            <p className="text-xs flex-shrink-0 ml-2" style={{ color: '#444' }}>
                              {timeAgo(lead.lastMsg?.created_at)}
                            </p>
                          </div>
                          <p className="text-xs truncate" style={{ color: '#666' }}>
                            {lead.lastMsg?.content || lead.roadblock || '—'}
                          </p>
                        </div>
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: '#B8935A', boxShadow: '0 0 6px #B8935A88' }} />
                      </Link>
                    ))}
                  </div>

                  {/* Overflow count */}
                  {hiddenCount > 0 && (
                    <Link href="/inbox"
                      className="mt-3 flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-all"
                      style={{ color: '#B8935A', border: '1px solid #B8935A33', background: '#B8935A11' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#B8935A1a'}
                      onMouseLeave={e => e.currentTarget.style.background = '#B8935A11'}>
                      +{hiddenCount} more waiting in inbox →
                    </Link>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}