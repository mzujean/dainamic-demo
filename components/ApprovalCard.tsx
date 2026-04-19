// components/ApprovalCard.tsx
// Drop this anywhere an agent makes a suggestion that needs owner approval.
// Handles approve / reject / modify + silently writes to agent_memory.

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { learnFromDecision, DecisionPayload } from '@/lib/agent-feedback'

interface ApprovalCardProps {
  agentType: string                        // e.g. 'inventory'
  actionType: string                       // e.g. 'reorder_alert'
  suggestion: string                       // what the agent is proposing
  context?: Record<string, unknown>        // extra context for memory tagging
  label?: string                           // card title
  onApprove?: (final: string) => void      // called after approve
  onReject?: () => void                    // called after reject
}

type UIState = 'idle' | 'modifying' | 'rejecting' | 'saving' | 'done_approve' | 'done_reject'

export default function ApprovalCard({
  agentType,
  actionType,
  suggestion,
  context,
  label = 'Agent Suggestion',
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const [uiState, setUiState] = useState<UIState>('idle')
  const [edited, setEdited] = useState(suggestion)
  const [rejectionReason, setRejectionReason] = useState('')
  const [insight, setInsight] = useState<string | null>(null)

  const basePayload: Omit<DecisionPayload, 'decision'> = {
    agent_type: agentType,
    action_type: actionType,
    suggestion,
    context,
  }

  async function handleApprove() {
    setUiState('saving')
    const wasModified = edited.trim() !== suggestion.trim()
    const result = await learnFromDecision({
      ...basePayload,
      decision: wasModified ? 'modified' : 'approved',
      modification: wasModified ? edited.trim() : undefined,
    })
    setInsight(result)
    setUiState('done_approve')
    onApprove?.(edited.trim())
  }

  async function handleReject() {
    setUiState('saving')
    const result = await learnFromDecision({
      ...basePayload,
      decision: 'rejected',
      rejection_reason: rejectionReason.trim() || undefined,
    })
    setInsight(result)
    setUiState('done_reject')
    onReject?.()
  }

  return (
    <motion.div
      layout
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-purple-400">
          {label}
        </span>
        {uiState === 'done_approve' && (
          <span className="text-xs text-green-400 font-medium">✓ Approved & learned</span>
        )}
        {uiState === 'done_reject' && (
          <span className="text-xs text-red-400 font-medium">✗ Rejected & learned</span>
        )}
      </div>

      {/* Suggestion body */}
      {uiState === 'modifying' ? (
        <textarea
          value={edited}
          onChange={e => setEdited(e.target.value)}
          rows={4}
          className="w-full rounded-lg bg-white/10 text-white text-sm p-3 resize-none outline-none focus:ring-2 focus:ring-purple-500"
        />
      ) : (
        <p className="text-sm text-white/80 leading-relaxed">{suggestion}</p>
      )}

      {/* Reject reason input */}
      <AnimatePresence>
        {uiState === 'rejecting' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <input
              type="text"
              placeholder="Why are you rejecting this? (optional)"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="w-full rounded-lg bg-white/10 text-white text-sm p-3 outline-none focus:ring-2 focus:ring-red-500 placeholder:text-white/30"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insight bubble */}
      <AnimatePresence>
        {insight && (uiState === 'done_approve' || uiState === 'done_reject') && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3"
          >
            <p className="text-xs text-purple-300 font-medium mb-1">🧠 Learned:</p>
            <p className="text-xs text-white/70">{insight}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {uiState === 'idle' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleApprove}
            className="flex-1 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm font-medium py-2 transition-colors"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setUiState('modifying')}
            className="flex-1 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-medium py-2 transition-colors"
          >
            ✏ Edit
          </button>
          <button
            onClick={() => setUiState('rejecting')}
            className="flex-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium py-2 transition-colors"
          >
            ✗ Reject
          </button>
        </div>
      )}

      {uiState === 'modifying' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleApprove}
            className="flex-1 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm font-medium py-2 transition-colors"
          >
            ✓ Save & Approve
          </button>
          <button
            onClick={() => { setEdited(suggestion); setUiState('idle') }}
            className="rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm font-medium px-4 py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {uiState === 'rejecting' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleReject}
            className="flex-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium py-2 transition-colors"
          >
            ✗ Confirm Reject
          </button>
          <button
            onClick={() => setUiState('idle')}
            className="rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm font-medium px-4 py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {uiState === 'saving' && (
        <p className="text-xs text-white/40 text-center py-2 animate-pulse">
          Saving decision & learning…
        </p>
      )}
    </motion.div>
  )
}
