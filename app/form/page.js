'use client'
import { useEffect, useRef, useState } from 'react'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, GoldRule, DisplayHeading, PageBackground,
  CornerBracket, BracketFrame, BrandButton,
  useIsMobile,
} from '@/lib/brand'

const STORAGE_KEY = 'ldFormProgress'

// ─── Country list (alphabetical) ────────────────────────────────────────
const COUNTRIES = [
  'United States','Canada','United Kingdom','Australia','New Zealand','Ireland',
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda',
  'Argentina','Armenia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh',
  'Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia',
  'Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso',
  'Burundi','Cambodia','Cameroon','Cape Verde','Central African Republic','Chad',
  'Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba',
  'Cyprus','Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia',
  'Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia',
  'Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau',
  'Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran',
  'Iraq','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya',
  'Kiribati','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia',
  'Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia',
  'Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico',
  'Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique',
  'Myanmar','Namibia','Nauru','Nepal','Netherlands','Nicaragua','Niger','Nigeria',
  'Norway','Oman','Pakistan','Palau','Panama','Papua New Guinea','Paraguay','Peru',
  'Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
  'Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia',
  'Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands',
  'Somalia','South Africa','South Sudan','Spain','Sri Lanka','Sudan','Suriname',
  'Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand',
  'Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey',
  'Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','Uruguay',
  'Uzbekistan','Vanuatu','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
]

// ─── Steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'first_name',     label: 'Your First Name',                           type: 'text',    placeholder: 'First name',  eyebrow: 'Step 1 of 9' },
  { key: 'last_name',      label: 'Your Last Name',                            type: 'text',    placeholder: 'Last name',   eyebrow: 'Step 2 of 9' },
  { key: 'email',          label: 'Email Address',                             type: 'email',   placeholder: 'you@email.com',eyebrow: 'Step 3 of 9' },
  { key: 'phone',          label: 'Phone Number',                              type: 'tel',     placeholder: '+1 555 000 0000', eyebrow: 'Step 4 of 9' },
  { key: 'age',            label: 'How Old Are You',                           type: 'number',  placeholder: 'Age in years', eyebrow: 'Step 5 of 9' },
  { key: 'struggle',       label: 'What Has Been Your Biggest Struggle With Fitness', type: 'textarea', placeholder: 'Type your answer…', eyebrow: 'Step 6 of 9' },
  { key: 'bothered_score', label: 'How Much Are You Bothered By How You Look and Feel',type: 'scale',    eyebrow: 'Step 7 of 9' },
  { key: 'occupation',     label: 'What Do You Do For Work',                   type: 'text',    placeholder: 'Your occupation', eyebrow: 'Step 8 of 9' },
  { key: 'country',        label: 'Where Are You Based',                       type: 'country', eyebrow: 'Step 9 of 9' },
]

// ─── Validation per step ────────────────────────────────────────────────
function validateStep(stepKey, value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 'This field is required'
  }
  if (stepKey === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email'
  }
  if (stepKey === 'phone') {
    const digits = String(value).replace(/\D/g, '')
    if (digits.length < 7) return 'Please enter a valid phone number'
  }
  if (stepKey === 'age') {
    const n = parseInt(value, 10)
    if (Number.isNaN(n) || n < 13 || n > 100) return 'Please enter an age between 13 and 100'
  }
  if (stepKey === 'bothered_score') {
    const n = parseInt(value, 10)
    if (Number.isNaN(n) || n < 1 || n > 5) return 'Please select a number'
  }
  return null
}

