import { createClient } from '@supabase/supabase-js'
import type {
  AgentContext,
  AgentMemory,
  AgentType,
  AgentPromptContext,
  KnowledgeGap,
  AgentFinding,
} from '@/types/agent-os'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function loadAgentContext(): Promise<{
  soul: string
  user: string
  heartbeat: string
}> {
  const { data, error } = await supabase
    .from('agent_context')
    .select('file_name, content')

  if (error) throw new Error(`Failed to load agent context: ${error.message}`)

  const map = Object.fromEntries(
    (data as AgentContext[]).map((row) => [row.file_name, row.content])
  )

  return {
    soul: map['soul'] ?? '',
    user: map['user'] ?? '',
    heartbeat: map['heartbeat'] ?? '',
  }
}

export async function loadMemories(
  agentType: AgentType,
  tags: string[] = [],
  limit = 10
): Promise<AgentMemory[]> {
  let query = supabase
    .from('agent_memory')
    .select('*')
    .eq('agent_type', agentType)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  const { data, error } = await query
  if (error) return []
  return data as AgentMemory[]
}

export async function writeMemory(
  agentType: AgentType,
  insight: string,
  context: Record<string, unknown> = {},
  tags: string[] = []
): Promise<void> {
  await supabase.from('agent_memory').insert({
    agent_type: agentType,
    insight,
    context,
    tags,
  })
}

export async function registerKnowledgeGap(
  agentType: AgentType,
  gapKey: string,
  question: string,
  context: Record<string, unknown> = {}
): Promise<void> {
  await supabase
    .from('knowledge_gaps')
    .upsert(
      { agent_type: agentType, gap_key: gapKey, question, context },
      { onConflict: 'gap_key', ignoreDuplicates: true }
    )
}

export async function getKnowledgeAnswer(gapKey: string): Promise<string | null> {
  const { data } = await supabase
    .from('knowledge_gaps')
    .select('answer')
    .eq('gap_key', gapKey)
    .not('answer', 'is', null)
    .single()

  return data?.answer ?? null
}

export async function getUnansweredGaps(): Promise<KnowledgeGap[]> {
  const { data, error } = await supabase
    .from('knowledge_gaps')
    .select('*')
    .is('answered_at', null)
    .order('created_at', { ascending: true })

  if (error) return []
  return data as KnowledgeGap[]
}

export async function answerKnowledgeGap(
  gapKey: string,
  answer: string
): Promise<void> {
  await supabase
    .from('knowledge_gaps')
    .update({ answer, answered_at: new Date().toISOString() })
    .eq('gap_key', gapKey)

  if (gapKey.startsWith('owner.') || gapKey.startsWith('client.') ||
      gapKey.startsWith('inventory.') || gapKey.startsWith('content.') ||
      gapKey.startsWith('finance.')) {
    await patchUserContext(gapKey, answer)
  }
}

async function patchUserContext(gapKey: string, answer: string): Promise<void> {
  const { data } = await supabase
    .from('agent_context')
    .select('content')
    .eq('file_name', 'user')
    .single()

  if (!data) return

  const keyMap: Record<string, string> = {
    'owner.name': 'Name',
    'owner.working_hours': 'Working Hours',
    'client.followup_days': 'Client Follow-up Days',
    'client.followup_tone': 'Client Follow-up Tone',
    'inventory.approval_threshold': 'Reorder Approval Threshold',
    'content.post_frequency': 'Content Post Frequency',
    'content.primary_platform': 'Primary Platform',
    'finance.weekly_summary_day': 'Weekly Summary Day',
  }

  const label = keyMap[gapKey]
  if (!label) return

  let content: string = data.content
  const sectionRegex = new RegExp(`## ${label}\n[^\n]*`, 'g')
  const newSection = `## ${label}\n${answer}`

  if (sectionRegex.test(content)) {
    content = content.replace(sectionRegex, newSection)
  } else {
    content += `\n\n## ${label}\n${answer}`
  }

  await supabase
    .from('agent_context')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('file_name', 'user')
}

export async function buildAgentPrompt(
  agentType: AgentType,
  task: string,
  liveData: Record<string, unknown> = {},
  requireApprovalFor: string[] = [],
  memoryTags: string[] = []
): Promise<AgentPromptContext> {
  const [context, memories] = await Promise.all([
    loadAgentContext(),
    loadMemories(agentType, memoryTags),
  ])

  return {
    soul: context.soul,
    user: context.user,
    heartbeat: context.heartbeat,
    relevant_memories: memories,
    task,
    live_data: liveData,
    require_approval_for: requireApprovalFor,
  }
}

export function formatPromptForGroq(ctx: AgentPromptContext): {
  system: string
  user: string
} {
  const memorySummary = ctx.relevant_memories.length > 0
    ? ctx.relevant_memories
        .slice(0, 5)
        .map((m) => `- [${m.agent_type}] ${m.insight}`)
        .join('\n')
    : 'No relevant memories yet.'

  const system = `${ctx.soul}\n\n---\n\n${ctx.user}`

  const user = `## Relevant Memory
${memorySummary}

## Task
${ctx.task}

## Live Data
\`\`\`json
${JSON.stringify(ctx.live_data, null, 2)}
\`\`\`

## Constraints
- Response format: JSON
- If you need information not present above, output: { "needs_info": true, "gap_key": "...", "question": "..." }
- Require human approval before: ${ctx.require_approval_for.join(', ') || 'none specified'}
- Max 3 actions per response`

  return { system, user }
}

export async function runHeartbeat(
  triggeredBy: 'user_open' | 'manual' | 'whatsapp' | 'scheduled'
): Promise<{
  hasAlerts: boolean
  findings: AgentFinding[]
  unansweredGaps: KnowledgeGap[]
}> {
  const unansweredGaps = await getUnansweredGaps()
  const findings: AgentFinding[] = []

  for (const gap of unansweredGaps) {
    findings.push({
      type: 'gap',
      message: gap.question,
      gap_key: gap.gap_key,
    })
  }

  await supabase.from('agent_heartbeat_log').insert({
    triggered_by: triggeredBy,
    agents_run: ['system'],
    findings: { system: findings },
    actions_taken: {},
  })

  return {
    hasAlerts: findings.length > 0,
    findings,
    unansweredGaps,
  }
}
