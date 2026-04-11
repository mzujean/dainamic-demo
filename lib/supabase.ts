import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getProducts() {
  const { data, error } = await supabase.from("products").select("*").eq("available", true).order("category").order("price");
  if (error) throw error;
  return data;
}

export async function createOrder(order: any) {
  const { data, error } = await supabase.from("orders").insert(order).select().single();
  if (error) throw error;
  return data;
}

export async function getOrders() {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getClients() {
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function updateFollowUpStatus(id: string, status: string) {
  const { error } = await supabase.from("clients").update({ follow_up_status: status }).eq("id", id);
  if (error) throw error;
}

export async function addFinanceEntry(entry: any) {
  const { data, error } = await supabase.from("finance").insert(entry).select().single();
  if (error) throw error;
  return data;
}

export async function getFinanceEntries() {
  const { data, error } = await supabase.from("finance").select("*").order("date", { ascending: false });
  if (error) throw error;
  return data;
}
