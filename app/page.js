'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    setLeads(data || [])
  }

  async function selectLead(lead) {
    setSelectedLead(lead)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  async function updateStatus(id, status) {
    await supabase.from('leads').update({ status }).eq('id', id)
    fetchLeads()
  }

  async function sendReply() {
    if (!reply.trim() || !selectedLead) return
    const res = await fetch('/api/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ psid: selectedLead.psid, message: reply, lead_id: selectedLead.id })
    })
    if (res.ok) {
      setReply('')
      selectLead(selectedLead)
    }
  }

  const filteredLeads = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  const statusColors = {
    new: 'bg-blue-500/20 text-blue-300',
    qualifying: 'bg-yellow-500/20 text-yellow-300',
    disqualified: 'bg-red-500/20 text-red-300',
    booked: 'bg-green-500/20 text-green-300',
    'link sent': 'bg-purple-500/20 text-purple-300'
  }

  const DumbbellIcon = ({ size = 28, opacity = 1 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <rect x="2" y="10" width="3" height="4" rx="1" fill="#B8935A"/>
      <rect x="19" y="10" width="3" height="4" rx="1" fill="#B8935A"/>
      <rect x="5" y="8" width="2" height="8" rx="1" fill="#B8935A"/>
      <rect x="17" y="8" width="2" height="8" rx="1" fill="#B8935A"/>
      <rect x="7" y="11" width="10" height="2" rx="1" fill="#B8935A"/>
    </svg>
  )

  return (
    <div className="flex h-screen font-sans" style={{ background: '#0a0a0a' }}>

      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r" style={{ background: '#111111', borderColor: '#222' }}>
        <div className="p-4 border-b" style={{ borderColor: '#222' }}>
          <p className="text-xs mb-3 font-semibold tracking-widest" style={{ color: '#555' }}>FILTER</p>
          <div className="flex flex-wrap gap-1">
            {['all', 'new', 'link sent', 'qualifying', 'disqualified', 'booked'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-2 py-1 rounded text-xs font-medium transition-all"
                style={{
                  background: filter === f ? '#B8935A' : '#1a1a1a',
                  color: filter === f ? '#000' : '#888',
                  border: '1px solid',
                  borderColor: filter === f ? '#B8935A' : '#333'
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredLeads.length === 0 && (
            <p className="text-xs p-4" style={{ color: '#555' }}>No leads yet</p>
          )}
          {filteredLeads.map(lead => (
            <div key={lead.id} onClick={() => selectLead(lead)}
              className="p-3 cursor-pointer transition-all border-b"
              style={{
                borderColor: '#1a1a1a',
                background: selectedLead?.id === lead.id ? '#1a1a1a' : 'transparent',
                borderLeft: selectedLead?.id === lead.id ? '2px solid #B8935A' : '2px solid transparent'
              }}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm" style={{ color: '#e0e0e0' }}>
                  {lead.name || lead.ig_handle}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[lead.status] || 'bg-gray-500/20 text-gray-400'}`}>
                  {lead.status}
                </span>
              </div>
              {lead.roadblock && (
                <p className="text-xs line-clamp-2" style={{ color: '#666' }}>{lead.roadblock}</p>
              )}
              <p className="text-xs mt-1" style={{ color: '#444' }}>
                {new Date(lead.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Brand header — centered */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: '#111', borderColor: '#222' }}>
          <div className="flex-1 flex items-center justify-center gap-3">
            <DumbbellIcon size={32} />
            <div className="text-center">
              <h1 className="font-bold tracking-widest text-lg" style={{ color: '#B8935A' }}>LARGE DUMBBELLS</h1>
              <p className="text-xs" style={{ color: '#444' }}>Leads Dashboard</p>
            </div>
            <DumbbellIcon size={32} />
          </div>
          {selectedLead && (
            <select value={selectedLead.status}
              onChange={e => { updateStatus(selectedLead.id, e.target.value); setSelectedLead({...selectedLead, status: e.target.value}) }}
              className="text-xs px-3 py-1.5 rounded ml-4"
              style={{ background: '#1a1a1a', color: '#B8935A', border: '1px solid #B8935A44' }}>
              <option value="new">new</option>
              <option value="link sent">link sent</option>
              <option value="qualifying">qualifying</option>
              <option value="disqualified">disqualified</option>
              <option value="booked">booked</option>
            </select>
          )}
        </div>

        {!selectedLead ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <DumbbellIcon size={48} opacity={0.15} />
            <p className="text-sm" style={{ color: '#444' }}>Select a lead to view the conversation</p>
          </div>
        ) : (
          <>
            {/* Lead info bar */}
            <div className="px-6 py-3 border-b flex items-center gap-3" style={{ background: '#0f0f0f', borderColor: '#1a1a1a' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: '#B8935A22', color: '#B8935A', border: '1px solid #B8935A44' }}>
                {(selectedLead.name || selectedLead.ig_handle || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#e0e0e0' }}>{selectedLead.name || selectedLead.ig_handle}</p>
                <p className="text-xs" style={{ color: '#555' }}>{selectedLead.platform}</p>
              </div>
            </div>

            {/* Roadblock banner */}
            {selectedLead.roadblock && (
              <div className="mx-4 mt-4 p-3 rounded-lg"
                style={{ background: '#B8935A11', border: '1px solid #B8935A33' }}>
                <p className="text-xs font-bold mb-1 tracking-wider" style={{ color: '#B8935A' }}>THEIR BIGGEST STRUGGLE</p>
                <p className="text-sm" style={{ color: '#ccc' }}>{selectedLead.roadblock}</p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-xs px-4 py-2 text-sm"
                    style={{
                      background: msg.direction === 'outbound' ? '#B8935A' : '#1a1a1a',
                      color: msg.direction === 'outbound' ? '#000' : '#ccc',
                      borderRadius: msg.direction === 'outbound' ? '14px 4px 14px 14px' : '4px 14px 14px 14px'
                    }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-xs text-center mt-8" style={{ color: '#444' }}>No messages yet</p>
              )}
            </div>

            {/* Reply box */}
            <div className="p-4 border-t flex gap-3" style={{ background: '#111', borderColor: '#222' }}>
              <textarea value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1 text-sm resize-none rounded-lg px-3 py-2 focus:outline-none"
                style={{ background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333' }}
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) sendReply() }}
              />
              <button onClick={sendReply}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                style={{ background: '#B8935A', color: '#000' }}>
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}