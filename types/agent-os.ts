export type AgentType = 'inventory' | 'client' | 'content' | 'finance' | 'video' | 'system'
export type HeartbeatTrigger = 'user_open' | 'manual' | 'whatsapp' | 'scheduled'
export type VideoStatus = 'uploaded' | 'transcribed' | 'analysed' | 'clipped' | 'scheduled' | 'posted'
export type ScriptStatus = 'draft' | 'paired' | 'scheduled' | 'posted'

export interface AgentContext {
  id: string
  file_name: 'soul' | 'user' | 'heartbeat'
  content: string
  updated_at: string
}

export interface AgentMemory {
  id: string
  agent_type: AgentType
  insight: string
  context: Record<string, unknown>
  tags: string[]
  created_at: string
}

export interface KnowledgeGap {
  id: string
  agent_type: AgentType
  gap_key: string
  question: string
  answer: string | null
  context: {
    priority?: number
    category?: string
    triggered_by_task?: string
    [key: string]: unknown
  }
  answered_at: string | null
  created_at: string
}

export interface WizardQuestion {
  gap_key: string
  question: string
  agent_type: AgentType
  category: string
  input_type: 'text' | 'number' | 'select' | 'time_range'
  options?: string[]
  placeholder?: string
}

export interface AgentFinding {
  type: 'alert' | 'info' | 'action_required' | 'gap'
  message: string
  data?: Record<string, unknown>
  gap_key?: string
}

export interface HeartbeatLog {
  id: string
  triggered_by: HeartbeatTrigger
  agents_run: AgentType[]
  findings: Record<AgentType, AgentFinding[]>
  actions_taken: Record<string, unknown>
  created_at: string
}

export interface VideoAsset {
  id: string
  file_name: string
  storage_path: string
  drive_file_id: string | null
  transcript: string | null
  summary: string | null
  highlight_timestamp_start: number | null
  highlight_timestamp_end: number | null
  script_id: string | null
  status: VideoStatus
  platform_post_ids: Record<string, string>
  created_at: string
  updated_at: string
}

export interface ContentScript {
  id: string
  title: string
  body: string
  topic_tags: string[]
  platform: 'facebook' | 'instagram' | 'tiktok' | 'all'
  video_id: string | null
  status: ScriptStatus
  created_at: string
}

export interface AgentPromptContext {
  soul: string
  user: string
  heartbeat: string
  relevant_memories: AgentMemory[]
  task: string
  live_data: Record<string, unknown>
  require_approval_for: string[]
}
