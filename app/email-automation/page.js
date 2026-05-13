'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const TAG_COLORS = {
  uncalled: '#555',
  'called once': '#378ADD',
  'called twice': '#F0A500',
  'called three times': '#E74C3C',
  'not interested': '#888',
  'call back': '#9B59B6',
  booked: '#2ECC71',
}

const STATUS_STYLES = {
  draft:  { bg: '#33333322', color: '#888' },
  active: { bg: '#2ECC7122', color: '#2ECC71' },
  paused: { bg: '#F0A50022', color: '#F0A500' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}

export default function EmailAutomation() {
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    const { data: campaignData } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: enrollmentData } = await supabase
      .from('campaign_enrollments')
      .select('campaign_id, status')

    const statsByCampaign = {}
    ;(enrollmentData || []).forEach(e => {
      if (!statsByCampaign[e.campaign_id]) {
        statsByCampaign[e.campaign_id] = { enrolled: 0, booked: 0, completed: 0 }
      }
      if (e.status === 'active')    statsByCampaign[e.campaign_id].enrolled++
      if (e.status === 'booked')    statsByCampaign[e.campaign_id].booked++
      if (e.status === 'completed') statsByCampaign[e.campaign_id].completed++
    })

    setCampaigns(campaignData || [])
    setStats(statsByCampaign)
    setLoading(false)
  }

  async function createCampaign() {
    if (!newName.trim()) return
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert({
        name: newName.trim(),
        status: 'draft',
        from_name: 'Large Dumbbells',
        from_email: 'kyle.briere@largedumbbells.com',
      })
      .select()
      .single()
    if (error) { console.error('Create error:', error); return }
    setNewName('')
    setCreating(false)
    window.location.href = `/email-automation/${data.id}`
  }

  async function deleteCampaign(id) {
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    await supabase.from('email_campaigns').delete().eq('id', id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif' }}>
      <div style={{
        borderBottom: '1px solid #222', padding: '16px 32px', background: '#111',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Left: Back to Outreach */}
        <Link href="/calls"
          style={{
            background: '#1a1a1a', color: '#B8935A',
            border: '1px solid #B8935A44', padding: '6px 12px',
            borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none',
          }}>← Back to Outreach Pipeline</Link>

        {/* Center: Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <h1 style={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: 18, color: '#B8935A' }}>
            LARGE DUMBBELLS
          </h1>
          <p style={{ fontSize: 11, color: '#fff', fontWeight: 500, letterSpacing: '0.08em' }}>
            EMAIL AUTOMATION
          </p>
        </div>

        {/* Right: spacer */}
        <div style={{ width: 180 }} />
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e0e0e0' }}>Campaigns</h2>
            <p style={{ fontSize: 14, marginTop: 4, color: '#555' }}>
              Trigger-based email and SMS sequences for your call list contacts.
            </p>
          </div>
          {!creating ? (
            <button onClick={() => setCreating(true)}
              style={{
                background: '#B8935A', color: '#000', border: 'none',
                cursor: 'pointer', fontSize: 14, padding: '8px 16px',
                borderRadius: 8, fontWeight: 500,
              }}>+ Create campaign</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input autoFocus value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createCampaign() }}
                placeholder="Campaign name…"
                style={{
                  background: '#111', color: '#e0e0e0', border: '1px solid #333',
                  padding: '8px 12px', borderRadius: 8, fontSize: 14,
                  minWidth: 240, outline: 'none',
                }} />
              <button onClick={createCampaign}
                style={{
                  background: '#B8935A', color: '#000', border: 'none',
                  cursor: 'pointer', fontSize: 14, padding: '8px 16px',
                  borderRadius: 8, fontWeight: 500,
                }}>Create</button>
              <button onClick={() => { setCreating(false); setNewName('') }}
                style={{
                  background: '#1a1a1a', color: '#888', border: '1px solid #333',
                  cursor: 'pointer', fontSize: 14, padding: '8px 12px', borderRadius: 8,
                }}>Cancel</button>
            </div>
          )}
        </div>

        {loading ? (
          <p style={{ fontSize: 14, color: '#555' }}>Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <div style={{
            background: '#111', border: '1px solid #222',
            borderRadius: 12, padding: 48, textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, marginBottom: 8, color: '#888' }}>No campaigns yet</p>
            <p style={{ fontSize: 12, color: '#555' }}>
              Create your first email automation to start nurturing leads.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {campaigns.map(c => {
              const s = STATUS_STYLES[c.status] || STATUS_STYLES.draft
              const cs = stats[c.id] || { enrolled: 0, booked: 0, completed: 0 }
              return (
                <div key={c.id}
                  style={{
                    background: '#111', border: '1px solid #1a1a1a',
                    borderRadius: 12, padding: 20,
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        <Link href={`/email-automation/${c.id}`}
                          style={{ fontSize: 16, fontWeight: 600, color: '#e0e0e0', textDecoration: 'none' }}>
                          {c.name}
                        </Link>

                        {/* Draft / Published toggle */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: '#0d0d0d', border: '1px solid #222',
                          borderRadius: 999, padding: 2,
                        }}>
                          {[
                            { key: 'draft',  label: 'Draft' },
                            { key: 'active', label: 'Published' },
                          ].map(opt => {
                            const isActive = (c.status || 'draft') === opt.key
                            return (
                              <button key={opt.key}
                                onClick={async () => {
                                  await supabase.from('email_campaigns').update({ status: opt.key }).eq('id', c.id)
                                  setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: opt.key } : x))
                                }}
                                style={{
                                  background: isActive ? (opt.key === 'active' ? '#B8935A' : '#2a2a2a') : 'transparent',
                                  color:      isActive ? (opt.key === 'active' ? '#000' : '#ccc') : '#666',
                                  border:     'none',
                                  padding:    '3px 10px',
                                  borderRadius: 999,
                                  fontSize:   10, fontWeight: 600,
                                  cursor:     'pointer',
                                  transition: 'all 0.15s',
                                  letterSpacing: '0.03em',
                                }}>
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#555' }}>
                        {c.trigger_tag ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Triggers when tagged
                            <span style={{
                              color: TAG_COLORS[c.trigger_tag],
                              background: `${TAG_COLORS[c.trigger_tag]}22`,
                              padding: '2px 8px', borderRadius: 10, fontWeight: 500,
                            }}>{c.trigger_tag}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#666' }}>No trigger set</span>
                        )}
                        <span>·</span>
                        <span>Created {timeAgo(c.created_at)}</span>
                      </div>
                    </div>

                    {/* Enrollment stats button */}
                    <Link href={`/email-automation/${c.id}/enrolled`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#1a1a1a', color: '#378ADD',
                        border: '1px solid #378ADD44', padding: '8px 14px',
                        borderRadius: 8, fontSize: 12, textDecoration: 'none',
                        marginRight: 16,
                      }}>
                      <span style={{ fontSize: 14 }}>📊</span>
                      <span>Enrollment stats</span>
                    </Link>

                    {/* Stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginRight: 16 }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '4px 16px', borderRight: '1px solid #222',
                      }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#B8935A' }}>{cs.enrolled}</span>
                        <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrolled</span>
                      </div>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '4px 16px', borderRight: '1px solid #222',
                      }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#2ECC71' }}>{cs.booked}</span>
                        <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booked</span>
                      </div>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '4px 16px',
                      }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#888' }}>{cs.completed}</span>
                        <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/email-automation/${c.id}`}
                        style={{
                          background: '#1a1a1a', color: '#B8935A',
                          border: '1px solid #B8935A44', padding: '6px 12px',
                          borderRadius: 6, fontSize: 12, textDecoration: 'none',
                        }}>Edit →</Link>
                      <button onClick={() => deleteCampaign(c.id)}
                        style={{
                          background: '#1a1a1a', color: '#E74C3C',
                          border: '1px solid #333', padding: '6px 12px',
                          borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        }}>Delete</button>
                    </div>
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