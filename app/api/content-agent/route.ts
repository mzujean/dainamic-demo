import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function callGroq(system: string, user: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

export async function POST(req: NextRequest) {
  try {
    const { action, context } = await req.json();

    if (action === "generate_batch") {
      const { platforms, postsPerPlatform, pillars, hasOrders, hasNewProducts, contentMix, businessContext } = context;

      const system = `You are a content strategy agent for Dainamic Hair, a South African natural hair care brand owned by Dai-Jean.

BRAND VOICE: Warm, knowledgeable, authentic. Like a friend who knows hair. Real talk, no corporate speak.
PRODUCTS: Daily Hair Moisturiser, Growth Elixir, Clarifying Shampoo, Leave-in Cream, Hair Butter, Starter Kits, Full House Bundle.
TARGET: Natural hair community, 4A/4B/4C hair types, South African women primarily.
GOAL: Reach 5,000 customers by end of year.

CONTENT MIX (Scenario 3):
- 45% Text/graphic posts (inspirational, lifestyle, quotes, tips) — for Canva Bulk Create
- 25% AI video scripts (educational, product demos, storytelling) — for HeyGen/Runway/Pika
- 20% BTS/self-recorded prompts (authentic, behind the scenes) — suggestions for Dai-Jean to film
- 10% Product image prompts (for Google ImageFX free tier)

RULES:
- Never be too salesy. Educational and lifestyle first, product second.
- BTS content only suggested if context says orders/products available.
- Text posts must work standalone without video.
- All captions platform-optimised.
- Return ONLY valid JSON, no markdown backticks.`;

      const user = `Generate a full content batch for today.

Context:
- Platforms: ${platforms.join(", ")}
- Posts per platform: ${postsPerPlatform}
- Total posts needed: ${platforms.length * postsPerPlatform}
- Active pillars: ${pillars.join(", ")}
- Has active orders to pack: ${hasOrders}
- Has new products to feature: ${hasNewProducts}
- Business notes: ${businessContext || "Growing steadily, building audience"}

Return JSON in this exact format:
{
  "strategy_note": "brief note on today's content angle",
  "text_posts": [
    {
      "id": "t1",
      "pillar": "string",
      "hook": "opening line",
      "caption": "full caption text",
      "hashtags": ["tag1", "tag2"],
      "platforms": ["ig", "facebook"],
      "canva_text": "short text for Canva overlay (max 12 words)",
      "image_prompt": "Google ImageFX prompt for background image"
    }
  ],
  "video_scripts": [
    {
      "id": "v1",
      "pillar": "string",
      "title": "video title",
      "hook": "first 3 seconds script",
      "script": "full 30-second script",
      "caption": "post caption",
      "platforms": ["ig", "tiktok"],
      "platform_notes": "any platform-specific adjustments"
    }
  ],
  "bts_prompts": [
    {
      "id": "b1",
      "title": "what to film",
      "description": "exactly what to capture and say",
      "available_if": "condition e.g. only if packing orders",
      "caption": "caption to use when posted",
      "platforms": ["tiktok", "ig"]
    }
  ],
  "image_prompts": [
    {
      "id": "i1",
      "product": "product name",
      "prompt": "detailed Google ImageFX prompt",
      "caption": "post caption",
      "platforms": ["ig"]
    }
  ],
  "canva_csv_rows": [
    {"text": "canva overlay text", "caption": "post caption", "hashtags": "#tag1 #tag2", "platform": "ig"}
  ]
}

Generate ${Math.round(platforms.length * postsPerPlatform * 0.45)} text posts, ${Math.round(platforms.length * postsPerPlatform * 0.25)} video scripts, ${Math.round(platforms.length * postsPerPlatform * 0.20)} BTS prompts, ${Math.round(platforms.length * postsPerPlatform * 0.10)} image prompts.`;

      const raw = await callGroq(system, user);
      const clean = raw.replace(/```json|```/g, "").trim();
      const result = JSON.parse(clean);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "analyse_performance") {
      const { metrics } = context;

      const system = `You are a social media analytics agent for Dainamic Hair. Analyse performance data and give practical, specific recommendations. Be direct and actionable. Return ONLY valid JSON.`;

      const user = `Analyse this performance data and recommend next steps:
${JSON.stringify(metrics, null, 2)}

Return JSON:
{
  "top_performing": [{"content_type": "string", "reason": "string", "action": "string"}],
  "underperforming": [{"content_type": "string", "reason": "string", "action": "string"}],
  "recommended_mix_change": "string",
  "priority_actions": ["action1", "action2", "action3"],
  "content_to_increase": "string",
  "content_to_decrease": "string",
  "next_week_focus": "string"
}`;

      const raw = await callGroq(system, user);
      const clean = raw.replace(/```json|```/g, "").trim();
      return NextResponse.json({ success: true, data: JSON.parse(clean) });
    }

    if (action === "generate_scripts") {
      const { topic, count, pillar } = context;

      const system = `You are a video script writer for Dainamic Hair's AI avatar. Write in Dai-Jean's voice — warm, knowledgeable, authentic South African woman who knows natural hair deeply. Scripts should feel like she's talking to a friend, not presenting to a camera. Return ONLY valid JSON.`;

      const user = `Write ${count} video script(s) about: ${topic}
Pillar: ${pillar}
Duration: 30 seconds each (~70 words)

Return JSON:
{
  "scripts": [
    {
      "title": "string",
      "hook": "first 3 seconds - must stop the scroll",
      "body": "main content",
      "cta": "call to action",
      "full_script": "complete script to read",
      "word_count": number,
      "caption": "social media caption",
      "hashtags": ["tag1", "tag2"]
    }
  ]
}`;

      const raw = await callGroq(system, user);
      const clean = raw.replace(/```json|```/g, "").trim();
      return NextResponse.json({ success: true, data: JSON.parse(clean) });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("Content agent error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