// ─── Main page ──────────────────────────────────────────────────────────
export default function FormPage() {
  const isMobile = useIsMobile()

  const [stepIdx, setStepIdx]    = useState(0)
  const [values, setValues]      = useState({})
  const [website, setWebsite]    = useState('')   // honeypot
  const [error, setError]        = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]          = useState(false)
  const [hydrated, setHydrated]  = useState(false)

  const isFinal = stepIdx === STEPS.length - 1
  const step    = STEPS[stepIdx]

  // ── Hydrate from localStorage once ─────────────────────────────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved && saved.values) {
        setValues(saved.values)
        if (typeof saved.stepIdx === 'number' && saved.stepIdx < STEPS.length) {
          setStepIdx(saved.stepIdx)
        }
      }
    } catch {}
    setHydrated(true)
  }, [])

  // ── Save progress on every change ──────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ stepIdx, values }))
    } catch {}
  }, [hydrated, stepIdx, values])

  // ── Step navigation ────────────────────────────────────────────────────
  function setValue(key, v) {
    setValues(prev => ({ ...prev, [key]: v }))
    setError('')
  }

  function next() {
    const val = values[step.key]
    const err = validateStep(step.key, val)
    if (err) { setError(err); return }
    setError('')
    if (isFinal) submit()
    else setStepIdx(i => i + 1)
  }

  function back() {
    setError('')
    setStepIdx(i => Math.max(0, i - 1))
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, website }),  // include honeypot
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.reason === 'rate_limited'
          ? 'Too many submissions. Please try again in an hour.'
          : 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      // Wipe localStorage on success
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      setDone(true)
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  if (done) return <ThankYou isMobile={isMobile} />

  const progressPct = ((stepIdx + 1) / STEPS.length) * 100

  return (
    <PageBackground style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Top bar — logo + progress */}
      <div style={{
        padding: isMobile ? '18px 16px 14px' : '24px 32px 18px',
        borderBottom: `1px solid ${BRAND.border}`,
        background: BRAND.bg,
      }}>
        <div style={{
          maxWidth: 760, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <img
            src="/logo-large-dumbbells.png"
            alt=""
            style={{ width: 36, height: 36, opacity: 0.95, flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ fontSize: 9, letterSpacing: '0.35em', marginBottom: 4 }}>
              Large Dumbbells
            </Eyebrow>
            <p style={{
              fontFamily: FONT_BODY,
              fontSize: 10, fontWeight: 600,
              color: BRAND.textDim,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: 0,
            }}>The Busy Body Blueprint</p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          maxWidth: 760, margin: '14px auto 0',
          height: 2,
          background: BRAND.border,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${progressPct}%`,
            background: BRAND.gold,
            boxShadow: `0 0 12px ${BRAND.goldGlow}`,
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      </div>

      {/* Step body */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '32px 16px 100px' : '60px 32px 100px',
      }}>
        <div style={{
          width: '100%', maxWidth: 640,
          position: 'relative',
        }}>
          <Eyebrow color={BRAND.textMuted} style={{
            fontSize: 10, letterSpacing: '0.35em', marginBottom: 14,
          }}>
            {step.eyebrow}
          </Eyebrow>

          <DisplayHeading
            size={isMobile ? 28 : 38}
            style={{ marginBottom: 14, lineHeight: 1.15 }}>
            {step.label}
          </DisplayHeading>

          <GoldRule width={40} />

          <div style={{ marginTop: 28 }}>
            <StepInput
              step={step}
              value={values[step.key] ?? ''}
              onChange={v => setValue(step.key, v)}
              onEnter={next}
              isMobile={isMobile}
            />

            {error && (
              <p style={{
                marginTop: 14,
                fontFamily: FONT_BODY,
                fontSize: 11, fontWeight: 600,
                color: BRAND.statusDisqualified,
                letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>
                {error}
              </p>
            )}
          </div>

          {/* Honeypot — visually hidden, only bots fill it */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-10000px', top: 'auto',
              width: 1, height: 1,
              overflow: 'hidden',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Sticky footer with Back / Next */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: BRAND.bg,
        borderTop: `1px solid ${BRAND.border}`,
        padding: isMobile ? '14px 16px' : '18px 32px',
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: 640, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {stepIdx > 0 ? (
            <BrandButton
              variant="ghost" size="md"
              onClick={back}
              disabled={submitting}>
              ← Back
            </BrandButton>
          ) : (
            <div style={{ flex: 1 }} />
          )}

          <div style={{ flex: 1 }} />

          <BrandButton
            variant="solid" size="md"
            onClick={next}
            disabled={submitting}>
            {submitting ? 'Sending…' : isFinal ? 'Get the Blueprint →' : 'Continue →'}
          </BrandButton>
        </div>
      </div>
    </PageBackground>
  )
}

// ─── The right input per step type ──────────────────────────────────────
function StepInput({ step, value, onChange, onEnter, isMobile }) {
  const ref = useRef(null)

  // Auto-focus on step change (desktop only — mobile would force keyboard up)
  useEffect(() => {
    if (!isMobile && ref.current && step.type !== 'scale' && step.type !== 'country') {
      ref.current.focus()
    }
  }, [step.key, isMobile, step.type])

  function onKeyDown(e) {
    if (e.key === 'Enter' && step.type !== 'textarea') {
      e.preventDefault()
      onEnter()
    }
  }

  const inputBase = {
    width: '100%',
    background: BRAND.bgCard,
    color: BRAND.textPrimary,
    border: `1px solid ${BRAND.border}`,
    padding: '14px 16px',
    fontSize: 16,           // 16px = no iOS auto-zoom
    fontFamily: FONT_BODY,
    letterSpacing: '0.01em',
    outline: 'none',
    transition: 'border-color 0.15s, background 0.15s',
  }

  function handleFocus(e) {
    e.target.style.borderColor = BRAND.borderGoldStrong
    e.target.style.background  = BRAND.bgRaised
  }
  function handleBlur(e) {
    e.target.style.borderColor = BRAND.border
    e.target.style.background  = BRAND.bgCard
  }

  // ── 1-5 scale picker ──────────────────────────────────────────────────
  if (step.type === 'scale') {
    return (
      <div>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 10,
        }}>
          {[1, 2, 3, 4, 5].map(n => {
            const active = parseInt(value, 10) === n
            return (
              <button
                key={n}
                onClick={() => onChange(n)}
                style={{
                  flex: 1,
                  position: 'relative',
                  background: active ? 'rgba(176, 131, 74, 0.13)' : BRAND.bgCard,
                  color: active ? BRAND.gold : BRAND.textPrimary,
                  border: `1px solid ${active ? BRAND.borderGoldStrong : BRAND.border}`,
                  padding: isMobile ? '14px 16px' : '20px 8px',
                  fontFamily: FONT_DISPLAY,
                  fontSize: isMobile ? 18 : 24,
                  fontWeight: 400,
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textShadow: active ? `0 0 12px ${BRAND.goldGlow}` : 'none',
                  display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.borderColor = BRAND.borderGold
                    e.currentTarget.style.background  = BRAND.bgRaised
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.borderColor = BRAND.border
                    e.currentTarget.style.background  = BRAND.bgCard
                  }
                }}>
                {active && <CornerBracket position="tl" size={8} />}
                {active && <CornerBracket position="tr" size={8} />}
                {active && <CornerBracket position="bl" size={8} />}
                {active && <CornerBracket position="br" size={8} />}
                <span style={{ position: 'relative' }}>
                  {n}
                </span>
                {isMobile && (
                  <span style={{
                    fontSize: 9,
                    letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700,
                    fontFamily: FONT_BODY,
                    color: active ? BRAND.gold : BRAND.textDim,
                    opacity: 0.85,
                  }}>
                    {n === 1 ? 'Not At All' : n === 5 ? 'Constantly' : ''}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {!isMobile && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 14,
          }}>
            <Eyebrow color={BRAND.textDim} style={{ fontSize: 9, letterSpacing: '0.2em' }}>
              Not At All
            </Eyebrow>
            <Eyebrow color={BRAND.textDim} style={{ fontSize: 9, letterSpacing: '0.2em' }}>
              Constantly
            </Eyebrow>
          </div>
        )}
      </div>
    )
  }

  // ── Country dropdown ──────────────────────────────────────────────────
  if (step.type === 'country') {
    return (
      <select
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          ...inputBase,
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage:
            `linear-gradient(45deg, transparent 50%, ${BRAND.textMuted} 50%),
             linear-gradient(135deg, ${BRAND.textMuted} 50%, transparent 50%)`,
          backgroundPosition:
            `calc(100% - 22px) 50%,
             calc(100% - 16px) 50%`,
          backgroundSize: '6px 6px',
          backgroundRepeat: 'no-repeat',
          paddingRight: 40,
        }}>
        <option value="" disabled style={{ background: BRAND.bgCard }}>
          Choose your country
        </option>
        {COUNTRIES.map(c => (
          <option key={c} value={c} style={{ background: BRAND.bgCard, color: BRAND.textPrimary }}>
            {c}
          </option>
        ))}
      </select>
    )
  }

  // ── Textarea (struggle question) ──────────────────────────────────────
  if (step.type === 'textarea') {
    return (
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={step.placeholder}
        rows={5}
        style={{ ...inputBase, resize: 'vertical', minHeight: 120, lineHeight: 1.5 }}
      />
    )
  }

  // ── Standard text/email/phone/number ──────────────────────────────────
  return (
    <input
      ref={ref}
      type={step.type}
      inputMode={step.type === 'number' ? 'numeric' : step.type === 'tel' ? 'tel' : step.type === 'email' ? 'email' : 'text'}
      autoComplete={
        step.key === 'first_name' ? 'given-name' :
        step.key === 'last_name'  ? 'family-name' :
        step.key === 'email'      ? 'email' :
        step.key === 'phone'      ? 'tel' :
        'off'
      }
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={step.placeholder}
      style={inputBase}
    />
  )
}

// ─── Thank You screen ───────────────────────────────────────────────────
function ThankYou({ isMobile }) {
  return (
    <PageBackground style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 480,
        background: BRAND.bgCard,
        border: `1px solid ${BRAND.border}`,
        padding: isMobile ? '40px 24px' : '56px 36px',
        textAlign: 'center',
      }}>
        <CornerBracket position="tl" />
        <CornerBracket position="tr" />
        <CornerBracket position="bl" />
        <CornerBracket position="br" />

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <img
            src="/logo-large-dumbbells.png"
            alt=""
            style={{ width: 56, height: 56, opacity: 0.95 }}
          />
        </div>

        <Eyebrow style={{ fontSize: 10, letterSpacing: '0.35em', marginBottom: 14 }}>
          Submission Received
        </Eyebrow>

        <DisplayHeading size={isMobile ? 30 : 38} style={{ marginBottom: 14 }}>
          Thank You
        </DisplayHeading>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <GoldRule width={40} />
        </div>

        <p style={{
          fontFamily: FONT_BODY,
          fontSize: 14, lineHeight: 1.6,
          color: BRAND.textSecondary,
          letterSpacing: '0.01em',
          margin: 0,
        }}>
          Your Busy Body Blueprint will be sent to your email shortly.
        </p>

        <p style={{
          marginTop: 28,
          fontFamily: FONT_BODY,
          fontSize: 9,
          color: BRAND.textDim,
          letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700,
        }}>
          Large Dumbbells
        </p>
      </div>
    </PageBackground>
  )
}