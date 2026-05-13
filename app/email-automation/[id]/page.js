'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  TAG_COLORS,
  Eyebrow, GoldRule, DisplayHeading, PageBackground, PageHeader, BrandButton,
  CornerBracket,
} from '@/lib/brand'

const TAGS = ['uncalled', 'called once', 'called twice', 'called three times', 'call back', 'not interested', 'booked']

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
  email: { label: 'Send Email', color: BRAND.gold },
  sms:   { label: 'Send SMS',   color: BRAND.statusNew },
  wait:  { label: 'Wait',       color: BRAND.statusQualifying },
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB
const MAX_TOTAL_SIZE = 25 * 1024 * 1024 // 25 MB

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ─── Generic input styling helper ─────────────────────────────────────────
function InputLabel({ children }) {
  return (
    <Eyebrow color={BRAND.textMuted} style={{ fontSize: 9, letterSpacing: '0.25em', marginBottom: 6 }}>
      {children}
    </Eyebrow>
  )
}

const baseInputStyle = {
  width: '100%',
  background: BRAND.bgInput,
  color: BRAND.textPrimary,
  border: `1px solid ${BRAND.border}`,
  padding: '10px 14px',
  fontSize: 13,
  outline: 'none',
  fontFamily: FONT_BODY,
  letterSpacing: '0.01em',
  transition: 'border-color 0.15s',
}

function focusInput(e) { e.target.style.borderColor = BRAND.borderGoldStrong }
function blurInput(e)  { e.target.style.borderColor = BRAND.border }

