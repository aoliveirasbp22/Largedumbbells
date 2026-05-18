'use client'
// components/Dialer.js
//
// Floating Twilio Voice dialer. Mount once in app/layout.js inside
// <DialerProvider> and call its imperative API via the useDialer() hook
// from anywhere in the page tree.
//
// USAGE:
//   const { startCall } = useDialer()
//   startCall({
//     to:         '+13055551234',
//     leadName:   'Carlos',
//     leadId:     'uuid-...',
//     currentTag: 'called once',   // optional — drives the smart "next called" suggestion
//   })
//
// Post-call UI:
//   Row 1 (always):       Booked · Call Back · Not Interested
//   Row 2 (smart suggest): Mark As Called Once / Twice / Three Times
//                          (label depends on currentTag passed to startCall)
//   Row 3:                Skip
//
// Tag persistence:
//   applyOutcome writes to BOTH:
//     - leads.tag + leads.tag_updated_at  (new home for current tag)
//     - call_logs.tag + call_logs.last_contacted + call_logs.updated_at
//       (legacy per-lead row that the existing Calls page reads from)
//   This dual-write keeps the existing Calls page UI in sync while the
//   underlying schema migration is in progress.

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { BRAND, FONT_BODY, FONT_DISPLAY, CornerBracket, useIsMobile, formatPhone } from '@/lib/brand'
import { supabase } from '@/lib/supabase'
import { handleTagChange } from '@/lib/enrollments'

const DialerContext = createContext(null)

export function useDialer() {
  const ctx = useContext(DialerContext)
  if (!ctx) {
    return {
      startCall: () => console.warn('Dialer not mounted'),
      callState: 'idle',
      isMuted: false,
      toggleMute: () => {},
      hangup: () => {},
    }
  }
  return ctx
}

const OUTCOME_TAGS = [
  { tag: 'booked',         label: 'Booked',         color: BRAND.statusBooked },
  { tag: 'call back',      label: 'Call Back',      color: BRAND.statusQualifying },
  { tag: 'not interested', label: 'Not Interested', color: BRAND.statusDisqualified },
]

function nextCalledTag(currentTag) {
  if (currentTag === 'called once')        return 'called twice'
  if (currentTag === 'called twice')       return 'called three times'
  if (currentTag === 'called three times') return 'called three times'
  return 'called once'
}

function calledTagLabel(tag) {
  return tag.replace(/\b\w/g, c => c.toUpperCase())
}

