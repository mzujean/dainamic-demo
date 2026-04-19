import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data } = await supabase
      .from("agent_heartbeat_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({ heartbeats: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST() {
  try {
    await supabase.from("agent_heartbeat_log").insert({
      agent_type: "heartbeat",
      payload: { ping: true, ts: new Date().toISOString() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}