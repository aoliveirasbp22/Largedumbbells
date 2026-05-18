'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, GoldRule, DisplayHeading, PageBackground, BrandButton,
  CornerBracket,
} from '@/lib/brand'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <PageBackground style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Eyebrow color={BRAND.textDim} style={{ fontSize: 10, letterSpacing: '0.3em' }}>
          Loading…
        </Eyebrow>
      </PageBackground>
    }>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password || submitting) return
    setSubmitting(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password,
      })

      if (authError || !data?.session) {
        setError(authError?.message?.includes('Invalid')
          ? 'Incorrect email or password'
          : (authError?.message || 'Sign in failed'))
        setPassword('')
        setSubmitting(false)
        return
      }

      // Session cookie is now set by @supabase/ssr.
      // Hard-navigate (not router.push) so the proxy sees the fresh cookie.
      window.location.href = next
    } catch (err) {
      console.error('[login] error:', err)
      setError('Something went wrong. Try again.')
      setSubmitting(false)
    }
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
            Email
          </Eyebrow>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            autoFocus
            autoComplete="email"
            style={{
              width: '100%',
              background: BRAND.bgInput,
              color: BRAND.textPrimary,
              border: `1px solid ${error ? BRAND.statusDisqualified : BRAND.border}`,
              padding: '12px 14px',
              fontSize: 16,
              outline: 'none',
              fontFamily: FONT_BODY,
              letterSpacing: '0.02em',
              transition: 'border-color 0.15s',
              marginBottom: 18,
            }}
            onFocus={e => { if (!error) e.target.style.borderColor = BRAND.borderGoldStrong }}
            onBlur={e => { if (!error) e.target.style.borderColor = BRAND.border }}
          />

          <Eyebrow color={BRAND.textMuted} style={{ fontSize: 9, letterSpacing: '0.25em', marginBottom: 8 }}>
            Password
          </Eyebrow>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            autoComplete="current-password"
            style={{
              width: '100%',
              background: BRAND.bgInput,
              color: BRAND.textPrimary,
              border: `1px solid ${error ? BRAND.statusDisqualified : BRAND.border}`,
              padding: '12px 14px',
              fontSize: 16,
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
              onClick={handleSubmit}
              disabled={submitting || !email || !password}
              style={{ width: '100%' }}>
              {submitting ? 'Signing In…' : 'Enter →'}
            </BrandButton>
            <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
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