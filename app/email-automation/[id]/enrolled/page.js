'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, GoldRule, DisplayHeading, PageBackground, PageHeader, BrandButton,
  CornerBracket,
  useIsMobile,
} from '@/lib/brand'

const STEP_LABELS = {
  email: 'Send Email',
  sms:   'Send SMS',
  wait:  'Wait',
}

const STEP_COLORS = {
  email: BRAND.gold,
  sms:   BRAND.statusNew,
  wait:  BRAND.statusQualifying,
}

function stepSummary(step) {
  if (step.type === 'email') return step.subject || '(no subject)'
  if (step.type === 'sms')   return step.message || '(no message)'
  if (step.type === 'wait')  return `${step.duration || 1} ${step.unit || 'days'}`
  return ''
}

export default function EnrolledPage() {
  const isMobile = useIsMobile()
  const params = useParams()
  const id = params.id

  const [campaign, setCampaign] = useState(null)
  const [steps, setSteps] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [contactsById, setContactsById] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const { data: c } = await supabase
      .from('email_campaigns').select('*').eq('id', id).single()
    setCampaign(c)

    const { data: s } = await supabase
      .from('email_campaign_steps').select('*').eq('campaign_id', id)
      .order('position', { ascending: true })
    setSteps(s || [])

    const { data: e } = await supabase
      .from('campaign_enrollments').select('*')
      .eq('campaign_id', id).eq('status', 'active')
    setEnrollments(e || [])

    // Fetch GHL contacts to resolve names
    try {
      const res = await fetch('/api/ghl-contacts')
      const data = await res.json()
      const map = {}
      ;(data.contacts || []).forEach(c => { map[c.id] = c })
      setContactsById(map)
    } catch (err) {
      console.error('Failed to fetch GHL contacts:', err)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <PageBackground style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Eyebrow color={BRAND.textDim}>Loading</Eyebrow>
          <div style={{ width: 32, height: 1, background: BRAND.gold }} />
        </div>
      </PageBackground>
    )
  }

  if (!campaign) {
    return (
      <PageBackground style={{ minHeight: '100vh' }}>
        <PageHeader
          pageLabel="Enrollment Details"
          leftSlot={
            <Link href="/email-automation" style={{ textDecoration: 'none' }}>
              <BrandButton variant="ghost" size="sm">← Campaigns</BrandButton>
            </Link>
          }
        />
        <div style={{ padding: 80, textAlign: 'center' }}>
          <Eyebrow color={BRAND.statusDisqualified} style={{ fontSize: 11, letterSpacing: '0.3em', marginBottom: 16 }}>
            Campaign Not Found
          </Eyebrow>
          <Link href="/email-automation" style={{ textDecoration: 'none' }}>
            <BrandButton variant="primary" size="md">← Back To Campaigns</BrandButton>
          </Link>
        </div>
      </PageBackground>
    )
  }

  const byStep = {}
  steps.forEach((_, i) => { byStep[i] = [] })
  enrollments.forEach(e => {
    if (byStep[e.current_step] === undefined) byStep[e.current_step] = []
    byStep[e.current_step].push(e)
  })

  return (
    <PageBackground style={{ minHeight: '100vh' }}>

      <PageHeader
        pageLabel="Enrollment Details"
        leftSlot={
          <Link href={`/email-automation/${id}`} style={{ textDecoration: 'none' }}>
            <BrandButton variant="ghost" size="sm">
              {isMobile ? '← Campaign' : '← Back To Campaign'}
            </BrandButton>
          </Link>
        }
        rightSlot={<div style={{ minWidth: isMobile ? 0 : 150 }} />}
      />

      <div style={{
        padding: isMobile ? '20px 14px' : '32px 24px',
        maxWidth: 1000, margin: '0 auto',
      }}>

        {/* Hero title */}
        <div style={{ marginBottom: isMobile ? 18 : 28 }}>
          <Eyebrow style={{ fontSize: 10, letterSpacing: '0.35em', marginBottom: 10 }}>
            {campaign.name || 'Untitled Campaign'}
          </Eyebrow>
          <DisplayHeading size={isMobile ? 28 : 36} style={{ marginBottom: 12 }}>
            Enrolled Contacts
          </DisplayHeading>
          <GoldRule width={40} />
          <p style={{
            fontSize: 11, marginTop: 14, color: BRAND.textMuted,
            fontFamily: FONT_BODY,
            letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            {enrollments.length} Contact{enrollments.length === 1 ? '' : 's'} Currently In This Campaign
          </p>
        </div>

        {steps.length === 0 ? (
          <div style={{
            position: 'relative',
            background: BRAND.bgCard,
            border: `1px dashed ${BRAND.border}`,
            padding: '50px 32px', textAlign: 'center',
          }}>
            <CornerBracket position="tl" />
            <CornerBracket position="tr" />
            <CornerBracket position="bl" />
            <CornerBracket position="br" />
            <Eyebrow color={BRAND.textMuted} style={{ fontSize: 11, letterSpacing: '0.3em', marginBottom: 12 }}>
              No Steps Yet
            </Eyebrow>
            <p style={{
              fontSize: 12, color: BRAND.textDim,
              fontFamily: FONT_BODY, fontStyle: 'italic',
            }}>Add steps in the campaign builder first.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, i) => {
              const contactsHere = byStep[i] || []
              const color = STEP_COLORS[step.type]
              const hasContacts = contactsHere.length > 0
              return (
                <div key={step.id}
                  style={{
                    position: 'relative',
                    background: BRAND.bgCard,
                    border: `1px solid ${BRAND.border}`,
                    overflow: 'hidden',
                  }}>
                  <CornerBracket position="tl" size={12} />
                  <CornerBracket position="tr" size={12} />
                  <CornerBracket position="bl" size={12} />
                  <CornerBracket position="br" size={12} />

                  {/* Step header */}
                  <div style={{
                    padding: isMobile ? '14px 12px' : 18,
                    borderBottom: `1px solid ${BRAND.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, flexWrap: 'wrap',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 999, flexShrink: 0,
                        background: 'transparent',
                        color, border: `1px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: FONT_DISPLAY,
                        fontSize: 14, fontWeight: 400,
                        letterSpacing: '0.02em',
                      }}>{i + 1}</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 600, color: BRAND.textPrimary,
                          fontFamily: FONT_BODY, letterSpacing: '0.02em',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {step.name || STEP_LABELS[step.type]}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Eyebrow color={color} style={{ fontSize: 9, letterSpacing: '0.25em' }}>
                            {STEP_LABELS[step.type]}
                          </Eyebrow>
                          <span style={{ color: BRAND.textDim, fontSize: 11 }}>·</span>
                          <span style={{
                            fontSize: 11, color: BRAND.textMuted,
                            fontFamily: FONT_BODY,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: 400,
                          }}>
                            {stepSummary(step)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      padding: '5px 12px',
                      background: hasContacts ? `${color}1f` : 'transparent',
                      color: hasContacts ? color : BRAND.textDim,
                      border: `1px solid ${hasContacts ? `${color}55` : BRAND.border}`,
                      fontFamily: FONT_BODY,
                      flexShrink: 0,
                    }}>
                      {contactsHere.length} Contact{contactsHere.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Contacts */}
                  <div style={{ padding: isMobile ? 12 : 18 }}>
                    {!hasContacts ? (
                      <p style={{
                        fontSize: 11, color: BRAND.textDim, fontStyle: 'italic',
                        fontFamily: FONT_BODY,
                        letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                      }}>
                        No One In This Step
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {contactsHere.map(c => {
                          const contact = contactsById[c.contact_id]
                          const name = contact?.contactName || 'Unknown Contact'
                          const email = contact?.email
                          const initial = (name || '?')[0].toUpperCase()
                          return (
                            <Link key={c.id}
                              href={`/calls/${c.contact_id}`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 14px',
                                background: BRAND.bgInput,
                                border: `1px solid ${BRAND.border}`,
                                fontFamily: FONT_BODY,
                                textDecoration: 'none',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = BRAND.borderGoldStrong
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = BRAND.border
                              }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                                background: 'transparent',
                                color: BRAND.gold,
                                border: `1px solid ${BRAND.borderGold}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700,
                                fontFamily: FONT_BODY,
                              }}>{initial}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                  fontSize: 13, fontWeight: 500,
                                  color: BRAND.textPrimary,
                                  letterSpacing: '0.01em',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {name}
                                </p>
                                {email && (
                                  <p style={{
                                    fontSize: 10, color: BRAND.textMuted, marginTop: 2,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    letterSpacing: '0.02em',
                                  }}>
                                    {email}
                                  </p>
                                )}
                              </div>
                              <span style={{ color: BRAND.textDim, fontSize: 14, flexShrink: 0 }}>→</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
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