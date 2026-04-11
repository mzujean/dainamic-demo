import { createClient } from "@supabase/supabase-js";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: income }, { data: expenses }, { data: inventory }, { data: clients }, { data: products }] = await Promise.all([
    supabase.from("finance_income").select("*").order("date"),
    supabase.from("finance_expenses").select("*").order("date"),
    supabase.from("finance_inventory").select("*").order("date"),
    supabase.from("clients").select("*"),
    supabase.from("products").select("*"),
  ]);

  return (
    <DashboardClient
      income={income || []}
      expenses={expenses || []}
      inventory={inventory || []}
      clients={clients || []}
      products={products || []}
    />
  );
}
