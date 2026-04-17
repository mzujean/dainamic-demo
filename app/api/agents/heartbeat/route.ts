import { NextRequest, NextResponse } from 'next/server'
import { runHeartbeat } from '@/lib/agents/agent-os'

export async function POST(req: NextRequest) {
  try {
    const { trigger = 'user_open' } = await req.json()
    const result = await runHeartbeat(trigger)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ error: 'Heartbeat failed' }, { status: 500 })
  }
}