// ─── Section card wrapper ─────────────────────────────────────────────────
function SectionCard({ children, title, rightSlot, style = {} }) {
  return (
    <div style={{
      position: 'relative',
      background: BRAND.bgCard,
      border: `1px solid ${BRAND.border}`,
      ...style,
    }}>
      <CornerBracket position="tl" size={14} />
      <CornerBracket position="tr" size={14} />
      <CornerBracket position="bl" size={14} />
      <CornerBracket position="br" size={14} />

      {title && (
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${BRAND.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em' }}>{title}</Eyebrow>
            <GoldRule width={28} />
          </div>
          {rightSlot}
        </div>
      )}

      {children}
    </div>
  )
}

// ─── Rich text editor ─────────────────────────────────────────────────────
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
        background: BRAND.bgRaised, color: BRAND.textSecondary,
        border: `1px solid ${BRAND.border}`,
        padding: '4px 10px',
        fontSize: 11, cursor: 'pointer',
        fontFamily: FONT_BODY,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = BRAND.borderGoldStrong; e.currentTarget.style.color = BRAND.textPrimary }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BRAND.border; e.currentTarget.style.color = BRAND.textSecondary }}>
      {label}
    </button>
  )

  return (
    <div style={{ border: `1px solid ${BRAND.border}`, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: 8,
        borderBottom: `1px solid ${BRAND.border}`, background: BRAND.bgRaised,
      }}>
        <Btn cmd="bold"      label={<b>B</b>} />
        <Btn cmd="italic"    label={<i>I</i>} />
        <Btn cmd="underline" label={<u>U</u>} />
        <span style={{ width: 1, height: 18, background: BRAND.border, margin: '0 4px' }} />
        <Btn cmd="insertUnorderedList" label="• LIST" />
        <Btn cmd="insertOrderedList"   label="1. LIST" />
        <span style={{ width: 1, height: 18, background: BRAND.border, margin: '0 4px' }} />
        <Btn cmd="createLink" label="LINK" />
        <div style={{ position: 'relative', marginLeft: 'auto' }} ref={varsRef}>
          <button onClick={() => setShowVars(s => !s)}
            style={{
              background: showVars ? BRAND.gold : 'rgba(176, 131, 74, 0.13)',
              color: showVars ? '#000' : BRAND.gold,
              border: `1px solid ${BRAND.borderGoldStrong}`,
              padding: '4px 10px',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              fontFamily: FONT_BODY,
              cursor: 'pointer',
            }}>{'{{ }} Variable'}</button>
          {showVars && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: BRAND.bgRaised, border: `1px solid ${BRAND.borderStrong}`,
              zIndex: 100, minWidth: 240, padding: 4,
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}>
              {VARIABLES.map(v => (
                <div key={v.key}
                  onClick={() => insertVariable(v.key)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px',
                    cursor: 'pointer', fontSize: 11, color: BRAND.textSecondary,
                    fontFamily: FONT_BODY,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = BRAND.bgCardHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{v.label}</span>
                  <code style={{
                    color: BRAND.gold, fontSize: 9,
                    fontFamily: 'monospace', letterSpacing: '0.05em',
                  }}>{`{{${v.key}}}`}</code>
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
          background: BRAND.bgInput, color: BRAND.textPrimary,
          padding: 14,
          minHeight: 160, maxHeight: 400, overflowY: 'auto',
          fontSize: 13, lineHeight: 1.6, outline: 'none',
          fontFamily: FONT_BODY,
          letterSpacing: '0.01em',
        }}
      />
    </div>
  )
}

// ─── Attachments field ────────────────────────────────────────────────────
function AttachmentsField({ attachments, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const totalSize = attachments.reduce((sum, a) => sum + (a.size || 0), 0)

  async function handleFiles(files) {
    setError('')
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    let runningTotal = totalSize

    for (const file of filesArray) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" is too large. Max 20MB per file.`)
        return
      }
      if (runningTotal + file.size > MAX_TOTAL_SIZE) {
        setError(`Total attachments would exceed 25MB.`)
        return
      }
      runningTotal += file.size
    }

    setUploading(true)
    const newAttachments = [...attachments]

    for (const file of filesArray) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`

      const { data, error: upErr } = await supabase.storage
        .from('campaign-attachments')
        .upload(path, file)

      if (upErr) {
        console.error('Upload error:', upErr)
        setError(`Failed to upload "${file.name}": ${upErr.message}`)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('campaign-attachments')
        .getPublicUrl(path)

      newAttachments.push({
        filename: file.name,
        url:      urlData.publicUrl,
        path:     path,
        size:     file.size,
        type:     file.type,
      })
    }

    onChange(newAttachments)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removeAttachment(idx) {
    const att = attachments[idx]
    if (att?.path) {
      supabase.storage.from('campaign-attachments').remove([att.path]).catch(() => {})
    }
    const next = attachments.filter((_, i) => i !== idx)
    onChange(next)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <InputLabel>
          Attachments {attachments.length > 0 && `(${attachments.length})`}
        </InputLabel>
        {totalSize > 0 && (
          <Eyebrow color={totalSize > MAX_TOTAL_SIZE * 0.9 ? BRAND.statusQualifying : BRAND.textDim}
            style={{ fontSize: 9, letterSpacing: '0.15em' }}>
            {formatFileSize(totalSize)} / 25 MB
          </Eyebrow>
        )}
      </div>

      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {attachments.map((att, i) => (
            <div key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: BRAND.bgInput,
                border: `1px solid ${BRAND.border}`,
                padding: '8px 12px',
              }}>
              <span style={{ fontSize: 13, color: BRAND.gold }}>📎</span>
              <a href={att.url} target="_blank" rel="noopener noreferrer"
                style={{
                  fontSize: 12, color: BRAND.textPrimary, textDecoration: 'none',
                  flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: FONT_BODY,
                }}>
                {att.filename}
              </a>
              <span style={{
                fontSize: 9, color: BRAND.textDim, flexShrink: 0,
                fontFamily: FONT_BODY,
                letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
              }}>
                {formatFileSize(att.size)}
              </span>
              <button onClick={() => removeAttachment(i)}
                style={{
                  background: 'transparent', border: 'none',
                  color: BRAND.statusDisqualified, cursor: 'pointer', fontSize: 14,
                  padding: '0 4px', flexShrink: 0,
                }}
                title="Remove">×</button>
            </div>
          ))}
        </div>
      )}

      <BrandButton variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        📎 {uploading ? 'Uploading…' : 'Attach File'}
      </BrandButton>

      <input ref={fileInputRef} type="file" multiple
        onChange={e => handleFiles(e.target.files)}
        style={{ display: 'none' }} />

      {error && (
        <p style={{
          fontSize: 11, color: BRAND.statusDisqualified, marginTop: 8,
          fontFamily: FONT_BODY,
        }}>{error}</p>
      )}
    </div>
  )
}

// ─── Step node ────────────────────────────────────────────────────────────
function StepNode({ step, index, total, onUpdate, onDelete, onMoveUp, onMoveDown, dragHandlers, isDragging }) {
  const type = STEP_TYPES[step.type]

  return (
    <div {...dragHandlers}
      style={{
        position: 'relative',
        background: BRAND.bgCard,
        border: `1px solid ${isDragging ? BRAND.gold : BRAND.border}`,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        transition: 'border-color 0.15s',
      }}>
      <CornerBracket position="tl" size={12} />
      <CornerBracket position="tr" size={12} />
      <CornerBracket position="bl" size={12} />
      <CornerBracket position="br" size={12} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottom: `1px solid ${BRAND.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ color: BRAND.textDim, fontSize: 14, flexShrink: 0 }}>⋮⋮</span>
          <div style={{
            width: 28, height: 28, borderRadius: 999, flexShrink: 0,
            background: 'transparent', color: type.color,
            border: `1px solid ${type.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_DISPLAY,
            fontSize: 13, fontWeight: 400,
            letterSpacing: '0.02em',
          }}>{index + 1}</div>
          <Eyebrow color={type.color} style={{ fontSize: 10, letterSpacing: '0.25em' }}>
            {type.label}
          </Eyebrow>
          <input
            value={step.name || ''}
            onChange={e => onUpdate({ ...step, name: e.target.value })}
            placeholder="Name this step…"
            style={{
              background: 'transparent', border: '1px solid transparent', outline: 'none',
              fontSize: 13, fontWeight: 500, color: BRAND.textPrimary,
              padding: '6px 10px',
              flex: 1, minWidth: 0, maxWidth: 400,
              fontFamily: FONT_BODY,
              letterSpacing: '0.01em',
              transition: 'all 0.15s',
            }}
            onMouseDown={e => e.stopPropagation()}
            onFocus={e => { e.target.style.background = BRAND.bgInput; e.target.style.borderColor = BRAND.borderGoldStrong }}
            onBlur={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <button onClick={onMoveUp} disabled={index === 0}
            style={{
              background: 'transparent', border: 'none',
              color: index === 0 ? BRAND.textDim : BRAND.textSecondary,
              cursor: index === 0 ? 'not-allowed' : 'pointer',
              padding: '6px 10px', fontSize: 14,
            }}>↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            style={{
              background: 'transparent', border: 'none',
              color: index === total - 1 ? BRAND.textDim : BRAND.textSecondary,
              cursor: index === total - 1 ? 'not-allowed' : 'pointer',
              padding: '6px 10px', fontSize: 14,
            }}>↓</button>
          <button onClick={onDelete}
            style={{
              background: 'transparent', border: 'none', color: BRAND.statusDisqualified,
              cursor: 'pointer', padding: '6px 10px', fontSize: 14,
            }}>✕</button>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {step.type === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <InputLabel>Subject Line</InputLabel>
              <input value={step.subject || ''} onChange={e => onUpdate({ ...step, subject: e.target.value })}
                placeholder="Quick question about your fitness..."
                style={baseInputStyle}
                onFocus={focusInput} onBlur={blurInput} />
            </div>
            <div>
              <InputLabel>Preview Text</InputLabel>
              <input value={step.preview || ''} onChange={e => onUpdate({ ...step, preview: e.target.value })}
                placeholder="Short preview shown in inbox..."
                style={baseInputStyle}
                onFocus={focusInput} onBlur={blurInput} />
            </div>
            <div>
              <InputLabel>Email Body</InputLabel>
              <RichTextEditor value={step.body || ''} onChange={body => onUpdate({ ...step, body })} />
            </div>

            <AttachmentsField
              attachments={step.attachments || []}
              onChange={attachments => onUpdate({ ...step, attachments })}
            />
          </div>
        )}

        {step.type === 'sms' && (
          <div>
            <InputLabel>SMS Message (160 Char Limit Recommended)</InputLabel>
            <textarea value={step.message || ''} onChange={e => onUpdate({ ...step, message: e.target.value })}
              placeholder="Hey {{first_name}}! Just checking in..."
              rows={3}
              style={{ ...baseInputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={focusInput} onBlur={blurInput} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{
                fontSize: 10, color: BRAND.textDim,
                fontFamily: FONT_BODY,
                letterSpacing: '0.05em',
              }}>
                Variables: {`{{first_name}} {{biggest_struggle}}`} etc.
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: (step.message || '').length > 160 ? BRAND.statusDisqualified : BRAND.textDim,
                fontFamily: FONT_BODY,
                letterSpacing: '0.1em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {(step.message || '').length} / 160
              </span>
            </div>
          </div>
        )}

        {step.type === 'wait' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Eyebrow color={BRAND.textMuted} style={{ fontSize: 10, letterSpacing: '0.2em' }}>Wait</Eyebrow>
            <input type="number" min="1"
              value={step.duration || 1}
              onChange={e => onUpdate({ ...step, duration: parseInt(e.target.value) || 1 })}
              style={{
                ...baseInputStyle,
                width: 80,
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
              }}
              onFocus={focusInput} onBlur={blurInput} />
            <select value={step.unit || 'days'}
              onChange={e => onUpdate({ ...step, unit: e.target.value })}
              style={{
                ...baseInputStyle,
                width: 'auto',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
              <option value="weeks">weeks</option>
            </select>
            <Eyebrow color={BRAND.textMuted} style={{ fontSize: 10, letterSpacing: '0.2em' }}>
              Before Next Step
            </Eyebrow>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add step button ──────────────────────────────────────────────────────
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
      <BrandButton
        variant={open ? 'solid' : 'primary'}
        size="md"
        onClick={() => setOpen(s => !s)}>
        + Add Step
      </BrandButton>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', marginTop: 8,
          background: BRAND.bgRaised, border: `1px solid ${BRAND.borderStrong}`,
          zIndex: 50, minWidth: 200, padding: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          {Object.entries(STEP_TYPES).map(([key, t]) => (
            <div key={key}
              onClick={() => { onAdd(key); setOpen(false) }}
              style={{
                padding: '10px 14px',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                cursor: 'pointer', color: BRAND.textSecondary,
                fontFamily: FONT_BODY,
                display: 'flex', alignItems: 'center', gap: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = BRAND.bgCardHover; e.currentTarget.style.color = t.color }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BRAND.textSecondary }}>
              <span style={{
                width: 6, height: 6, borderRadius: 999,
                background: t.color,
                boxShadow: `0 0 6px ${t.color}99`,
              }} />
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stat cell helper ─────────────────────────────────────────────────────
function StatCell({ value, label, color, last, href }) {
  const inner = (
    <>
      <span style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 24, fontWeight: 400,
        color, lineHeight: 1,
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</span>
      <Eyebrow color={BRAND.textMuted} style={{ fontSize: 8, letterSpacing: '0.25em' }}>
        {label}
      </Eyebrow>
    </>
  )

  const cellStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 6,
    padding: '10px 22px',
    borderRight: last ? 'none' : `1px solid ${BRAND.border}`,
    minWidth: 100,
    textDecoration: 'none',
  }

  if (href) {
    return <Link href={href} style={cellStyle}>{inner}</Link>
  }
  return <div style={cellStyle}>{inner}</div>
}

// ─── Main Builder ─────────────────────────────────────────────────────────
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
      name:        null,
      subject:     type === 'email' ? '' : null,
      preview:     type === 'email' ? '' : null,
      body:        type === 'email' ? '' : null,
      message:     type === 'sms' ? '' : null,
      duration:    type === 'wait' ? 1 : null,
      unit:        type === 'wait' ? 'days' : null,
      attachments: type === 'email' ? [] : null,
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
        name:        updated.name,
        subject:     updated.subject,
        preview:     updated.preview,
        body:        updated.body,
        message:     updated.message,
        duration:    updated.duration,
        unit:        updated.unit,
        attachments: updated.attachments,
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
      <PageBackground style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Eyebrow color={BRAND.textDim}>Loading Campaign</Eyebrow>
          <div style={{ width: 32, height: 1, background: BRAND.gold }} />
        </div>
      </PageBackground>
    )
  }

  if (!campaign) {
    return (
      <PageBackground style={{ minHeight: '100vh' }}>
        <PageHeader
          pageLabel="Campaign Builder"
          leftSlot={
            <Link href="/email-automation" style={{ textDecoration: 'none' }}>
              <BrandButton variant="ghost" size="sm">← All Campaigns</BrandButton>
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

  return (
    <PageBackground style={{ minHeight: '100vh' }}>

      <PageHeader
        pageLabel="Campaign Builder"
        leftSlot={
          <Link href="/email-automation" style={{ textDecoration: 'none' }}>
            <BrandButton variant="ghost" size="sm">← All Campaigns</BrandButton>
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

      <div style={{ padding: '24px 24px 40px', maxWidth: 1000, margin: '0 auto' }}>

        {/* Title + Stats bar */}
        <div style={{
          position: 'relative',
          background: BRAND.bgCard,
          border: `1px solid ${BRAND.border}`,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 24, flexWrap: 'wrap',
        }}>
          <CornerBracket position="tl" size={14} />
          <CornerBracket position="tr" size={14} />
          <CornerBracket position="bl" size={14} />
          <CornerBracket position="br" size={14} />

          <div>
            <Eyebrow style={{ fontSize: 10, letterSpacing: '0.35em', marginBottom: 8 }}>
              Editing Campaign
            </Eyebrow>
            <DisplayHeading size={26}>
              {campaign.name || 'Untitled'}
            </DisplayHeading>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            flexWrap: 'wrap', justifyContent: 'flex-end',
          }}>
            <div style={{
              display: 'flex',
              background: BRAND.bgRaised,
              border: `1px solid ${BRAND.border}`,
            }}>
              <StatCell value={stats.enrolled}  label="Enrolled"  color={BRAND.gold}          href={`/email-automation/${id}/enrolled`} />
              <StatCell value={stats.booked}    label="Booked"    color={BRAND.statusBooked}  />
              <StatCell value={stats.completed} label="Completed" color={BRAND.textSecondary} last />
            </div>
            <Link href={`/email-automation/${id}/enrolled`} style={{ textDecoration: 'none' }}>
              <BrandButton variant="ghost" size="sm" style={{ color: BRAND.statusNew, borderColor: 'rgba(74,144,217,0.33)' }}>
                Enrollment Details →
              </BrandButton>
            </Link>
          </div>
        </div>

        {/* Campaign settings */}
        <SectionCard
          title="Campaign Settings"
          style={{ marginBottom: 24 }}
          rightSlot={
            <div style={{
              display: 'flex', gap: 0,
              border: `1px solid ${BRAND.border}`,
            }}>
              {[
                { key: 'draft',  label: 'Draft' },
                { key: 'active', label: 'Published' },
              ].map((s, i) => {
                const active = (campaign.status || 'draft') === s.key
                return (
                  <button key={s.key}
                    onClick={() => updateField('status', s.key)}
                    style={{
                      background: active
                        ? (s.key === 'active' ? BRAND.gold : BRAND.bgRaised)
                        : 'transparent',
                      color: active
                        ? (s.key === 'active' ? '#000' : BRAND.textPrimary)
                        : BRAND.textDim,
                      border: 'none',
                      borderLeft: i > 0 ? `1px solid ${BRAND.border}` : 'none',
                      padding: '6px 16px',
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      fontFamily: FONT_BODY,
                      cursor: 'pointer',
                    }}>
                    {s.label}
                  </button>
                )
              })}
            </div>
          }>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <InputLabel>Campaign Name</InputLabel>
              <input value={campaign.name || ''}
                onChange={e => updateField('name', e.target.value)}
                style={baseInputStyle}
                onFocus={focusInput} onBlur={blurInput} />
            </div>

            <div>
              <InputLabel>Trigger — Fires When Contact Is Tagged</InputLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TAGS.map(t => {
                  const isActive = campaign.trigger_tag === t
                  return (
                    <button key={t}
                      onClick={() => updateField('trigger_tag', isActive ? null : t)}
                      style={{
                        background: isActive ? `${TAG_COLORS[t]}1f` : 'transparent',
                        color: isActive ? TAG_COLORS[t] : BRAND.textMuted,
                        border: `1px solid ${isActive ? TAG_COLORS[t] : BRAND.border}`,
                        padding: '6px 12px',
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
              <p style={{
                fontSize: 10, marginTop: 10, color: BRAND.textDim,
                fontFamily: FONT_BODY,
                letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
              }}>
                Campaign Exits When: Lead Books A Call, Or Is Manually Removed
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div>
                <InputLabel>From Name</InputLabel>
                <input value={campaign.from_name || ''}
                  onChange={e => updateField('from_name', e.target.value)}
                  style={baseInputStyle}
                  onFocus={focusInput} onBlur={blurInput} />
              </div>
              <div>
                <InputLabel>From Email</InputLabel>
                <input value={campaign.from_email || ''}
                  onChange={e => updateField('from_email', e.target.value)}
                  style={baseInputStyle}
                  onFocus={focusInput} onBlur={blurInput} />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Sequence */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, marginTop: 24,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em' }}>Sequence</Eyebrow>
            <GoldRule width={28} />
          </div>
          <Eyebrow color={BRAND.textDim} style={{ fontSize: 9, letterSpacing: '0.2em' }}>
            {steps.length} Step{steps.length === 1 ? '' : 's'}
          </Eyebrow>
        </div>

        {steps.length === 0 ? (
          <div style={{
            position: 'relative',
            background: BRAND.bgCard,
            border: `1px dashed ${BRAND.border}`,
            padding: '50px 32px', textAlign: 'center', marginBottom: 16,
          }}>
            <CornerBracket position="tl" />
            <CornerBracket position="tr" />
            <CornerBracket position="bl" />
            <CornerBracket position="br" />
            <Eyebrow color={BRAND.textMuted} style={{ fontSize: 11, letterSpacing: '0.3em', marginBottom: 10 }}>
              No Steps Yet
            </Eyebrow>
            <p style={{
              fontSize: 12, color: BRAND.textDim,
              fontFamily: FONT_BODY, fontStyle: 'italic',
            }}>Add your first email, SMS, or wait step below.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
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
                    <div style={{ width: 1, height: 20, background: BRAND.border }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <AddStepButton onAdd={addStep} />

        {steps.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <div style={{
              background: BRAND.bgRaised, color: BRAND.textDim,
              border: `1px solid ${BRAND.border}`,
              padding: '5px 14px',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              fontFamily: FONT_BODY,
            }}>End Of Sequence</div>
          </div>
        )}
      </div>
    </PageBackground>
  )
}