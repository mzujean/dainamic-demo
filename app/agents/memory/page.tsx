'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const AGENT_TYPES = ['inventory', 'content', 'finance', 'client']

const AGENT_COLORS: Record<string, string> = {
  inventory: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
  content: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
  finance: 'text-green-300 bg-green-500/10 border-green-500/20',
  client: 'text-pink-300 bg-pink-500/10 border-pink-500/20',
}

interface Memory {
  id: string
  agent_type: string
  insight: string
  tags: string[]
  created_at: string
  context: string
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/agent/feedback?limit=50`)
      const data = await res.json()
      setMemories(data.memories ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? memories : memories.filter(m => m.agent_type === filter)

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🧠 Agent Memory</h1>
        <p className="text-white/50 text-sm mt-1">What your agents have learned from your decisions</p>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {AGENT_TYPES.map(type => {
          const count = memories.filter(m => m.agent_type === type).length
          return (
            <button key={type} onClick={() => setFilter(filter === type ? 'all' : type)}
              className={`rounded-xl p-3 border text-center transition-all ${filter === type ? AGENT_COLORS[type] : 'bg-white/5 border-white/10 text-white/50'}`}>
              <div className="text-lg font-bold">{count}</div>
              <div className="text-xs capitalize">{type}</div>
            </button>
          )
        })}
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-white/30 py-16">
          <p className="text-4xl mb-3">🫥</p>
          <p>No memories yet. Start approving or rejecting agent suggestions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mem, i) => {
            let parsedContext: Record<string, unknown> = {}
            try { parsedContext = JSON.parse(mem.context) } catch {}
            const decision = parsedContext.decision as string | undefined
            return (
              <motion.div key={mem.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${AGENT_COLORS[mem.agent_type] ?? 'text-white/50 bg-white/5 border-white/10'}`}>{mem.agent_type}</span>
                  {decision && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${decision === 'approved' ? 'bg-green-500/10 text-green-400' : decision === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{decision}</span>
                  )}
                  <span className="text-xs text-white/30 ml-auto">{new Date(mem.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{mem.insight}</p>
                {mem.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {mem.tags.map(tag => <span key={tag} className="text-xs bg-white/5 text-white/30 px-2 py-0.5 rounded-full">#{tag}</span>)}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}