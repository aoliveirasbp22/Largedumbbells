'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  CornerBracket, Eyebrow, GoldRule, DisplayHeading, PageBackground,
  useIsMobile,
} from '@/lib/brand'

// Legacy GHL field IDs kept so getField() lookups stay unchanged.
// leadToContact() synthesizes a customFields[] array from Supabase columns
// using these IDs. 'occupation' is a synthetic id (not from GHL) since
// we replaced the would_invest field with occupation everywhere.
const FIELD_IDS = {
  struggle:   'WtsEP55kDKmuYvjR3cRM',
  bothered:   'b9izCUDE2DcOqViZ6Da4',
  age:        'gvlEzRdj7FhoOw6Yk0p6',
  occupation: 'occupation_field',
}

// ─── Timezone helpers ─────────────────────────────────────────────────
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

// Normalize a Supabase leads row into the GHL-shape that the rest of
// this dashboard expects (contactName, dateAdded, customFields[], etc).
function leadToContact(l) {
  const name = l.name || l.ig_handle || ''
  return {
    id:          l.id,
    contactName: name,
    email:       l.email || '',
    phone:       l.phone || '',
    country:     l.country || '',
    dateAdded:   l.created_at,
    customFields: [
      { id: FIELD_IDS.struggle,   value: l.roadblock      ?? '' },
      { id: FIELD_IDS.occupation, value: l.occupation     ?? '' },
      { id: FIELD_IDS.bothered,   value: l.bothered_score != null ? String(l.bothered_score) : '' },
      { id: FIELD_IDS.age,        value: l.age            != null ? String(l.age) : '' },
    ],
  }
}

