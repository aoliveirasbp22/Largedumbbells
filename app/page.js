'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const DumbbellIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2"  y="10" width="3"  height="4" rx="1" fill="#B8935A"/>
    <rect x="19" y="10" width="3"  height="4" rx="1" fill="#B8935A"/>
    <rect x="5"  y="8"  width="2"  height="8" rx="1" fill="#B8935A"/>
    <rect x="17" y="8"  width="2"  height="8" rx="1" fill="#B8935A"/>
    <rect x="7"  y="11" width="10" height="2" rx="1" fill="#B8935A"/>
  </svg>
)

const ChatIcon = ({ size = 22, color = '#B8935A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const PhoneIcon = ({ size = 22, color = '#B8935A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l1.17-1.17a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const FIELD_IDS = {
  struggle: 'WtsEP55kDKmuYvjR3cRM',
  bothered: 'b9izCUDE2DcOqViZ6Da4',
  age:      'gvlEzRdj7FhoOw6Yk0p6',
  invest:   'xLhl7frOJAopwN0r94gX',
}

// ─── Timezone helpers (slim version - just for checking green window) ───
const COUNTRY_TIMEZONES = {
  '1876':'America/Jamaica','1868':'America/Port_of_Spain','1246':'America/Barbados',
  '213':'Africa/Algiers','216':'Africa/Tunis','218':'Africa/Tripoli',
  '20':'Africa/Cairo','27':'Africa/Johannesburg','30':'Europe/Athens',
  '31':'Europe/Amsterdam','32':'Europe/Brussels','33':'Europe/Paris',
  '34':'Europe/Madrid','36':'Europe/Budapest','39':'Europe/Rome',
  '40':'Europe/Bucharest','41':'Europe/Zurich','43':'Europe/Vienna',
  '44':'Europe/London','45':'Europe/Copenhagen','46':'Europe/Stockholm',
  '47':'Europe/Oslo','48':'Europe/Warsaw','49':'Europe/Berlin',
  '52':'America/Mexico_City','55':'America/Sao_Paulo','61':'Australia/Sydney',
  '64':'Pacific/Auckland','7':'Europe/Moscow','81':'Asia/Tokyo',
  '86':'Asia/Shanghai','91':'Asia/Kolkata',
}

function isInGreenWindow(phone) {
  if (!phone) return false
  const digits = phone.replace(/\D/g, '')
  if (!digits) return false

  let tz = COUNTRY_TIMEZONES[digits.slice(0, 4)]
    || COUNTRY_TIMEZONES[digits.slice(0, 3)]
    || COUNTRY_TIMEZONES[digits.slice(0, 2)]
  if (!tz && digits.startsWith('1')) tz = 'America/New_York'
  if (!tz) return false

  try {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', minute: '2-digit',
      hour12: true, weekday: 'short',
    }).formatToParts(now)
    const get = type => parts.find(p => p.type === type)?.value || ''
    const weekday = get('weekday')
    const isWeekend = weekday === 'Sat' || weekday === 'Sun'
    const h12 = parseInt(get('hour'))
    const m   = parseInt(get('minute'))
    const ap  = get('dayPeriod')
    let h24 = h12
    if (ap === 'PM' && h12 !== 12) h24 = h12 + 12
    if (ap === 'AM' && h12 === 12) h24 = 0
    const total = h24 * 60 + m
    const start = isWeekend ? 11 * 60 : 18 * 60
    const end   = 20 * 60
    return total >= start && total <= end
  } catch { return false }
}

function getField(customFields, id) {
  return customFields?.find(f => f.id === id)?.value || null
}

