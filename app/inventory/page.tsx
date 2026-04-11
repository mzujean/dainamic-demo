"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Camera, Upload, Package, CheckCircle, AlertTriangle, X, Plus } from "lucide-react";
import Card from "@/components/Card";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Mode = "view" | "receipt" | "stocktake" | "add-sale";

export default function InventoryPage() {
  const [mode, setMode] = useState<Mode>("view");
  const [inventory, setInventory] = useState<any[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [sale, setSale] = useState({ customer_name: "", description: "", amount: "", payment_method: "EFT" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchInventory(); }, []);

  async function fetchInventory() {
    const { data } = await supabase.from("finance_inventory").select("*").order("item_name");
    setInventory(data || []);
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  }

  async function scanReceipt() {
    if (!image) return;
    setLoading(true);
    setStatus("Reading receipt...");
    try {
      const res = await fetch("/api/gemini-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          prompt: `You are a receipt scanner for a hair product business. Extract all items from this receipt and return ONLY valid JSON in this exact format, no markdown:
{
  "vendor": "store name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "items": [
    { "item_name": "name", "quantity": 1, "cost_per_unit": 0.00, "total_cost": 0.00 }
  ]
}`
        })
      });
      const { result: text } = await res.json();
      const clean = text.replace(/\`\`\`json|\`\`\`/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setStatus("");
    } catch {
      setStatus("Could not read receipt. Try a clearer photo.");
    }
    setLoading(false);
  }

  async function confirmReceipt() {
    if (!result) return;
    setLoading(true);
    setStatus("Saving to Supabase...");
    const today = result.date || new Date().toISOString().slice(0, 10);
    await supabase.from("finance_expenses").insert({
      date: today,
      vendor: result.vendor,
      category: "Inventory",
      description: result.items.map((i: any) => i.item_name).join(", "),
      amount: result.total,
      payment_method: "EFT",
      notes: "Scanned via app"
    });
    await supabase.from("finance_inventory").insert(
      result.items.map((i: any) => ({
        date: today,
        item_name: i.item_name,
        quantity: i.quantity,
        cost_per_unit: i.cost_per_unit,
        total_cost: i.total_cost,
        supplier: result.vendor,
        notes: "Added via receipt scan"
      }))
    );
    setStatus("✅ Saved! Expense and inventory updated.");
    setResult(null);
    setImage(null);
    fetchInventory();
    setLoading(false);
  }

  async function scanStockTake() {
    if (!image) return;
    setLoading(true);
    setStatus("Identifying items...");
    const itemNames = inventory.map(i => i.item_name).join(", ");
    try {
      const res = await fetch("/api/gemini-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          prompt: `You are doing a stock take for a hair product business. Known inventory items: ${itemNames}.
Look at this photo and identify any visible items from the list. Return ONLY valid JSON, no markdown:
{
  "found": [
    { "item_name": "exact name from list", "estimated_quantity": 1, "notes": "e.g. about half full" }
  ]
}`
        })
      });
      const { result: text } = await res.json();
      const clean = text.replace(/\`\`\`json|\`\`\`/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setStatus("");
    } catch {
      setStatus("Could not identify items. Try a clearer photo.");
    }
    setLoading(false);
  }

  async function confirmStockTake() {
    if (!result?.found) return;
    setLoading(true);
    setStatus("Updating stock levels...");
    for (const item of result.found) {
      const match = inventory.find(i => i.item_name.toLowerCase().includes(item.item_name.toLowerCase()));
      if (match) {
        await supabase.from("finance_inventory").update({
          quantity: item.estimated_quantity,
          notes: item.notes || match.notes
        }).eq("id", match.id);
      }
    }
    setStatus("✅ Stock levels updated!");
    setResult(null);
    setImage(null);
    fetchInventory();
    setLoading(false);
  }

  async function logSale() {
    if (!sale.customer_name || !sale.amount) return;
    setLoading(true);
    setStatus("Logging sale...");
    await supabase.from("finance_income").insert({
      date: new Date().toISOString().slice(0, 10),
      customer_name: sale.customer_name,
      category: "Products Sold",
      description: sale.description,
      amount: parseFloat(sale.amount),
      payment_method: sale.payment_method,
      notes: "Added via app"
    });
    setStatus("✅ Sale logged!");
    setSale({ customer_name: "", description: "", amount: "", payment_method: "EFT" });
    setLoading(false);
  }

  const btnStyle = (active: boolean, color = "#a78bfa") => ({
    padding: "10px 18px", borderRadius: 10, border: `0.5px solid ${active ? color : "var(--glass-border)"}`,
    background: active ? `${color}22` : "transparent", color: active ? color : "var(--text-tertiary)",
    fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: active ? 500 : 400
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Inventory</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{inventory.length} items tracked</p>
      </div>

      {/* Mode selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button style={btnStyle(mode === "view")} onClick={() => { setMode("view"); setResult(null); setImage(null); setStatus(""); }}>
          <Package size={14} /> View Stock
        </button>
        <button style={btnStyle(mode === "receipt", "#2dd4bf")} onClick={() => { setMode("receipt"); setResult(null); setImage(null); setStatus(""); }}>
          <Camera size={14} /> Scan Receipt
        </button>
        <button style={btnStyle(mode === "stocktake", "#60a5fa")} onClick={() => { setMode("stocktake"); setResult(null); setImage(null); setStatus(""); }}>
          <Upload size={14} /> Stock Take
        </button>
        <button style={btnStyle(mode === "add-sale", "#fbbf24")} onClick={() => { setMode("add-sale"); setResult(null); setStatus(""); }}>
          <Plus size={14} /> Log Sale
        </button>
      </div>

      {/* VIEW MODE */}
      {mode === "view" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {inventory.filter(i => i.item_name !== "delivery of items above").map((item, i) => (
            <Card key={i} padding="16px">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 13, fontWeight: 500, flex: 1, marginRight: 8 }}>{item.item_name}</div>
                <div style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 4, flexShrink: 0,
                  background: item.quantity === 0 ? "rgba(239,68,68,0.15)" : item.quantity <= 1 ? "rgba(251,191,36,0.15)" : "rgba(45,212,191,0.15)",
                  color: item.quantity === 0 ? "#ef4444" : item.quantity <= 1 ? "#fbbf24" : "#2dd4bf"
                }}>
                  {item.quantity === 0 ? "Out" : item.quantity <= 1 ? "Low" : "OK"}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>
                Qty: {item.quantity ?? "?"} · R{Number(item.total_cost || 0).toLocaleString()}
              </div>
              {item.supplier && <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>{item.supplier}</div>}
              {item.notes && <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4, fontStyle: "italic" }}>{item.notes}</div>}
            </Card>
          ))}
        </div>
      )}

      {/* RECEIPT SCAN MODE */}
      {(mode === "receipt" || mode === "stocktake") && (
        <Card padding="24px">
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 16 }}>
            {mode === "receipt" ? "📸 Take a photo of your receipt" : "📸 Take a photo of your stock shelf"}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImage} style={{ display: "none" }} />
          {!image ? (
            <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--glass-border)", background: "transparent", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <Camera size={32} style={{ opacity: 0.4 }} />
              Tap to open camera or choose photo
            </button>
          ) : (
            <div style={{ textAlign: "center" }}>
              <img src={`data:image/jpeg;base64,${image}`} style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 10, marginBottom: 16 }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => { setImage(null); setResult(null); }} style={{ ...btnStyle(false), color: "var(--text-tertiary)" }}>
                  <X size={14} /> Retake
                </button>
                <button onClick={mode === "receipt" ? scanReceipt : scanStockTake} disabled={loading} style={{ ...btnStyle(true, mode === "receipt" ? "#2dd4bf" : "#60a5fa") }}>
                  {loading ? "Reading..." : mode === "receipt" ? "Read Receipt" : "Identify Items"}
                </button>
              </div>
            </div>
          )}

          {status && (
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: status.includes("✅") ? "rgba(45,212,191,0.1)" : "var(--glass-border)", fontSize: 12, color: status.includes("✅") ? "#2dd4bf" : "var(--text-secondary)" }}>
              {status}
            </div>
          )}

          {/* Receipt results */}
          {result && mode === "receipt" && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Found on receipt:</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Vendor: {result.vendor} · Date: {result.date} · Total: R{result.total}</div>
              {result.items?.map((item: any, i: number) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: "0.5px solid var(--glass-border)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                  <span>{item.item_name} × {item.quantity}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "#2dd4bf" }}>R{item.total_cost}</span>
                </div>
              ))}
              <button onClick={confirmReceipt} disabled={loading} style={{ ...btnStyle(true, "#2dd4bf"), marginTop: 16, width: "100%", justifyContent: "center" }}>
                <CheckCircle size={14} /> Confirm & Save to Supabase
              </button>
            </div>
          )}

          {/* Stock take results */}
          {result && mode === "stocktake" && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Items identified:</div>
              {result.found?.map((item: any, i: number) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: "0.5px solid var(--glass-border)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                  <span>{item.item_name}</span>
                  <span style={{ color: "#60a5fa" }}>Qty: {item.estimated_quantity} · {item.notes}</span>
                </div>
              ))}
              <button onClick={confirmStockTake} disabled={loading} style={{ ...btnStyle(true, "#60a5fa"), marginTop: 16, width: "100%", justifyContent: "center" }}>
                <CheckCircle size={14} /> Update Stock Levels
              </button>
            </div>
          )}
        </Card>
      )}

      {/* LOG SALE MODE */}
      {mode === "add-sale" && (
        <Card padding="24px">
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 20 }}>💰 Log a new sale</div>
          {[
            { label: "Customer name", key: "customer_name", placeholder: "e.g. Mathabelazitha" },
            { label: "Products sold", key: "description", placeholder: "e.g. Hair oils, sprays and butters" },
            { label: "Amount (R)", key: "amount", placeholder: "e.g. 1200" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>{f.label}</div>
              <input
                value={(sale as any)[f.key]}
                onChange={e => setSale(s => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "0.5px solid var(--glass-border)", background: "var(--bg-2)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Payment method</div>
            <select value={sale.payment_method} onChange={e => setSale(s => ({ ...s, payment_method: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "0.5px solid var(--glass-border)", background: "var(--bg-2)", color: "var(--text-primary)", fontSize: 13 }}>
              <option>EFT</option><option>Cash</option><option>Card</option>
            </select>
          </div>
          <button onClick={logSale} disabled={loading} style={{ ...btnStyle(true, "#fbbf24"), width: "100%", justifyContent: "center" }}>
            <Plus size={14} /> {loading ? "Saving..." : "Log Sale"}
          </button>
          {status && <div style={{ marginTop: 12, fontSize: 12, color: "#2dd4bf" }}>{status}</div>}
        </Card>
      )}
    </div>
  );
}
