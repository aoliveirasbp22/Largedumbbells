'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
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

const VARIABLES = [
  { key: 'first_name',       label: 'First name' },
  { key: 'last_name',        label: 'Last name' },
  { key: 'full_name',        label: 'Full name' },
  { key: 'email',            label: 'Email' },
  { key: 'phone',            label: 'Phone' },
  { key: 'country',          label: 'Country' },
  { key: 'biggest_struggle', label: 'Biggest struggle' },
  { key: 'would_invest',     label: 'Would invest answer' },
  { key: 'bothered',         label: 'Bothered score' },
  { key: 'age',              label: 'Age' },
]

const STEP_TYPES = {
  email: { label: 'Send email', color: '#B8935A' },
  sms:   { label: 'Send SMS',   color: '#378ADD' },
  wait:  { label: 'Wait',       color: '#F0A500' },
}

// ─── Rich text editor ───────────────────────────────────────────────────────
function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null)
  const [showVars, setShowVars] = useState(false)
  const varsRef = useRef(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || ''
    }
  }, [])

  useEffect(() => {
    if (!showVars) return
    function handler(e) {
      if (varsRef.current && !varsRef.current.contains(e.target)) setShowVars(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showVars])

  function handleInput() {
    onChange(editorRef.current?.innerHTML || '')
  }

  function exec(cmd) {
    if (cmd === 'createLink') {
      const url = prompt('Link URL:')
      if (url) document.execCommand('createLink', false, url)
    } else {
      document.execCommand(cmd, false, null)
    }
    handleInput()
    editorRef.current?.focus()
  }

  function insertVariable(key) {
    editorRef.current?.focus()
    document.execCommand('insertText', false, `{{${key}}}`)
    handleInput()
    setShowVars(false)
  }

  const Btn = ({ cmd, label }) => (
    <button onClick={() => exec(cmd)}
      style={{
        background: '#1a1a1a', color: '#aaa', border: '1px solid #333',
        padding: '4px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
      }}>{label}</button>
  )

  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: 8,
        borderBottom: '1px solid #222', background: '#0d0d0d',
      }}>
        <Btn cmd="bold"      label={<b>B</b>} />
        <Btn cmd="italic"    label={<i>I</i>} />
        <Btn cmd="underline" label={<u>U</u>} />
        <span style={{ width: 1, height: 18, background: '#222', margin: '0 4px' }} />
        <Btn cmd="insertUnorderedList" label="• List" />
        <Btn cmd="insertOrderedList"   label="1. List" />
        <span style={{ width: 1, height: 18, background: '#222', margin: '0 4px' }} />
        <Btn cmd="createLink" label="Link" />
        <div style={{ position: 'relative' }} ref={varsRef}>
          <button onClick={() => setShowVars(s => !s)}
            style={{
              background: '#B8935A22', color: '#B8935A', border: '1px solid #B8935A44',
              padding: '4px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
            }}>{'{{ }} Variable'}</button>
          {showVars && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
              zIndex: 100, minWidth: 220, padding: 6,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
              {VARIABLES.map(v => (
                <div key={v.key}
                  onClick={() => insertVariable(v.key)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: '#ccc',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#222'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{v.label}</span>
                  <code style={{ color: '#B8935A', fontSize: 10 }}>{`{{${v.key}}}`}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        style={{
          background: '#111', color: '#e0e0e0', padding: 12,
          minHeight: 160, maxHeight: 400, overflowY: 'auto',
          fontSize: 14, lineHeight: 1.6, outline: 'none',
        }}
      />
    </div>
  )
}

// ─── Step node ──────────────────────────────────────────────────────────────
function StepNode({ step, index, total, onUpdate, onDelete, onMoveUp, onMoveDown, dragHandlers, isDragging }) {
  const type = STEP_TYPES[step.type]

  return (
    <div {...dragHandlers}
      style={{
        background: '#111',
        border: `1px solid ${isDragging ? '#B8935A' : '#222'}`,
        borderRadius: 12,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
      }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ color: '#444', fontSize: 14, flexShrink: 0 }}>⋮⋮</span>
          <div style={{
            width: 24, height: 24, borderRadius: 999, flexShrink: 0,
            background: `${type.color}22`, color: type.color,
            border: `1px solid ${type.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>{index + 1}</div>
          <span style={{
            fontSize: 10, color: type.color, textTransform: 'uppercase',
            letterSpacing: '0.05em', fontWeight: 600, flexShrink: 0,
          }}>{type.label}</span>
          <input
            value={step.name || ''}
            onChange={e => onUpdate({ ...step, name: e.target.value })}
            placeholder="Name this step…"
            style={{
              background: 'transparent', border: '1px solid transparent', outline: 'none',
              fontSize: 14, fontWeight: 500, color: '#e0e0e0',
              padding: '4px 8px', borderRadius: 4,
              flex: 1, minWidth: 0, maxWidth: 400,
            }}
            onMouseDown={e => e.stopPropagation()}
            onFocus={e => { e.target.style.background = '#0d0d0d'; e.target.style.borderColor = '#333' }}
            onBlur={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button onClick={onMoveUp} disabled={index === 0}
            style={{
              background: 'transparent', border: 'none',
              color: index === 0 ? '#333' : '#888',
              cursor: index === 0 ? 'not-allowed' : 'pointer',
              padding: '4px 8px', fontSize: 12,
            }}>↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            style={{
              background: 'transparent', border: 'none',
              color: index === total - 1 ? '#333' : '#888',
              cursor: index === total - 1 ? 'not-allowed' : 'pointer',
              padding: '4px 8px', fontSize: 12,
            }}>↓</button>
          <button onClick={onDelete}
            style={{
              background: 'transparent', border: 'none', color: '#E74C3C',
              cursor: 'pointer', padding: '4px 8px', fontSize: 12,
            }}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        {step.type === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, marginBottom: 4, display: 'block', color: '#888' }}>Subject line</label>
              <input value={step.subject || ''} onChange={e => onUpdate({ ...step, subject: e.target.value })}
                placeholder="Quick question about your fitness..."
                style={{
                  width: '100%', background: '#0d0d0d', color: '#e0e0e0',
                  border: '1px solid #333', padding: '8px 12px', borderRadius: 8,
                  fontSize: 14, outline: 'none',
                }} />
            </div>
            <div>
              <label style={{ fontSize: 11, marginBottom: 4, display: 'block', color: '#888' }}>Preview text</label>
              <input value={step.preview || ''} onChange={e => onUpdate({ ...step, preview: e.target.value })}
                placeholder="Short preview shown in inbox..."
                style={{
                  width: '100%', background: '#0d0d0d', color: '#e0e0e0',
                  border: '1px solid #333', padding: '8px 12px', borderRadius: 8,
                  fontSize: 14, outline: 'none',
                }} />
            </div>
            <div>
              <label style={{ fontSize: 11, marginBottom: 4, display: 'block', color: '#888' }}>Email body</label>
              <RichTextEditor value={step.body || ''} onChange={body => onUpdate({ ...step, body })} />
            </div>
          </div>
        )}

        {step.type === 'sms' && (
          <div>
            <label style={{ fontSize: 11, marginBottom: 4, display: 'block', color: '#888' }}>
              SMS message (160 char limit recommended)
            </label>
            <textarea value={step.message || ''} onChange={e => onUpdate({ ...step, message: e.target.value })}
              placeholder="Hey {{first_name}}! Just checking in..."
              rows={3}
              style={{
                width: '100%', background: '#0d0d0d', color: '#e0e0e0',
                border: '1px solid #333', padding: '8px 12px', borderRadius: 8,
                fontSize: 14, resize: 'vertical', outline: 'none',
              }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <p style={{ fontSize: 11, color: '#555' }}>
                Variables: {`{{first_name}} {{biggest_struggle}}`} etc.
              </p>
              <p style={{ fontSize: 11, color: (step.message || '').length > 160 ? '#E74C3C' : '#555' }}>
                {(step.message || '').length} / 160
              </p>
            </div>
          </div>
        )}

        {step.type === 'wait' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#aaa' }}>Wait</span>
            <input type="number" min="1"
              value={step.duration || 1}
              onChange={e => onUpdate({ ...step, duration: parseInt(e.target.value) || 1 })}
              style={{
                background: '#0d0d0d', color: '#e0e0e0',
                border: '1px solid #333', padding: '8px 12px', borderRadius: 8,
                fontSize: 14, width: 80, outline: 'none',
              }} />
            <select value={step.unit || 'days'}
              onChange={e => onUpdate({ ...step, unit: e.target.value })}
              style={{
                background: '#0d0d0d', color: '#e0e0e0',
                border: '1px solid #333', padding: '8px 12px', borderRadius: 8,
                fontSize: 14, outline: 'none',
              }}>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
              <option value="weeks">weeks</option>
            </select>
            <span style={{ fontSize: 14, color: '#aaa' }}>before next step</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add step button ────────────────────────────────────────────────────────
function AddStepButton({ onAdd }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
      <button onClick={() => setOpen(s => !s)}
        style={{
          background: open ? '#B8935A' : '#1a1a1a',
          color:      open ? '#000' : '#B8935A',
          border:     `1px solid ${open ? '#B8935A' : '#B8935A44'}`,
          padding:    '6px 14px', borderRadius: 999, fontSize: 12,
          fontWeight: 500, cursor: 'pointer',
        }}>
        + Add step
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', marginTop: 8,
          background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
          zIndex: 50, minWidth: 180, padding: 6,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {Object.entries(STEP_TYPES).map(([key, t]) => (
            <div key={key}
              onClick={() => { onAdd(key); setOpen(false) }}
              style={{
                padding: '6px 10px', borderRadius: 4, fontSize: 12,
                cursor: 'pointer', color: '#ccc',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#222'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: t.color }} />
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Builder ───────────────────────────────────────────────────────────
export default function CampaignBuilder() {
  const params = useParams()
  const id = params.id

  const [campaign, setCampaign] = useState(null)
  const [steps, setSteps] = useState([])
  const [stats, setStats] = useState({ enrolled: 0, booked: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const saveTimer = useRef(null)
  const stepSaveTimer = useRef(null)

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
      .from('campaign_enrollments').select('status').eq('campaign_id', id)
    const counts = { enrolled: 0, booked: 0, completed: 0 }
    ;(e || []).forEach(en => {
      if (en.status === 'active')    counts.enrolled++
      if (en.status === 'booked')    counts.booked++
      if (en.status === 'completed') counts.completed++
    })
    setStats(counts)

    setLoading(false)
  }

  function updateField(field, value) {
    setCampaign(prev => ({ ...prev, [field]: value }))
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('email_campaigns').update({ [field]: value }).eq('id', id)
      setSaving(false)
      setLastSaved(new Date())
    }, 700)
  }

  async function addStep(type) {
    const newStep = {
      campaign_id: id,
      position:    steps.length,
      type,
      name:     null,
      subject:  type === 'email' ? '' : null,
      preview:  type === 'email' ? '' : null,
      body:     type === 'email' ? '' : null,
      message:  type === 'sms' ? '' : null,
      duration: type === 'wait' ? 1 : null,
      unit:     type === 'wait' ? 'days' : null,
    }
    const { data, error } = await supabase
      .from('email_campaign_steps').insert(newStep).select().single()
    if (error) { console.error('Add step error:', error); return }
    setSteps(prev => [...prev, data])
  }

  function updateStep(index, updated) {
    setSteps(prev => prev.map((s, i) => i === index ? updated : s))
    clearTimeout(stepSaveTimer.current)
    stepSaveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('email_campaign_steps').update({
        name:     updated.name,
        subject:  updated.subject,
        preview:  updated.preview,
        body:     updated.body,
        message:  updated.message,
        duration: updated.duration,
        unit:     updated.unit,
      }).eq('id', updated.id)
      setSaving(false)
      setLastSaved(new Date())
    }, 800)
  }

  async function deleteStep(index) {
    if (!confirm('Delete this step?')) return
    const step = steps[index]
    await supabase.from('email_campaign_steps').delete().eq('id', step.id)
    const next = steps.filter((_, i) => i !== index)
    setSteps(next)
    await Promise.all(next.map((s, i) =>
      supabase.from('email_campaign_steps').update({ position: i }).eq('id', s.id)
    ))
  }

  async function reorderSteps(from, to) {
    if (from === to) return
    const next = [...steps]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setSteps(next)
    await Promise.all(next.map((s, i) =>
      supabase.from('email_campaign_steps').update({ position: i }).eq('id', s.id)
    ))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: 32, background: '#0a0a0a' }}>
        <p style={{ color: '#555', fontSize: 14 }}>Loading…</p>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div style={{ minHeight: '100vh', padding: 32, background: '#0a0a0a' }}>
        <p style={{ color: '#E74C3C', fontSize: 14, marginBottom: 8 }}>Campaign not found.</p>
        <Link href="/email-automation" style={{ color: '#B8935A', fontSize: 14 }}>
          ← Back to campaigns
        </Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid #222', padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#111',
      }}>

        {/* Left: Back button */}
        <Link href="/email-automation"
          style={{
            background: '#1a1a1a', color: '#B8935A',
            border: '1px solid #B8935A44', padding: '6px 12px',
            borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none',
          }}>← All campaigns</Link>

        {/* Center: Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <h1 style={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: 18, color: '#B8935A' }}>
            LARGE DUMBBELLS
          </h1>
          <p style={{ fontSize: 11, color: '#fff', fontWeight: 500, letterSpacing: '0.08em' }}>
            CAMPAIGN BUILDER
          </p>
        </div>

        {/* Right: save status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 180, justifyContent: 'flex-end' }}>
          {saving && <span style={{ fontSize: 12, color: '#555' }}>Saving…</span>}
          {!saving && lastSaved && (
            <span style={{ fontSize: 12, color: '#555' }}>
              Saved {lastSaved.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>

        {/* Stats bar at top */}
        <div style={{
          background: '#111', border: '1px solid #1a1a1a',
          borderRadius: 12, padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <Link href={`/email-automation/${id}/enrolled`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '4px 20px', textDecoration: 'none',
                borderRight: '1px solid #222',
              }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#B8935A' }}>{stats.enrolled}</span>
              <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrolled</span>
            </Link>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '4px 20px', borderRight: '1px solid #222',
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#2ECC71' }}>{stats.booked}</span>
              <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booked</span>
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '4px 20px',
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#888' }}>{stats.completed}</span>
              <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</span>
            </div>
          </div>
          <Link href={`/email-automation/${id}/enrolled`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#1a1a1a', color: '#378ADD',
              border: '1px solid #378ADD44', padding: '8px 14px',
              borderRadius: 8, fontSize: 12, textDecoration: 'none',
            }}>
            <span style={{ fontSize: 14 }}>📊</span>
            <span>View enrollment details →</span>
          </Link>
        </div>

        {/* Campaign settings */}
        <div style={{
          background: '#111', border: '1px solid #1a1a1a',
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#B8935A' }}>
              CAMPAIGN SETTINGS
            </p>

            {/* Status toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#0d0d0d', border: '1px solid #222',
              borderRadius: 999, padding: 3,
            }}>
              {[
                { key: 'draft',  label: 'Draft',     color: '#888' },
                { key: 'active', label: 'Published', color: '#B8935A' },
              ].map(s => {
                const isActive = (campaign.status || 'draft') === s.key
                return (
                  <button key={s.key}
                    onClick={() => updateField('status', s.key)}
                    style={{
                      background: isActive ? (s.key === 'active' ? '#B8935A' : '#2a2a2a') : 'transparent',
                      color:      isActive ? (s.key === 'active' ? '#000' : '#ccc') : '#666',
                      border:     'none',
                      padding:    '6px 14px',
                      borderRadius: 999,
                      fontSize:   11, fontWeight: 600,
                      cursor:     'pointer',
                      transition: 'all 0.15s',
                      letterSpacing: '0.03em',
                    }}>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, marginBottom: 4, display: 'block', color: '#888' }}>
                Campaign name
              </label>
              <input value={campaign.name || ''}
                onChange={e => updateField('name', e.target.value)}
                style={{
                  width: '100%', background: '#0d0d0d', color: '#e0e0e0',
                  border: '1px solid #333', padding: '8px 12px', borderRadius: 8,
                  fontSize: 14, outline: 'none',
                }} />
            </div>

            <div>
              <label style={{ fontSize: 11, marginBottom: 4, display: 'block', color: '#888' }}>
                Trigger — fires when contact is tagged
              </label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {TAGS.map(t => {
                  const isActive = campaign.trigger_tag === t
                  return (
                    <button key={t}
                      onClick={() => updateField('trigger_tag', isActive ? null : t)}
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
              <p style={{ fontSize: 11, marginTop: 8, color: '#555' }}>
                Campaign exits when: lead books a call, or is manually removed.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, marginBottom: 4, display: 'block', color: '#888' }}>From name</label>
                <input value={campaign.from_name || ''}
                  onChange={e => updateField('from_name', e.target.value)}
                  style={{
                    width: '100%', background: '#0d0d0d', color: '#e0e0e0',
                    border: '1px solid #333', padding: '8px 12px', borderRadius: 8,
                    fontSize: 14, outline: 'none',
                  }} />
              </div>
              <div>
                <label style={{ fontSize: 11, marginBottom: 4, display: 'block', color: '#888' }}>From email</label>
                <input value={campaign.from_email || ''}
                  onChange={e => updateField('from_email', e.target.value)}
                  style={{
                    width: '100%', background: '#0d0d0d', color: '#e0e0e0',
                    border: '1px solid #333', padding: '8px 12px', borderRadius: 8,
                    fontSize: 14, outline: 'none',
                  }} />
              </div>
            </div>
          </div>
        </div>

        {/* Sequence */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#B8935A' }}>
            SEQUENCE
          </p>
          <p style={{ fontSize: 11, color: '#555' }}>
            {steps.length} step{steps.length === 1 ? '' : 's'}
          </p>
        </div>

        {steps.length === 0 ? (
          <div style={{
            background: '#111', border: '1px dashed #333',
            borderRadius: 12, padding: 48, textAlign: 'center', marginBottom: 12,
          }}>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>No steps yet</p>
            <p style={{ fontSize: 12, color: '#555' }}>Add your first email, SMS, or wait step below.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            {steps.map((step, i) => (
              <div key={step.id}
                onDragOver={e => { e.preventDefault() }}
                onDrop={e => {
                  e.preventDefault()
                  if (dragIndex !== null && dragIndex !== i) reorderSteps(dragIndex, i)
                  setDragIndex(null)
                }}>
                <StepNode
                  step={step}
                  index={i}
                  total={steps.length}
                  onUpdate={u => updateStep(i, u)}
                  onDelete={() => deleteStep(i)}
                  onMoveUp={() => reorderSteps(i, i - 1)}
                  onMoveDown={() => reorderSteps(i, i + 1)}
                  isDragging={dragIndex === i}
                  dragHandlers={{
                    draggable: true,
                    onDragStart: e => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move' },
                    onDragEnd:   () => setDragIndex(null),
                  }}
                />
                {i < steps.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4, marginBottom: 4 }}>
                    <div style={{ width: 2, height: 16, background: '#222' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <AddStepButton onAdd={addStep} />

        {steps.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <div style={{
              background: '#0d0d0d', color: '#555',
              border: '1px solid #222', borderRadius: 999,
              padding: '4px 12px', fontSize: 11,
            }}>End of sequence</div>
          </div>
        )}
      </div>
    </div>
  )
}