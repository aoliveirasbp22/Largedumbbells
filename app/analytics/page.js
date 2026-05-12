'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Config ───────────────────────────────────────────────────────────────────

const CARDS = [
  { key: 'messages sent', label: 'Messages Sent', color: '#B8935A' },
  { key: 'qualifying',    label: 'Qualifying',    color: '#F0A500' },
  { key: 'ghosted',       label: 'Ghosted',       color: '#666'    },
  { key: 'link sent',     label: 'Link Sent',     color: '#9B59B6' },
  { key: 'booked',        label: 'Booked',        color: '#2ECC71' },
  { key: 'disqualified',  label: 'Disqualified',  color: '#E74C3C' },
]

const cardColor = (key) => CARDS.find(c => c.key === key)?.color || '#888'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodLabel(date, timeframe) {
  if (timeframe === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'short' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildPeriods(leads, timeframe) {
  const now    = new Date()
  const count  = timeframe === 'weekly' ? 8 : timeframe === 'biweekly' ? 6 : 6
  const days   = timeframe === 'weekly' ? 7 : timeframe === 'biweekly' ? 14 : 30
  const periods = []

  for (let i = count - 1; i >= 0; i--) {
    const end   = new Date(now)
    end.setDate(end.getDate() - i * days)
    const start = new Date(end)
    start.setDate(start.getDate() - days)

    const label = timeframe === 'biweekly'
      ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${end.toLocaleDateString('en-US', { day: 'numeric' })}`
      : getPeriodLabel(end, timeframe)

    const periodLeads = leads.filter(l => {
      const d = new Date(l.created_at)
      return d >= start && d < end
    })

    periods.push({
      label,
      values: {
        'messages sent': periodLeads.length,
        'qualifying':    periodLeads.filter(l => l.status === 'qualifying').length,
        'ghosted':       periodLeads.filter(l => l.status === 'ghosted').length,
        'link sent':     periodLeads.filter(l => l.status === 'link sent').length,
        'booked':        periodLeads.filter(l => l.status === 'booked').length,
        'disqualified':  periodLeads.filter(l => l.status === 'disqualified').length,
      }
    })
  }
  return periods
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const DumbbellIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2"  y="10" width="3"  height="4" rx="1" fill="#B8935A"/>
    <rect x="19" y="10" width="3"  height="4" rx="1" fill="#B8935A"/>
    <rect x="5"  y="8"  width="2"  height="8" rx="1" fill="#B8935A"/>
    <rect x="17" y="8"  width="2"  height="8" rx="1" fill="#B8935A"/>
    <rect x="7"  y="11" width="10" height="2" rx="1" fill="#B8935A"/>
  </svg>
)

function RateCard({ label, sublabel, value, color, detail }) {
  return (
    <div className="p-5 rounded-lg" style={{ background: '#111', border: '1px solid #222' }}>
      <p className="text-xs tracking-wider mb-1" style={{ color: '#555' }}>{label.toUpperCase()}</p>
      <p className="text-xs mb-4" style={{ color: '#444' }}>{sublabel}</p>
      <p className="text-4xl font-bold mb-4" style={{ color }}>{value}%</p>
      <div className="w-full rounded-full mb-2" style={{ background: '#1a1a1a', height: '3px' }}>
        <div className="rounded-full transition-all" style={{ width: `${value}%`, background: color, height: '3px' }} />
      </div>
      <p className="text-xs" style={{ color: '#444' }}>{detail}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Analytics() {
  const [leads,       setLeads]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [timeframe,   setTimeframe]   = useState('weekly')
  const [activeCards, setActiveCards] = useState(['booked', 'link sent'])

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase
      .from('leads')
      .select('id, status, created_at')
      .order('created_at', { ascending: true })
    setLeads(data || [])
    setLoading(false)
  }

  function toggleCard(key) {
    setActiveCards(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // ── Aggregate stats (all-time, not timeframe-scoped — these are totals)
  const totalSent      = leads.length
  const nQualifying    = leads.filter(l => l.status === 'qualifying').length
  const nGhosted       = leads.filter(l => l.status === 'ghosted').length
  const nLinkSent      = leads.filter(l => l.status === 'link sent').length
  const nBooked        = leads.filter(l => l.status === 'booked').length
  const nDisqualified  = leads.filter(l => l.status === 'disqualified').length

  // "Responded" = everyone who made it past 'new' (qualifying, ghosted, link sent, booked, disqualified)
  const nResponded = leads.filter(l =>
    ['qualifying', 'ghosted', 'link sent', 'booked', 'disqualified'].includes(l.status)
  ).length

  // "Ever qualified" = reached qualifying or beyond (before ghosting)
  const nEverQualified = leads.filter(l =>
    ['qualifying', 'ghosted', 'link sent', 'booked', 'disqualified'].includes(l.status)
  ).length

  // Rates
  const responseRate  = totalSent     > 0 ? Math.round((nResponded    / totalSent)     * 100) : 0
  const ghostedRate   = nEverQualified > 0 ? Math.round((nGhosted      / nEverQualified) * 100) : 0
  const linkSentRate  = nResponded    > 0 ? Math.round((nLinkSent     / nResponded)    * 100) : 0
  const bookedRate    = nLinkSent     > 0 ? Math.round((nBooked       / nLinkSent)     * 100) : 0

  const statValues = {
    'messages sent': totalSent,
    'qualifying':    nQualifying,
    'ghosted':       nGhosted,
    'link sent':     nLinkSent,
    'booked':        nBooked,
    'disqualified':  nDisqualified,
  }

  // ── Chart data
  const periods = buildPeriods(leads, timeframe)
  const maxVal  = Math.max(
    ...periods.flatMap(p => activeCards.map(k => p.values[k] || 0)),
    1
  )

  return (
    <div className="min-h-screen font-sans" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="border-b px-8 py-4 flex items-center"
        style={{ background: '#111', borderColor: '#222' }}>
        <div className="flex items-center gap-3">
          <DumbbellIcon size={28} />
          <div>
            <h1 className="font-bold tracking-widest text-lg" style={{ color: '#B8935A' }}>LARGE DUMBBELLS</h1>
            <p className="text-xs" style={{ color: '#444' }}>DM Analytics</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-6xl mx-auto">
        {loading ? (
          <p className="text-sm" style={{ color: '#555' }}>Loading...</p>
        ) : (
          <>
            {/* Stat cards — click to toggle on chart */}
            <div className="grid grid-cols-6 gap-3 mb-6">
              {CARDS.map(card => {
                const active = activeCards.includes(card.key)
                return (
                  <div key={card.key} onClick={() => toggleCard(card.key)}
                    className="p-4 rounded-lg cursor-pointer transition-all select-none"
                    style={{
                      background:  active ? `${card.color}18` : '#111',
                      border:      `1px solid ${active ? card.color : '#222'}`,
                    }}>
                    <p className="text-xs mb-2 tracking-wider"
                      style={{ color: active ? card.color : '#555' }}>
                      {card.label.toUpperCase()}
                    </p>
                    <p className="text-3xl font-bold"
                      style={{ color: active ? card.color : '#444' }}>
                      {statValues[card.key]}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Bar chart */}
            <div className="p-5 rounded-lg mb-6" style={{ background: '#111', border: '1px solid #222' }}>
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs tracking-wider" style={{ color: '#555' }}>
                  {activeCards.length === 0 ? 'SELECT A METRIC ABOVE TO CHART' : 'LEAD VOLUME BY PERIOD'}
                </p>
                <div className="flex gap-2">
                  {['weekly', 'biweekly', 'monthly'].map(t => (
                    <button key={t} onClick={() => setTimeframe(t)}
                      className="text-xs px-3 py-1 rounded"
                      style={{
                        background:  timeframe === t ? '#B8935A' : '#1a1a1a',
                        color:       timeframe === t ? '#000' : '#888',
                        border:      '1px solid',
                        borderColor: timeframe === t ? '#B8935A' : '#333',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {activeCards.length === 0 ? (
                <div className="flex items-center justify-center" style={{ height: '160px' }}>
                  <p className="text-xs" style={{ color: '#333' }}>Click a metric card above to display it</p>
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-2" style={{ height: '180px' }}>
                    {periods.map((period, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        {/* Y-axis label for the tallest bar */}
                        <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: '155px' }}>
                          {activeCards.map(key => {
                            const val = period.values[key] || 0
                            const pct = (val / maxVal) * 100
                            return (
                              <div key={key}
                                title={`${key}: ${val}`}
                                className="flex-1 rounded-t-sm transition-all relative group"
                                style={{
                                  height:    `${Math.max(pct, val > 0 ? 3 : 0.5)}%`,
                                  background: cardColor(key),
                                  opacity:   0.85,
                                  minHeight: '2px',
                                }}>
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                                  style={{ background: '#222', color: '#e0e0e0', border: '1px solid #333', zIndex: 10 }}>
                                  {key}: {val}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <span style={{ color: '#444', fontSize: '9px', whiteSpace: 'nowrap' }}>
                          {period.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 mt-4 flex-wrap">
                    {activeCards.map(key => (
                      <div key={key} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: cardColor(key) }} />
                        <span className="text-xs" style={{ color: '#888' }}>{key}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Rate cards */}
            <div className="grid grid-cols-4 gap-4">
              <RateCard
                label="Response Rate"
                sublabel="Of messages sent, replied"
                value={responseRate}
                color="#B8935A"
                detail={`${nResponded} of ${totalSent} replied`}
              />
              <RateCard
                label="Ghosted Rate"
                sublabel="Of qualifying leads, went cold"
                value={ghostedRate}
                color="#666"
                detail={`${nGhosted} of ${nEverQualified} ghosted`}
              />
              <RateCard
                label="Link Sent Rate"
                sublabel="Of those who responded"
                value={linkSentRate}
                color="#9B59B6"
                detail={`${nLinkSent} of ${nResponded} got the link`}
              />
              <RateCard
                label="Booked Rate"
                sublabel="Of links sent → calls booked"
                value={bookedRate}
                color="#2ECC71"
                detail={`${nBooked} of ${nLinkSent} booked`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}