// ─── Mini line chart with x-axis labels ───────────────────────────────
function MiniChart({ series, labels, height = 60 }) {
  if (!series.length || !series[0].data.length) {
    return (
      <div style={{ height: height + 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 10, color: '#333' }}>No trend data yet</p>
      </div>
    )
  }
  const allValues = series.flatMap(s => s.data)
  const max = Math.max(...allValues, 1)
  const min = 0
  const range = max - min || 1
  const W = 100
  const H = height

  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ overflow: 'visible' }}>
        {series.map((s, idx) => {
          if (s.data.length === 0) return null
          const points = s.data.map((v, i) => {
            const x = (i / (s.data.length - 1 || 1)) * W
            const y = H - ((v - min) / range) * (H - 4) - 2
            return `${x},${y}`
          }).join(' ')
          return (
            <polyline key={idx}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>
      {/* X-axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {labels.map((l, i) => (
          <span key={i} style={{ fontSize: 9, color: '#555', fontWeight: 500 }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Pipeline card ───────────────────────────────────────────────────
function PipelineCard({ title, icon: Icon, href, stats, series, labels, timeframe, setTimeframe, rangeLabel, listTitle, listItems, renderListItem, emptyText }) {
  return (
    <div style={{
      background: '#111',
      border: '1px solid #1a1a1a',
      borderRadius: 16,
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      transition: 'border-color 0.2s',
      height: '100%',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: '#B8935A18',
            border: '1px solid #B8935A33',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={22} />
          </div>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: '#fff' }}>{title}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>
            {rangeLabel}
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[
              { key: 'daily',   label: 'D' },
              { key: 'weekly',  label: 'W' },
              { key: 'monthly', label: 'M' },
            ].map(t => (
              <button key={t.key}
                onClick={() => setTimeframe(t.key)}
                style={{
                  background: timeframe === t.key ? '#B8935A' : 'transparent',
                  color: timeframe === t.key ? '#000' : '#666',
                  border: `1px solid ${timeframe === t.key ? '#B8935A' : '#333'}`,
                  width: 28, height: 24, borderRadius: 6,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        gap: 12,
      }}>
        {stats.map(s => (
          <div key={s.label}>
            <p style={{ fontSize: 30, fontWeight: 700, color: s.color, lineHeight: 1 }}>
              {s.value}
            </p>
            <p style={{
              fontSize: 9, color: '#666',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              fontWeight: 600, marginTop: 8,
            }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Mini chart */}
      <div>
        <p style={{
          fontSize: 9, color: '#444', marginBottom: 6,
          textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
        }}>Trend</p>
        <MiniChart series={series} labels={labels} />
      </div>

      {/* List section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <p style={{
          fontSize: 9, color: '#444', marginBottom: 10,
          textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
        }}>{listTitle}</p>
        {listItems.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px dashed #222', borderRadius: 8, padding: 16,
          }}>
            <p style={{ fontSize: 11, color: '#444', fontStyle: 'italic' }}>{emptyText}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {listItems.slice(0, 3).map((item, i) => renderListItem(item, i))}
          </div>
        )}
      </div>

      {/* Open button */}
      <Link href={href}
        style={{
          background: '#B8935A',
          color: '#000',
          padding: '10px 18px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
          textDecoration: 'none',
          transition: 'all 0.15s',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#a8824a' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#B8935A' }}>
        Open Pipeline →
      </Link>
    </div>
  )
}

// ─── Date helpers ────────────────────────────────────────────────────
function getBuckets(timeframe) {
  const buckets = []
  const now = new Date()
  if (timeframe === 'daily') {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now); start.setDate(now.getDate() - i); start.setHours(0,0,0,0)
      const end = new Date(start); end.setDate(start.getDate() + 1)
      buckets.push({ start, end })
    }
  } else if (timeframe === 'weekly') {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now); start.setDate(now.getDate() - (i + 1) * 7); start.setHours(0,0,0,0)
      const end = new Date(start); end.setDate(start.getDate() + 7)
      buckets.push({ start, end })
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now); start.setDate(now.getDate() - (i + 1) * 30); start.setHours(0,0,0,0)
      const end = new Date(start); end.setDate(start.getDate() + 30)
      buckets.push({ start, end })
    }
  }
  return buckets
}

