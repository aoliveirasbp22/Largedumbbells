'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { handleTagChange } from '@/lib/enrollments'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  TAG_COLORS,
  Eyebrow, GoldRule, DisplayHeading, PageBackground, PageHeader, BrandButton,
  CornerBracket,
  useIsMobile, formatPhone, phoneHref,
} from '@/lib/brand'

const TAGS = ['uncalled', 'called once', 'called twice', 'called three times', 'call back', 'not interested', 'booked']

// Legacy GHL custom-field IDs. Kept so the render code below can stay unchanged.
// fetchAll() synthesizes a customFields[] array with these IDs from Supabase columns,
// then getField() looks up by ID just like before.
const FIELD_IDS = {
  struggle: 'WtsEP55kDKmuYvjR3cRM',
  bothered: 'b9izCUDE2DcOqViZ6Da4',
  age:      'gvlEzRdj7FhoOw6Yk0p6',
  invest:   'xLhl7frOJAopwN0r94gX',
}

function getField(customFields, id) {
  return customFields?.find(f => f.id === id)?.value || null
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => {
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        }}
        title="Copy"
        style={{
          background: 'transparent',
          border: `1px solid ${BRAND.border}`,
          color: BRAND.textDim,
          padding: '2px 7px',
          fontSize: 11, lineHeight: 1.4,
          cursor: 'pointer',
          fontFamily: FONT_BODY,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = BRAND.gold; e.currentTarget.style.borderColor = BRAND.borderGoldStrong }}
        onMouseLeave={e => { e.currentTarget.style.color = BRAND.textDim; e.currentTarget.style.borderColor = BRAND.border }}>
        ⎘
      </button>
      {copied && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 4px)', left: '50%',
          transform: 'translateX(-50%)',
          background: BRAND.gold, color: '#000',
          padding: '3px 8px', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          fontFamily: FONT_BODY, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 20,
          boxShadow: `0 0 12px ${BRAND.goldGlow}`,
        }}>Copied</span>
      )}
    </div>
  )
}

function FieldRow({ label, value, displayValue, copyable, actionHref }) {
  const shown = displayValue ?? value
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: '14px 18px',
      borderBottom: `1px solid ${BRAND.border}`,
    }}>
      <Eyebrow color={BRAND.textMuted} style={{ fontSize: 9, letterSpacing: '0.25em' }}>
        {label}
      </Eyebrow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        {actionHref && value ? (
          <a
            href={actionHref}
            style={{
              fontSize: 13,
              color: BRAND.gold,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
              fontFamily: FONT_BODY,
              letterSpacing: '0.01em',
              flex: 1,
              textDecoration: 'none',
              borderBottom: '1px dotted transparent',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderBottomColor = BRAND.gold }}
            onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}>
            {shown}
          </a>
        ) : (
          <p style={{
            fontSize: 13,
            color: value ? BRAND.textPrimary : BRAND.textDim,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
            fontFamily: FONT_BODY,
            letterSpacing: '0.01em',
            flex: 1,
          }}>
            {shown || '—'}
          </p>
        )}
        {copyable && value && <CopyButton value={value} />}
      </div>
    </div>
  )
}

