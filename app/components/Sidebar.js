'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const nav = [
    {
      href: '/',
      label: 'Home',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },

    {
      href: '/inbox',
      label: 'DM Inbox',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },

    {
      href: '/analytics',
      label: 'DM Analytics',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },

    {
      href: '/email-automation',
      label: 'Email Automation',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
          <polyline points="3 7 12 13 21 7" />
        </svg>
      ),
    },

    {
      href: '/calls',
      label: 'Call List',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l1.17-1.17a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
    },
  ]

  function isActive(href) {
    if (href === '/') {
      return pathname === '/'
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside
      className="flex flex-col h-screen sticky top-0"
      style={{
        width: '220px',
        minWidth: '220px',
        background: '#0d0d0d',
        borderRight: '1px solid #1a1a1a',
      }}
    >
      {/* Quote */}
      <div
        className="px-6 pt-7 pb-6 border-b"
        style={{ borderColor: '#1a1a1a' }}
      >
        <p
          style={{
            color: '#B8935A',
            fontStyle: 'italic',
            fontSize: '13px',
            lineHeight: '1.5',
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.01em',
          }}
        >
          "How bad do you want it"
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-1.5">
        {nav.map((item) => {
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: active ? '#B8935A18' : 'transparent',
                color: active ? '#B8935A' : '#666',
                border: active
                  ? '1px solid #B8935A33'
                  : '1px solid transparent',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: '#1a1a1a' }}
      >
        <p
          className="text-xs"
          style={{
            color: '#333',
            letterSpacing: '0.04em',
          }}
        >
          v1.0
        </p>
      </div>
    </aside>
  )
}