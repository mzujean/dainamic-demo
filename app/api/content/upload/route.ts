import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('video') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${timestamp}_${safeName}`

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/clips/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': file.type || 'video/mp4',
          'x-upsert': 'true',
        },
        body: Buffer.from(arrayBuffer) as unknown as BodyInit,
      }
    )

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      throw new Error(`Upload failed: ${err}`)
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/clips/${fileName}`

    return NextResponse.json({
      success: true,
      fileName,
      publicUrl,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET — list all clips in Supabase Storage
export async function GET() {
  try {
    const listRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/list/clips`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix: '',
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        }),
      }
    )

    if (!listRes.ok) {
      throw new Error('Failed to list clips')
    }

    const files = await listRes.json()

    const clips = files
      .filter((f: any) => f.name && !f.name.startsWith('.'))
      .map((f: any) => ({
        name: f.name,
        size: f.metadata?.size || 0,
        createdAt: f.created_at,
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/clips/${f.name}`,
      }))

    return NextResponse.json({ success: true, clips })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// DELETE — remove a clip from storage after posting
export async function DELETE(req: NextRequest) {
  try {
    const { fileName } = await req.json()
    if (!fileName) {
      return NextResponse.json({ error: 'fileName required' }, { status: 400 })
    }

    const delRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/clips/${fileName}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    return NextResponse.json({ success: delRes.ok, deleted: fileName })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
