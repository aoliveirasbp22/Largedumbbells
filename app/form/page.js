'use client'
import { useEffect, useRef, useState } from 'react'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, GoldRule, DisplayHeading, PageBackground,
  CornerBracket, BrandButton,
  useIsMobile,
} from '@/lib/brand'

// ─── Country list with calling codes ────────────────────────────────────
// Used both by the country picker and the phone country-code dropdown.
// Sorted with high-priority English-speaking markets at top, then alpha.
const COUNTRIES = [
  { name: 'United States',    code: '1',   iso: 'US' },
  { name: 'Canada',            code: '1',   iso: 'CA' },
  { name: 'United Kingdom',    code: '44',  iso: 'GB' },
  { name: 'Australia',         code: '61',  iso: 'AU' },
  { name: 'New Zealand',       code: '64',  iso: 'NZ' },
  { name: 'Ireland',           code: '353', iso: 'IE' },
  { name: 'Afghanistan',       code: '93',  iso: 'AF' },
  { name: 'Albania',           code: '355', iso: 'AL' },
  { name: 'Algeria',           code: '213', iso: 'DZ' },
  { name: 'Andorra',           code: '376', iso: 'AD' },
  { name: 'Angola',            code: '244', iso: 'AO' },
  { name: 'Antigua and Barbuda', code: '1268', iso: 'AG' },
  { name: 'Argentina',         code: '54',  iso: 'AR' },
  { name: 'Armenia',           code: '374', iso: 'AM' },
  { name: 'Austria',           code: '43',  iso: 'AT' },
  { name: 'Azerbaijan',        code: '994', iso: 'AZ' },
  { name: 'Bahamas',           code: '1242', iso: 'BS' },
  { name: 'Bahrain',           code: '973', iso: 'BH' },
  { name: 'Bangladesh',        code: '880', iso: 'BD' },
  { name: 'Barbados',          code: '1246', iso: 'BB' },
  { name: 'Belarus',           code: '375', iso: 'BY' },
  { name: 'Belgium',           code: '32',  iso: 'BE' },
  { name: 'Belize',            code: '501', iso: 'BZ' },
  { name: 'Benin',             code: '229', iso: 'BJ' },
  { name: 'Bhutan',            code: '975', iso: 'BT' },
  { name: 'Bolivia',           code: '591', iso: 'BO' },
  { name: 'Bosnia and Herzegovina', code: '387', iso: 'BA' },
  { name: 'Botswana',          code: '267', iso: 'BW' },
  { name: 'Brazil',            code: '55',  iso: 'BR' },
  { name: 'Brunei',            code: '673', iso: 'BN' },
  { name: 'Bulgaria',          code: '359', iso: 'BG' },
  { name: 'Burkina Faso',      code: '226', iso: 'BF' },
  { name: 'Burundi',           code: '257', iso: 'BI' },
  { name: 'Cambodia',          code: '855', iso: 'KH' },
  { name: 'Cameroon',          code: '237', iso: 'CM' },
  { name: 'Cape Verde',        code: '238', iso: 'CV' },
  { name: 'Central African Republic', code: '236', iso: 'CF' },
  { name: 'Chad',              code: '235', iso: 'TD' },
  { name: 'Chile',             code: '56',  iso: 'CL' },
  { name: 'China',             code: '86',  iso: 'CN' },
  { name: 'Colombia',          code: '57',  iso: 'CO' },
  { name: 'Comoros',           code: '269', iso: 'KM' },
  { name: 'Congo',             code: '242', iso: 'CG' },
  { name: 'Costa Rica',        code: '506', iso: 'CR' },
  { name: 'Croatia',           code: '385', iso: 'HR' },
  { name: 'Cuba',              code: '53',  iso: 'CU' },
  { name: 'Cyprus',            code: '357', iso: 'CY' },
  { name: 'Czech Republic',    code: '420', iso: 'CZ' },
  { name: 'Denmark',           code: '45',  iso: 'DK' },
  { name: 'Djibouti',          code: '253', iso: 'DJ' },
  { name: 'Dominica',          code: '1767', iso: 'DM' },
  { name: 'Dominican Republic', code: '1809', iso: 'DO' },
  { name: 'Ecuador',           code: '593', iso: 'EC' },
  { name: 'Egypt',             code: '20',  iso: 'EG' },
  { name: 'El Salvador',       code: '503', iso: 'SV' },
  { name: 'Equatorial Guinea', code: '240', iso: 'GQ' },
  { name: 'Eritrea',           code: '291', iso: 'ER' },
  { name: 'Estonia',           code: '372', iso: 'EE' },
  { name: 'Eswatini',          code: '268', iso: 'SZ' },
  { name: 'Ethiopia',          code: '251', iso: 'ET' },
  { name: 'Fiji',              code: '679', iso: 'FJ' },
  { name: 'Finland',           code: '358', iso: 'FI' },
  { name: 'France',            code: '33',  iso: 'FR' },
  { name: 'Gabon',             code: '241', iso: 'GA' },
  { name: 'Gambia',            code: '220', iso: 'GM' },
  { name: 'Georgia',           code: '995', iso: 'GE' },
  { name: 'Germany',           code: '49',  iso: 'DE' },
  { name: 'Ghana',             code: '233', iso: 'GH' },
  { name: 'Greece',            code: '30',  iso: 'GR' },
  { name: 'Grenada',           code: '1473', iso: 'GD' },
  { name: 'Guatemala',         code: '502', iso: 'GT' },
  { name: 'Guinea',            code: '224', iso: 'GN' },
  { name: 'Guinea-Bissau',     code: '245', iso: 'GW' },
  { name: 'Guyana',            code: '592', iso: 'GY' },
  { name: 'Haiti',             code: '509', iso: 'HT' },
  { name: 'Honduras',          code: '504', iso: 'HN' },
  { name: 'Hungary',           code: '36',  iso: 'HU' },
  { name: 'Iceland',           code: '354', iso: 'IS' },
  { name: 'India',             code: '91',  iso: 'IN' },
  { name: 'Indonesia',         code: '62',  iso: 'ID' },
  { name: 'Iran',              code: '98',  iso: 'IR' },
  { name: 'Iraq',              code: '964', iso: 'IQ' },
  { name: 'Israel',            code: '972', iso: 'IL' },
  { name: 'Italy',             code: '39',  iso: 'IT' },
  { name: 'Jamaica',           code: '1876', iso: 'JM' },
  { name: 'Japan',             code: '81',  iso: 'JP' },
  { name: 'Jordan',            code: '962', iso: 'JO' },
  { name: 'Kazakhstan',        code: '7',   iso: 'KZ' },
  { name: 'Kenya',             code: '254', iso: 'KE' },
  { name: 'Kiribati',          code: '686', iso: 'KI' },
  { name: 'Kuwait',            code: '965', iso: 'KW' },
  { name: 'Kyrgyzstan',        code: '996', iso: 'KG' },
  { name: 'Laos',              code: '856', iso: 'LA' },
  { name: 'Latvia',            code: '371', iso: 'LV' },
  { name: 'Lebanon',           code: '961', iso: 'LB' },
  { name: 'Lesotho',           code: '266', iso: 'LS' },
  { name: 'Liberia',           code: '231', iso: 'LR' },
  { name: 'Libya',             code: '218', iso: 'LY' },
  { name: 'Liechtenstein',     code: '423', iso: 'LI' },
  { name: 'Lithuania',         code: '370', iso: 'LT' },
  { name: 'Luxembourg',        code: '352', iso: 'LU' },
  { name: 'Madagascar',        code: '261', iso: 'MG' },
  { name: 'Malawi',            code: '265', iso: 'MW' },
  { name: 'Malaysia',          code: '60',  iso: 'MY' },
  { name: 'Maldives',          code: '960', iso: 'MV' },
  { name: 'Mali',              code: '223', iso: 'ML' },
  { name: 'Malta',             code: '356', iso: 'MT' },
  { name: 'Marshall Islands',  code: '692', iso: 'MH' },
  { name: 'Mauritania',        code: '222', iso: 'MR' },
  { name: 'Mauritius',         code: '230', iso: 'MU' },
  { name: 'Mexico',            code: '52',  iso: 'MX' },
  { name: 'Micronesia',        code: '691', iso: 'FM' },
  { name: 'Moldova',           code: '373', iso: 'MD' },
  { name: 'Monaco',            code: '377', iso: 'MC' },
  { name: 'Mongolia',          code: '976', iso: 'MN' },
  { name: 'Montenegro',        code: '382', iso: 'ME' },
  { name: 'Morocco',           code: '212', iso: 'MA' },
  { name: 'Mozambique',        code: '258', iso: 'MZ' },
  { name: 'Myanmar',           code: '95',  iso: 'MM' },
  { name: 'Namibia',           code: '264', iso: 'NA' },
  { name: 'Nauru',             code: '674', iso: 'NR' },
  { name: 'Nepal',             code: '977', iso: 'NP' },
  { name: 'Netherlands',       code: '31',  iso: 'NL' },
  { name: 'Nicaragua',         code: '505', iso: 'NI' },
  { name: 'Niger',             code: '227', iso: 'NE' },
  { name: 'Nigeria',           code: '234', iso: 'NG' },
  { name: 'Norway',            code: '47',  iso: 'NO' },
  { name: 'Oman',              code: '968', iso: 'OM' },
  { name: 'Pakistan',          code: '92',  iso: 'PK' },
  { name: 'Palau',             code: '680', iso: 'PW' },
  { name: 'Panama',            code: '507', iso: 'PA' },
  { name: 'Papua New Guinea',  code: '675', iso: 'PG' },
  { name: 'Paraguay',          code: '595', iso: 'PY' },
  { name: 'Peru',              code: '51',  iso: 'PE' },
  { name: 'Philippines',       code: '63',  iso: 'PH' },
  { name: 'Poland',            code: '48',  iso: 'PL' },
  { name: 'Portugal',          code: '351', iso: 'PT' },
  { name: 'Qatar',             code: '974', iso: 'QA' },
  { name: 'Romania',           code: '40',  iso: 'RO' },
  { name: 'Russia',            code: '7',   iso: 'RU' },
  { name: 'Rwanda',            code: '250', iso: 'RW' },
  { name: 'Saint Kitts and Nevis', code: '1869', iso: 'KN' },
  { name: 'Saint Lucia',       code: '1758', iso: 'LC' },
  { name: 'Saint Vincent and the Grenadines', code: '1784', iso: 'VC' },
  { name: 'Samoa',             code: '685', iso: 'WS' },
  { name: 'San Marino',        code: '378', iso: 'SM' },
  { name: 'Sao Tome and Principe', code: '239', iso: 'ST' },
  { name: 'Saudi Arabia',      code: '966', iso: 'SA' },
  { name: 'Senegal',           code: '221', iso: 'SN' },
  { name: 'Serbia',            code: '381', iso: 'RS' },
  { name: 'Seychelles',        code: '248', iso: 'SC' },
  { name: 'Sierra Leone',      code: '232', iso: 'SL' },
  { name: 'Singapore',         code: '65',  iso: 'SG' },
  { name: 'Slovakia',          code: '421', iso: 'SK' },
  { name: 'Slovenia',          code: '386', iso: 'SI' },
  { name: 'Solomon Islands',   code: '677', iso: 'SB' },
  { name: 'Somalia',           code: '252', iso: 'SO' },
  { name: 'South Africa',      code: '27',  iso: 'ZA' },
  { name: 'South Sudan',       code: '211', iso: 'SS' },
  { name: 'Spain',             code: '34',  iso: 'ES' },
  { name: 'Sri Lanka',         code: '94',  iso: 'LK' },
  { name: 'Sudan',             code: '249', iso: 'SD' },
  { name: 'Suriname',          code: '597', iso: 'SR' },
  { name: 'Sweden',            code: '46',  iso: 'SE' },
  { name: 'Switzerland',       code: '41',  iso: 'CH' },
  { name: 'Syria',             code: '963', iso: 'SY' },
  { name: 'Taiwan',            code: '886', iso: 'TW' },
  { name: 'Tajikistan',        code: '992', iso: 'TJ' },
  { name: 'Tanzania',          code: '255', iso: 'TZ' },
  { name: 'Thailand',          code: '66',  iso: 'TH' },
  { name: 'Timor-Leste',       code: '670', iso: 'TL' },
  { name: 'Togo',              code: '228', iso: 'TG' },
  { name: 'Tonga',             code: '676', iso: 'TO' },
  { name: 'Trinidad and Tobago', code: '1868', iso: 'TT' },
  { name: 'Tunisia',           code: '216', iso: 'TN' },
  { name: 'Turkey',            code: '90',  iso: 'TR' },
  { name: 'Turkmenistan',      code: '993', iso: 'TM' },
  { name: 'Tuvalu',            code: '688', iso: 'TV' },
  { name: 'Uganda',            code: '256', iso: 'UG' },
  { name: 'Ukraine',           code: '380', iso: 'UA' },
  { name: 'United Arab Emirates', code: '971', iso: 'AE' },
  { name: 'Uruguay',           code: '598', iso: 'UY' },
  { name: 'Uzbekistan',        code: '998', iso: 'UZ' },
  { name: 'Vanuatu',           code: '678', iso: 'VU' },
  { name: 'Venezuela',         code: '58',  iso: 'VE' },
  { name: 'Vietnam',           code: '84',  iso: 'VN' },
  { name: 'Yemen',             code: '967', iso: 'YE' },
  { name: 'Zambia',            code: '260', iso: 'ZM' },
  { name: 'Zimbabwe',          code: '263', iso: 'ZW' },
]