// ─── Chart ────────────────────────────────────────────────────────────
function MiniChart({ series, axisLabels, tooltipLabels, height = 56 }) {
  const containerRef = useRef(null)
  const [hover, setHover] = useState(null)

  if (!series.length || !series[0].data.length) {
    return (
      <div style={{ height: height + 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 10, color: BRAND.textDim, fontFamily: FONT_BODY }}>NO TREND DATA YET</p>
      </div>
    )
  }

  const allValues = series.flatMap(s => s.data)
  const max = Math.max(...allValues, 1)
  const min = 0
  const range = max - min || 1
  const H = height
  const numPoints = series[0].data.length

  function getPointPx(seriesIdx, pointIdx, containerWidth) {
    const s = series[seriesIdx]
    const v = s.data[pointIdx]
    const x = numPoints === 1 ? containerWidth / 2 : (pointIdx / (s.data.length - 1)) * containerWidth
    const y = H - ((v - min) / range) * (H - 6) - 3
    return { x, y, value: v }
  }

  function handleMouseMove(e) {
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const containerWidth = rect.width

    const pointWidth = numPoints === 1 ? containerWidth : containerWidth / (numPoints - 1)
    const pointIdx = numPoints === 1 ? 0 : Math.round(mouseX / pointWidth)
    const clampedIdx = Math.max(0, Math.min(numPoints - 1, pointIdx))

    let nearestSeriesIdx = 0
    let nearestDist = Infinity
    series.forEach((s, idx) => {
      const { y } = getPointPx(idx, clampedIdx, containerWidth)
      const dist = Math.abs(y - mouseY)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestSeriesIdx = idx
      }
    })

    setHover({ seriesIdx: nearestSeriesIdx, pointIdx: clampedIdx, mouseX, mouseY, containerWidth })
  }

  let hoverPoint = null
  if (hover) {
    const { x, y, value } = getPointPx(hover.seriesIdx, hover.pointIdx, hover.containerWidth)
    hoverPoint = {
      x, y, value,
      color: series[hover.seriesIdx].color,
      label: series[hover.seriesIdx].label || 'Value',
      date:  tooltipLabels[hover.pointIdx] || '',
    }
  }

  return (
    <div>
      <div ref={containerRef}
        style={{ position: 'relative', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}>
        <svg width="100%" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none"
          style={{ overflow: 'visible', display: 'block' }}>
          {series.map((s, idx) => {
            if (s.data.length === 0) return null
            const isDimmed = hover && hover.seriesIdx !== idx
            if (s.data.length === 1) {
              const v = s.data[0]
              const y = H - ((v - min) / range) * (H - 6) - 3
              return (
                <circle key={idx} cx="50" cy={y} r="2"
                  fill={s.color}
                  opacity={isDimmed ? 0.25 : 0.95}
                  vectorEffect="non-scaling-stroke"
                />
              )
            }
            const points = s.data.map((v, i) => {
              const x = (i / (s.data.length - 1)) * 100
              const y = H - ((v - min) / range) * (H - 6) - 3
              return `${x},${y}`
            }).join(' ')
            return (
              <polyline key={idx}
                points={points}
                fill="none" stroke={s.color}
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                opacity={isDimmed ? 0.25 : 0.95}
                vectorEffect="non-scaling-stroke"
                style={{ transition: 'opacity 0.15s' }}
              />
            )
          })}
        </svg>

        {hoverPoint && (
          <>
            <div style={{
              position: 'absolute',
              left: hoverPoint.x, top: 0, width: 1, height: H,
              background: BRAND.borderStrong, pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute',
              left: hoverPoint.x - 4, top: hoverPoint.y - 4,
              width: 8, height: 8, borderRadius: 999,
              background: hoverPoint.color,
              border: `2px solid ${BRAND.bg}`,
              pointerEvents: 'none',
              boxShadow: `0 0 12px ${hoverPoint.color}99`,
            }} />
          </>
        )}

        {hoverPoint && (
          <div style={{
            position: 'absolute',
            left: Math.min(hover.mouseX + 12, hover.containerWidth - 130),
            top: Math.max(hover.mouseY - 44, -10),
            background: '#000',
            border: `1px solid ${hoverPoint.color}55`,
            borderRadius: 4,
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: 110,
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
          }}>
            <p style={{
              fontSize: 9, color: BRAND.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.15em',
              marginBottom: 4, fontWeight: 600,
              fontFamily: FONT_BODY,
            }}>{hoverPoint.date}</p>
            <p style={{
              fontSize: 13, color: hoverPoint.color, fontWeight: 700,
              fontFamily: FONT_BODY, fontVariantNumeric: 'tabular-nums',
            }}>
              {hoverPoint.label}: {hoverPoint.value}
            </p>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', marginTop: 10, height: 14 }}>
        {axisLabels.map((l, i) => {
          if (!l) return null
          const leftPct = axisLabels.length === 1 ? 50 : (i / (axisLabels.length - 1)) * 100
          const isFirst = i === 0
          const isLast = i === axisLabels.length - 1
          return (
            <span key={i} style={{
              position: 'absolute',
              left: `${leftPct}%`,
              transform: isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)',
              fontSize: 9,
              color: BRAND.textDim,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              fontFamily: FONT_BODY,
            }}>
              {l}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Pipeline card ────────────────────────────────────────────────────
function PipelineCard({ phaseLabel, title, href, stats, series, axisLabels, tooltipLabels, timeframe, setTimeframe, rangeLabel, listTitle, listItems, renderListItem, emptyText }) {
  const [hovered, setHovered] = useState(false)
  const isMobile = useIsMobile()
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: BRAND.bgCard,
        border: `1px solid ${hovered ? BRAND.borderGold : BRAND.border}`,
        borderRadius: 4,
        padding: isMobile ? '16px 14px 14px' : '20px 22px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 14 : 18,
        height: '100%',
        transition: 'border-color 0.25s ease',
      }}>

      <CornerBracket position="tl" />
      <CornerBracket position="tr" />
      <CornerBracket position="bl" />
      <CornerBracket position="br" />

      {/* Header */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: isMobile ? 10 : 16,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div>
            <DisplayHeading size={isMobile ? 22 : 24}>{title}</DisplayHeading>
            <div style={{ marginTop: 8 }}>
              <GoldRule width={32} />
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: 10, flexShrink: 0,
            alignSelf: isMobile ? 'stretch' : 'flex-start',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
            width: isMobile ? '100%' : 'auto',
          }}>
            <span style={{
              fontSize: isMobile ? 9 : 10, color: BRAND.textMuted, fontWeight: 600,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              fontFamily: FONT_BODY,
            }}>
              {rangeLabel}
            </span>
            <div style={{ display: 'flex', gap: 0, border: `1px solid ${BRAND.border}`, borderRadius: 2 }}>
              {[
                { key: 'weekly',  label: 'W' },
                { key: 'monthly', label: 'M' },
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
                      width: 30, height: 26,
                      fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      fontFamily: FONT_BODY,
                      transition: 'all 0.15s',
                    }}>{t.label}</button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid — on mobile, 2 columns instead of 4 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile && stats.length > 2
          ? 'repeat(2, 1fr)'
          : `repeat(${stats.length}, 1fr)`,
        gap: 1,
        background: BRAND.border,
        padding: 1,
      }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: BRAND.bgRaised,
            padding: isMobile ? '10px 12px' : '12px 14px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${s.color}aa, transparent)`,
              opacity: 0.5,
            }} />
            <p style={{
              fontFamily: FONT_DISPLAY,
              fontSize: isMobile ? 22 : 26, fontWeight: 400,
              color: s.color, lineHeight: 1,
              letterSpacing: '0.02em',
              fontVariantNumeric: 'tabular-nums',
              margin: 0,
            }}>
              {s.value}
            </p>
            <Eyebrow color={BRAND.textMuted} style={{ marginTop: 6, letterSpacing: '0.2em', fontSize: 9 }}>
              {s.label}
            </Eyebrow>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div>
        <Eyebrow color={BRAND.textDim} style={{ marginBottom: 8, letterSpacing: '0.3em', fontSize: 9 }}>Trend</Eyebrow>
        <MiniChart series={series} axisLabels={axisLabels} tooltipLabels={tooltipLabels} />
      </div>

      {/* List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Eyebrow color={BRAND.textDim} style={{ marginBottom: 10, letterSpacing: '0.3em', fontSize: 9 }}>
          {listTitle}
        </Eyebrow>
        {listItems.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px dashed ${BRAND.border}`, padding: 20,
          }}>
            <p style={{
              fontSize: 11, color: BRAND.textDim, fontStyle: 'italic',
              fontFamily: FONT_BODY,
            }}>{emptyText}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: BRAND.border }}>
            {listItems.slice(0, 3).map((item, i) => renderListItem(item, i))}
          </div>
        )}
      </div>

      {/* CTA */}
      <Link href={href}
        style={{
          background: 'transparent',
          color: BRAND.gold,
          padding: '10px 18px',
          border: `1px solid ${BRAND.gold}`,
          fontFamily: FONT_BODY,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          textAlign: 'center',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = BRAND.gold
          e.currentTarget.style.color = '#000'
          e.currentTarget.style.boxShadow = `0 0 24px ${BRAND.goldGlow}`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = BRAND.gold
          e.currentTarget.style.boxShadow = 'none'
        }}>
        <span>Open Pipeline</span>
        <span style={{ fontSize: 14 }}>→</span>
      </Link>
    </div>
  )
}

