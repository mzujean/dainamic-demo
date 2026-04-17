import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function callGroq(system: string, user: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

async function getSystemState() {
  // Query all tables to auto-detect what's live and working
  const [orders, clients, contentQueue, products, finance, sessionProgress] = await Promise.all([
    supabase.from("orders").select("id, created_at, status").order("created_at", { ascending: false }).limit(5),
    supabase.from("clients").select("id, name, follow_up_status").limit(100),
    supabase.from("content_queue").select("id, created_at, status, platform").order("created_at", { ascending: false }).limit(10),
    supabase.from("products").select("id, name, available").eq("available", true),
    supabase.from("finance").select("id, created_at").limit(5),
    supabase.from("session_progress").select("*").order("updated_at", { ascending: false }).limit(20),
  ]);

  return {
    orders: {
      exists: !orders.error && (orders.data?.length ?? 0) > 0,
      count: orders.data?.length ?? 0,
      latest: orders.data?.[0] ?? null,
    },
    clients: {
      exists: !clients.error && (clients.data?.length ?? 0) > 0,
      count: clients.data?.length ?? 0,
    },
    contentQueue: {
      exists: !contentQueue.error && (contentQueue.data?.length ?? 0) > 0,
      count: contentQueue.data?.length ?? 0,
      latest: contentQueue.data?.[0] ?? null,
    },
    products: {
      exists: !products.error && (products.data?.length ?? 0) > 0,
      count: products.data?.length ?? 0,
    },
    finance: {
      exists: !finance.error && (finance.data?.length ?? 0) > 0,
    },
    sessionProgress: sessionProgress.data ?? [],
  };
}

async function ensureSessionProgressTable() {
  // Try inserting a test row to see if table exists — if not, we handle gracefully
  const { error } = await supabase.from("session_progress").select("id").limit(1);
  return !error;
}

export async function POST(req: NextRequest) {
  try {
    const { action, message, manualUpdate } = await req.json();

    // AUTO BRIEF — called on page load
    if (action === "get_brief") {
      const state = await getSystemState();
      const tableExists = await ensureSessionProgressTable();

      // Build what we know automatically from data
      const autoDetected = [
        state.products.exists ? `${state.products.count} products live in store` : "No products loaded yet",
        state.orders.exists ? `${state.orders.count} orders received — store is working` : "No orders yet",
        state.clients.exists ? `${state.clients.count} clients in database` : "No clients added yet",
        state.contentQueue.exists ? `${state.contentQueue.count} items in content queue — content engine fired` : "Content queue is empty",
        state.finance.exists ? "Finance entries recorded" : "No finance entries yet",
      ];

      // Known manual progress from session_progress table
      const manualItems = tableExists ? state.sessionProgress.map((s: any) => `${s.feature}: ${s.status} — ${s.note}`).join("\n") : "";

      const system = `You are the Dainamic Hair OS assistant — a smart, concise build agent for Dai-Jean's hair business app.
Your job is to brief Dai-Jean at the start of each session on exactly where things stand and what to focus on.
Be warm, direct, and specific. Like a co-founder giving a morning standup. No fluff.
Speak in second person — "you have", "you're working on".
Keep it under 80 words. End with one clear priority action.`;

      const user = `Today is Session 4 — ${new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.

AUTO-DETECTED FROM SUPABASE:
${autoDetected.join("\n")}

MANUALLY CONFIRMED PROGRESS:
${manualItems || "WhatsApp number switched to personal — bot unblocked\nDocker stack updated\nContent scheduler page built\nMeta Developer app created"}

SESSION 4 GOALS:
1. WhatsApp bot QR scan — go live
2. Install Node.js on Windows
3. Test content page end-to-end
4. Set up Facebook auto-posting via Make.com
5. Upload clips to Google Drive

Give Dai-Jean her morning brief. What's done, what's next, what's the one thing to focus on right now.`;

      const brief = await callGroq(system, user);

      return NextResponse.json({
        success: true,
        brief,
        state: {
          autoDetected,
          sessionProgress: state.sessionProgress,
          tableExists,
        },
      });
    }

    // VOICE QUESTION — user asks something mid-session
    if (action === "ask") {
      const state = await getSystemState();

      const system = `You are the Dainamic Hair OS build assistant. Answer Dai-Jean's questions about the current build state concisely and helpfully.
You have access to live data from Supabase. Be specific, warm, and direct. Max 60 words per response.`;

      const user = `Live system state:
- Products in store: ${state.products.count}
- Orders received: ${state.orders.count}
- Content queue items: ${state.contentQueue.count}
- Clients in DB: ${state.clients.count}

Session 4 is in progress. WhatsApp number switched to personal.

Dai-Jean asks: "${message}"`;

      const response = await callGroq(system, user);
      return NextResponse.json({ success: true, response });
    }

    // MANUAL UPDATE — user confirms something is done
    if (action === "update_progress") {
      const { feature, status, note, session } = manualUpdate;

      const { error } = await supabase.from("session_progress").upsert({
        feature,
        status,
        note,
        session: session ?? "S4",
        updated_at: new Date().toISOString(),
      }, { onConflict: "feature" });

      if (error) {
        // Table might not exist yet — return instructions
        return NextResponse.json({
          success: false,
          error: "session_progress table not found. Create it in Supabase.",
          sql: `create table session_progress (
  id uuid default gen_random_uuid() primary key,
  feature text unique not null,
  status text not null,
  note text,
  session text,
  updated_at timestamptz default now()
);`
        });
      }

      return NextResponse.json({ success: true, message: `${feature} marked as ${status}` });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("Progress agent error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
