import { NextRequest, NextResponse } from 'next/server'
import { answerKnowledgeGap } from '@/lib/agents/agent-os'

export async function POST(req: NextRequest) {
  try {
    const { gapKey, answer } = await req.json()

    if (!gapKey || !answer) {
      return NextResponse.json({ error: 'gapKey and answer required' }, { status: 400 })
    }

    await answerKnowledgeGap(gapKey, answer)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Answer gap error:', error)
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
  }
}
