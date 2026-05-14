// HMAC helpers for signed unsubscribe links.
//
// We sign the lead UUID with UNSUBSCRIBE_SECRET so people can't unsubscribe
// each other by guessing UUIDs. Token is short (first 16 hex chars) — enough
// entropy to prevent guessing, short enough to fit cleanly in a URL.

import crypto from 'crypto'

const SECRET = process.env.UNSUBSCRIBE_SECRET || ''

export function makeUnsubToken(leadId) {
  if (!SECRET) throw new Error('UNSUBSCRIBE_SECRET not set')
  return crypto
    .createHmac('sha256', SECRET)
    .update(String(leadId))
    .digest('hex')
    .slice(0, 16)
}

export function verifyUnsubToken(leadId, token) {
  if (!SECRET || !leadId || !token) return false
  const expected = makeUnsubToken(leadId)
  // Constant-time compare
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(token, 'utf8')
    )
  } catch {
    return false
  }
}

export function unsubscribeUrl(leadId, baseUrl) {
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://largedumbbells.vercel.app'
  const token = makeUnsubToken(leadId)
  return `${base}/api/unsubscribe?lead=${leadId}&token=${token}`
}