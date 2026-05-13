'use client'
// ─── LARGE DUMBBELLS DESIGN SYSTEM ────────────────────────────────────
// Single source of truth for the brand visual language.
// Import BRAND tokens and shared primitives across the app.

export const BRAND = {
  // Surfaces
  bg:           '#0a0a0a',
  bgRaised:     '#101010',
  bgCard:       '#0d0d0d',
  bgCardHover:  '#121212',
  bgInput:      '#0d0d0d',
  // Borders
  border:       '#1a1a1a',
  borderStrong: '#262626',
  borderGold:   'rgba(176, 131, 74, 0.22)',
  borderGoldStrong: 'rgba(176, 131, 74, 0.5)',
  // Type
  textPrimary:   '#f5f5f5',
  textSecondary: '#a3a3a3',
  textMuted:     '#666666',
  textDim:       '#404040',
  // Brand gold (matched to logo)
  gold:        '#B0834A',
  goldBright:  '#C49A5F',
  goldDim:     '#7A5A33',
  goldFaint:   'rgba(176, 131, 74, 0.06)',
  goldGlow:    'rgba(176, 131, 74, 0.35)',
  // Status — kept but slightly desaturated to live with the gold
  statusNew:          '#4A90D9',
  statusQualifying:   '#D9A03A',
  statusLinkSent:     '#9B6BC4',
  statusBooked:       '#3DBE6E',
  statusGhosted:      '#666666',
  statusDisqualified: '#D9534F',
}

// Font CSS vars are wired in app/layout.js via next/font:
//   --font-geist-sans   (body)
//   --font-anton        (display)
export const FONT_DISPLAY = "var(--font-anton), 'Arial Narrow', sans-serif"
export const FONT_BODY    = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif"

// Status -> pill style (used in lead/contact status displays everywhere)
export const STATUS_STYLES = {
  new:          { bg: 'rgba(74, 144, 217, 0.13)',  color: BRAND.statusNew,          border: 'rgba(74, 144, 217, 0.33)' },
  qualifying:   { bg: 'rgba(217, 160, 58, 0.13)',  color: BRAND.statusQualifying,   border: 'rgba(217, 160, 58, 0.33)' },
  ghosted:      { bg: 'rgba(102, 102, 102, 0.18)', color: BRAND.statusGhosted,      border: 'rgba(102, 102, 102, 0.33)' },
  'link sent':  { bg: 'rgba(155, 107, 196, 0.13)', color: BRAND.statusLinkSent,     border: 'rgba(155, 107, 196, 0.33)' },
  booked:       { bg: 'rgba(61, 190, 110, 0.13)',  color: BRAND.statusBooked,       border: 'rgba(61, 190, 110, 0.33)' },
  disqualified: { bg: 'rgba(217, 83, 79, 0.13)',   color: BRAND.statusDisqualified, border: 'rgba(217, 83, 79, 0.33)' },
}

export const TAG_COLORS = {
  uncalled:             BRAND.textMuted,
  'called once':        BRAND.statusNew,
  'called twice':       BRAND.statusQualifying,
  'called three times': BRAND.statusDisqualified,
  'not interested':     BRAND.textMuted,
  'call back':          BRAND.statusLinkSent,
  booked:               BRAND.statusBooked,
}

// ─── PRIMITIVES ───────────────────────────────────────────────────────

// Corner bracket — architectural detail pulled from Kyle's IG content.
// Use 4 of these (one per corner) on any "premium" framed element.
export function CornerBracket({ position, size = 18, color = BRAND.gold, opacity = 0.5 }) {
  const positions = {
    tl: { top: 0, left: 0, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
    tr: { top: 0, right: 0, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` },
    bl: { bottom: 0, left: 0, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
    br: { bottom: 0, right: 0, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` },
  }
  return (
    <div style={{
      position: 'absolute',
      width: size, height: size,
      pointerEvents: 'none',
      opacity,
      ...positions[position],
    }} />
  )
}

// Wrap an element with 4 corner brackets at its corners.
// Usage: <BracketFrame><div>my content</div></BracketFrame>
export function BracketFrame({ children, size = 16, color = BRAND.gold, opacity = 0.5, style = {} }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <CornerBracket position="tl" size={size} color={color} opacity={opacity} />
      <CornerBracket position="tr" size={size} color={color} opacity={opacity} />
      <CornerBracket position="bl" size={size} color={color} opacity={opacity} />
      <CornerBracket position="br" size={size} color={color} opacity={opacity} />
      {children}
    </div>
  )
}

// Eyebrow — small tracked uppercase label used above titles, sections, etc.
export function Eyebrow({ children, color = BRAND.gold, style = {} }) {
  return (
    <p style={{
      fontSize: 10,
      fontWeight: 600,
      color,
      letterSpacing: '0.25em',
      textTransform: 'uppercase',
      fontFamily: FONT_BODY,
      margin: 0,
      ...style,
    }}>{children}</p>
  )
}

