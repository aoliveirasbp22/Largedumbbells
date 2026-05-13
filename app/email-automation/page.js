'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  TAG_COLORS,
  Eyebrow, GoldRule, DisplayHeading, PageBackground, PageHeader, BrandButton,
  CornerBracket,
  useIsMobile,
} from '@/lib/brand'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}

function StatCell({ value, label, color, last }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 4,
      padding: '8px 20px',
      borderRight: last ? 'none' : `1px solid ${BRAND.border}`,
      minWidth: 90,
    }}>
      <span style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 22, fontWeight: 400,
        color, lineHeight: 1,
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</span>
      <Eyebrow color={BRAND.textMuted} style={{ fontSize: 8, letterSpacing: '0.25em' }}>
        {label}
      </Eyebrow>
    </div>
  )
}

export default function EmailAutomation() {
  const isMobile = useIsMobile()
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    const { data: campaignData } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: enrollmentData } = await supabase
      .from('campaign_enrollments')
      .select('campaign_id, status')

    const statsByCampaign = {}
    ;(enrollmentData || []).forEach(e => {
      if (!statsByCampaign[e.campaign_id]) {
        statsByCampaign[e.campaign_id] = { enrolled: 0, booked: 0, completed: 0 }
      }
      if (e.status === 'active')    statsByCampaign[e.campaign_id].enrolled++
      if (e.status === 'booked')    statsByCampaign[e.campaign_id].booked++
      if (e.status === 'completed') statsByCampaign[e.campaign_id].completed++
    })

    setCampaigns(campaignData || [])
    setStats(statsByCampaign)
    setLoading(false)
  }

  async function createCampaign() {
    if (!newName.trim()) return
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert({
        name: newName.trim(),
        status: 'draft',
        from_name: 'Large Dumbbells',
        from_email: 'kyle.briere@largedumbbells.com',
      })
      .select()
      .single()
    if (error) { console.error('Create error:', error); return }
    setNewName('')
    setCreating(false)
    window.location.href = `/email-automation/${data.id}`
  }

  async function deleteCampaign(id) {
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    await supabase.from('email_campaigns').delete().eq('id', id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  async function updateStatus(id, newStatus) {
    await supabase.from('email_campaigns').update({ status: newStatus }).eq('id', id)
    setCampaigns(prev => prev.map(x => x.id === id ? { ...x, status: newStatus } : x))
  }

  return (
    <PageBackground style={{ minHeight: '100vh' }}>

      <PageHeader
        pageLabel="Email Automation"
        leftSlot={
          <Link href="/calls" style={{ textDecoration: 'none' }}>
            <BrandButton variant="ghost" size="sm">
              {isMobile ? '← Pipeline' : '← Outreach Pipeline'}
            </BrandButton>
          </Link>
        }
        rightSlot={<div style={{ minWidth: isMobile ? 0 : 180 }} />}
      />

      <div style={{
        padding: isMobile ? '20px 14px' : '32px 24px',
        maxWidth: 1280, margin: '0 auto',
      }}>

        {/* Title + Create */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-end',
          marginBottom: isMobile ? 18 : 28,
          flexWrap: 'wrap',
          gap: isMobile ? 18 : 16,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div>
            <Eyebrow style={{ fontSize: 10, letterSpacing: '0.35em', marginBottom: 10 }}>
              Lead Nurture
            </Eyebrow>
            <DisplayHeading size={isMobile ? 30 : 38} style={{ marginBottom: 12 }}>
              Campaigns
            </DisplayHeading>
            <GoldRule width={40} />
            <p style={{
              fontSize: 11, marginTop: 14, color: BRAND.textMuted,
              fontFamily: FONT_BODY,
              letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
            }}>
              Trigger-Based Email Sequences For Your Call List
            </p>
          </div>

          {!creating ? (
            <BrandButton
              variant="solid"
              size="md"
              onClick={() => setCreating(true)}
              style={isMobile ? { width: '100%' } : {}}>
              + Create Campaign
            </BrandButton>
          ) : (
            <div style={{
              display: 'flex',
              gap: 8,
              flexDirection: isMobile ? 'column' : 'row',
              width: isMobile ? '100%' : 'auto',
            }}>
              <input autoFocus value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createCampaign() }}
                placeholder="CAMPAIGN NAME…"
                style={{
                  background: BRAND.bgCard,
                  color: BRAND.textPrimary,
                  border: `1px solid ${BRAND.border}`,
                  padding: '10px 14px',
                  fontSize: 11,
                  letterSpacing: '0.15em',
                  fontFamily: FONT_BODY,
                  minWidth: isMobile ? 0 : 260,
                  width: isMobile ? '100%' : 'auto',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = BRAND.borderGoldStrong }}
                onBlur={e => { e.target.style.borderColor = BRAND.border }} />
              <BrandButton variant="solid" size="md" onClick={createCampaign}>Create</BrandButton>
              <BrandButton variant="ghost" size="md" onClick={() => { setCreating(false); setNewName('') }}>
                Cancel
              </BrandButton>
            </div>
          )}
        </div>

        {loading ? (
          <Eyebrow color={BRAND.textDim}>Loading Campaigns…</Eyebrow>
        ) : campaigns.length === 0 ? (
          <div style={{
            position: 'relative',
            background: BRAND.bgCard,
            border: `1px dashed ${BRAND.border}`,
            padding: '60px 32px', textAlign: 'center',
          }}>
            <CornerBracket position="tl" />
            <CornerBracket position="tr" />
            <CornerBracket position="bl" />
            <CornerBracket position="br" />
            <Eyebrow color={BRAND.textMuted} style={{ fontSize: 11, letterSpacing: '0.3em', marginBottom: 12 }}>
              No Campaigns Yet
            </Eyebrow>
            <p style={{
              fontSize: 12, color: BRAND.textDim,
              fontFamily: FONT_BODY, fontStyle: 'italic',
              marginTop: 8,
            }}>
              Create your first email automation to start nurturing leads.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {campaigns.map(c => {
              const cs = stats[c.id] || { enrolled: 0, booked: 0, completed: 0 }
              const isActive = (c.status || 'draft') === 'active'
              return (
                <div key={c.id}
                  style={{
                    position: 'relative',
                    background: BRAND.bgCard,
                    border: `1px solid ${BRAND.border}`,
                    padding: isMobile ? '16px 14px' : '20px 24px',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = BRAND.borderGold }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BRAND.border }}>

                  <CornerBracket position="tl" size={14} />
                  <CornerBracket position="tr" size={14} />
                  <CornerBracket position="bl" size={14} />
                  <CornerBracket position="br" size={14} />

                  {/* Top row: name + status + meta */}
                  <div style={{
                    display: 'flex',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: isMobile ? 10 : 14,
                    marginBottom: isMobile ? 12 : 16,
                    flexWrap: 'wrap',
                    flexDirection: isMobile ? 'column' : 'row',
                  }}>
                    <Link href={`/email-automation/${c.id}`}
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 22, fontWeight: 400,
                        color: BRAND.textPrimary,
                        textDecoration: 'none',
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = BRAND.gold }}
                      onMouseLeave={e => { e.currentTarget.style.color = BRAND.textPrimary }}>
                      {c.name}
                    </Link>

                    {/* Status pill toggle */}
                    <div style={{
                      display: 'flex', gap: 0,
                      border: `1px solid ${BRAND.border}`,
                    }}>
                      {[
                        { key: 'draft',  label: 'Draft' },
                        { key: 'active', label: 'Published' },
                      ].map((opt, i) => {
                        const active = (c.status || 'draft') === opt.key
                        const color = opt.key === 'active' ? BRAND.gold : BRAND.textSecondary
                        return (
                          <button key={opt.key}
                            onClick={() => updateStatus(c.id, opt.key)}
                            style={{
                              background: active
                                ? (opt.key === 'active' ? BRAND.gold : BRAND.bgRaised)
                                : 'transparent',
                              color: active
                                ? (opt.key === 'active' ? '#000' : color)
                                : BRAND.textDim,
                              border: 'none',
                              borderLeft: i > 0 ? `1px solid ${BRAND.border}` : 'none',
                              padding: '4px 12px',
                              fontSize: 9, fontWeight: 700,
                              letterSpacing: '0.2em', textTransform: 'uppercase',
                              fontFamily: FONT_BODY,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}>
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Trigger + Created meta */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? 8 : 10,
                      fontSize: 10, color: BRAND.textMuted,
                      fontFamily: FONT_BODY,
                      letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
                      marginLeft: isMobile ? 0 : 'auto',
                      flexWrap: 'wrap',
                    }}>
                      {c.trigger_tag ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>Triggers On</span>
                          <span style={{
                            color: TAG_COLORS[c.trigger_tag],
                            background: `${TAG_COLORS[c.trigger_tag]}1f`,
                            border: `1px solid ${TAG_COLORS[c.trigger_tag]}55`,
                            padding: '3px 10px',
                            fontWeight: 700,
                            letterSpacing: '0.2em',
                          }}>{c.trigger_tag}</span>
                        </span>
                      ) : (
                        <span style={{ color: BRAND.textDim }}>No Trigger Set</span>
                      )}
                      <span style={{ color: BRAND.textDim }}>·</span>
                      <span>Created {timeAgo(c.created_at)}</span>
                    </div>
                  </div>

                  {/* Bottom row: stats + actions */}
                  <div style={{
                    display: 'flex',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? 12 : 18,
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    flexDirection: isMobile ? 'column' : 'row',
                  }}>
                    {/* Stat ribbon */}
                    <div style={{
                      display: 'flex',
                      background: BRAND.bgRaised,
                      border: `1px solid ${BRAND.border}`,
                      width: isMobile ? '100%' : 'auto',
                      justifyContent: isMobile ? 'space-around' : 'flex-start',
                    }}>
                      <StatCell value={cs.enrolled}  label="Enrolled"  color={BRAND.gold} />
                      <StatCell value={cs.booked}    label="Booked"    color={BRAND.statusBooked} />
                      <StatCell value={cs.completed} label="Completed" color={BRAND.textSecondary} last />
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      width: isMobile ? '100%' : 'auto',
                    }}>
                      <Link href={`/email-automation/${c.id}/enrolled`} style={{ textDecoration: 'none', flex: isMobile ? 1 : 'initial' }}>
                        <BrandButton
                          variant="ghost"
                          size="sm"
                          style={{
                            color: BRAND.statusNew,
                            borderColor: 'rgba(74,144,217,0.33)',
                            width: isMobile ? '100%' : 'auto',
                          }}>
                          {isMobile ? 'Stats' : 'Enrollment Stats'}
                        </BrandButton>
                      </Link>
                      <Link href={`/email-automation/${c.id}`} style={{ textDecoration: 'none', flex: isMobile ? 1 : 'initial' }}>
                        <BrandButton variant="primary" size="sm" style={{ width: isMobile ? '100%' : 'auto' }}>
                          Edit →
                        </BrandButton>
                      </Link>
                      <BrandButton
                        variant="danger"
                        size="sm"
                        onClick={() => deleteCampaign(c.id)}
                        style={{ flex: isMobile ? 1 : 'initial' }}>
                        Delete
                      </BrandButton>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageBackground>
  )
}