export function DialerProvider({ children }) {
  const isMobile = useIsMobile()

  const deviceRef = useRef(null)
  const callRef   = useRef(null)
  const startedAtRef = useRef(null)

  const [ready, setReady]         = useState(false)
  const [callState, setCallState] = useState('idle')
  const [currentLead, setCurrentLead] = useState(null)
  const [isMuted, setIsMuted]     = useState(false)
  const [duration, setDuration]   = useState(0)
  const [errorMsg, setErrorMsg]   = useState(null)

  const initDevice = useCallback(async () => {
    if (deviceRef.current) return deviceRef.current
    try {
      const res = await fetch('/api/twilio/token', { method: 'POST' })
      const data = await res.json()
      if (!data.ok || !data.token) {
        throw new Error(data.reason || 'token_failed')
      }
      const { Device } = await import('@twilio/voice-sdk')
      const device = new Device(data.token, {
        codecPreferences: ['opus', 'pcmu'],
        disableAudioContextSounds: false,
      })

      device.on('error', (err) => {
        console.error('[dialer] device error:', err)
        setErrorMsg(err?.message || 'Device error')
        setCallState('error')
      })

      device.on('tokenWillExpire', async () => {
        try {
          const r = await fetch('/api/twilio/token', { method: 'POST' })
          const d = await r.json()
          if (d.token) device.updateToken(d.token)
        } catch (err) {
          console.error('[dialer] token refresh failed:', err)
        }
      })

      await device.register()
      deviceRef.current = device
      setReady(true)
      return device
    } catch (err) {
      console.error('[dialer] init failed:', err)
      setErrorMsg(err?.message || 'Failed to initialize dialer')
      setCallState('error')
      return null
    }
  }, [])

  const startCall = useCallback(async ({ to, leadName, leadId, currentTag }) => {
    if (!to) {
      setErrorMsg('No phone number')
      setCallState('error')
      return
    }
    let normalizedTo = String(to).trim()
    if (!normalizedTo.startsWith('+')) {
      const digits = normalizedTo.replace(/\D/g, '')
      if (digits.length < 7) {
        setErrorMsg('Invalid phone number')
        setCallState('error')
        return
      }
      normalizedTo = '+' + digits
    }

    setErrorMsg(null)
    setIsMuted(false)
    setDuration(0)
    setCurrentLead({
      to: normalizedTo,
      leadName: leadName || 'Unknown',
      leadId,
      currentTag: currentTag || 'uncalled',
    })
    setCallState('connecting')

    const device = await initDevice()
    if (!device) return

    try {
      const call = await device.connect({ params: { To: normalizedTo } })
      callRef.current = call

      call.on('ringing', () => setCallState('ringing'))
      call.on('accept', () => {
        setCallState('live')
        startedAtRef.current = Date.now()
      })
      call.on('disconnect', () => {
        callRef.current = null
        setCallState(prev => prev === 'error' ? 'error' : 'ended')
      })
      call.on('cancel', () => {
        callRef.current = null
        setCallState('ended')
      })
      call.on('reject', () => {
        callRef.current = null
        setCallState('ended')
      })
      call.on('error', (err) => {
        console.error('[dialer] call error:', err)
        setErrorMsg(err?.message || 'Call error')
        setCallState('error')
      })
    } catch (err) {
      console.error('[dialer] connect failed:', err)
      setErrorMsg(err?.message || 'Could not place call')
      setCallState('error')
    }
  }, [initDevice])

  const toggleMute = useCallback(() => {
    const call = callRef.current
    if (!call) return
    const next = !isMuted
    call.mute(next)
    setIsMuted(next)
  }, [isMuted])

  const hangup = useCallback(() => {
    const call = callRef.current
    if (call) {
      try { call.disconnect() } catch {}
      callRef.current = null
    }
    setCallState('ended')
  }, [])

  const dismiss = useCallback(() => {
    setCallState('idle')
    setCurrentLead(null)
    setDuration(0)
    setErrorMsg(null)
    startedAtRef.current = null
  }, [])

  // ─── Apply an outcome tag — writes to BOTH leads.tag and call_logs ─────
  // This mirrors what the existing tag dropdown on the Calls page does,
  // so the right-column tag visibly updates after a call.
  const applyOutcome = useCallback(async (tag) => {
    const leadId = currentLead?.leadId
    if (!leadId) {
      dismiss()
      return
    }

    const now = new Date().toISOString()

    try {
      // 1. Write to leads.tag (new home)
      await supabase
        .from('leads')
        .update({ tag, tag_updated_at: now })
        .eq('id', leadId)

      // 2. Write to call_logs (legacy per-lead row that the Calls page reads)
      //    Try update first; if no row exists, insert.
      const { data: existing } = await supabase
        .from('call_logs')
        .select('id')
        .eq('lead_id', leadId)
        .is('twilio_call_sid', null)        // the legacy "summary" row, not a per-call row
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('call_logs')
          .update({ tag, last_contacted: now, updated_at: now })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('call_logs')
          .insert({
            lead_id:        leadId,
            tag,
            last_contacted: now,
            updated_at:     now,
          })
      }

      // 3. Fire enrollment side-effect (same as the Calls page does)
      await handleTagChange(leadId, tag)

      // 4. Broadcast so any page listening (e.g., Calls list) can refresh.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ld:tag-changed', {
          detail: { leadId, tag, last_contacted: now },
        }))
      }
    } catch (err) {
    }

    dismiss()
  }, [currentLead, dismiss])

  useEffect(() => {
    if (callState !== 'live') return
    const id = setInterval(() => {
      if (startedAtRef.current) {
        setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }
    }, 500)
    return () => clearInterval(id)
  }, [callState])

  useEffect(() => {
    return () => {
      try {
        if (callRef.current) callRef.current.disconnect()
        if (deviceRef.current) deviceRef.current.destroy()
      } catch {}
    }
  }, [])

  const api = {
    startCall,
    callState,
    isMuted,
    toggleMute,
    hangup,
    duration,
    currentLead,
    errorMsg,
    ready,
  }

  return (
    <DialerContext.Provider value={api}>
      {children}
      {callState !== 'idle' && (
        <DialerWidget
          isMobile={isMobile}
          callState={callState}
          currentLead={currentLead}
          isMuted={isMuted}
          duration={duration}
          errorMsg={errorMsg}
          onToggleMute={toggleMute}
          onHangup={hangup}
          onDismiss={dismiss}
          onApplyOutcome={applyOutcome}
        />
      )}
    </DialerContext.Provider>
  )
}

