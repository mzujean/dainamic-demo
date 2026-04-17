import { NextRequest, NextResponse } from 'next/server'

const META_PAGE_ID = process.env.META_PAGE_ID
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function deleteFromSupabase(fileName: string) {
  try {
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/clips/${fileName}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
      }
    )
    console.log('Deleted from Supabase:', fileName)
  } catch (err) {
    console.error('Failed to delete from Supabase:', err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { caption, videoUrl, imageUrl, platforms, fileName } = await req.json()

    const results: Record<string, any> = {}

    // FACEBOOK
    if (platforms.includes('facebook')) {
      console.log('Posting to Facebook...')
      console.log('Page ID:', META_PAGE_ID)
      console.log('Video URL:', videoUrl)

      if (videoUrl) {
        // Video post
        const fbRes = await fetch(
          `https://graph.facebook.com/v19.0/${META_PAGE_ID}/videos`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_url: videoUrl,
              description: caption,
              published: true,
              access_token: META_PAGE_ACCESS_TOKEN,
            }),
          }
        )
        results.facebook = await fbRes.json()
        console.log('FB Response:', JSON.stringify(results.facebook))
      } else if (imageUrl) {
        // Image post
        const fbRes = await fetch(
          `https://graph.facebook.com/v19.0/${META_PAGE_ID}/photos`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: imageUrl,
              message: caption,
              access_token: META_PAGE_ACCESS_TOKEN,
            }),
          }
        )
        results.facebook = await fbRes.json()
      } else {
        // Text-only post
        const fbRes = await fetch(
          `https://graph.facebook.com/v19.0/${META_PAGE_ID}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: caption,
              access_token: META_PAGE_ACCESS_TOKEN,
            }),
          }
        )
        results.facebook = await fbRes.json()
      }
    }

    const hasErrors = Object.values(results).some(
      (r: any) => r.error && !r.id
    )

    // Auto-delete from Supabase after successful post (5 min delay for safety)
    if (!hasErrors && fileName) {
      const fileToDelete = fileName
      setTimeout(() => deleteFromSupabase(fileToDelete), 300_000)
    }

    return NextResponse.json({
      success: !hasErrors,
      results,
      posted_to: platforms,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Auto-post error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
