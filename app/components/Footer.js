'use client'
import { useEffect, useState } from 'react'

export default function Footer() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile) return null

  return (
    <footer style={{
      padding: '24px 16px',
      textAlign: 'center',
      borderTop: '1px solid #1a1a1a',
      background: '#0a0a0a',
      marginTop: 'auto',
    }}>
      <p style={{
        color: '#B8935A',
        fontStyle: 'italic',
        fontSize: 14,
        fontFamily: 'Georgia, serif',
        letterSpacing: '0.02em',
      }}>
        "How bad do you want it"
      </p>
    </footer>
  )
}