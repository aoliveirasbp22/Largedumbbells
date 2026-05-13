'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { handleTagChange } from '@/lib/enrollments'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const TAGS = ['uncalled', 'called once', 'called twice', 'called three times', 'call back', 'not interested', 'booked']

const TAG_COLORS = {
  uncalled: '#555',
  'called once': '#378ADD',
  'called twice': '#F0A500',
  'called three times': '#E74C3C',
  'not interested': '#888',
  'call back': '#9B59B6',
  booked: '#2ECC71',
}

// Same field IDs as the call list — these are confirmed working
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
    <button
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      title="Copy"
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: copied ? '#2ECC71' : '#666', fontSize: 12, padding: '0 6px',
      }}>
      {copied ? '✓' : '⎘'}
    </button>
  )
}

function FieldRow({ label, value, copyable }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      padding: '12px 16px', borderBottom: '1px solid #1a1a1a',
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <p style={{ fontSize: 14, color: value ? '#e0e0e0' : '#444', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {value || '—'}
        </p>
        {copyable && value && <CopyButton value={value} />}
      </div>
    </div>
  )
}

export default function ContactProfile() {
  const params = useParams()
  const contactId = params.contactId

  const [contact, setContact] = useState(null)
  const [callLog, setCallLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const notesTimer = useRef(null)

  useEffect(() => { fetchAll() }, [contactId])

  async function fetchAll() {
    let ghlContact = null
    try {
      const res = await fetch('/api/ghl-contacts')
      const data = await res.json()
      ghlContact = (data.contacts || []).find(c => c.id === contactId) || null
    } catch (err) {
      console.error('GHL fetch error:', err)
    }
    setContact(ghlContact)

    const { data: logData } = await supabase
      .from('call_logs')
      .select('*')
      .eq('ghl_contact_id', contactId)
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
          .eq('ghl_contact_id', contactId)
      } else {
        const { data } = await supabase.from('call_logs')
          .insert({ ghl_contact_id: contactId, notes: value })
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
        .eq('ghl_contact_id', contactId)
        .select().single()
      setCallLog(data)
    } else {
      const { data } = await supabase.from('call_logs')
        .insert({ ghl_contact_id: contactId, tag: newTag, last_contacted: now })
        .select().single()
      setCallLog(data)
    }
    setLastSaved(new Date())

    // Trigger campaign enrollment logic
    handleTagChange(contactId, newTag)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: 32, background: '#0a0a0a' }}>
        <p style={{ color: '#555', fontSize: 14 }}>Loading…</p>
      </div>
    )
  }

  if (!contact) {
    return (
      <div style={{ minHeight: '100vh', padding: 32, background: '#0a0a0a' }}>
        <p style={{ color: '#E74C3C', fontSize: 14, marginBottom: 8 }}>Contact not found.</p>
        <Link href="/calls" style={{ color: '#B8935A', fontSize: 14 }}>
          ← Back to call list
        </Link>
      </div>
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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid #222', padding: '16px 32px',
        background: '#111',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Left: Back button */}
        <Link href="/calls"
          style={{
            background: '#1a1a1a', color: '#B8935A',
            border: '1px solid #B8935A44', padding: '6px 12px',
            borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none',
          }}>← Back to Outreach Pipeline</Link>

        {/* Center: Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <h1 style={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: 18, color: '#B8935A' }}>
            LARGE DUMBBELLS
          </h1>
          <p style={{ fontSize: 11, color: '#fff', fontWeight: 500, letterSpacing: '0.08em' }}>
            CONTACT PROFILE
          </p>
        </div>

        {/* Right: save status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, justifyContent: 'flex-end' }}>
          {saving && <span style={{ fontSize: 12, color: '#555' }}>Saving…</span>}
          {!saving && lastSaved && (
            <span style={{ fontSize: 12, color: '#555' }}>
              Saved {lastSaved.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>

        {/* Profile header */}
        <div style={{
          background: '#111', border: '1px solid #1a1a1a',
          borderRadius: 12, padding: 24, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 999,
            background: '#B8935A22', color: '#B8935A',
            border: '1px solid #B8935A44',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e0e0e0' }}>
                {fullName}
              </h2>
              <span style={{
                background: `${TAG_COLORS[tag]}33`,
                color:      TAG_COLORS[tag],
                border:     `1px solid ${TAG_COLORS[tag]}`,
                padding:    '3px 10px', borderRadius: 999,
                fontSize:   11, fontWeight: 500,
              }}>{tag}</span>
            </div>
            <p style={{ fontSize: 13, color: '#666' }}>
              {[country, age && `${age} years old`].filter(Boolean).join(' · ') || 'No location/age info'}
            </p>
          </div>
        </div>

        {/* Tag selector */}
        <div style={{
          background: '#111', border: '1px solid #1a1a1a',
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12, color: '#B8935A' }}>
            CALL STATUS
          </p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {TAGS.map(t => {
              const isActive = tag === t
              return (
                <button key={t}
                  onClick={() => updateTag(t)}
                  style={{
                    background: isActive ? `${TAG_COLORS[t]}33` : '#1a1a1a',
                    color:      isActive ? TAG_COLORS[t] : '#888',
                    border:     `1px solid ${isActive ? TAG_COLORS[t] : '#333'}`,
                    padding:    '4px 10px', borderRadius: 999,
                    fontSize:   12, cursor: 'pointer',
                  }}>{t}</button>
              )
            })}
          </div>
        </div>

        {/* Two-column grid: Contact + Survey */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{
            background: '#111', border: '1px solid #1a1a1a',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              padding: '16px 16px 12px', color: '#B8935A',
              borderBottom: '1px solid #1a1a1a',
            }}>CONTACT INFO</p>
            <FieldRow label="First name" value={firstName} />
            <FieldRow label="Last name"  value={lastName} />
            <FieldRow label="Email"      value={email} copyable />
            <FieldRow label="Phone"      value={phone} copyable />
            <FieldRow label="Country"    value={country} />
          </div>

          <div style={{
            background: '#111', border: '1px solid #1a1a1a',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              padding: '16px 16px 12px', color: '#B8935A',
              borderBottom: '1px solid #1a1a1a',
            }}>SURVEY ANSWERS</p>
            <FieldRow label="Age" value={age} />
            <FieldRow label="Biggest struggle" value={struggle} />
            <FieldRow label="Would invest" value={invest} />
            <FieldRow label="Bothered score" value={bothered} />
          </div>
        </div>

        {/* Notes */}
        <div style={{
          background: '#111', border: '1px solid #1a1a1a',
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12, color: '#B8935A' }}>
            NOTES
          </p>
          <textarea
            value={notes}
            onChange={e => updateNotes(e.target.value)}
            placeholder="Add notes about this contact..."
            rows={6}
            style={{
              width: '100%', background: '#0d0d0d', color: '#e0e0e0',
              border: '1px solid #333', padding: '10px 12px', borderRadius: 8,
              fontSize: 14, resize: 'vertical', outline: 'none', lineHeight: 1.5,
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
    </div>
  )
}