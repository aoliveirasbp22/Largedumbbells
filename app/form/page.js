'use client'
import { useState } from 'react'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, GoldRule, DisplayHeading, PageBackground,
  CornerBracket, BrandButton,
  useIsMobile,
} from '@/lib/brand'

// ─── Country list ───────────────────────────────────────────────────────
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

const INITIAL = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  age: '',
  struggle: '',
  bothered_score: '',
  occupation: '',
  country: '',
}

function validate(v) {
  const errors = {}
  if (!v.first_name.trim())   errors.first_name = 'Required'
  if (!v.last_name.trim())    errors.last_name  = 'Required'
  if (!v.email.trim())        errors.email      = 'Required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = 'Enter a valid email'
  if (!v.phone.trim())        errors.phone      = 'Required'
  else if (String(v.phone).replace(/\D/g,'').length < 7) errors.phone = 'Enter a valid phone'
  if (!v.age)                 errors.age        = 'Required'
  else {
    const n = parseInt(v.age, 10)
    if (Number.isNaN(n) || n < 13 || n > 100) errors.age = 'Must be 13–100'
  }
  if (!v.struggle.trim())     errors.struggle   = 'Required'
  if (!v.bothered_score)      errors.bothered_score = 'Select a number'
  if (!v.occupation.trim())   errors.occupation = 'Required'
  if (!v.country)             errors.country    = 'Required'
  return errors
}

export default function FormPage() {
  const isMobile = useIsMobile()

  const [values, setValues]         = useState(INITIAL)
  const [errors, setErrors]         = useState({})
  const [website, setWebsite]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)
  const [submitError, setSubmitError] = useState('')

  function setField(key, v) {
    setValues(prev => ({ ...prev, [key]: v }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  async function onSubmit() {
    if (submitting) return
    const errs = validate(values)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0]
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${firstKey}"]`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, website }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError(
          data?.reason === 'rate_limited'
            ? 'Too many submissions. Please try again in an hour.'
            : 'Something went wrong. Please try again.'
        )
        setSubmitting(false)
        return
      }
      setDone(true)
    } catch {
      setSubmitError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  if (done) return <ThankYou isMobile={isMobile} />

  return (
    <PageBackground style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '20px 16px 16px' : '32px 32px 24px',
        borderBottom: `1px solid ${BRAND.border}`,
      }}>
        <div style={{
          maxWidth: 640, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <img
            src="/logo-large-dumbbells.png"
            alt=""
            style={{
              width: isMobile ? 40 : 48, height: isMobile ? 40 : 48,
              opacity: 0.95, flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ fontSize: 9, letterSpacing: '0.35em', marginBottom: 4 }}>
              Large Dumbbells
            </Eyebrow>
            <p style={{
              fontFamily: FONT_BODY,
              fontSize: 10, fontWeight: 700,
              color: BRAND.textDim,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              margin: 0,
            }}>The Busy Body Blueprint</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{
        padding: isMobile ? '24px 16px 120px' : '40px 32px 120px',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Intro */}
          <div style={{ marginBottom: isMobile ? 28 : 36 }}>
            <Eyebrow color={BRAND.textMuted} style={{
              fontSize: 10, letterSpacing: '0.35em', marginBottom: 10,
            }}>
              Get The Blueprint
            </Eyebrow>
            <DisplayHeading size={isMobile ? 28 : 36} style={{ marginBottom: 14, lineHeight: 1.15 }}>
              Tell Us About You
            </DisplayHeading>
            <GoldRule width={40} />
            <p style={{
              marginTop: 18,
              fontFamily: FONT_BODY,
              fontSize: 13, lineHeight: 1.6,
              color: BRAND.textSecondary,
              letterSpacing: '0.01em',
            }}>
              Fill out the form below to receive your Busy Body Blueprint.
            </p>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 18 : 22 }}>

            <Field dataField="first_name" label="First Name" error={errors.first_name}>
              <TextInput
                value={values.first_name}
                onChange={v => setField('first_name', v)}
                placeholder="First name"
                autoComplete="given-name"
                hasError={!!errors.first_name}
              />
            </Field>

            <Field dataField="last_name" label="Last Name" error={errors.last_name}>
              <TextInput
                value={values.last_name}
                onChange={v => setField('last_name', v)}
                placeholder="Last name"
                autoComplete="family-name"
                hasError={!!errors.last_name}
              />
            </Field>

            <Field dataField="email" label="Email" error={errors.email}>
              <TextInput
                type="email"
                value={values.email}
                onChange={v => setField('email', v)}
                placeholder="you@email.com"
                inputMode="email"
                autoComplete="email"
                hasError={!!errors.email}
              />
            </Field>

            <Field dataField="phone" label="Phone Number" error={errors.phone}>
              <TextInput
                type="tel"
                value={values.phone}
                onChange={v => setField('phone', v)}
                placeholder="+1 555 000 0000"
                inputMode="tel"
                autoComplete="tel"
                hasError={!!errors.phone}
              />
            </Field>

            <Field dataField="age" label="Age" error={errors.age}>
              <TextInput
                type="number"
                value={values.age}
                onChange={v => setField('age', v)}
                placeholder="Years"
                inputMode="numeric"
                hasError={!!errors.age}
              />
            </Field>

            <Field
              dataField="struggle"
              label="What has been your biggest struggle with fitness"
              error={errors.struggle}>
              <Textarea
                value={values.struggle}
                onChange={v => setField('struggle', v)}
                placeholder="Type your answer…"
                hasError={!!errors.struggle}
              />
            </Field>

            <Field
              dataField="bothered_score"
              label="How much are you bothered by how you look and feel"
              sublabel="1 = not at all · 5 = constantly"
              error={errors.bothered_score}>
              <ScalePicker
                value={parseInt(values.bothered_score, 10) || null}
                onChange={n => setField('bothered_score', n)}
                isMobile={isMobile}
              />
            </Field>

            <Field
              dataField="occupation"
              label="What do you do for work"
              error={errors.occupation}>
              <TextInput
                value={values.occupation}
                onChange={v => setField('occupation', v)}
                placeholder="Your occupation"
                hasError={!!errors.occupation}
              />
            </Field>

            <Field dataField="country" label="Country" error={errors.country}>
              <SelectInput
                value={values.country}
                onChange={v => setField('country', v)}
                hasError={!!errors.country}>
                <option value="" disabled style={{ background: BRAND.bgCard }}>
                  Choose your country
                </option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c} style={{ background: BRAND.bgCard, color: BRAND.textPrimary }}>
                    {c}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          {/* Honeypot */}
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

          {submitError && (
            <p style={{
              marginTop: 18,
              fontFamily: FONT_BODY,
              fontSize: 11, fontWeight: 600,
              color: BRAND.statusDisqualified,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              {submitError}
            </p>
          )}

        </div>
      </div>

      {/* Sticky submit */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: `linear-gradient(to top, ${BRAND.bg} 70%, transparent)`,
        padding: isMobile ? '16px 16px calc(16px + env(safe-area-inset-bottom))' : '20px 32px',
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <BrandButton
            variant="solid" size="md"
            onClick={onSubmit}
            disabled={submitting}
            style={{ width: '100%' }}>
            {submitting ? 'Sending…' : 'Get the Blueprint →'}
          </BrandButton>
        </div>
      </div>
    </PageBackground>
  )
}

// ─── Field wrapper ──────────────────────────────────────────────────────
function Field({ label, sublabel, error, children, dataField }) {
  return (
    <div data-field={dataField}>
      <Eyebrow color={BRAND.textSecondary} style={{
        fontSize: 9, letterSpacing: '0.25em', marginBottom: 8,
      }}>
        {label}
      </Eyebrow>
      {sublabel && (
        <p style={{
          fontFamily: FONT_BODY, fontSize: 10,
          color: BRAND.textDim,
          letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
          marginTop: -4, marginBottom: 10,
        }}>
          {sublabel}
        </p>
      )}
      {children}
      {error && (
        <p style={{
          marginTop: 6,
          fontFamily: FONT_BODY,
          fontSize: 10, fontWeight: 700,
          color: BRAND.statusDisqualified,
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          {error}
        </p>
      )}
    </div>
  )
}

function baseInputStyle(hasError) {
  return {
    width: '100%',
    background: BRAND.bgCard,
    color: BRAND.textPrimary,
    border: `1px solid ${hasError ? BRAND.statusDisqualified : BRAND.border}`,
    padding: '14px 16px',
    minHeight: 48,
    fontSize: 16,
    fontFamily: FONT_BODY,
    letterSpacing: '0.01em',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, background 0.15s',
  }
}

function makeFocusHandlers(hasError) {
  return {
    onFocus: e => {
      if (!hasError) e.target.style.borderColor = BRAND.borderGoldStrong
      e.target.style.background = BRAND.bgRaised
    },
    onBlur: e => {
      if (!hasError) e.target.style.borderColor = BRAND.border
      e.target.style.background = BRAND.bgCard
    },
  }
}

function TextInput({ value, onChange, type = 'text', placeholder, inputMode, autoComplete, hasError }) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete || 'off'}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={baseInputStyle(hasError)}
      {...makeFocusHandlers(hasError)}
    />
  )
}