function getBucketLabels(timeframe, buckets) {
  if (timeframe === 'daily') {
    return buckets.map(b => b.start.toLocaleDateString('en-US', { weekday: 'short' }))
  }
  if (timeframe === 'weekly') {
    return buckets.map(b => b.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  }
  return buckets.map(b => b.start.toLocaleDateString('en-US', { month: 'short' }))
}

function getRangeLabel(timeframe) {
  const now = new Date()
  const opts = { month: 'short', day: 'numeric' }
  if (timeframe === 'daily') {
    const start = new Date(now); start.setDate(now.getDate() - 6)
    return `${start.toLocaleDateString('en-US', opts)} – ${now.toLocaleDateString('en-US', opts)}`
  }
  if (timeframe === 'weekly') {
    const start = new Date(now); start.setDate(now.getDate() - 42)
    return `${start.toLocaleDateString('en-US', opts)} – ${now.toLocaleDateString('en-US', opts)}`
  }
  const start = new Date(now); start.setDate(now.getDate() - 180)
  return `${start.toLocaleDateString('en-US', opts)} – ${now.toLocaleDateString('en-US', opts)}`
}

function currentRangeStart(timeframe) {
  const now = new Date()
  const start = new Date(now)
  if (timeframe === 'daily')   start.setHours(0,0,0,0)
  if (timeframe === 'weekly')  start.setDate(now.getDate() - 7)
  if (timeframe === 'monthly') start.setDate(now.getDate() - 30)
  return start
}

function timeAgoShort(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 60) return `${mins}m`
  if (hrs < 24)  return `${hrs}h`
  return `${days}d`
}

