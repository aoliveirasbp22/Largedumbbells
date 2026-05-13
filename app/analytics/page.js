'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, GoldRule, DisplayHeading, PageBackground, PageHeader, BrandButton,
  CornerBracket,
  useIsMobile,
} from '@/lib/brand'

// ─── Config ─────────────────────────────────────────────────────────────
const CARDS = [
  { key: 'messages sent', label: 'Messages Sent', color: BRAND.gold },
  { key: 'qualifying',    label: 'Qualifying',    color: BRAND.statusQualifying },
  { key: 'ghosted',       label: 'Ghosted',       color: BRAND.statusGhosted },
  { key: 'link sent',     label: 'Link Sent',     color: BRAND.statusLinkSent },
  { key: 'booked',        label: 'Booked',        color: BRAND.statusBooked },
  { key: 'disqualified',  label: 'Disqualified',  color: BRAND.statusDisqualified },
]

const cardColor = (key) => CARDS.find(c => c.key === key)?.color || BRAND.textMuted

// ─── Helpers ────────────────────────────────────────────────────────────
function buildPeriods(leads, timeframe) {
  const now = new Date()
  const periods = []

  // Daily = today (1 day bucket)
  // Weekly = last 7 days, 1 bar per day
  // Monthly = last 4 weeks, 1 bar per week
  if (timeframe === 'monthly') {
    const weekCount = 4
    for (let i = weekCount - 1; i >= 0; i--) {
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      end.setDate(now.getDate() - i * 7)
      const start = new Date(end)
      start.setDate(end.getDate() - 6)
      start.setHours(0, 0, 0, 0)

      const label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${end.toLocaleDateString('en-US', { day: 'numeric' })}`
      const tooltipLabel = `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

      const weekLeads = leads.filter(l => {
        const d = new Date(l.created_at)
        return d >= start && d <= end
      })

      periods.push({
        label,
        tooltipLabel,
        values: {
          'messages sent': weekLeads.length,
          'qualifying':    weekLeads.filter(l => l.status === 'qualifying').length,
          'ghosted':       weekLeads.filter(l => l.status === 'ghosted').length,
          'link sent':     weekLeads.filter(l => l.status === 'link sent').length,
          'booked':        weekLeads.filter(l => l.status === 'booked').length,
          'disqualified':  weekLeads.filter(l => l.status === 'disqualified').length,
        }
      })
    }
    return periods
  }

  // Daily / Weekly: one bar per day
  const dayCount = timeframe === 'daily' ? 1 : 7

  for (let i = dayCount - 1; i >= 0; i--) {
    const start = new Date(now)
    start.setDate(now.getDate() - i)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)

    const label = timeframe === 'daily'
      ? 'Today'
      : start.toLocaleDateString('en-US', { weekday: 'short' })

    const dayLeads = leads.filter(l => {
      const d = new Date(l.created_at)
      return d >= start && d < end
    })

    periods.push({
      label,
      tooltipLabel: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      values: {
        'messages sent': dayLeads.length,
        'qualifying':    dayLeads.filter(l => l.status === 'qualifying').length,
        'ghosted':       dayLeads.filter(l => l.status === 'ghosted').length,
        'link sent':     dayLeads.filter(l => l.status === 'link sent').length,
        'booked':        dayLeads.filter(l => l.status === 'booked').length,
        'disqualified':  dayLeads.filter(l => l.status === 'disqualified').length,
      }
    })
  }
  return periods
}