function Textarea({ value, onChange, placeholder, hasError }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      style={{
        ...baseInputStyle(hasError),
        resize: 'vertical',
        minHeight: 100,
        lineHeight: 1.5,
      }}
      {...makeFocusHandlers(hasError)}
    />
  )
}

function SelectInput({ value, onChange, children, hasError }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        ...baseInputStyle(hasError),
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage:
          `linear-gradient(45deg, transparent 50%, ${BRAND.textMuted} 50%),
           linear-gradient(135deg, ${BRAND.textMuted} 50%, transparent 50%)`,
        backgroundPosition:
          `calc(100% - 22px) 50%, calc(100% - 16px) 50%`,
        backgroundSize: '6px 6px',
        backgroundRepeat: 'no-repeat',
        paddingRight: 40,
      }}
      {...makeFocusHandlers(hasError)}>
      {children}
    </select>
  )
}

function ScalePicker({ value, onChange, isMobile }) {
  return (
    <div style={{
      display: 'flex',
      gap: isMobile ? 6 : 10,
    }}>
      {[1, 2, 3, 4, 5].map(n => {
        const active = value === n
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              flex: 1,
              position: 'relative',
              background: active ? 'rgba(176, 131, 74, 0.13)' : BRAND.bgCard,
              color: active ? BRAND.gold : BRAND.textPrimary,
              border: `1px solid ${active ? BRAND.borderGoldStrong : BRAND.border}`,
              padding: isMobile ? '14px 0' : '18px 0',
              minHeight: 48,
              fontFamily: FONT_DISPLAY,
              fontSize: isMobile ? 18 : 22, fontWeight: 400,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'all 0.15s',
              textShadow: active ? `0 0 12px ${BRAND.goldGlow}` : 'none',
            }}>
            {active && <CornerBracket position="tl" size={7} />}
            {active && <CornerBracket position="tr" size={7} />}
            {active && <CornerBracket position="bl" size={7} />}
            {active && <CornerBracket position="br" size={7} />}
            {n}
          </button>
        )
      })}
    </div>
  )
}

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