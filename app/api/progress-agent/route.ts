import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function callGroq(system: string, user: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });
  const data = await res.json();
  return data.choices[0]?.message?.content ?? "";
}

async function getSystemState() {
  const [
    clients, orders, income, expenses, inventory,
    contentQueue, posts, agentMemory, heartbeat, products
  ] = await Promise.all([
    supabase.from("clients").select("id, name, follow_up_status, created_at").order("created_at", { ascending: false }),
    supabase.from("orders").select("id, created_at, status").order("created_at", { ascending: false }).limit(10),
    supabase.from("finance_income").select("id, amount, date, customer_name").order("date", { ascending: false }).limit(20),
    supabase.from("finance_expenses").select("id, amount, date").order("date", { ascending: false }).limit(10),
    supabase.from("finance_inventory").select("id, item_name, quantity").order("item_name"),
    supabase.from("content_queue").select("id, status, platform, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("posts").select("id, created_at, platform").order("created_at", { ascending: false }).limit(10),
    supabase.from("agent_memory").select("insight, agent_type, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("agent_heartbeat_log").select("created_at, triggered_by").order("created_at", { ascending: false }).limit(5),
    supabase.from("products").select("id, name").limit(20),
  ]);

  const totalRevenue = income.data?.reduce((sum, r) => sum + Number(r.amount || 0), 0) ?? 0;
  const totalExpenses = expenses.data?.reduce((sum, r) => sum + Number(r.amount || 0), 0) ?? 0;
  const lowStock = inventory.data?.filter(i => (i.quantity ?? 0) <= 3).length ?? 0;

  return {
    clients: { count: clients.data?.length ?? 0, latest: clients.data?.[0]?.name ?? null },
    orders: { count: orders.data?.length ?? 0 },
    income: { count: income.data?.length ?? 0, total: totalRevenue, latest: income.data?.[0] ?? null },
    expenses: { count: expenses.data?.length ?? 0, total: totalExpenses },
    inventory: { count: inventory.data?.length ?? 0, lowStock },
    contentQueue: { count: contentQueue.data?.length ?? 0 },
    posts: { count: posts.data?.length ?? 0 },
    agentMemory: { count: agentMemory.data?.length ?? 0, latest: agentMemory.data?.[0]?.insight ?? null },
    heartbeat: { lastRun: heartbeat.data?.[0]?.created_at ?? null },
    products: { count: products.data?.length ?? 0 },
  };
}

export async function POST(req: NextRequest) {
  try {
    const { action, message } = await req.json();

    const state = await getSystemState();

    const stateText = `
LIVE APP STATE (auto-detected from Supabase right now):
- Clients tracked: ${state.clients.count}${state.clients.latest ? ` (latest: ${state.clients.latest})` : ""}
- Sales logged: ${state.income.count} · Total revenue: R${state.income.total.toFixed(2)}
- Expenses logged: ${state.expenses.count} · Total spent: R${state.expenses.total.toFixed(2)}
- Inventory items: ${state.inventory.count} · Low stock: ${state.inventory.lowStock} items need reorder
- Orders: ${state.orders.count}
- Content queue: ${state.contentQueue.count} items
- Posts published: ${state.posts.count}
- Agent memories: ${state.agentMemory.count}${state.agentMemory.latest ? ` (latest: "${state.agentMemory.latest}")` : ""}
- Products in store: ${state.products.count}
- Last agent heartbeat: ${state.heartbeat.lastRun ? new Date(state.heartbeat.lastRun).toLocaleString("en-ZA") : "never"}

WHAT'S WORKING:
${state.clients.count > 0 ? "✅ Clients page — real data from Supabase" : "⏳ Clients page — needs real data"}
${state.income.count > 0 ? "✅ Sales logging — finance_income has entries" : "⏳ Sales logging — no sales recorded yet"}
${state.inventory.count > 0 ? "✅ Inventory — tracking " + state.inventory.count + " items" : "⏳ Inventory — empty"}
${state.agentMemory.count > 0 ? "✅ Agent memory — " + state.agentMemory.count + " insights stored" : "⏳ Agent memory — no decisions logged yet"}
${state.posts.count > 0 ? "✅ Content posting — " + state.posts.count + " posts published" : "⏳ Content posting — not yet working"}
${state.products.count > 0 ? "✅ Products loaded — " + state.products.count + " products" : "⏳ Products — not loaded"}

CURRENT FOCUS (this week):
- Fix analytics numbers to match reality
- Build finance agent
- Build client agent  
- Fix WhatsApp templates
- Content posting to Facebook (weekend)
`.trim();

    if (action === "get_brief") {
      const system = `You are the Dainamic Hair OS assistant — Dai-Jean's smart build co-founder.
Give a concise morning standup brief based on live app data.
Be warm, specific, and direct. Second person only ("you have", "you're at").
Under 80 words. End with ONE clear priority for right now.
Today is ${new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`;

      const brief = await callGroq(system, stateText);
      return NextResponse.json({ success: true, brief, state });
    }

    if (action === "ask") {
      const system = `You are the Dainamic Hair OS assistant. Answer Dai-Jean's questions about her business app.
Be specific, warm, direct. Use the live data provided. Max 60 words.`;

      const response = await callGroq(system, `${stateText}\n\nDai-Jean asks: "${message}"`);
      return NextResponse.json({ success: true, response });
    }

    if (action === "get_state") {
      return NextResponse.json({ success: true, state });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });

  } catch (err) {
    console.error("[progress-agent]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}