// ─── Main ────────────────────────────────────────────────────────────
export default function Home() {
  const [dmTimeframe, setDmTimeframe] = useState('daily')
  const [outreachTimeframe, setOutreachTimeframe] = useState('daily')

  const [leads, setLeads] = useState([])
  const [messages, setMessages] = useState([])
  const [contacts, setContacts] = useState([])
  const [callLogs, setCallLogs] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const { data: leadsData } = await supabase.from('leads').select('*')
      setLeads(leadsData || [])

      const { data: msgsData } = await supabase.from('messages')
        .select('*').order('created_at', { ascending: false })
      setMessages(msgsData || [])

      const res = await fetch('/api/ghl-contacts')
      const data = await res.json()
      setContacts(data.contacts || [])

      const { data: logs } = await supabase.from('call_logs').select('*')
      const logsMap = {}
      logs?.forEach(log => { logsMap[log.ghl_contact_id] = log })
      setCallLogs(logsMap)
    } catch (err) { console.error('Fetch error:', err) }
    setLoading(false)
  }

  // ─── DM stats ─────────────────────────────────────────────────────
  const dmStart = currentRangeStart(dmTimeframe)
  const dmLeadsInRange = leads.filter(l => new Date(l.created_at) >= dmStart)

  const dmMessages   = dmLeadsInRange.length
  const dmQualifying = dmLeadsInRange.filter(l => l.status === 'qualifying' || l.status === 'new').length
  const dmLinkSent   = dmLeadsInRange.filter(l => l.status === 'link sent').length
  const dmBooked     = dmLeadsInRange.filter(l => l.status === 'booked').length

  const dmStats = [
    { label: 'Messages',   value: dmMessages,   color: '#B8935A' },
    { label: 'Qualifying', value: dmQualifying, color: '#378ADD' },
    { label: 'Link Sent',  value: dmLinkSent,   color: '#9B59B6' },
    { label: 'Booked',     value: dmBooked,     color: '#2ECC71' },
  ]

  const dmBuckets = getBuckets(dmTimeframe)
  const dmLabels  = getBucketLabels(dmTimeframe, dmBuckets)
  const dmSeries = [
    {
      color: '#B8935A',
      data: dmBuckets.map(b => leads.filter(l => {
        const t = new Date(l.created_at)
        return t >= b.start && t < b.end
      }).length),
    },
    {
      color: '#378ADD',
      data: dmBuckets.map(b => leads.filter(l => {
        const t = new Date(l.created_at)
        return t >= b.start && t < b.end && (l.status === 'qualifying' || l.status === 'new')
      }).length),
    },
    {
      color: '#9B59B6',
      data: dmBuckets.map(b => leads.filter(l => {
        const t = new Date(l.created_at)
        return t >= b.start && t < b.end && l.status === 'link sent'
      }).length),
    },
    {
      color: '#2ECC71',
      data: dmBuckets.map(b => leads.filter(l => {
        const t = new Date(l.created_at)
        return t >= b.start && t < b.end && l.status === 'booked'
      }).length),
    },
  ]

  // ─── Top DMs awaiting reply ───────────────────────────────────────
  // For each lead, find last message — if inbound, they're waiting on us
  const dmsByLead = {}
  messages.forEach(m => {
    if (!dmsByLead[m.lead_id] || new Date(m.created_at) > new Date(dmsByLead[m.lead_id].created_at)) {
      dmsByLead[m.lead_id] = m
    }
  })
  const awaitingReply = leads
    .filter(l => {
      const lastMsg = dmsByLead[l.id]
      if (!lastMsg) return false
      if (lastMsg.direction !== 'inbound') return false
      if (l.status === 'booked' || l.status === 'disqualified') return false
      return true
    })
    .map(l => ({ lead: l, lastMsg: dmsByLead[l.id] }))
    .sort((a, b) => new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at))

  function renderDmItem({ lead, lastMsg }, i) {
    const avatar = lead.profile_pic_url
    const initial = (lead.name || lead.ig_handle || '?')[0].toUpperCase()
    return (
      <div key={lead.id} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        background: '#0d0d0d', border: '1px solid #1a1a1a',
        borderRadius: 8,
      }}>
        {avatar ? (
          <img src={avatar} alt="" style={{
            width: 32, height: 32, borderRadius: 999, objectFit: 'cover', flexShrink: 0,
          }} onError={e => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
            background: '#B8935A22', color: '#B8935A',
            border: '1px solid #B8935A44',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>{initial}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: '#e0e0e0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            @{lead.ig_handle || lead.name || 'unknown'}
          </p>
          <p style={{ fontSize: 11, color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lastMsg.body || lastMsg.message || '(media)'}
          </p>
        </div>
        <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>
          {timeAgoShort(lastMsg.created_at)}
        </span>
      </div>
    )
  }

  // ─── Outreach stats ───────────────────────────────────────────────
  const outreachStart = currentRangeStart(outreachTimeframe)
  const outreachInRange = contacts.filter(c => new Date(c.dateAdded) >= outreachStart)

  const calledTags = ['called once','called twice','called three times','call back','not interested','booked']
  const totalLeads = outreachInRange.length
  const calledCount = outreachInRange.filter(c => calledTags.includes(callLogs[c.id]?.tag || 'uncalled')).length
  const bookedCount = outreachInRange.filter(c => (callLogs[c.id]?.tag || 'uncalled') === 'booked').length

  const outreachStats = [
    { label: 'Total Leads', value: totalLeads,  color: '#B8935A' },
    { label: 'Called',      value: calledCount, color: '#378ADD' },
    { label: 'Booked',      value: bookedCount, color: '#2ECC71' },
  ]

  const outreachBuckets = getBuckets(outreachTimeframe)
  const outreachLabels  = getBucketLabels(outreachTimeframe, outreachBuckets)
  const outreachSeries = [
    {
      color: '#B8935A',
      data: outreachBuckets.map(b => contacts.filter(c => {
        const t = new Date(c.dateAdded)
        return t >= b.start && t < b.end
      }).length),
    },
    {
      color: '#378ADD',
      data: outreachBuckets.map(b => contacts.filter(c => {
        const t = new Date(c.dateAdded)
        return t >= b.start && t < b.end && calledTags.includes(callLogs[c.id]?.tag || 'uncalled')
      }).length),
    },
    {
      color: '#2ECC71',
      data: outreachBuckets.map(b => contacts.filter(c => {
        const t = new Date(c.dateAdded)
        return t >= b.start && t < b.end && (callLogs[c.id]?.tag || 'uncalled') === 'booked'
      }).length),
    },
  ]

  // ─── Top leads for outreach (strongest leads) ─────────────────────
  // Filter: invest=Yes, bothered 4 or 5, age 22-45, currently in green window
  // Sort: bothered desc, then age asc (younger first)
  const strongestLeads = contacts
    .filter(c => {
      const tag = callLogs[c.id]?.tag || 'uncalled'
      // Skip already booked or not interested
      if (['booked', 'not interested', 'called three times'].includes(tag)) return false

      const invest = getField(c.customFields, FIELD_IDS.invest)
      if (!invest || !invest.toLowerCase().includes('yes')) return false

      const botheredRaw = getField(c.customFields, FIELD_IDS.bothered)
      const bothered = parseInt(botheredRaw)
      if (isNaN(bothered) || bothered < 4) return false

      const ageRaw = getField(c.customFields, FIELD_IDS.age)
      const age = parseInt(ageRaw)
      if (isNaN(age) || age < 22 || age > 45) return false

      if (!isInGreenWindow(c.phone)) return false

      return true
    })
    .map(c => ({
      contact: c,
      bothered: parseInt(getField(c.customFields, FIELD_IDS.bothered)),
      age:      parseInt(getField(c.customFields, FIELD_IDS.age)),
      tag:      callLogs[c.id]?.tag || 'uncalled',
    }))
    .sort((a, b) => {
      if (b.bothered !== a.bothered) return b.bothered - a.bothered
      return a.age - b.age
    })

  function renderLeadItem({ contact, bothered, age, tag }, i) {
    const tagColors = {
      uncalled: '#888',
      'called once': '#378ADD',
      'called twice': '#F0A500',
      'call back': '#9B59B6',
    }
    const tagColor = tagColors[tag] || '#888'
    const initial = (contact.contactName || '?')[0].toUpperCase()
    return (
      <div key={contact.id} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        background: '#0d0d0d', border: '1px solid #1a1a1a',
        borderRadius: 8,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 999, flexShrink: 0,
          background: '#B8935A22', color: '#B8935A',
          border: '1px solid #B8935A44',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: '#e0e0e0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {contact.contactName || 'Unknown'}
          </p>
          <p style={{ fontSize: 10, color: '#777' }}>
            {age}y · Bothered {bothered}/5 · 🟢 Good to call
          </p>
        </div>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 999,
          background: `${tagColor}22`, color: tagColor,
          border: `1px solid ${tagColor}44`, flexShrink: 0,
        }}>{tag}</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', background: '#0a0a0a', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Top banner */}
      <div style={{
        padding: '32px 24px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <DumbbellIcon size={48} />
        <h1 style={{
          fontWeight: 800,
          letterSpacing: '0.18em',
          fontSize: 28,
          color: '#fff',
          textAlign: 'center',
        }}>
          LARGE DUMBBELLS
        </h1>
      </div>

      {/* Sales Pipeline header — doubled in size */}
      <div style={{ textAlign: 'center', padding: '8px 24px 20px' }}>
        <p style={{
          fontSize: 22, fontWeight: 700, letterSpacing: '0.2em',
          color: '#B8935A', textTransform: 'uppercase',
        }}>Sales Pipeline</p>
      </div>

      <div style={{
        flex: 1, padding: '0 24px 24px',
        maxWidth: 1600, width: '100%', margin: '0 auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#555', fontSize: 14 }}>Loading…</p>
        ) : (
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: 24,
          }}>
            <PipelineCard
              title="DM Pipeline"
              icon={ChatIcon}
              href="/inbox"
              stats={dmStats}
              series={dmSeries}
              labels={dmLabels}
              timeframe={dmTimeframe}
              setTimeframe={setDmTimeframe}
              rangeLabel={getRangeLabel(dmTimeframe)}
              listTitle="DMs awaiting your reply"
              listItems={awaitingReply}
              renderListItem={renderDmItem}
              emptyText="No DMs awaiting reply"
            />
            <PipelineCard
              title="Outreach Pipeline"
              icon={PhoneIcon}
              href="/calls"
              stats={outreachStats}
              series={outreachSeries}
              labels={outreachLabels}
              timeframe={outreachTimeframe}
              setTimeframe={setOutreachTimeframe}
              rangeLabel={getRangeLabel(outreachTimeframe)}
              listTitle="Strongest leads to call now"
              listItems={strongestLeads}
              renderListItem={renderLeadItem}
              emptyText="No leads match criteria right now"
            />
          </div>
        )}
      </div>
    </div>
  )
}