// ─── Rate Card ──────────────────────────────────────────────────────────
function RateCard({ label, sublabel, value, color, detail, isMobile }) {
  return (
    <div style={{
      position: 'relative',
      background: BRAND.bgCard,
      border: `1px solid ${BRAND.border}`,
      padding: isMobile ? '14px 14px' : '20px 22px',
      overflow: 'hidden',
    }}>
      <CornerBracket position="tl" size={12} />
      <CornerBracket position="tr" size={12} />
      <CornerBracket position="bl" size={12} />
      <CornerBracket position="br" size={12} />

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${color}aa, transparent)`,
        opacity: 0.5,
      }} />

      <Eyebrow color={color} style={{ fontSize: isMobile ? 9 : 10, letterSpacing: '0.25em', marginBottom: 6 }}>
        {label}
      </Eyebrow>
      <p style={{
        fontSize: 9, color: BRAND.textDim, marginBottom: isMobile ? 12 : 18,
        fontFamily: FONT_BODY,
        letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
      }}>{sublabel}</p>

      <p style={{
        fontFamily: FONT_DISPLAY,
        fontSize: isMobile ? 30 : 44, fontWeight: 400,
        color, lineHeight: 1,
        letterSpacing: '0.02em',
        marginBottom: isMobile ? 12 : 16,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}<span style={{ fontSize: isMobile ? 18 : 26, opacity: 0.7 }}>%</span></p>

      <div style={{ width: '100%', background: BRAND.bgRaised, height: 2, marginBottom: 12 }}>
        <div style={{ width: `${value}%`, background: color, height: 2, transition: 'width 0.4s ease' }} />
      </div>
      <p style={{
        fontSize: 10, color: BRAND.textDim,
        fontFamily: FONT_BODY,
        letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
      }}>{detail}</p>
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────
export default function Analytics() {
  const isMobile = useIsMobile()
  const [leads,       setLeads]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [timeframe,   setTimeframe]   = useState('weekly')
  const [activeCards, setActiveCards] = useState(['messages sent', 'qualifying', 'link sent'])

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

  const totalSent      = leads.length
  const nQualifying    = leads.filter(l => l.status === 'qualifying').length
  const nGhosted       = leads.filter(l => l.status === 'ghosted').length
  const nLinkSent      = leads.filter(l => l.status === 'link sent').length
  const nBooked        = leads.filter(l => l.status === 'booked').length
  const nDisqualified  = leads.filter(l => l.status === 'disqualified').length

  const nResponded = leads.filter(l =>
    ['qualifying', 'ghosted', 'link sent', 'booked', 'disqualified'].includes(l.status)
  ).length

  const nEverQualified = leads.filter(l =>
    ['qualifying', 'ghosted', 'link sent', 'booked', 'disqualified'].includes(l.status)
  ).length

  const responseRate  = totalSent     > 0 ? Math.round((nResponded   / totalSent)     * 100) : 0
  const ghostedRate   = nEverQualified > 0 ? Math.round((nGhosted     / nEverQualified) * 100) : 0
  const linkSentRate  = nResponded    > 0 ? Math.round((nLinkSent    / nResponded)    * 100) : 0
  const bookedRate    = nLinkSent     > 0 ? Math.round((nBooked      / nLinkSent)     * 100) : 0

  const statValues = {
    'messages sent': totalSent,
    'qualifying':    nQualifying,
    'ghosted':       nGhosted,
    'link sent':     nLinkSent,
    'booked':        nBooked,
    'disqualified':  nDisqualified,
  }

  const periods = buildPeriods(leads, timeframe)
  const maxVal  = Math.max(
    ...periods.flatMap(p => activeCards.map(k => p.values[k] || 0)),
    1
  )

  return (
    <PageBackground style={{ minHeight: '100vh' }}>

      <PageHeader
        pageLabel="DM Analytics"
        leftSlot={
          <Link href="/inbox" style={{ textDecoration: 'none' }}>
            <BrandButton variant="ghost" size="sm">
              {isMobile ? '← Inbox' : '← DM Pipeline'}
            </BrandButton>
          </Link>
        }
        rightSlot={<div style={{ minWidth: isMobile ? 0 : 170 }} />}
      />

      <div style={{
        padding: isMobile ? '20px 14px' : '32px 24px',
        maxWidth: 1280, margin: '0 auto',
      }}>

        {/* Hero */}
        <div style={{ marginBottom: isMobile ? 18 : 28 }}>
          <Eyebrow style={{ fontSize: 10, letterSpacing: '0.35em', marginBottom: 10 }}>
            Conversion Intelligence
          </Eyebrow>
          <DisplayHeading size={isMobile ? 30 : 38} style={{ marginBottom: 12 }}>
            DM <span style={{ color: BRAND.gold }}>Analytics</span>
          </DisplayHeading>
          <GoldRule width={40} />
          <p style={{
            fontSize: 11, marginTop: 14, color: BRAND.textMuted,
            fontFamily: FONT_BODY,
            letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            {isMobile ? 'Tap A Card To Toggle Chart' : 'Click Any Card To Toggle It On The Chart'}
          </p>
        </div>

        {loading ? (
          <Eyebrow color={BRAND.textDim}>Loading Analytics…</Eyebrow>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: isMobile ? 8 : 12,
              marginBottom: isMobile ? 16 : 24,
            }}>
              {CARDS.map(card => {
                const active = activeCards.includes(card.key)
                return (
                  <div key={card.key}
                    onClick={() => toggleCard(card.key)}
                    style={{
                      position: 'relative',
                      background: active ? `${card.color}13` : BRAND.bgCard,
                      border: `1px solid ${active ? card.color : BRAND.border}`,
                      padding: '16px 18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      userSelect: 'none',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => {
                      if (active) return
                      e.currentTarget.style.borderColor = BRAND.borderGold
                    }}
                    onMouseLeave={e => {
                      if (active) return
                      e.currentTarget.style.borderColor = BRAND.border
                    }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                      background: `linear-gradient(90deg, transparent, ${card.color}aa, transparent)`,
                      opacity: active ? 0.7 : 0.3,
                    }} />
                    <Eyebrow
                      color={active ? card.color : BRAND.textMuted}
                      style={{ fontSize: 9, letterSpacing: '0.25em', marginBottom: 10 }}>
                      {card.label}
                    </Eyebrow>
                    <p style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: isMobile ? 24 : 30, fontWeight: 400,
                      color: active ? card.color : BRAND.textSecondary,
                      lineHeight: 1,
                      letterSpacing: '0.02em',
                      fontVariantNumeric: 'tabular-nums',
                      margin: 0,
                    }}>
                      {statValues[card.key]}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Bar chart */}
            <div style={{
              position: 'relative',
              background: BRAND.bgCard,
              border: `1px solid ${BRAND.border}`,
              padding: isMobile ? '16px 14px' : '22px 26px',
              marginBottom: isMobile ? 16 : 24,
            }}>
              <CornerBracket position="tl" size={14} />
              <CornerBracket position="tr" size={14} />
              <CornerBracket position="bl" size={14} />
              <CornerBracket position="br" size={14} />

              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                marginBottom: 22, gap: 16, flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em' }}>
                    {activeCards.length === 0 ? 'Select A Metric Above' : 'Lead Volume By Period'}
                  </Eyebrow>
                  <GoldRule width={28} />
                </div>
                <div style={{
                  display: 'flex', gap: 0,
                  border: `1px solid ${BRAND.border}`,
                  width: isMobile ? '100%' : 'auto',
                }}>
                  {['daily', 'weekly', 'monthly'].map((t, i) => {
                    const active = timeframe === t
                    return (
                      <button key={t} onClick={() => setTimeframe(t)}
                        style={{
                          background: active ? BRAND.gold : 'transparent',
                          color: active ? '#000' : BRAND.textMuted,
                          border: 'none',
                          borderLeft: i > 0 ? `1px solid ${BRAND.border}` : 'none',
                          padding: isMobile ? '8px 12px' : '6px 16px',
                          fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.2em', textTransform: 'uppercase',
                          fontFamily: FONT_BODY,
                          cursor: 'pointer',
                          flex: isMobile ? 1 : 'initial',
                        }}>
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {activeCards.length === 0 ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 160,
                }}>
                  <Eyebrow color={BRAND.textDim} style={{ fontSize: 10, letterSpacing: '0.3em' }}>
                    Click A Metric Card Above To Display It
                  </Eyebrow>
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'flex-end', gap: 8, height: 200,
                    justifyContent: periods.length === 1 ? 'center' : 'flex-start',
                  }}>
                    {periods.map((period, i) => (
                      <div key={i} style={{
                        flex: periods.length === 1 ? '0 0 120px' : 1,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 6,
                        height: '100%', justifyContent: 'flex-end',
                      }}>
                        <div style={{
                          width: '100%',
                          display: 'flex', alignItems: 'flex-end', gap: 2,
                          justifyContent: 'center',
                          height: 168,
                        }}>
                          {activeCards.map(key => {
                            const val = period.values[key] || 0
                            const pct = (val / maxVal) * 100
                            return (
                              <div key={key} className="group"
                                title={`${period.tooltipLabel} · ${key}: ${val}`}
                                style={{
                                  flex: 1,
                                  height: `${Math.max(pct, val > 0 ? 3 : 0.5)}%`,
                                  background: cardColor(key),
                                  opacity: 0.9,
                                  minHeight: 2,
                                  position: 'relative',
                                  transition: 'all 0.3s',
                                }}>
                                <div style={{
                                  position: 'absolute', bottom: '100%', left: '50%',
                                  transform: 'translateX(-50%)', marginBottom: 6,
                                  padding: '3px 8px',
                                  fontSize: 9, fontWeight: 700,
                                  letterSpacing: '0.15em', textTransform: 'uppercase',
                                  pointerEvents: 'none',
                                  opacity: 0,
                                  whiteSpace: 'nowrap',
                                  background: '#000',
                                  color: cardColor(key),
                                  border: `1px solid ${cardColor(key)}55`,
                                  fontFamily: FONT_BODY,
                                  zIndex: 10,
                                  transition: 'opacity 0.15s',
                                }}
                                className="bar-tooltip">
                                  {key}: {val}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <Eyebrow color={BRAND.textDim} style={{
                          fontSize: 8, letterSpacing: '0.15em',
                          whiteSpace: 'nowrap',
                        }}>
                          {period.label}
                        </Eyebrow>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div style={{
                    display: 'flex', gap: 20, marginTop: 22, flexWrap: 'wrap',
                    paddingTop: 16,
                    borderTop: `1px solid ${BRAND.border}`,
                  }}>
                    {activeCards.map(key => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: 999,
                          background: cardColor(key),
                          boxShadow: `0 0 6px ${cardColor(key)}99`,
                        }} />
                        <Eyebrow color={BRAND.textMuted} style={{ fontSize: 9, letterSpacing: '0.2em' }}>
                          {key}
                        </Eyebrow>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Rate cards */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14,
            }}>
              <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em' }}>Conversion Funnel</Eyebrow>
              <GoldRule width={28} />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: isMobile ? 8 : 16,
            }}>
              <RateCard
                isMobile={isMobile}
                label="Response Rate"
                sublabel="Of Messages Sent, Replied"
                value={responseRate}
                color={BRAND.gold}
                detail={`${nResponded} Of ${totalSent} Replied`}
              />
              <RateCard
                isMobile={isMobile}
                label="Ghosted Rate"
                sublabel="Of Qualifying, Went Cold"
                value={ghostedRate}
                color={BRAND.statusGhosted}
                detail={`${nGhosted} Of ${nEverQualified} Ghosted`}
              />
              <RateCard
                isMobile={isMobile}
                label="Link Sent Rate"
                sublabel="Of Those Who Responded"
                value={linkSentRate}
                color={BRAND.statusLinkSent}
                detail={`${nLinkSent} Of ${nResponded} Got The Link`}
              />
              <RateCard
                isMobile={isMobile}
                label="Booked Rate"
                sublabel="Of Links Sent, Booked"
                value={bookedRate}
                color={BRAND.statusBooked}
                detail={`${nBooked} Of ${nLinkSent} Booked`}
              />
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        :global(.group:hover .bar-tooltip) {
          opacity: 1 !important;
        }
      `}</style>
    </PageBackground>
  )
}