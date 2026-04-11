import { createClient } from "@supabase/supabase-js";
import StorePage from "./StorePage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .gt("price", 0)
    .order("category")
    .order("price");

  return <StorePage products={products || []} />;
}
