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
  try {
    const { data: memory } = await supabase
      .from("agent_memory")
      .select("insight")
      .eq("agent_type", "inventory")
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: lastLog } = await supabase
      .from("agent_heartbeat_log")
      .select("*")
      .eq("agent_type", "inventory")
      .order("created_at", { ascending: false })
      .limit(1);

    return NextResponse.json({
      last_scan: lastLog?.[0]?.payload ?? null,
      scanned_at: lastLog?.[0]?.created_at ?? null,
      memories: memory?.map((m) => m.insight) ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // If approving reorders, just log to heartbeat and return
    if (body.approved_items?.length > 0) {
      await supabase.from("agent_heartbeat_log").insert({
        agent_type: "inventory",
        payload: { approved_reorders: body.approved_items },
      });
      return NextResponse.json({ success: true });
    }

    // Scan inventory
    const { data: inventory } = await supabase
      .from("finance_inventory")
      .select("*")
      .order("item_name");

    if (!inventory?.length) {
      return NextResponse.json({ success: false, low_stock: [], total_items: 0 });
    }

    // Find low stock items
    const lowStock = inventory
      .filter((i) => i.item_name !== "delivery of items above")
      .filter((i) => (i.quantity ?? 0) <= REORDER_THRESHOLD)
      .map((i) => ({
        id: i.id,
        item_name: i.item_name,
        quantity: i.quantity ?? 0,
        supplier: i.supplier ?? "",
        cost_per_unit: i.cost_per_unit ?? 0,
        status:
          i.quantity === 0 ? "out" : i.quantity <= 1 ? "critical" : "low",
      }));

    // Get past memories to inform the insight
    const { data: memories } = await supabase
      .from("agent_memory")
      .select("insight")
      .eq("agent_type", "inventory")
      .order("created_at", { ascending: false })
      .limit(10);

    const memoryBlock = memories?.length
      ? `Past owner decisions:\n${memories.map((m, i) => `${i + 1}. ${m.insight}`).join("\n")}\n\n`
      : "";

    // Generate insight with Groq
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: `You are the inventory agent for Dainamic Hair, a natural hair products business in South Africa. ${memoryBlock}Analyse the low stock items and write a brief 1-2 sentence insight about the most urgent reorder priorities. Be specific about product names.`,
        },
        {
          role: "user",
          content: `Low stock items: ${JSON.stringify(lowStock)}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const insight = completion.choices[0]?.message?.content ?? "";

    // Write to agent_memory
    await supabase.from("agent_memory").insert({
      agent_type: "inventory",
      insight,
      context: JSON.stringify({ low_stock: lowStock, total_items: inventory.length }),
      tags: ["inventory", "scan", "low-stock"],
    });

    // Log heartbeat
    await supabase.from("agent_heartbeat_log").insert({
      agent_type: "inventory",
      payload: { low_stock: lowStock, total_items: inventory.length, insight },
    });

    return NextResponse.json({
      success: true,
      total_items: inventory.length,
      low_stock: lowStock,
      insight,
    });
  } catch (err) {
    console.error("[inventory agent]", err);
    return NextResponse.json({ error: "Agent failed" }, { status: 500 });
  }
}