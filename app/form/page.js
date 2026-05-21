'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, GoldRule, DisplayHeading, PageBackground,
  CornerBracket, BrandButton,
  useIsMobile,
} from '@/lib/brand'

// Country list (name only) for the Country typeahead at the bottom of the form.
// Prioritized English-speaking markets first, then alpha.
const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'New Zealand', 'Ireland',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh',
  'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso',
  'Burundi', 'Cambodia', 'Cameroon', 'Cape Verde', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba',
  'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
  'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
  'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia',
  'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia',
  'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
  'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'Nicaragua', 'Niger', 'Nigeria',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay',
  'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
  'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
  'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste',
  'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
]

// Country name -> international calling code. Used to auto-fill the phone
// country code when a country is selected, so US users (default +1) never
// touch it and others get the right code implicitly. Covers every COUNTRIES entry.
const COUNTRY_CALLING_CODES = {
  'United States':'1','Canada':'1','United Kingdom':'44','Australia':'61','New Zealand':'64','Ireland':'353',
  'Afghanistan':'93','Albania':'355','Algeria':'213','Andorra':'376','Angola':'244','Antigua and Barbuda':'1268',
  'Argentina':'54','Armenia':'374','Austria':'43','Azerbaijan':'994','Bahamas':'1242','Bahrain':'973','Bangladesh':'880',
  'Barbados':'1246','Belarus':'375','Belgium':'32','Belize':'501','Benin':'229','Bhutan':'975','Bolivia':'591',
  'Bosnia and Herzegovina':'387','Botswana':'267','Brazil':'55','Brunei':'673','Bulgaria':'359','Burkina Faso':'226',
  'Burundi':'257','Cambodia':'855','Cameroon':'237','Cape Verde':'238','Central African Republic':'236','Chad':'235',
  'Chile':'56','China':'86','Colombia':'57','Comoros':'269','Congo':'242','Costa Rica':'506','Croatia':'385','Cuba':'53',
  'Cyprus':'357','Czech Republic':'420','Denmark':'45','Djibouti':'253','Dominica':'1767','Dominican Republic':'1809',
  'Ecuador':'593','Egypt':'20','El Salvador':'503','Equatorial Guinea':'240','Eritrea':'291','Estonia':'372',
  'Eswatini':'268','Ethiopia':'251','Fiji':'679','Finland':'358','France':'33','Gabon':'241','Gambia':'220','Georgia':'995',
  'Germany':'49','Ghana':'233','Greece':'30','Grenada':'1473','Guatemala':'502','Guinea':'224','Guinea-Bissau':'245',
  'Guyana':'592','Haiti':'509','Honduras':'504','Hungary':'36','Iceland':'354','India':'91','Indonesia':'62','Iran':'98',
  'Iraq':'964','Israel':'972','Italy':'39','Jamaica':'1876','Japan':'81','Jordan':'962','Kazakhstan':'7','Kenya':'254',
  'Kiribati':'686','Kuwait':'965','Kyrgyzstan':'996','Laos':'856','Latvia':'371','Lebanon':'961','Lesotho':'266','Liberia':'231',
  'Libya':'218','Liechtenstein':'423','Lithuania':'370','Luxembourg':'352','Madagascar':'261','Malawi':'265','Malaysia':'60',
  'Maldives':'960','Mali':'223','Malta':'356','Marshall Islands':'692','Mauritania':'222','Mauritius':'230','Mexico':'52',
  'Micronesia':'691','Moldova':'373','Monaco':'377','Mongolia':'976','Montenegro':'382','Morocco':'212','Mozambique':'258',
  'Myanmar':'95','Namibia':'264','Nauru':'674','Nepal':'977','Netherlands':'31','Nicaragua':'505','Niger':'227','Nigeria':'234',
  'Norway':'47','Oman':'968','Pakistan':'92','Palau':'680','Panama':'507','Papua New Guinea':'675','Paraguay':'595',
  'Peru':'51','Philippines':'63','Poland':'48','Portugal':'351','Qatar':'974','Romania':'40','Russia':'7','Rwanda':'250',
  'Saint Kitts and Nevis':'1869','Saint Lucia':'1758','Saint Vincent and the Grenadines':'1784','Samoa':'685',
  'San Marino':'378','Sao Tome and Principe':'239','Saudi Arabia':'966','Senegal':'221','Serbia':'381','Seychelles':'248',
  'Sierra Leone':'232','Singapore':'65','Slovakia':'421','Slovenia':'386','Solomon Islands':'677','Somalia':'252',
  'South Africa':'27','South Sudan':'211','Spain':'34','Sri Lanka':'94','Sudan':'249','Suriname':'597','Sweden':'46',
  'Switzerland':'41','Syria':'963','Taiwan':'886','Tajikistan':'992','Tanzania':'255','Thailand':'66','Timor-Leste':'670',
  'Togo':'228','Tonga':'676','Trinidad and Tobago':'1868','Tunisia':'216','Turkey':'90','Turkmenistan':'993','Tuvalu':'688',
  'Uganda':'256','Ukraine':'380','United Arab Emirates':'971','Uruguay':'598','Uzbekistan':'998','Vanuatu':'678',
  'Venezuela':'58','Vietnam':'84','Yemen':'967','Zambia':'260','Zimbabwe':'263',
}