const COUNTRY_NAMES = COUNTRIES.map(c => c.name)

const INITIAL = {
  first_name: '',
  last_name: '',
  email: '',
  country_code: '1',  // default to US/CA
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
  else if (String(v.phone).replace(/\D/g,'').length < 6) errors.phone = 'Enter a valid phone'
  if (!v.country_code)        errors.phone      = 'Pick a country code'
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
              <PhoneInput
                countryCode={values.country_code}
                onCountryCodeChange={v => setField('country_code', v)}
                phone={values.phone}
                onPhoneChange={v => setField('phone', v)}
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
              <CountryInput
                value={values.country}
                onChange={v => setField('country', v)}
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

// ─── Phone input: country-code picker + digits ──────────────────────────
function PhoneInput({ countryCode, onCountryCodeChange, phone, onPhoneChange, hasError }) {
  // Deduplicate codes since several countries share e.g. "1" → show one entry per code.
  // The picker stores the calling code only, not country.
  // We dedupe by code, picking the first country for that code as the "primary" display name.
  const uniqueCodes = []
  const seen = new Set()
  for (const c of COUNTRIES) {
    if (seen.has(c.code)) continue
    seen.add(c.code)
    uniqueCodes.push(c)
  }
  // Sort by numeric code for predictable ordering
  uniqueCodes.sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10))

  return (
    <div style={{
      display: 'flex',
      gap: 0,
      border: `1px solid ${hasError ? BRAND.statusDisqualified : BRAND.border}`,
      background: BRAND.bgCard,
      transition: 'border-color 0.15s',
    }}>
      <select
        value={countryCode}
        onChange={e => onCountryCodeChange(e.target.value)}
        style={{
          background: 'transparent',
          color: BRAND.textPrimary,
          border: 'none',
          borderRight: `1px solid ${BRAND.border}`,
          padding: '14px 28px 14px 14px',
          minHeight: 48,
          fontSize: 16,
          fontFamily: FONT_BODY,
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage:
            `linear-gradient(45deg, transparent 50%, ${BRAND.textMuted} 50%),
             linear-gradient(135deg, ${BRAND.textMuted} 50%, transparent 50%)`,
          backgroundPosition:
            `calc(100% - 14px) 50%, calc(100% - 8px) 50%`,
          backgroundSize: '6px 6px',
          backgroundRepeat: 'no-repeat',
          flexShrink: 0,
        }}>
        {uniqueCodes.map(c => (
          <option key={c.code} value={c.code} style={{ background: BRAND.bgRaised }}>
            +{c.code}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={phone}
        onChange={e => onPhoneChange(e.target.value)}
        placeholder="555 000 0000"
        style={{
          flex: 1,
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

function CountryInput({ value, onChange, hasError }) {
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
    ? COUNTRY_NAMES.filter(c => c.toLowerCase().includes(q)).slice(0, 8)
    : COUNTRY_NAMES.slice(0, 8)

  function pick(c) {
    onChange(c)
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
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
          if (value && e.target.value !== value) onChange('')
        }}
        onFocus={e => {
          setOpen(true)
          if (!hasError) e.target.style.borderColor = BRAND.borderGoldStrong
          e.target.style.background = BRAND.bgRaised
        }}
        onBlur={e => {
          if (!hasError) e.target.style.borderColor = BRAND.border
          e.target.style.background = BRAND.bgCard
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