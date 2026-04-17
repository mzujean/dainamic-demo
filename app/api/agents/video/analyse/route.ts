import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

export async function POST(req: NextRequest) {
  try {
    const { videoId, videoUrl, fileName } = await req.json()

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })
    }

    const prompt = `You are analysing a short-form video for a South African hair business called Dainamic Hair.

Analyse this video and return a JSON object with EXACTLY these fields:

{
  "transcript": "Full word-for-word transcript of everything spoken in the video",
  "summary": "2-3 sentence description of what this video is about",
  "highlightStart": <number - the second where the most engaging moment starts>,
  "highlightEnd": <number - the second where that highlight ends>,
  "topicTags": ["tag1", "tag2"]
}

Rules:
- Return ONLY valid JSON, no markdown, no explanation
- highlightStart and highlightEnd must be integers (seconds)
- topicTags must be lowercase, single words or hyphenated
- If no speech detected, set transcript to "No speech detected"
- Video file name for reference: ${fileName}`

    const videoRes = await fetch(videoUrl)
    const videoBuffer = await videoRes.arrayBuffer()
    const base64Video = Buffer.from(videoBuffer).toString('base64')
    const mimeType = videoUrl.includes('.mp4') ? 'video/mp4' : 'video/quicktime'

    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Video,
              }
            },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      throw new Error(`Gemini error: ${err}`)
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const cleaned = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({
      videoId,
      transcript: parsed.transcript ?? '',
      summary: parsed.summary ?? '',
      highlightStart: parsed.highlightStart ?? 0,
      highlightEnd: parsed.highlightEnd ?? 30,
      topicTags: parsed.topicTags ?? [],
    })

  } catch (error) {
    console.error('Gemini video analysis error:', error)
    return NextResponse.json(
      { error: `Analysis failed: ${String(error)}` },
      { status: 500 }
    )
  }
}