function DialerWidget({
  isMobile, callState, currentLead, isMuted, duration, errorMsg,
  onToggleMute, onHangup, onDismiss, onApplyOutcome,
}) {
  const isLive = callState === 'live'
  const isError = callState === 'error'
  const isEnded = callState === 'ended'

  const stateLabel = {
    connecting: 'Connecting…',
    ringing:    'Ringing…',
    live:       'On Call',
    ended:      'Call Ended',
    error:      'Error',
  }[callState] || ''

  const stateColor = {
    connecting: BRAND.statusQualifying,
    ringing:    BRAND.statusQualifying,
    live:       BRAND.statusBooked,
    ended:      BRAND.textMuted,
    error:      BRAND.statusDisqualified,
  }[callState] || BRAND.textMuted

  const mins = Math.floor(duration / 60)
  const secs = duration % 60
  const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`

  const positionStyle = isMobile
    ? { bottom: 12, left: 12, right: 12 }
    : { bottom: 24, right: 24, width: 380 }

  const suggestedCalledTag = nextCalledTag(currentLead?.currentTag)
  const suggestedCalledLabel = calledTagLabel(suggestedCalledTag)

  return (
    <div
      role="dialog"
      aria-label="Active call"
      style={{
        position: 'fixed',
        zIndex: 500,
        background: BRAND.bgCard,
        border: `1px solid ${isLive ? BRAND.borderGoldStrong : BRAND.borderStrong}`,
        boxShadow: isLive
          ? `0 0 24px ${BRAND.goldGlow}, 0 12px 32px rgba(0,0,0,0.8)`
          : '0 12px 32px rgba(0,0,0,0.8)',
        padding: '14px 16px',
        fontFamily: FONT_BODY,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...positionStyle,
      }}>
      <CornerBracket position="tl" size={10} />
      <CornerBracket position="tr" size={10} />
      <CornerBracket position="bl" size={10} />
      <CornerBracket position="br" size={10} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? 16 : 18,
            color: BRAND.textPrimary,
            letterSpacing: '0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {currentLead?.leadName || 'Unknown'}
          </div>
          <div style={{
            fontSize: 10,
            color: BRAND.textMuted,
            letterSpacing: '0.05em',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 2,
          }}>
            {currentLead?.to ? formatPhone(currentLead.to) : ''}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: 999,
            background: stateColor,
            boxShadow: `0 0 6px ${stateColor}99`,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: stateColor,
          }}>
            {stateLabel}
          </span>
        </div>
      </div>

      {isLive && (
        <div style={{
          marginTop: 10,
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          color: BRAND.gold,
          textShadow: `0 0 12px ${BRAND.goldGlow}`,
          letterSpacing: '0.06em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {durationStr}
        </div>
      )}

      {isError && errorMsg && (
        <div style={{
          marginTop: 10,
          fontSize: 11,
          color: BRAND.statusDisqualified,
          lineHeight: 1.5,
        }}>
          {errorMsg}
        </div>
      )}

      {(callState === 'connecting' || callState === 'ringing' || callState === 'live') && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={onToggleMute}
            disabled={!isLive}
            style={{
              flex: 1,
              background: isMuted ? 'rgba(176, 131, 74, 0.2)' : 'transparent',
              color: isMuted ? BRAND.gold : (isLive ? BRAND.textSecondary : BRAND.textDim),
              border: `1px solid ${isMuted ? BRAND.borderGoldStrong : BRAND.border}`,
              padding: '10px 14px',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              fontFamily: FONT_BODY,
              cursor: isLive ? 'pointer' : 'not-allowed',
            }}>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button
            onClick={onHangup}
            style={{
              flex: 1,
              background: BRAND.statusDisqualified,
              color: '#fff',
              border: 'none',
              padding: '10px 14px',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              fontFamily: FONT_BODY,
              cursor: 'pointer',
            }}>
            Hang Up
          </button>
        </div>
      )}

      {isEnded && (
        <>
          <div style={{
            marginTop: 12, marginBottom: 8,
            fontSize: 9, fontWeight: 700,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: BRAND.textMuted,
          }}>
            Tag this call
          </div>

          {/* Row 1: always-visible outcomes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {OUTCOME_TAGS.map(opt => (
              <button
                key={opt.tag}
                onClick={() => onApplyOutcome(opt.tag)}
                style={{
                  background: 'transparent',
                  color: opt.color,
                  border: `1px solid ${opt.color}55`,
                  padding: '8px 6px',
                  fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  fontFamily: FONT_BODY,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${opt.color}1f`
                  e.currentTarget.style.borderColor = opt.color
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = `${opt.color}55`
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Row 2: smart-suggested called-N */}
          <button
            onClick={() => onApplyOutcome(suggestedCalledTag)}
            style={{
              marginTop: 6, width: '100%',
              background: 'rgba(176, 131, 74, 0.13)',
              color: BRAND.gold,
              border: `1px solid ${BRAND.borderGoldStrong}`,
              padding: '10px 10px',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              fontFamily: FONT_BODY,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: `0 0 8px ${BRAND.goldGlow}`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(176, 131, 74, 0.22)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(176, 131, 74, 0.13)'
            }}>
            Mark As {suggestedCalledLabel}
          </button>

          <button
            onClick={onDismiss}
            style={{
              marginTop: 8, width: '100%',
              background: 'transparent',
              color: BRAND.textDim,
              border: `1px solid ${BRAND.border}`,
              padding: '7px 10px',
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              fontFamily: FONT_BODY,
              cursor: 'pointer',
            }}>
            Skip
          </button>
        </>
      )}

      {isError && (
        <button
          onClick={onDismiss}
          style={{
            marginTop: 12, width: '100%',
            background: 'transparent',
            color: BRAND.textSecondary,
            border: `1px solid ${BRAND.border}`,
            padding: '8px 10px',
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            fontFamily: FONT_BODY,
            cursor: 'pointer',
          }}>
          Dismiss
        </button>
      )}
    </div>
  )
}