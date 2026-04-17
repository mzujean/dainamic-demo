'use client'

import { useHeartbeat } from '@/lib/agents/use-heartbeat'
import KnowledgeWizard from '@/components/wizard/KnowledgeWizard'

export default function AgentOSProvider({ children }: { children: React.ReactNode }) {
  const { unansweredGaps, answerGap, isRunning } = useHeartbeat()

  return (
    <>
      {children}

      {unansweredGaps.length > 0 && !isRunning && (
        <KnowledgeWizard
          gaps={unansweredGaps}
          onAnswer={answerGap}
        />
      )}
    </>
  )
}
