import { NextRequest, NextResponse } from 'next/server'

const BUFFER_API_KEY = process.env.BUFFER_API_KEY!
const BUFFER_CHANNEL_ID = process.env.BUFFER_CHANNEL_ID!
const BUFFER_API_BASE = 'https://api.bufferapp.com/1'

export async function POST(req: NextRequest) {
  try {
    const { caption, videoUrl, imageUrl, fileName, scheduledAt } = await req.json()

    if (!caption) {
      return NextResponse.json({ error: 'Caption is required' }, { status: 400 })
    }

    // Build Buffer update payload
    const params = new URLSearchParams()
    params.append('profile_ids[]', BUFFER_CHANNEL_ID)
    params.append('text', caption)

    // If scheduling for later
    if (scheduledAt) {
      params.append('scheduled_at', scheduledAt)
    } else {
      params.append('now', 'true')
    }

    // Attach media
    if (videoUrl) {
      params.append('media[video]', videoUrl)
      params.append('media[thumbnail]', '')
    } else if (imageUrl) {
      params.append('media[photo]', imageUrl)
    }

    // Post to Buffer
    const bufferRes = await fetch(
      `${BUFFER_API_BASE}/updates/create.json?access_token=${BUFFER_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    )

    const bufferData = await bufferRes.json()
    console.log('Buffer response:', JSON.stringify(bufferData))

    if (!bufferRes.ok || bufferData.error) {
      return NextResponse.json({
        success: false,
        error: bufferData.error || 'Buffer API error',
        details: bufferData,
      }, { status: 400 })
    }

    // Auto-delete from Supabase Storage after posting
    if (fileName && !scheduledAt) {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
      setTimeout(async () => {
        try {
          await fetch(`${SUPABASE_URL}/storage/v1/object/clips/${fileName}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
          })
          console.log('Deleted from Supabase:', fileName)
        } catch (err) {
          console.error('Failed to delete:', err)
        }
      }, 300_000) // 5 min delay
    }

    return NextResponse.json({
      success: true,
      buffered: true,
      update_id: bufferData.updates?.[0]?.id,
      scheduled_at: bufferData.updates?.[0]?.due_time,
      posted_to: ['facebook'],
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Auto-post error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
