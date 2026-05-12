'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const STEP_LABELS = {
  email: 'Send email',
  sms:   'Send SMS',
  wait:  'Wait',
}

const STEP_COLORS = {
  email: '#B8935A',
  sms:   '#378ADD',
  wait:  '#F0A500',
}

function stepSummary(step) {
  if (step.type === 'email') return step.subject || '(no subject)'
  if (step.type === 'sms')   return step.message || '(no message)'
  if (step.type === 'wait')  return `${step.duration || 1} ${step.unit || 'days'}`
  return ''
}

export default function EnrolledPage() {
  const params = useParams()
  const id = params.id

  const [campaign, setCampaign] = useState(null)
  const [steps, setSteps] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const { data: c } = await supabase
      .from('email_campaigns').select('*').eq('id', id).single()
    setCampaign(c)

    const { data: s } = await supabase
      .from('email_campaign_steps').select('*').eq('campaign_id', id)
      .order('position', { ascending: true })
    setSteps(s || [])

    const { data: e } = await supabase
      .from('campaign_enrollments').select('*')
      .eq('campaign_id', id).eq('status', 'active')
    setEnrollments(e || [])

    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: 32, background: '#0a0a0a' }}>
        <p style={{ color: '#555', fontSize: 14 }}>Loading…</p>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div style={{ minHeight: '100vh', padding: 32, background: '#0a0a0a' }}>
        <p style={{ color: '#E74C3C', fontSize: 14, marginBottom: 8 }}>Campaign not found.</p>
        <Link href="/email-automation" style={{ color: '#B8935A', fontSize: 14 }}>
          ← Back to campaigns
        </Link>
      </div>
    )
  }

  const byStep = {}
  steps.forEach((_, i) => { byStep[i] = [] })
  enrollments.forEach(e => {
    if (byStep[e.current_step] === undefined) byStep[e.current_step] = []
    byStep[e.current_step].push(e)
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif' }}>

      <div style={{
        borderBottom: '1px solid #222', padding: '16px 32px',
        background: '#111',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Left: Back button */}
        <Link href={`/email-automation/${id}`}
          style={{
            background: '#1a1a1a', color: '#B8935A',
            border: '1px solid #B8935A44', padding: '6px 12px',
            borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none',
          }}>← Back to campaign</Link>

        {/* Center: Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <h1 style={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: 18, color: '#B8935A' }}>
            LARGE DUMBBELLS
          </h1>
          <p style={{ fontSize: 11, color: '#fff', fontWeight: 500, letterSpacing: '0.08em' }}>
            ENROLLMENT DETAILS
          </p>
        </div>

        {/* Right: spacer */}
        <div style={{ minWidth: 150 }} />
      </div>

      <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e0e0e0' }}>
            Enrolled contacts
          </h2>
          <p style={{ fontSize: 14, marginTop: 4, color: '#555' }}>
            {enrollments.length} contact{enrollments.length === 1 ? '' : 's'} currently in this campaign.
          </p>
        </div>

        {steps.length === 0 ? (
          <div style={{
            background: '#111', border: '1px dashed #333',
            borderRadius: 12, padding: 48, textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>This campaign has no steps yet</p>
            <p style={{ fontSize: 12, color: '#555' }}>Add steps in the campaign builder first.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, i) => {
              const contactsHere = byStep[i] || []
              const color = STEP_COLORS[step.type]
              return (
                <div key={step.id}
                  style={{
                    background: '#111', border: '1px solid #1a1a1a',
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                  <div style={{
                    padding: 16, borderBottom: '1px solid #1a1a1a',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 999,
                        background: `${color}22`, color: color,
                        border: `1px solid ${color}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                      }}>{i + 1}</div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#e0e0e0' }}>
                          {step.name || STEP_LABELS[step.type]}
                        </p>
                        <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                          {STEP_LABELS[step.type]} · {stepSummary(step)}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 999,
                      background: contactsHere.length > 0 ? `${color}22` : '#1a1a1a',
                      color: contactsHere.length > 0 ? color : '#555',
                      fontWeight: 500,
                    }}>
                      {contactsHere.length} contact{contactsHere.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div style={{ padding: 16 }}>
                    {contactsHere.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>
                        No one in this step
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {contactsHere.map(c => (
                          <div key={c.id}
                            style={{
                              padding: '8px 12px', background: '#0d0d0d',
                              border: '1px solid #1a1a1a', borderRadius: 6,
                              fontSize: 13, color: '#ccc',
                            }}>
                            Contact ID: {c.contact_id}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}