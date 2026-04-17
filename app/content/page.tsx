import { createClient } from '@supabase/supabase-js'
import ContentClient from './ContentClient'

export default async function ContentPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: queue } = await supabase
    .from('content_queue')
    .select('*')
    .order('scheduled_for', { ascending: true })

  return <ContentClient initialQueue={queue || []} />
}
