// app/api/agent/feedback/route.ts
// Records owner approve/reject decisions and writes behavioral insights to agent_memory

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export type FeedbackDecision = 'approved' | 'rejected' | 'modified'

export interface AgentFeedback {
  agent_type: string          // 'inventory' | 'content' | 'finance' | etc.
  action_type: string         // 'reorder_alert' | 'post_suggestion' | 'caption' | etc.
  decision: FeedbackDecision
  suggestion: string          // what the agent suggested
  modification?: string       // if modified, what the owner changed it to
  rejection_reason?: string   // optional: why rejected
  context?: Record<string, unknown> // any extra context (product, platform, etc.)
}

export async function POST(req: NextRequest) {
  try {
    const body: AgentFeedback = await req.json()
    const {
      agent_type,
      action_type,
      decision,
      suggestion,
      modification,
      rejection_reason,
      context,
    } = body

    // 1. Build a prompt to extract the behavioral insight from this decision
    const insightPrompt = buildInsightPrompt({
      agent_type,
      action_type,
      decision,
      suggestion,
      modification,
      rejection_reason,
      context,
    })

    // 2. Ask Groq to distill this into a reusable behavioral insight
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: `You are an AI that extracts behavioral patterns from a business owner's decisions.
Your job is to write a single, concise, reusable insight about how the owner wants their AI agents to behave.
The insight should be specific enough to prevent the same mistake again, but general enough to apply to future situations.
Write in plain English. Max 2 sentences. No bullet points. No preamble.`,
        },
        { role: 'user', content: insightPrompt },
      ],
      temperature: 0.3,
      max_tokens: 150,
    })

    const insight = completion.choices[0]?.message?.content?.trim() ?? ''

    // 3. Generate tags for easy retrieval
    const tags = buildTags(agent_type, action_type, decision, context)

    // 4. Write to agent_memory
    const { error } = await supabase.from('agent_memory').insert({
      agent_type,
      insight,
      context: JSON.stringify({
        action_type,
        decision,
        suggestion,
        modification: modification ?? null,
        rejection_reason: rejection_reason ?? null,
        extra: context ?? null,
      }),
      tags,
    })

    if (error) throw error

    return NextResponse.json({ success: true, insight })
  } catch (err) {
    console.error('[feedback] error:', err)
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
  }
}

// GET: Retrieve recent behavioral insights for a given agent_type
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agent_type = searchParams.get('agent_type')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  let query = supabase
    .from('agent_memory')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agent_type) {
    query = query.eq('agent_type', agent_type)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ memories: data })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInsightPrompt(fb: AgentFeedback): string {
  const lines = [
    `Agent type: ${fb.agent_type}`,
    `Action: ${fb.action_type}`,
    `Decision: ${fb.decision.toUpperCase()}`,
    `Agent suggested: "${fb.suggestion}"`,
  ]
  if (fb.modification) lines.push(`Owner changed it to: "${fb.modification}"`)
  if (fb.rejection_reason) lines.push(`Rejection reason: "${fb.rejection_reason}"`)
  if (fb.context) lines.push(`Context: ${JSON.stringify(fb.context)}`)

  return lines.join('\n')
}

function buildTags(
  agent_type: string,
  action_type: string,
  decision: FeedbackDecision,
  context?: Record<string, unknown>
): string[] {
  const tags = [agent_type, action_type, decision]
  if (context?.platform) tags.push(String(context.platform))
  if (context?.product) tags.push(String(context.product))
  return tags.filter(Boolean)
}
