/**
 * Agent layer — lightweight multi-agent orchestration.
 * Each agent is spawned for a specific task, runs, then is removed.
 * Uses free LLM APIs: Groq (primary), Gemini (fallback/vision).
 */

export type AgentType =
  | "receipt_extractor"
  | "caption_writer"
  | "whatsapp_handler"
  | "follow_up_drafter"
  | "inventory_monitor"
  | "analytics_summariser"
  | "content_scheduler"
  | "pdf_generator";

interface AgentResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ─── Groq (free tier, fast inference) ──────────────────────────
async function callGroq(systemPrompt: string, userMessage: string, model = "llama-3.3-70b-versatile"): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── Gemini (free tier, vision capable) ─────────────────────────
async function callGemini(prompt: string, imageBase64?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const parts: unknown[] = [{ text: prompt }];
  if (imageBase64) {
    parts.unshift({ inline_data: { mime_type: "image/jpeg", data: imageBase64 } });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// ─── Individual agent tasks ─────────────────────────────────────

/** Agent: extract data from receipt/invoice image using Gemini vision */
export async function receiptExtractorAgent(imageBase64: string): Promise<AgentResult> {
  try {
    const prompt = `You are a receipt extraction agent for a small South African hair product business called Dainamic Hair.
Extract all relevant data from this receipt/invoice image and return ONLY valid JSON in this exact format:
{
  "type": "income" | "expense",
  "amount": number,
  "currency": "ZAR",
  "vendor": string,
  "date": "YYYY-MM-DD",
  "category": "product_purchase" | "packaging" | "delivery" | "marketing" | "utilities" | "other",
  "description": string,
  "items": [{ "name": string, "qty": number, "unitPrice": number }]
}
If any field cannot be determined, use null.`;

    const raw = await callGemini(prompt, imageBase64);
    const json = raw.replace(/```json|```/g, "").trim();
    return { success: true, data: JSON.parse(json) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Agent: generate social media captions for a given topic and platform */
export async function captionWriterAgent(params: {
  topic: string;
  platform: "instagram" | "tiktok" | "facebook";
  pillar: string;
  products?: string[];
  count?: number;
}): Promise<AgentResult> {
  try {
    const { topic, platform, pillar, products = [], count = 1 } = params;
    const system = `You are a social media content writer for Dainamic Hair, a South African natural hair care brand.
You write in a warm, knowledgeable tone — like a friend who knows hair inside out.
Products: Daily Moisturiser, Growth Elixir, Shampoo, Leave-in Cream, Hair Butter, Starter Bundle.
Always write in first person or direct address. Keep it real, no corporate speak.
Return ONLY valid JSON array of caption objects: [{ "caption": string, "hashtags": string[], "hook": string }]`;

    const user = `Platform: ${platform}
Topic: ${topic}
Content pillar: ${pillar}
${products.length ? `Featured products: ${products.join(", ")}` : ""}
Generate ${count} caption(s). Vary the hooks. Keep captions ${platform === "tiktok" ? "punchy, under 150 chars" : platform === "instagram" ? "engaging, 100-200 chars + hashtags" : "conversational, 150-250 chars"}.`;

    const raw = await callGroq(system, user, "llama-3.3-70b-versatile");
    const json = raw.replace(/```json|```/g, "").trim();
    return { success: true, data: JSON.parse(json) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Agent: generate WhatsApp order reply or follow-up message */
export async function whatsappHandlerAgent(params: {
  type: "order_menu" | "order_confirm" | "payment_confirm" | "follow_up" | "shipping_update";
  clientName?: string;
  orderRef?: string;
  total?: number;
  products?: string[];
  bankDetails?: { bank: string; account: string; branch: string; name: string };
}): Promise<AgentResult> {
  try {
    const system = `You are the WhatsApp automation agent for Dainamic Hair, a South African natural hair care brand.
Write friendly, concise WhatsApp messages. Use plain text — no markdown. Keep it warm and professional.
Include relevant emojis sparingly. Prices are in ZAR (Rands). Owner's name is the business owner.
Return ONLY valid JSON: { "message": string }`;

    const user = JSON.stringify(params);
    const raw = await callGroq(system, user, "llama-3.3-70b-versatile");
    const json = raw.replace(/```json|```/g, "").trim();
    return { success: true, data: JSON.parse(json) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Agent: generate avatar video script */
export async function avatarScriptAgent(params: {
  topic: string;
  durationSeconds: number;
  pillar: string;
}): Promise<AgentResult> {
  try {
    const system = `You are a video script writer for Dainamic Hair's AI avatar (HeyGen).
Write natural, conversational scripts that sound like the business owner speaking.
The owner is knowledgeable about natural hair care for African hair types (4A, 4B, 4C, coily, curly).
Scripts should feel authentic — not like an ad. Educational first, product mention second if at all.
Return ONLY valid JSON: { "script": string, "wordCount": number, "estimatedSeconds": number, "hook": string }`;

    const user = `Topic: ${params.topic}
Target duration: ${params.durationSeconds} seconds (~${Math.round(params.durationSeconds * 2.3)} words)
Content pillar: ${params.pillar}`;

    const raw = await callGroq(system, user, "llama-3.3-70b-versatile");
    const json = raw.replace(/```json|```/g, "").trim();
    return { success: true, data: JSON.parse(json) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Agent: check inventory and flag items needing reorder */
export async function inventoryMonitorAgent(products: {
  name: string; stock: number; threshold: number; avgDailySales: number;
}[]): Promise<AgentResult> {
  try {
    const system = `You are an inventory management agent for Dainamic Hair.
Analyse stock levels and sales velocity to determine reorder priorities.
Return ONLY valid JSON: { "alerts": [{ "product": string, "urgency": "critical"|"warning"|"ok", "daysLeft": number, "reorderQty": number, "reason": string }] }`;

    const raw = await callGroq(system, JSON.stringify(products));
    const json = raw.replace(/```json|```/g, "").trim();
    return { success: true, data: JSON.parse(json) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Agent: summarise analytics and give business insights */
export async function analyticsAgent(data: {
  revenue: number; expenses: number; orders: number;
  topProducts: { name: string; revenue: number }[];
  socialReach: { platform: string; reach: number }[];
}): Promise<AgentResult> {
  try {
    const system = `You are a business analytics agent for Dainamic Hair, a small South African natural hair care business.
Provide practical, actionable insights — not generic advice.
The owner's goal is to reach 5000 customers by end of year.
Return ONLY valid JSON: { "summary": string, "insights": [{ "area": string, "finding": string, "action": string }], "healthScore": number }`;

    const raw = await callGroq(system, JSON.stringify(data));
    const json = raw.replace(/```json|```/g, "").trim();
    return { success: true, data: JSON.parse(json) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Agent runner (spawns, executes, signals completion) ────────
export type { AgentResult };
export { callGroq, callGemini };
