'use client'

import { useState, useEffect, useCallback } from 'react'
import type { KnowledgeGap, AgentFinding } from '@/types/agent-os'

interface HeartbeatState {
  isRunning: boolean
  hasAlerts: boolean
  unansweredGaps: KnowledgeGap[]
  findings: AgentFinding[]
  lastRun: Date | null
}

export function useHeartbeat() {
  const [state, setState] = useState<HeartbeatState>({
    isRunning: false,
    hasAlerts: false,
    unansweredGaps: [],
    findings: [],
    lastRun: null,
  })

  const runHeartbeat = useCallback(async (trigger: 'user_open' | 'manual' = 'user_open') => {
    setState((s) => ({ ...s, isRunning: true }))

    try {
      const res = await fetch('/api/agents/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger }),
      })

      if (!res.ok) throw new Error('Heartbeat failed')

      const data = await res.json()

      setState({
        isRunning: false,
        hasAlerts: data.hasAlerts,
        unansweredGaps: data.unansweredGaps ?? [],
        findings: data.findings ?? [],
        lastRun: new Date(),
      })
    } catch {
      setState((s) => ({ ...s, isRunning: false }))
    }
  }, [])

  useEffect(() => {
    runHeartbeat('user_open')
  }, [runHeartbeat])

  const answerGap = useCallback(async (gapKey: string, answer: string) => {
    await fetch('/api/agents/answer-gap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gapKey, answer }),
    })

    setState((s) => ({
      ...s,
      unansweredGaps: s.unansweredGaps.filter((g) => g.gap_key !== gapKey),
      hasAlerts: s.unansweredGaps.length > 1,
    }))
  }, [])

  return {
    ...state,
    runHeartbeat,
    answerGap,
  }
}