const INITIAL = {
  first_name: '',
  last_name: '',
  email: '',
  country_code: '1',
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

  // Country code: 1–4 digits (US/CA = 1, Caribbean = 4 digits like 1876)
  const ccDigits = String(v.country_code).replace(/\D/g, '')
  if (!ccDigits)              errors.country_code = 'Required'
  else if (ccDigits.length > 4) errors.country_code = 'Max 4 digits'

  if (!v.phone.trim())        errors.phone      = 'Required'
  else if (String(v.phone).replace(/\D/g,'').length < 6) errors.phone = 'Enter a valid phone'

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
  const router = useRouter()

  const [values, setValues]         = useState(INITIAL)
  const [errors, setErrors]         = useState({})
  const [website, setWebsite]       = useState('')
  const [submitting, setSubmitting] = useState(false)
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
      // Hard redirect to the post-submit landing page. We use window.location.assign
      // (full reload) rather than router.push (client-side nav) because /form/thanks
      // is a standalone page with its own <style> block — a clean load avoids any
      // chance of Next.js style/state bleed-through from the form.
      // submitting stays true until navigation completes, preventing double-submits.
      window.location.assign('/form/thanks')
    } catch {
      setSubmitError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

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
        padding: isMobile ? '24px 16px 40px' : '40px 32px 56px',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Intro */}
          <div style={{ marginBottom: isMobile ? 28 : 36 }}>
            <DisplayHeading size={isMobile ? 28 : 36} style={{ marginBottom: 14, lineHeight: 1.15 }}>
              Get The Blueprint
            </DisplayHeading>
            <GoldRule width={40} />
            <p style={{
              marginTop: 18,
              fontFamily: FONT_BODY,
              fontSize: 13, lineHeight: 1.6,
              color: BRAND.textSecondary,
              letterSpacing: '0.01em',
            }}>
              Fill out the form below to receive your Busy Body Blueprint. All fields required.
            </p>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 18 : 22 }}>

            <Field dataField="first_name" label="First Name" required error={errors.first_name}>
              <TextInput
                value={values.first_name}
                onChange={v => setField('first_name', v)}
                placeholder="First name"
                autoComplete="given-name"
                hasError={!!errors.first_name}
              />
            </Field>

            <Field dataField="last_name" label="Last Name" required error={errors.last_name}>
              <TextInput
                value={values.last_name}
                onChange={v => setField('last_name', v)}
                placeholder="Last name"
                autoComplete="family-name"
                hasError={!!errors.last_name}
              />
            </Field>

            <Field dataField="email" label="Email" required error={errors.email}>
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

            <Field
              dataField="country_code"
              label="Phone Number"
              sublabel="Country code + phone digits"
              required
              error={errors.country_code || errors.phone}>
              <PhoneInput
                countryCode={values.country_code}
                onCountryCodeChange={v => setField('country_code', v)}
                phone={values.phone}
                onPhoneChange={v => setField('phone', v)}
                hasCountryCodeError={!!errors.country_code}
                hasPhoneError={!!errors.phone}
              />
            </Field>

            <Field dataField="age" label="Age" required error={errors.age}>
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
              required
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
              required
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
              required
              error={errors.occupation}>
              <TextInput
                value={values.occupation}
                onChange={v => setField('occupation', v)}
                placeholder="Your occupation"
                hasError={!!errors.occupation}
              />
            </Field>

            <Field dataField="country" label="Country" required error={errors.country}>
              <CountryInput
                value={values.country}
                onChange={v => setField('country', v)}
                onCountrySelect={c => {
                  // When a known country is chosen, sync the phone country code to match.
                  const code = COUNTRY_CALLING_CODES[c]
                  if (code) setField('country_code', code)
                }}
                hasError={!!errors.country}
              />
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

      <div style={{
        padding: isMobile ? '0 16px 40px' : '0 32px 56px',
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
function Field({ label, sublabel, error, children, dataField, required }) {
  return (
    <div data-field={dataField}>
      <Eyebrow color={BRAND.textSecondary} style={{
        fontSize: 9, letterSpacing: '0.25em', marginBottom: 8,
      }}>
        {label}{required && <span style={{ color: BRAND.gold, marginLeft: 4 }}>*</span>}
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

// ─── Phone input: typed country code + digits ───────────────────────────
// Compact layout: "+" prefix, then a small country-code input (max 4 digits),
// then the phone digits input. Both digits-only.
function PhoneInput({ countryCode, onCountryCodeChange, phone, onPhoneChange, hasCountryCodeError, hasPhoneError }) {
  const hasError = hasCountryCodeError || hasPhoneError

  function handleCountryCodeChange(e) {
    // Strip non-digits and clamp to 4 chars
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
    onCountryCodeChange(digits)
  }

  function handlePhoneChange(e) {
    // Keep digits, spaces, dashes, parens — strip everything else
    // (The route normalizes to digits-only anyway, this just keeps display friendly.)
    const cleaned = e.target.value.replace(/[^\d\s\-()]/g, '')
    onPhoneChange(cleaned)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      gap: 0,
      border: `1px solid ${hasError ? BRAND.statusDisqualified : BRAND.border}`,
      background: BRAND.bgCard,
      transition: 'border-color 0.15s',
    }}>
      {/* + prefix */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 6px 0 12px',
        color: BRAND.textMuted,
        fontSize: 16,
        fontFamily: FONT_BODY,
        userSelect: 'none',
        flexShrink: 0,
      }}>+</div>

      {/* Country code (1-4 digits) */}
      <input
        type="tel"
        inputMode="numeric"
        value={countryCode}
        onChange={handleCountryCodeChange}
        placeholder="1"
        maxLength={4}
        autoComplete="off"
        aria-label="Country code"
        style={{
          width: 60,
          background: 'transparent',
          color: BRAND.textPrimary,
          border: 'none',
          borderRight: `1px solid ${BRAND.border}`,
          padding: '14px 8px',
          minHeight: 48,
          fontSize: 16,
          fontFamily: FONT_BODY,
          letterSpacing: '0.02em',
          outline: 'none',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      />

      {/* Phone digits */}
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={phone}
        onChange={handlePhoneChange}
        placeholder="555 000 0000"
        aria-label="Phone number"
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          color: BRAND.textPrimary,
          border: 'none',
          padding: '14px 16px',
          minHeight: 48,
          fontSize: 16,
          fontFamily: FONT_BODY,
          letterSpacing: '0.01em',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
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

function CountryInput({ value, onChange, onCountrySelect, hasError }) {
  const [query, setQuery]   = useState(value || '')
  const [open, setOpen]     = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const q = query.trim().toLowerCase()
  const matches = q
    ? COUNTRIES.filter(c => c.toLowerCase().includes(q)).slice(0, 8)
    : COUNTRIES.slice(0, 8)

  function pick(c) {
    onChange(c)
    if (onCountrySelect) onCountrySelect(c)
    setQuery(c)
    setOpen(false)
  }

  function onKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (matches[highlight]) {
        e.preventDefault()
        pick(matches[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={e => {
          const text = e.target.value
          setQuery(text)
          setOpen(true)
          setHighlight(0)
          // Auto-accept an exact country name (typed or browser-autofilled) so the
          // user never has to re-click the dropdown to confirm what they entered.
          const exact = COUNTRIES.find(c => c.toLowerCase() === text.trim().toLowerCase())
          if (exact) {
            onChange(exact)
            if (onCountrySelect) onCountrySelect(exact)
          } else if (value) {
            // Text no longer matches the committed value — clear it.
            onChange('')
          }
        }}
        onFocus={e => {
          setOpen(true)
          if (!hasError) e.target.style.borderColor = BRAND.borderGoldStrong
          e.target.style.background = BRAND.bgRaised
        }}
        onBlur={e => {
          if (!hasError) e.target.style.borderColor = BRAND.border
          e.target.style.background = BRAND.bgCard
          // Safety net for autofill that bypasses onChange: if the current text
          // exactly matches a country but isn't yet committed, commit it now.
          const exact = COUNTRIES.find(c => c.toLowerCase() === e.target.value.trim().toLowerCase())
          if (exact && exact !== value) {
            onChange(exact)
            if (onCountrySelect) onCountrySelect(exact)
          }
        }}
        onKeyDown={onKeyDown}
        placeholder="Start typing your country…"
        autoComplete="off"
        style={baseInputStyle(hasError)}
      />

      {open && matches.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)', left: 0, right: 0,
          background: BRAND.bgRaised,
          border: `1px solid ${BRAND.borderStrong}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
          zIndex: 50,
          maxHeight: 280,
          overflowY: 'auto',
        }}>
          {matches.map((c, i) => {
            const isHl = i === highlight
            return (
              <div
                key={c}
                onMouseDown={e => { e.preventDefault(); pick(c) }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  padding: '12px 16px',
                  minHeight: 44,
                  fontSize: 14,
                  fontFamily: FONT_BODY,
                  letterSpacing: '0.01em',
                  color: isHl ? BRAND.gold : BRAND.textSecondary,
                  background: isHl ? 'rgba(176, 131, 74, 0.13)' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${BRAND.border}`,
                  display: 'flex', alignItems: 'center',
                }}>
                {c}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}