function SectionCard({ children, title, style = {} }) {
  return (
    <div style={{
      position: 'relative',
      background: BRAND.bgCard,
      border: `1px solid ${BRAND.border}`,
      overflow: 'hidden',
      ...style,
    }}>
      <CornerBracket position="tl" size={14} />
      <CornerBracket position="tr" size={14} />
      <CornerBracket position="bl" size={14} />
      <CornerBracket position="br" size={14} />

      {title && (
        <div style={{
          padding: '16px 18px 14px',
          borderBottom: `1px solid ${BRAND.border}`,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em' }}>{title}</Eyebrow>
          <GoldRule width={28} />
        </div>
      )}

      {children}
    </div>
  )
}

export default function ContactProfile() {
  const params = useParams()
  const contactId = params.id ?? params.contactId
  const isMobile = useIsMobile()

  const [contact, setContact] = useState(null)
  const [callLog, setCallLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const notesTimer = useRef(null)

  useEffect(() => { fetchAll() }, [contactId])

  async function fetchAll() {
    // Read lead from Supabase by UUID, then normalize to GHL-shape so the
    // render code below (which expects contactName, firstName, customFields[])
    // can stay unchanged.
    let normalized = null
    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', contactId)
        .maybeSingle()
      if (error) console.error('lead fetch error:', error)
      if (lead) {
        const name = lead.name || lead.ig_handle || ''
        const parts = name.split(' ')
        const firstName = parts[0] || ''
        const lastName  = parts.slice(1).join(' ') || ''
        normalized = {
          id:          lead.id,
          contactName: name,
          firstName,
          lastName,
          email:       lead.email || '',
          phone:       lead.phone || '',
          country:     lead.country || '',
          source:      lead.source || 'unknown',
          dateAdded:   lead.created_at,
          // Synthesize customFields[] so getField(cf, FIELD_IDS.x) works unchanged
          customFields: [
            { id: FIELD_IDS.struggle, value: lead.roadblock      ?? '' },
            { id: FIELD_IDS.invest,   value: lead.would_invest   ?? '' },
            { id: FIELD_IDS.bothered, value: lead.bothered_score != null ? String(lead.bothered_score) : '' },
            { id: FIELD_IDS.age,      value: lead.age            != null ? String(lead.age) : '' },
          ],
        }
      }
    } catch (err) {
      console.error('fetchAll error:', err)
    }
    setContact(normalized)

    // Load call_log by lead_id (uuid)
    const { data: logData } = await supabase
      .from('call_logs')
      .select('*')
      .eq('lead_id', contactId)
      .maybeSingle()

    setCallLog(logData)
    setNotes(logData?.notes || '')
    setLoading(false)
  }

  function updateNotes(value) {
    setNotes(value)
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(async () => {
      setSaving(true)
      const now = new Date().toISOString()
      if (callLog) {
        await supabase.from('call_logs')
          .update({ notes: value, updated_at: now })
          .eq('lead_id', contactId)
      } else {
        const { data } = await supabase.from('call_logs')
          .insert({ lead_id: contactId, notes: value })
          .select().single()
        setCallLog(data)
      }
      setSaving(false)
      setLastSaved(new Date())
    }, 800)
  }

  async function updateTag(newTag) {
    const now = new Date().toISOString()
    if (callLog) {
      const { data } = await supabase.from('call_logs')
        .update({ tag: newTag, last_contacted: now, updated_at: now })
        .eq('lead_id', contactId)
        .select().single()
      setCallLog(data)
    } else {
      const { data } = await supabase.from('call_logs')
        .insert({ lead_id: contactId, tag: newTag, last_contacted: now })
        .select().single()
      setCallLog(data)
    }
    setLastSaved(new Date())

    // Trigger campaign enrollment logic (UUID-aware)
    try {
      await handleTagChange(contactId, newTag)
    } catch (err) {
      console.error('handleTagChange error:', err)
    }
  }

  if (loading) {
    return (
      <PageBackground style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Eyebrow color={BRAND.textDim}>Loading Contact</Eyebrow>
          <div style={{ width: 32, height: 1, background: BRAND.gold }} />
        </div>
      </PageBackground>
    )
  }

  if (!contact) {
    return (
      <PageBackground style={{ minHeight: '100vh' }}>
        <PageHeader
          pageLabel="Contact Profile"
          leftSlot={
            <Link href="/calls" style={{ textDecoration: 'none' }}>
              <BrandButton variant="ghost" size="sm">← Outreach Pipeline</BrandButton>
            </Link>
          }
        />
        <div style={{
          padding: 80, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 16,
        }}>
          <Eyebrow color={BRAND.statusDisqualified} style={{ fontSize: 11, letterSpacing: '0.3em' }}>
            Contact Not Found
          </Eyebrow>
          <Link href="/calls" style={{ textDecoration: 'none' }}>
            <BrandButton variant="primary" size="md">← Back To List</BrandButton>
          </Link>
        </div>
      </PageBackground>
    )
  }

  const contactName = contact.contactName || ''
  const firstName = contact.firstName || (contactName.split(' ')[0] || '')
  const lastName  = contact.lastName  || (contactName.split(' ').slice(1).join(' ') || '')
  const fullName  = contactName || `${firstName} ${lastName}`.trim() || 'Unknown contact'
  const email     = contact.email
  const phone     = contact.phone
  const country   = contact.country
  const initials  = ((firstName[0] || contactName[0] || '?') + (lastName[0] || '')).toUpperCase()

  const cf       = contact.customFields || []
  const struggle = getField(cf, FIELD_IDS.struggle)
  const invest   = getField(cf, FIELD_IDS.invest)
  const bothered = getField(cf, FIELD_IDS.bothered)
  const age      = getField(cf, FIELD_IDS.age)

  const tag = callLog?.tag || 'uncalled'

  return (
    <PageBackground style={{ minHeight: '100vh' }}>

      <PageHeader
        pageLabel="Contact Profile"
        leftSlot={
          <Link href="/calls" style={{ textDecoration: 'none' }}>
            <BrandButton variant="ghost" size="sm">← Outreach Pipeline</BrandButton>
          </Link>
        }
        rightSlot={
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 10, fontFamily: FONT_BODY,
            letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            {saving && (
              <>
                <div style={{
                  width: 6, height: 6, borderRadius: 999,
                  background: BRAND.statusQualifying,
                  boxShadow: `0 0 6px ${BRAND.statusQualifying}99`,
                }} />
                <span style={{ color: BRAND.textMuted }}>Saving</span>
              </>
            )}
            {!saving && lastSaved && (
              <>
                <div style={{
                  width: 6, height: 6, borderRadius: 999,
                  background: BRAND.statusBooked,
                  boxShadow: `0 0 6px ${BRAND.statusBooked}99`,
                }} />
                <span style={{ color: BRAND.textMuted }}>
                  Saved {lastSaved.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </>
            )}
          </div>
        }
      />

      <div style={{
        padding: isMobile ? '20px 14px' : '32px 24px',
        maxWidth: 1100, margin: '0 auto',
      }}>

        {/* Profile hero card */}
        <div style={{
          position: 'relative',
          background: BRAND.bgCard,
          border: `1px solid ${BRAND.border}`,
          padding: isMobile ? '20px 18px' : '28px 32px',
          marginBottom: isMobile ? 16 : 24,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? 14 : 24,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <CornerBracket position="tl" />
          <CornerBracket position="tr" />
          <CornerBracket position="bl" />
          <CornerBracket position="br" />

          {/* Avatar */}
          <div style={{
            width: isMobile ? 60 : 80,
            height: isMobile ? 60 : 80,
            borderRadius: 999,
            background: 'transparent',
            color: BRAND.gold,
            border: `1px solid ${BRAND.borderGoldStrong}`,
            boxShadow: `0 0 20px ${BRAND.goldGlow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? 24 : 30,
            fontWeight: 400,
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ fontSize: 10, letterSpacing: '0.35em', marginBottom: 8 }}>
              Lead Profile
            </Eyebrow>
            <DisplayHeading
              size={isMobile ? 26 : 36}
              style={{ marginBottom: 8, wordBreak: 'break-word' }}>
              {fullName}
            </DisplayHeading>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: isMobile ? 10 : 14,
              flexWrap: 'wrap', marginTop: 12,
            }}>
              <span style={{
                background: `${TAG_COLORS[tag]}1f`,
                color: TAG_COLORS[tag],
                border: `1px solid ${TAG_COLORS[tag]}55`,
                padding: '5px 14px',
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: FONT_BODY,
              }}>{tag}</span>
              {(country || age) && (
                <span style={{
                  fontSize: 11, color: BRAND.textMuted,
                  fontFamily: FONT_BODY,
                  letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                }}>
                  {[country, age && `${age} Years Old`].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tag selector */}
        <SectionCard title="Call Status" style={{ marginBottom: isMobile ? 16 : 24 }}>
          <div style={{ padding: '18px 18px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TAGS.map(t => {
              const isActive = tag === t
              return (
                <button key={t}
                  onClick={() => updateTag(t)}
                  style={{
                    background: isActive ? `${TAG_COLORS[t]}1f` : 'transparent',
                    color: isActive ? TAG_COLORS[t] : BRAND.textMuted,
                    border: `1px solid ${isActive ? TAG_COLORS[t] : BRAND.border}`,
                    padding: '7px 14px',
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    fontFamily: FONT_BODY,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (isActive) return
                    e.currentTarget.style.borderColor = TAG_COLORS[t]
                    e.currentTarget.style.color = TAG_COLORS[t]
                  }}
                  onMouseLeave={e => {
                    if (isActive) return
                    e.currentTarget.style.borderColor = BRAND.border
                    e.currentTarget.style.color = BRAND.textMuted
                  }}>
                  {t}
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* Two-column grid: Contact + Survey */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: isMobile ? 12 : 16,
          marginBottom: isMobile ? 16 : 24,
        }}>
          <SectionCard title="Contact Info">
            <FieldRow label="First Name" value={firstName} />
            <FieldRow label="Last Name"  value={lastName} />
            <FieldRow label="Email"      value={email} copyable
              actionHref={email ? `mailto:${email}` : null} />
            <FieldRow label="Phone"      value={phone} copyable
              displayValue={phone ? formatPhone(phone) : null}
              actionHref={phone ? `tel:${phoneHref(phone)}` : null} />
            <FieldRow label="Country"    value={country} />
          </SectionCard>

          <SectionCard title="Survey Answers">
            <FieldRow label="Age" value={age} />
            <FieldRow label="Biggest Struggle" value={struggle} />
            <FieldRow label="Would Invest" value={invest} />
            <FieldRow label="Bothered Score" value={bothered} />
          </SectionCard>
        </div>

        {/* Notes */}
        <SectionCard title="Notes">
          <div style={{ padding: 18 }}>
            <textarea
              value={notes}
              onChange={e => updateNotes(e.target.value)}
              placeholder="Add notes about this contact…"
              rows={6}
              style={{
                width: '100%',
                background: BRAND.bgInput,
                color: BRAND.textPrimary,
                border: `1px solid ${BRAND.border}`,
                padding: '12px 14px',
                fontSize: 13,
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.6,
                fontFamily: FONT_BODY,
                letterSpacing: '0.01em',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = BRAND.borderGoldStrong }}
              onBlur={e => { e.target.style.borderColor = BRAND.border }}
            />
          </div>
        </SectionCard>

      </div>
    </PageBackground>
  )
}