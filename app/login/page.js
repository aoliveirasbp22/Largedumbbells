'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, GoldRule, DisplayHeading, PageBackground, BrandButton,
  CornerBracket,
} from '@/lib/brand'

export default function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        // Cookie set by the API; navigate to intended page
        router.push(next)
      } else {
        setError('Incorrect password')
        setPassword('')
      }
    } catch {
      setError('Something went wrong. Try again.')
    }
    setSubmitting(false)
  }

  return (
    <PageBackground style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        background: BRAND.bgCard,
        border: `1px solid ${BRAND.border}`,
        padding: '40px 28px',
      }}>
        <CornerBracket position="tl" />
        <CornerBracket position="tr" />
        <CornerBracket position="bl" />
        <CornerBracket position="br" />

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img
            src="/logo-large-dumbbells.png"
            alt=""
            style={{ width: 56, height: 56, opacity: 0.95 }}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Eyebrow style={{ fontSize: 10, letterSpacing: '0.35em', marginBottom: 12 }}>
            The Command Center
          </Eyebrow>
          <DisplayHeading size={32} style={{ marginBottom: 14 }}>
            Sign In
          </DisplayHeading>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoldRule width={40} />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Eyebrow color={BRAND.textMuted} style={{ fontSize: 9, letterSpacing: '0.25em', marginBottom: 8 }}>
            Password
          </Eyebrow>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            autoFocus
            style={{
              width: '100%',
              background: BRAND.bgInput,
              color: BRAND.textPrimary,
              border: `1px solid ${error ? BRAND.statusDisqualified : BRAND.border}`,
              padding: '12px 14px',
              fontSize: 16, // 16px = no iOS auto-zoom
              outline: 'none',
              fontFamily: FONT_BODY,
              letterSpacing: '0.05em',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { if (!error) e.target.style.borderColor = BRAND.borderGoldStrong }}
            onBlur={e => { if (!error) e.target.style.borderColor = BRAND.border }}
          />

          {error && (
            <p style={{
              fontSize: 11, color: BRAND.statusDisqualified, marginTop: 10,
              fontFamily: FONT_BODY,
              letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
            }}>{error}</p>
          )}

          <div style={{ marginTop: 20 }}>
            <BrandButton
              variant="solid"
              size="md"
              type="submit"
              disabled={submitting || !password}
              style={{ width: '100%' }}>
              {submitting ? 'Verifying…' : 'Enter →'}
            </BrandButton>
          </div>
        </form>

        <p style={{
          marginTop: 28,
          textAlign: 'center',
          fontSize: 9, color: BRAND.textDim,
          fontFamily: FONT_BODY,
          letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          Large Dumbbells · Private Access
        </p>
      </div>
    </PageBackground>
  )
}