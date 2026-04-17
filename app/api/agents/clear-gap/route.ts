import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { gapKey } = await req.json()

    if (!gapKey) {
      return NextResponse.json({ error: 'gapKey required' }, { status: 400 })
    }

    await supabase
      .from('knowledge_gaps')
      .update({ answer: null, answered_at: null })
      .eq('gap_key', gapKey)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