// Thin gold underline — separator under section titles
export function GoldRule({ width = 32, color = BRAND.gold }) {
  return (
    <div style={{
      width, height: 1,
      background: `linear-gradient(90deg, ${color}, transparent)`,
    }} />
  )
}

// Display heading — Anton-based big condensed all-caps title
export function DisplayHeading({ children, size = 28, color = BRAND.textPrimary, style = {} }) {
  return (
    <h2 style={{
      fontFamily: FONT_DISPLAY,
      fontSize: size,
      fontWeight: 400,
      color,
      letterSpacing: '0.02em',
      lineHeight: 1,
      textTransform: 'uppercase',
      margin: 0,
      ...style,
    }}>{children}</h2>
  )
}

// Brand button (outlined gold, fills on hover with glow)
export function BrandButton({ children, onClick, href, disabled, variant = 'primary', size = 'md', style = {} }) {
  const sizing = {
    sm: { padding: '8px 14px', fontSize: 10, gap: 8 },
    md: { padding: '10px 18px', fontSize: 10, gap: 10 },
    lg: { padding: '14px 22px', fontSize: 11, gap: 12 },
  }[size]

  const variants = {
    primary: {
      base: { background: 'transparent', color: BRAND.gold, border: `1px solid ${BRAND.gold}` },
      hover: { background: BRAND.gold, color: '#000', boxShadow: `0 0 24px ${BRAND.goldGlow}` },
    },
    solid: {
      base: { background: BRAND.gold, color: '#000', border: `1px solid ${BRAND.gold}` },
      hover: { background: BRAND.goldBright, color: '#000', boxShadow: `0 0 24px ${BRAND.goldGlow}` },
    },
    ghost: {
      base: { background: BRAND.bgRaised, color: BRAND.gold, border: `1px solid ${BRAND.borderGold}` },
      hover: { background: 'rgba(176, 131, 74, 0.1)', color: BRAND.goldBright, boxShadow: 'none' },
    },
    danger: {
      base: { background: BRAND.bgRaised, color: BRAND.statusDisqualified, border: `1px solid ${BRAND.border}` },
      hover: { background: 'rgba(217, 83, 79, 0.1)', color: BRAND.statusDisqualified, boxShadow: 'none' },
    },
  }[variant] || variants.primary

  const baseStyle = {
    ...variants.base,
    ...sizing,
    fontFamily: FONT_BODY,
    fontWeight: 700,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    ...style,
  }

  const handleEnter = e => {
    if (disabled) return
    Object.assign(e.currentTarget.style, variants.hover)
  }
  const handleLeave = e => {
    if (disabled) return
    Object.assign(e.currentTarget.style, variants.base, { boxShadow: 'none' })
  }

  const inner = children

  if (href) {
    // Use anchor tag — caller can wrap with Next Link if needed
    return (
      <a href={href} style={baseStyle} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
        {inner}
      </a>
    )
  }
  return (
    <button onClick={onClick} disabled={disabled} style={baseStyle} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {inner}
    </button>
  )
}

// Status pill — colored uppercase tag chip
export function StatusPill({ status, size = 'sm' }) {
  const s = STATUS_STYLES[status] || { bg: 'rgba(102,102,102,0.13)', color: BRAND.textMuted, border: 'rgba(102,102,102,0.33)' }
  const sizing = {
    xs: { padding: '2px 7px', fontSize: 8 },
    sm: { padding: '3px 9px', fontSize: 9 },
    md: { padding: '4px 11px', fontSize: 10 },
  }[size]
  return (
    <span style={{
      ...sizing,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      fontFamily: FONT_BODY,
      whiteSpace: 'nowrap',
    }}>{status}</span>
  )
}

// Brand page wrapper — adds the subtle grain overlay across the page
export function PageBackground({ children, style = {} }) {
  return (
    <div style={{
      background: BRAND.bg,
      fontFamily: FONT_BODY,
      color: BRAND.textPrimary,
      position: 'relative',
      ...style,
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        zIndex: 0,
      }} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  )
}

// Top page header — consistent across non-dashboard pages
// Has: left slot (back button), centered brand mark + page label, right slot (action)
export function PageHeader({ leftSlot, rightSlot, pageLabel, logoSize = 28 }) {
  return (
    <div style={{
      padding: '14px 24px',
      borderBottom: `1px solid ${BRAND.border}`,
      background: BRAND.bgRaised,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
      position: 'relative',
      zIndex: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
        {leftSlot}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <img
          src="/logo-large-dumbbells.png"
          alt="Large Dumbbells"
          style={{ width: logoSize, height: logoSize, objectFit: 'contain' }}
        />
        {pageLabel && (
          <Eyebrow style={{ fontSize: 9, letterSpacing: '0.35em' }} color={BRAND.textSecondary}>
            {pageLabel}
          </Eyebrow>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, justifyContent: 'flex-end' }}>
        {rightSlot}
      </div>
    </div>
  )
}
