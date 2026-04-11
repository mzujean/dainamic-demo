import { createClient } from "@supabase/supabase-js";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: income }, { data: expenses }, { data: inventory }] = await Promise.all([
    supabase.from("finance_income").select("*").order("date"),
    supabase.from("finance_expenses").select("*").order("date"),
    supabase.from("finance_inventory").select("*").order("date"),
  ]);

  return <AnalyticsClient income={income || []} expenses={expenses || []} inventory={inventory || []} />;
}
