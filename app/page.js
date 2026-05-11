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
    new: 'bg-blue-100 text-blue-700',
    responded: 'bg-yellow-100 text-yellow-700',
    qualified: 'bg-purple-100 text-purple-700',
    booked: 'bg-green-100 text-green-700'
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="font-semibold text-gray-900 mb-3">Leads inbox</h1>
          <div className="flex gap-1 flex-wrap">
            {['all', 'new', 'responded', 'qualified', 'booked'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded-full text-xs font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredLeads.length === 0 && (
            <p className="text-sm text-gray-400 p-4">No leads yet</p>
          )}
          {filteredLeads.map(lead => (
            <div key={lead.id} onClick={() => selectLead(lead)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedLead?.id === lead.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm text-gray-900">{lead.name || lead.ig_handle}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                  {lead.status}
                </span>
              </div>
              {lead.roadblock && (
                <p className="text-xs text-gray-500 line-clamp-2">{lead.roadblock}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(lead.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col">
        {!selectedLead ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select a lead to view the conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedLead.name || selectedLead.ig_handle}</h2>
                <p className="text-sm text-gray-500">{selectedLead.platform}</p>
              </div>
              <select value={selectedLead.status}
                onChange={e => { updateStatus(selectedLead.id, e.target.value); setSelectedLead({...selectedLead, status: e.target.value}) }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
                <option value="new">new</option>
                <option value="responded">responded</option>
                <option value="qualified">qualified</option>
                <option value="booked">booked</option>
              </select>
            </div>

            {/* Roadblock banner */}
            {selectedLead.roadblock && (
              <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Their biggest struggle</p>
                <p className="text-sm text-amber-900">{selectedLead.roadblock}</p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${msg.direction === 'outbound' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-sm text-gray-400 text-center mt-8">No messages yet</p>
              )}
            </div>

            {/* Reply box */}
            <div className="bg-white border-t border-gray-200 p-4 flex gap-3">
              <textarea value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400"
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) sendReply() }}
              />
              <button onClick={sendReply}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}