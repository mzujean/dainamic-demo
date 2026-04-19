import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TONE_SYSTEM_PROMPT = `You are the client communication agent for Dainamic Hair, a natural hair care brand in Johannesburg run by Dai-Jean Mzumara.

Your job is to write WhatsApp messages on Dai-Jean's behalf to customers.

COMMUNICATION STYLE — match this exactly:
- Greet with time of day + "dear", "mama", or "ma'am" for regulars. New leads get "Hello👋"
- Write in short message bursts — keep it brief and natural, not long paragraphs
- Educate before selling — ask diagnostic questions about hair type, porosity, breakage before recommending products
- When a customer doubts the products, stay calm, validate the concern, reference Facebook videos for education, never be defensive
- NEVER pressure for payment. Use "no worries", acknowledge loyalty ("you have always paid me, I will wait")
- Celebrate customer results with genuine excitement: "Whooop whooopp", dance emojis 💃🏾, hearts ❤️
- Apologise immediately and own problems without making excuses. "My sincerest apologies"
- Be transparent with pricing. Offer discounts unprompted on large orders
- End messages with 🙏🏾 or "thank you for trusting me with your hair"
- Refer customers to Facebook videos for hair education when relevant

OWNER PREFERENCES:
- Working hours: 8am–6pm
- Follow-up window: 7 days after last contact
- Primary platform: Facebook
- Reorders: always confirm with owner before committing
- Summary day: Sunday

Write ONLY the WhatsApp message text. No preamble, no labels, no quotes around the message.`

const SCENARIOS: Record<string, string> = {
  followup_7day: `Write a warm WhatsApp follow-up to {name} who enquired about Dainamic Hair products 7 days ago but hasn't purchased yet. Keep it brief, warm, no pressure. Context: {ctx}`,
  followup_payment: `Write a gentle payment follow-up to valued returning customer {name}. Patient tone, trusting energy, "no worries" feel, acknowledge their loyalty. Context: {ctx}`,
  reorder_prompt: `Write a short reorder nudge to {name} who has bought before and is likely due to run out. Mention limited stock if relevant, keep it brief and warm. Context: {ctx}`,
  results_celebrate: `Write a celebratory WhatsApp reply to {name} who just shared positive results from using Dainamic Hair products. Genuine excited energy — "Whooop", dance emojis, heartfelt. Context: {ctx}`,
  doubt_objection: `Write a calm, confident reply to {name} who is expressing doubt about whether Dainamic products will work for their hair. Validate, educate, reference Facebook videos. Context: {ctx}`,
  delivery_update: `Write a brief WhatsApp delivery dispatch update to {name}. Informative, warm, ends warmly. Context: {ctx}`,
  new_product: `Write a WhatsApp new product announcement to loyal customer {name}. Warm, concise, personal. Context: {ctx}`,
  custom: `Write a WhatsApp message to customer {name} for Dainamic Hair. Situation: {ctx}`,
}

export async function POST(req: NextRequest) {
  try {
    const { scenario, customerName, context } = await req.json()

    if (!scenario || !customerName) {
      return NextResponse.json({ error: 'Missing scenario or customerName' }, { status: 400 })
    }

    const template = SCENARIOS[scenario] ?? SCENARIOS.custom
    const userPrompt = template
      .replace(/\{name\}/g, customerName)
      .replace(/\{ctx\}/g, context || 'no additional context')

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: TONE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 512,
    })

    const message = completion.choices[0]?.message?.content?.trim() ?? ''

    await supabase.from('agent_memory').insert({
      agent_type: 'client',
      insight: `Generated ${scenario} message for customer: ${customerName}`,
      context: message.slice(0, 300),
      tags: ['client-agent', 'message-generated', scenario],
    })

    return NextResponse.json({ message })
  } catch (err) {
    console.error('[client-agent] error:', err)
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 })
  }
}