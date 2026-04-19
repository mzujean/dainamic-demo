// lib/agent-feedback.ts
// Call learnFromDecision() anywhere an owner approves, rejects, or modifies an agent suggestion.
// This is the single entry point for the feedback loop.

export type FeedbackDecision = 'approved' | 'rejected' | 'modified'

export interface DecisionPayload {
  agent_type: string
  action_type: string
  decision: FeedbackDecision
  suggestion: string
  modification?: string       // provide if owner edited the suggestion
  rejection_reason?: string   // provide if owner gave a reason for rejecting
  context?: Record<string, unknown> // e.g. { platform: 'facebook', product: 'Hair Oil 100ml' }
}

/**
 * Record an owner decision and let the system learn from it.
 * Returns the distilled behavioral insight that was saved.
 */
export async function learnFromDecision(payload: DecisionPayload): Promise<string | null> {
  try {
    const res = await fetch('/api/agent/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    return data.insight ?? null
  } catch (err) {
    console.error('[learnFromDecision] failed:', err)
    return null
  }
}

/**
 * Retrieve recent behavioral insights for an agent type.
 * Pass these into agent prompts so they don't repeat past mistakes.
 */
export async function getAgentMemory(agent_type: string, limit = 10): Promise<string[]> {
  try {
    const res = await fetch(`/api/agent/feedback?agent_type=${agent_type}&limit=${limit}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.memories ?? []).map((m: { insight: string }) => m.insight)
  } catch {
    return []
  }
}

/**
 * Format agent memories into a system prompt block.
 * Paste this at the top of any agent's system prompt.
 */
export function formatMemoriesForPrompt(memories: string[]): string {
  if (!memories.length) return ''
  return [
    '## What the owner has taught you (behavioral memory):',
    ...memories.map((m, i) => `${i + 1}. ${m}`),
    '',
  ].join('\n')
}
