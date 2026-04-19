import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const REORDER_THRESHOLD = 3;

export async function GET() {
  const { data: memory } = await supabase
    .from("agent_memory")
    .select("insight")
    .eq("agent_type", "inventory")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: lastLog } = await supabase
    .from("agent_heartbeat_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  return NextResponse.json({
    last_scan: lastLog?.[0]?.findings?.inventory ?? null,
    scanned_at: lastLog?.[0]?.created_at ?? null,
    memories: memory?.map((m) => m.insight) ?? [],
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (body.approved_items?.length > 0) {
    await supabase.from("agent_heartbeat_log").insert({
      triggered_by: "user_approval",
      agents_run: ["inventory"],
      findings: { inventory: { approved: body.approved_items } },
      actions_taken: { reorders: body.approved_items },
    });
    return NextResponse.json({ success: true });
  }

  // Step 1: fetch inventory
  const { data: inventory, error: invError } = await supabase
    .from("finance_inventory")
    .select("*")
    .order("item_name");

  if (invError) return NextResponse.json({ step: "fetch_inventory", error: invError.message }, { status: 500 });
  if (!inventory?.length) return NextResponse.json({ success: false, low_stock: [], total_items: 0 });

  const lowStock = inventory
    .filter((i) => i.item_name !== "delivery of items above")
    .filter((i) => (i.quantity ?? 0) <= REORDER_THRESHOLD)
    .map((i) => ({
      id: i.id,
      item_name: i.item_name,
      quantity: i.quantity ?? 0,
      supplier: i.supplier ?? "",
      cost_per_unit: i.cost_per_unit ?? 0,
      status: i.quantity === 0 ? "out" : i.quantity <= 1 ? "critical" : "low",
    }));

  // Step 2: fetch memories
  const { data: memories, error: memError } = await supabase
    .from("agent_memory")
    .select("insight")
    .eq("agent_type", "inventory")
    .order("created_at", { ascending: false })
    .limit(10);

  if (memError) return NextResponse.json({ step: "fetch_memory", error: memError.message }, { status: 500 });

  const memoryBlock = memories?.length
    ? `Past owner decisions:\n${memories.map((m, i) => `${i + 1}. ${m.insight}`).join("\n")}\n\n`
    : "";

  // Step 3: Groq insight
  let insight = "";
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are the inventory agent for Dainamic Hair, a natural hair products business in South Africa. ${memoryBlock}Analyse the low stock items and write a brief 1-2 sentence insight about the most urgent reorder priorities. Be specific about product names.`,
        },
        { role: "user", content: `Low stock items: ${JSON.stringify(lowStock)}` },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });
    insight = completion.choices[0]?.message?.content ?? "";
  } catch (groqErr: any) {
    return NextResponse.json({ step: "groq", error: groqErr.message }, { status: 500 });
  }

  // Step 4: write agent_memory
  const { error: memWriteError } = await supabase.from("agent_memory").insert({
    agent_type: "inventory",
    insight,
    context: JSON.stringify({ low_stock: lowStock, total_items: inventory.length }),
    tags: ["inventory", "scan", "low-stock"],
  });

  if (memWriteError) return NextResponse.json({ step: "write_memory", error: memWriteError.message }, { status: 500 });

  // Step 5: write heartbeat
  const { error: hbError } = await supabase.from("agent_heartbeat_log").insert({
    triggered_by: "user_manual",
    agents_run: ["inventory"],
    findings: { inventory: { low_stock: lowStock, total_items: inventory.length, insight } },
    actions_taken: { alerts: lowStock.map((i) => i.item_name) },
  });

  if (hbError) return NextResponse.json({ step: "write_heartbeat", error: hbError.message }, { status: 500 });

  return NextResponse.json({ success: true, total_items: inventory.length, low_stock: lowStock, insight });
}