// ─── Date helpers ─────────────────────────────────────────────────────
function getBuckets(timeframe) {
  const buckets = []
  const now = new Date()
  if (timeframe === 'weekly') {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now); start.setDate(now.getDate() - i); start.setHours(0,0,0,0)
      const end = new Date(start); end.setDate(start.getDate() + 1)
      buckets.push({ start, end })
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const start = new Date(now); start.setDate(now.getDate() - i); start.setHours(0,0,0,0)
      const end = new Date(start); end.setDate(start.getDate() + 1)
      buckets.push({ start, end })
    }
  }
  return buckets
}

function getBucketLabels(timeframe, buckets) {
  if (timeframe === 'weekly') {
    return buckets.map(b => b.start.toLocaleDateString('en-US', { weekday: 'short' }))
  }
  const totalLabels = 5
  const step = (buckets.length - 1) / (totalLabels - 1)
  const labelIndices = new Set(
    Array.from({ length: totalLabels }, (_, i) => Math.round(i * step))
  )
  return buckets.map((b, i) => {
    if (!labelIndices.has(i)) return ''
    return b.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
}

function getDetailedLabels(timeframe, buckets) {
  return buckets.map(b => b.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
}

function getRangeLabel(timeframe) {
  const now = new Date()
  const opts = { month: 'short', day: 'numeric' }
  if (timeframe === 'weekly') {
    const start = new Date(now); start.setDate(now.getDate() - 6)
    return `${start.toLocaleDateString('en-US', opts)} – ${now.toLocaleDateString('en-US', opts)}`
  }
  const start = new Date(now); start.setDate(now.getDate() - 29)
  return `${start.toLocaleDateString('en-US', opts)} – ${now.toLocaleDateString('en-US', opts)}`
}

function currentRangeStart(timeframe) {
  const now = new Date()
  const start = new Date(now)
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

// ─── Main ─────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [dmTimeframe, setDmTimeframe] = useState('weekly')
  const [outreachTimeframe, setOutreachTimeframe] = useState('weekly')

  const [leads, setLeads] = useState([])
  const [messages, setMessages] = useState([])
  const [contacts, setContacts] = useState([])      // normalized leads → GHL-shape
  const [callLogs, setCallLogs] = useState({})       // keyed by lead_id (uuid)
  const [callLogsList, setCallLogsList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const { data: leadsData } = await supabase.from('leads').select('*')
      const leadsList = leadsData || []
      setLeads(leadsList)

      const { data: msgsData } = await supabase.from('messages')
        .select('*').order('created_at', { ascending: false })
      setMessages(msgsData || [])

      // Normalize the same leads list into GHL-shape for the Outreach card.
      // No second query needed — reuse data we already have.
      setContacts(leadsList.map(leadToContact))

      const { data: logs } = await supabase.from('call_logs')
        .select('*').not('lead_id', 'is', null)
      const logsMap = {}
      logs?.forEach(log => { logsMap[log.lead_id] = log })
      setCallLogs(logsMap)
      setCallLogsList(logs || [])
    } catch (err) { console.error('Fetch error:', err) }
    setLoading(false)
  }

  function openInboxConversation(leadId) {
    try {
      const existing = JSON.parse(localStorage.getItem('inboxState') || '{}')
      localStorage.setItem('inboxState', JSON.stringify({
        ...existing,
        selectedLeadId: leadId,
      }))
    } catch {
      localStorage.setItem('inboxState', JSON.stringify({ selectedLeadId: leadId }))
    }
    router.push('/inbox')
  }

  // ─── DM stats ───────────────────────────────────────────────────────
  const dmStart = currentRangeStart(dmTimeframe)
  const dmLeadsInRange = leads.filter(l => new Date(l.created_at) >= dmStart)

  const dmStats = [
    { label: 'Messages',   value: dmLeadsInRange.length, color: BRAND.gold },
    { label: 'Qualifying', value: dmLeadsInRange.filter(l => l.status === 'qualifying' || l.status === 'new').length, color: BRAND.statusNew },
    { label: 'Link Sent',  value: dmLeadsInRange.filter(l => l.status === 'link sent').length, color: BRAND.statusLinkSent },
    { label: 'Booked',     value: dmLeadsInRange.filter(l => l.status === 'booked').length, color: BRAND.statusBooked },
  ]

  const dmBuckets = getBuckets(dmTimeframe)
  const dmLabels  = getBucketLabels(dmTimeframe, dmBuckets)
  const dmDetailedLabels = getDetailedLabels(dmTimeframe, dmBuckets)
  const dmSeries = [
    { label: 'Messages', color: BRAND.gold,
      data: dmBuckets.map(b => leads.filter(l => {
        const t = new Date(l.created_at); return t >= b.start && t < b.end
      }).length) },
    { label: 'Qualifying', color: BRAND.statusNew,
      data: dmBuckets.map(b => leads.filter(l => {
        const t = new Date(l.created_at)
        return t >= b.start && t < b.end && (l.status === 'qualifying' || l.status === 'new')
      }).length) },
    { label: 'Link Sent', color: BRAND.statusLinkSent,
      data: dmBuckets.map(b => leads.filter(l => {
        const t = new Date(l.created_at)
        return t >= b.start && t < b.end && l.status === 'link sent'
      }).length) },
    { label: 'Booked', color: BRAND.statusBooked,
      data: dmBuckets.map(b => leads.filter(l => {
        const t = new Date(l.created_at)
        return t >= b.start && t < b.end && l.status === 'booked'
      }).length) },
  ]

  // ─── Awaiting reply ─────────────────────────────────────────────────
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
      <div key={lead.id}
        onClick={() => openInboxConversation(lead.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px',
          background: BRAND.bgRaised,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = BRAND.bgCardHover }}
        onMouseLeave={e => { e.currentTarget.style.background = BRAND.bgRaised }}>
        {avatar ? (
          <img src={avatar} alt="" style={{
            width: 28, height: 28, borderRadius: 999, objectFit: 'cover', flexShrink: 0,
            border: `1px solid ${BRAND.border}`,
          }} onError={e => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: 999, flexShrink: 0,
            background: 'transparent',
            color: BRAND.gold,
            border: `1px solid ${BRAND.borderGold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY,
          }}>{initial}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 12, color: BRAND.textPrimary, fontWeight: 500,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontFamily: FONT_BODY, letterSpacing: '0.02em',
          }}>
            @{lead.ig_handle || lead.name || 'unknown'}
          </p>
          <p style={{
            fontSize: 10, color: BRAND.textMuted, marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontFamily: FONT_BODY,
          }}>
            {lastMsg.body || lastMsg.message || lastMsg.content || '(media)'}
          </p>
        </div>
        <span style={{
          fontSize: 10, color: BRAND.textDim, flexShrink: 0,
          fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          fontFamily: FONT_BODY,
        }}>
          {timeAgoShort(lastMsg.created_at)}
        </span>
      </div>
    )
  }

  // ─── Outreach stats ─────────────────────────────────────────────────
  const outreachStart = currentRangeStart(outreachTimeframe)
  const calledTags = ['called once','called twice','called three times','call back','not interested','booked']
  const contactsInRange = contacts.filter(c => new Date(c.dateAdded) >= outreachStart)
  const callsInRange = callLogsList.filter(log => {
    if (!log.last_contacted) return false
    return new Date(log.last_contacted) >= outreachStart
  })

  const outreachStats = [
    { label: 'Total Leads', value: contactsInRange.length, color: BRAND.gold },
    { label: 'Called',      value: callsInRange.filter(log => calledTags.includes(log.tag)).length, color: BRAND.statusNew },
    { label: 'Booked',      value: callsInRange.filter(log => log.tag === 'booked').length, color: BRAND.statusBooked },
  ]

  const outreachBuckets = getBuckets(outreachTimeframe)
  const outreachLabels  = getBucketLabels(outreachTimeframe, outreachBuckets)
  const outreachDetailedLabels = getDetailedLabels(outreachTimeframe, outreachBuckets)
  const outreachSeries = [
    { label: 'Total Leads', color: BRAND.gold,
      data: outreachBuckets.map(b => contacts.filter(c => {
        const t = new Date(c.dateAdded); return t >= b.start && t < b.end
      }).length) },
    { label: 'Called', color: BRAND.statusNew,
      data: outreachBuckets.map(b => callLogsList.filter(log => {
        if (!log.last_contacted) return false
        const t = new Date(log.last_contacted)
        return t >= b.start && t < b.end && calledTags.includes(log.tag)
      }).length) },
    { label: 'Booked', color: BRAND.statusBooked,
      data: outreachBuckets.map(b => callLogsList.filter(log => {
        if (!log.last_contacted) return false
        const t = new Date(log.last_contacted)
        return t >= b.start && t < b.end && log.tag === 'booked'
      }).length) },
  ]

  // Strongest leads = uncalled/early-tag + bothered ≥4 + age 22-45 + in green call window.
  // would_invest filter was removed — form fillers self-select for high intent.
  const strongestLeads = contacts
    .filter(c => {
      const tag = callLogs[c.id]?.tag || 'uncalled'
      if (['booked', 'not interested', 'called three times'].includes(tag)) return false
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
      uncalled: BRAND.textMuted,
      'called once': BRAND.statusNew,
      'called twice': BRAND.statusQualifying,
      'call back': BRAND.statusLinkSent,
    }
    const tagColor = tagColors[tag] || BRAND.textMuted
    const initial = (contact.contactName || '?')[0].toUpperCase()
    return (
      <Link key={contact.id}
        href={`/calls/${contact.id}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px',
          background: BRAND.bgRaised,
          textDecoration: 'none',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = BRAND.bgCardHover }}
        onMouseLeave={e => { e.currentTarget.style.background = BRAND.bgRaised }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999, flexShrink: 0,
          background: 'transparent',
          color: BRAND.gold,
          border: `1px solid ${BRAND.borderGold}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY,
        }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 12, color: BRAND.textPrimary, fontWeight: 500,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontFamily: FONT_BODY, letterSpacing: '0.02em',
          }}>
            {contact.contactName || 'Unknown'}
          </p>
          <p style={{
            fontSize: 9, color: BRAND.textMuted, marginTop: 1,
            fontFamily: FONT_BODY, letterSpacing: '0.05em',
          }}>
            {age}Y · BOTHERED {bothered}/5 · <span style={{ color: BRAND.statusBooked }}>● </span>GOOD TO CALL
          </p>
        </div>
        <span style={{
          fontSize: 9, padding: '3px 8px',
          background: `${tagColor}15`, color: tagColor,
          border: `1px solid ${tagColor}33`,
          fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
          fontFamily: FONT_BODY,
          flexShrink: 0,
        }}>{tag}</span>
      </Link>
    )
  }

  return (
    <PageBackground style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
      {/* Hero header */}
      <div style={{
        padding: isMobile ? '18px 16px 14px' : '24px 24px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: isMobile ? 10 : 14,
      }}>
        <div style={{
          width: isMobile ? 48 : 64,
          height: isMobile ? 48 : 64,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img
            src="/logo-large-dumbbells.png"
            alt="Large Dumbbells"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>

        <div style={{
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: isMobile ? 8 : 12,
        }}>
          <Eyebrow style={{
            fontSize: isMobile ? 9 : 10,
            letterSpacing: isMobile ? '0.3em' : '0.4em',
          }}>The Command Center</Eyebrow>
          <DisplayHeading
            size={isMobile ? 30 : 44}
            style={{ letterSpacing: '0.04em', lineHeight: 0.95 }}>
            Sales <span style={{ color: BRAND.gold }}>Pipeline</span>
          </DisplayHeading>
        </div>
      </div>

      <div style={{
        flex: 1,
        padding: isMobile ? '4px 12px 16px' : '8px 24px 24px',
        maxWidth: 1600, width: '100%', margin: '0 auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {loading ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: 80, gap: 16,
          }}>
            <Eyebrow color={BRAND.textDim}>Loading</Eyebrow>
            <div style={{ width: 32, height: 1, background: BRAND.gold }} />
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(520px, 1fr))',
            gap: isMobile ? 14 : 24,
          }}>
            <PipelineCard
              phaseLabel="Phase One — Inbound"
              title="DM Pipeline"
              href="/inbox"
              stats={dmStats}
              series={dmSeries}
              axisLabels={dmLabels}
              tooltipLabels={dmDetailedLabels}
              timeframe={dmTimeframe}
              setTimeframe={setDmTimeframe}
              rangeLabel={getRangeLabel(dmTimeframe)}
              listTitle="DMs Awaiting Your Reply"
              listItems={awaitingReply}
              renderListItem={renderDmItem}
              emptyText="No DMs awaiting reply"
            />
            <PipelineCard
              phaseLabel="Phase Two — Outbound"
              title="Outreach Pipeline"
              href="/calls"
              stats={outreachStats}
              series={outreachSeries}
              axisLabels={outreachLabels}
              tooltipLabels={outreachDetailedLabels}
              timeframe={outreachTimeframe}
              setTimeframe={setOutreachTimeframe}
              rangeLabel={getRangeLabel(outreachTimeframe)}
              listTitle="Strongest Leads To Call Now"
              listItems={strongestLeads}
              renderListItem={renderLeadItem}
              emptyText="No leads match criteria right now"
            />
          </div>
        )}
      </div>
    </PageBackground>
  )
}