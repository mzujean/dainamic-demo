"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Camera, Upload, Package, CheckCircle, X, Plus, Search,
  Bot, AlertTriangle, RefreshCw, ShoppingCart, Zap, Edit2, Trash2
} from "lucide-react";
import Card from "@/components/Card";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Mode = "view" | "receipt" | "stocktake" | "add-sale" | "add-item";

const CATEGORIES = ["Ingredients", "Packaging", "Tools", "Marketing", "Other"];

type LowStockItem = {
  id: string;
  item_name: string;
  quantity: number;
  supplier: string;
  cost_per_unit: number;
  status: "out" | "critical" | "low";
};

type AgentScanResult = {
  total_items: number;
  low_stock: LowStockItem[];
  scanned_at: string;
  success: boolean;
};

export default function InventoryPage() {
  const [mode, setMode] = useState<Mode>("view");
  const [inventory, setInventory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [newItem, setNewItem] = useState({ item_name: "", category: "Packaging", quantity: "", cost_per_unit: "", supplier: "", notes: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<any>({});

  // Agent state
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentScanResult | null>(null);
  const [agentLastScan, setAgentLastScan] = useState<string | null>(null);
  const [selectedForReorder, setSelectedForReorder] = useState<Set<string>>(new Set());
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalDone, setApprovalDone] = useState(false);
  const [agentDismissed, setAgentDismissed] = useState(false);

  useEffect(() => { fetchInventory(); loadLastScan(); }, []);

  async function fetchInventory() {
    const { data } = await supabase.from("finance_inventory").select("*").order("item_name");
    setInventory(data || []);
  }

  async function loadLastScan() {
    try {
      const res = await fetch("/api/agents/inventory");
      const data = await res.json();
      if (data.last_scan && data.last_scan.low_stock?.length > 0) {
        setAgentResult({ ...data.last_scan, success: true });
        setAgentLastScan(data.scanned_at);
        setAgentDismissed(false);
      }
    } catch { }
  }

  async function runInventoryAgent() {
    setAgentRunning(true);
    setAgentResult(null);
    setAgentDismissed(false);
    setApprovalDone(false);
    setSelectedForReorder(new Set());
    try {
      const res = await fetch("/api/agents/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data: AgentScanResult = await res.json();
      setAgentResult(data);
      setAgentLastScan(new Date().toISOString());
    } catch { }
    setAgentRunning(false);
  }

  async function approveReorders() {
    if (selectedForReorder.size === 0) return;
    setApprovalLoading(true);
    const approved = agentResult?.low_stock.filter(i => selectedForReorder.has(i.item_name)) || [];
    const rejected = agentResult?.low_stock.filter(i => !selectedForReorder.has(i.item_name)) || [];

    const approvedNames = approved.map(i => i.item_name).join(", ");
    const rejectedNames = rejected.map(i => i.item_name).join(", ");

    await fetch("/api/agents/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_type: "inventory",
        action_type: "reorder_decision",
        decision: "approved",
        suggestion: `Low stock scan found ${agentResult?.low_stock.length} items needing reorder`,
        modification: approvedNames ? `Owner approved: ${approvedNames}` : undefined,
        rejection_reason: rejectedNames ? `Owner skipped: ${rejectedNames}` : undefined,
        context: { approved_count: approved.length, rejected_count: rejected.length }
      })
    });

    await fetch("/api/agents/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved_items: approved.map(i => i.item_name) })
    });
    setApprovalDone(true);
    setApprovalLoading(false);
  }

  async function saveEdit(id: string) {
    setStatus("Saving...");
    const total = parseFloat(editRow.cost_per_unit || 0) * parseFloat(editRow.quantity || 0);
    const { error } = await supabase.from("finance_inventory").update({
      item_name: editRow.item_name,
      quantity: parseFloat(editRow.quantity),
      cost_per_unit: parseFloat(editRow.cost_per_unit || 0),
      total_cost: total,
      supplier: editRow.supplier,
      notes: editRow.notes,
      date: editRow.date,
    }).eq("id", id);
    if (error) { setStatus("Error: " + error.message); return; }
    setStatus("✅ Updated!");
    setEditingId(null);
    fetchInventory();
    setTimeout(() => setStatus(""), 1500);
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    await supabase.from("finance_inventory").delete().eq("id", id);
    fetchInventory();
  }

  function toggleReorderItem(name: string) {
    setSelectedForReorder(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
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
    setLoading(true); setStatus("Reading receipt...");
    try {
      const res = await fetch("/api/gemini-vision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, prompt: `You are a receipt scanner for a hair product business. Extract all items from this receipt and return ONLY valid JSON, no markdown:\n{"vendor":"store name","date":"YYYY-MM-DD","total":0.00,"items":[{"item_name":"name","quantity":1,"cost_per_unit":0.00,"total_cost":0.00}]}` })
      });
      const { result: text } = await res.json();
      setResult(JSON.parse(text.replace(/```json|```/g, "").trim()));
      setStatus("");
    } catch { setStatus("Could not read receipt. Try a clearer photo."); }
    setLoading(false);
  }

  async function confirmReceipt() {
    if (!result) return;
    setLoading(true); setStatus("Saving...");
    const today = result.date || new Date().toISOString().slice(0, 10);
    await supabase.from("finance_expenses").insert({ date: today, vendor: result.vendor, category: "Cost of Sales", description: result.items.map((i: any) => i.item_name).join(", "), amount: result.total, payment_method: "EFT", notes: "Scanned via app" });
    await supabase.from("finance_inventory").insert(result.items.map((i: any) => ({ date: today, item_name: i.item_name, quantity: i.quantity, cost_per_unit: i.cost_per_unit, total_cost: i.total_cost, supplier: result.vendor, notes: "Added via receipt scan" })));
    setStatus("✅ Saved!"); setResult(null); setImage(null); fetchInventory();
    setLoading(false);
  }

  async function scanStockTake() {
    if (!image) return;
    setLoading(true); setStatus("Identifying items...");
    const itemNames = inventory.map(i => i.item_name).join(", ");
    try {
      const res = await fetch("/api/gemini-vision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, prompt: `You are doing a stock take for a hair product business. Known inventory: ${itemNames}. Look at this photo and identify visible items. Return ONLY valid JSON, no markdown:\n{"found":[{"item_name":"exact name from list","estimated_quantity":1,"notes":"e.g. about half full"}]}` })
      });
      const { result: text } = await res.json();
      setResult(JSON.parse(text.replace(/```json|```/g, "").trim()));
      setStatus("");
    } catch { setStatus("Could not identify items. Try a clearer photo."); }
    setLoading(false);
  }

  async function confirmStockTake() {
    if (!result?.found) return;
    setLoading(true); setStatus("Updating stock...");
    for (const item of result.found) {
      const match = inventory.find(i => i.item_name.toLowerCase().includes(item.item_name.toLowerCase()));
      if (match) await supabase.from("finance_inventory").update({ quantity: item.estimated_quantity, notes: item.notes || match.notes }).eq("id", match.id);
    }
    setStatus("✅ Stock updated!"); setResult(null); setImage(null); fetchInventory();
    setLoading(false);
  }

  async function addItem() {
    if (!newItem.item_name || !newItem.quantity) return;
    setLoading(true); setStatus("Adding item...");
    const total = parseFloat(newItem.cost_per_unit || "0") * parseFloat(newItem.quantity || "0");
    await supabase.from("finance_inventory").insert({
      date: new Date().toISOString().slice(0, 10),
      item_name: newItem.item_name,
      quantity: parseFloat(newItem.quantity),
      cost_per_unit: parseFloat(newItem.cost_per_unit || "0"),
      total_cost: total,
      supplier: newItem.supplier,
      notes: newItem.category + (newItem.notes ? " — " + newItem.notes : "")
    });
    setStatus("✅ Item added!");
    setNewItem({ item_name: "", category: "Packaging", quantity: "", cost_per_unit: "", supplier: "", notes: "" });
    fetchInventory(); setLoading(false);
  }

  const filtered = inventory.filter(i => {
    if (i.item_name === "delivery of items above") return false;
    const matchSearch = i.item_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || (i.notes || "").toLowerCase().includes(filterCat.toLowerCase());
    return matchSearch && matchCat;
  });

  const btn = (active: boolean, color = "#a78bfa") => ({
    padding: "9px 16px", borderRadius: 10, border: `0.5px solid ${active ? color : "var(--glass-border)"}`,
    background: active ? `${color}22` : "transparent", color: active ? color : "var(--text-tertiary)",
    fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
    fontWeight: active ? 500 : 400, whiteSpace: "nowrap" as const
  });

  const input = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "0.5px solid var(--glass-border)", background: "var(--bg-2)",
    color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" as const, marginBottom: 12
  };

  const statusColor = (s: "out" | "critical" | "low") =>
    s === "out" ? { bg: "rgba(239,68,68,0.12)", text: "#ef4444", label: "Out" } :
      s === "critical" ? { bg: "rgba(251,191,36,0.12)", text: "#fbbf24", label: "Critical" } :
        { bg: "rgba(251,146,60,0.12)", text: "#fb923c", label: "Low" };

  const hasAlerts = agentResult && agentResult.low_stock?.length > 0 && !agentDismissed;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Inventory</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{inventory.length} items tracked</p>
      </div>

      {/* Agent panel */}
      <div style={{ marginBottom: 20 }}>
        {!agentResult && (
          <button onClick={runInventoryAgent} disabled={agentRunning} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "0.5px solid rgba(167,139,250,0.4)", background: "rgba(167,139,250,0.08)", color: "#a78bfa", fontSize: 13, cursor: agentRunning ? "not-allowed" : "pointer", opacity: agentRunning ? 0.7 : 1, fontWeight: 500 }}>
            {agentRunning ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Scanning stock...</> : <><Bot size={13} /> <Zap size={11} /> Run Inventory Agent</>}
          </button>
        )}

        {hasAlerts && (
          <div style={{ borderRadius: 14, border: "0.5px solid rgba(251,146,60,0.3)", background: "rgba(251,146,60,0.05)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "0.5px solid rgba(251,146,60,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(251,146,60,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={15} color="#fb923c" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{agentResult.low_stock.length} item{agentResult.low_stock.length !== 1 ? "s" : ""} need attention</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    Scanned {agentResult.total_items} items · {agentLastScan ? new Date(agentLastScan).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "just now"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={runInventoryAgent} disabled={agentRunning} style={{ ...btn(false), padding: "6px 10px" }}><RefreshCw size={11} /> Rescan</button>
                <button onClick={() => setAgentDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}><X size={14} /></button>
              </div>
            </div>
            <div style={{ padding: "12px 18px" }}>
              {approvalDone ? (
                <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "#2dd4bf" }}>✅ Logged to agent memory. Dai Jean will handle reorders.</div>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10 }}>Select items to reorder:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {agentResult.low_stock.map((item) => {
                      const s = statusColor(item.status);
                      const selected = selectedForReorder.has(item.item_name);
                      return (
                        <div key={item.item_name} onClick={() => toggleReorderItem(item.item_name)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: `0.5px solid ${selected ? "#a78bfa44" : "var(--glass-border)"}`, background: selected ? "rgba(167,139,250,0.08)" : "var(--bg-2)", transition: "all 0.15s ease" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${selected ? "#a78bfa" : "var(--glass-border)"}`, background: selected ? "#a78bfa" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {selected && <CheckCircle size={10} color="white" strokeWidth={3} />}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 500 }}>{item.item_name}</div>
                              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{item.supplier} {item.cost_per_unit > 0 ? `· R${item.cost_per_unit}/unit` : ""}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Qty: {item.quantity}</div>
                            <div style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: s.bg, color: s.text, fontWeight: 500 }}>{s.label}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                    <button onClick={approveReorders} disabled={selectedForReorder.size === 0 || approvalLoading} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: selectedForReorder.size > 0 ? "#a78bfa" : "var(--bg-2)", color: selectedForReorder.size > 0 ? "white" : "var(--text-tertiary)", fontSize: 13, fontWeight: 500, cursor: selectedForReorder.size > 0 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: approvalLoading ? 0.7 : 1 }}>
                      <ShoppingCart size={13} />
                      {approvalLoading ? "Saving..." : selectedForReorder.size > 0 ? `Approve ${selectedForReorder.size} reorder${selectedForReorder.size !== 1 ? "s" : ""}` : "Select items to approve"}
                    </button>
                    <button onClick={() => setAgentDismissed(true)} style={{ ...btn(false), padding: "11px 16px" }}>Dismiss</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {agentDismissed && (
          <button onClick={runInventoryAgent} disabled={agentRunning} style={{ ...btn(false), fontSize: 11 }}>
            <Bot size={11} /> {agentRunning ? "Scanning..." : "Run agent again"}
          </button>
        )}
      </div>

      {/* Mode buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={btn(mode === "view")} onClick={() => { setMode("view"); setResult(null); setImage(null); setStatus(""); setEditingId(null); }}><Package size={13} /> View Stock</button>
        <button style={btn(mode === "add-item", "#2dd4bf")} onClick={() => { setMode("add-item"); setStatus(""); }}><Plus size={13} /> Add Item</button>
        <button style={btn(mode === "receipt", "#60a5fa")} onClick={() => { setMode("receipt"); setResult(null); setImage(null); setStatus(""); }}><Camera size={13} /> Scan Receipt</button>
        <button style={btn(mode === "stocktake", "#a78bfa")} onClick={() => { setMode("stocktake"); setResult(null); setImage(null); setStatus(""); }}><Upload size={13} /> Stock Take</button>
      </div>

      {/* VIEW MODE */}
      {mode === "view" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
              <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." style={{ ...input, marginBottom: 0, paddingLeft: 28 }} />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...input, marginBottom: 0, width: "auto" }}>
              <option>All</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {status && <div style={{ marginBottom: 12, fontSize: 12, color: "#2dd4bf" }}>{status}</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((item) => (
              <Card key={item.id} padding="14px 16px">
                {editingId === item.id ? (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Item name</div>
                        <input value={editRow.item_name || ""} onChange={e => setEditRow((s: any) => ({ ...s, item_name: e.target.value }))} style={{ ...input, marginBottom: 0 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Quantity</div>
                        <input value={editRow.quantity || ""} onChange={e => setEditRow((s: any) => ({ ...s, quantity: e.target.value }))} style={{ ...input, marginBottom: 0 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Cost per unit (R)</div>
                        <input value={editRow.cost_per_unit || ""} onChange={e => setEditRow((s: any) => ({ ...s, cost_per_unit: e.target.value }))} style={{ ...input, marginBottom: 0 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Supplier</div>
                        <input value={editRow.supplier || ""} onChange={e => setEditRow((s: any) => ({ ...s, supplier: e.target.value }))} style={{ ...input, marginBottom: 0 }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Notes</div>
                      <input value={editRow.notes || ""} onChange={e => setEditRow((s: any) => ({ ...s, notes: e.target.value }))} style={{ ...input, marginBottom: 0 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button onClick={() => saveEdit(item.id)} style={{ ...btn(true, "#2dd4bf"), flex: 1, justifyContent: "center" }}>
                        <CheckCircle size={13} /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ ...btn(false), padding: "9px 16px" }}><X size={13} /></button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 13, fontWeight: 500, flex: 1, marginRight: 8 }}>{item.item_name}</div>
                        <div style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, flexShrink: 0, background: item.quantity === 0 ? "rgba(239,68,68,0.15)" : item.quantity <= 1 ? "rgba(251,191,36,0.15)" : "rgba(45,212,191,0.15)", color: item.quantity === 0 ? "#ef4444" : item.quantity <= 1 ? "#fbbf24" : "#2dd4bf" }}>
                          {item.quantity === 0 ? "Out" : item.quantity <= 1 ? "Low" : "OK"}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
                        Qty: {item.quantity ?? "?"} · R{Number(item.cost_per_unit || 0).toFixed(2)}/unit
                      </div>
                      {item.supplier && <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>{item.supplier}</div>}
                      {item.notes && <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4, fontStyle: "italic" }}>{item.notes}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => { setEditingId(item.id); setEditRow({ ...item }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 6 }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 6 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ADD ITEM MODE */}
      {mode === "add-item" && (
        <Card padding="24px">
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 20 }}>➕ Add new inventory item</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Category</div>
          <select value={newItem.category} onChange={e => setNewItem(s => ({ ...s, category: e.target.value }))} style={input}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          {[
            { label: "Item name", key: "item_name", placeholder: "e.g. 50ml Amber Glass Bottles" },
            { label: "Quantity", key: "quantity", placeholder: "e.g. 20" },
            { label: "Cost per unit (R)", key: "cost_per_unit", placeholder: "e.g. 8.50" },
            { label: "Supplier", key: "supplier", placeholder: "e.g. Mabira Pack" },
            { label: "Notes (optional)", key: "notes", placeholder: "e.g. Used for Growth Elixir" },
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>{f.label}</div>
              <input value={(newItem as any)[f.key]} onChange={e => setNewItem(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} style={input} />
            </div>
          ))}
          <button onClick={addItem} disabled={loading} style={{ ...btn(true, "#2dd4bf"), width: "100%", justifyContent: "center", padding: "12px" }}>
            <Plus size={14} /> {loading ? "Saving..." : "Add to Inventory"}
          </button>
          {status && <div style={{ marginTop: 12, fontSize: 12, color: "#2dd4bf" }}>{status}</div>}
        </Card>
      )}

      {/* RECEIPT / STOCK TAKE MODE */}
      {(mode === "receipt" || mode === "stocktake") && (
        <Card padding="24px">
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 16 }}>
            {mode === "receipt" ? "📸 Photo of your receipt" : "📸 Photo of your stock shelf"}
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
                <button onClick={() => { setImage(null); setResult(null); }} style={btn(false)}><X size={14} /> Retake</button>
                <button onClick={mode === "receipt" ? scanReceipt : scanStockTake} disabled={loading} style={btn(true, mode === "receipt" ? "#60a5fa" : "#a78bfa")}>
                  {loading ? "Reading..." : mode === "receipt" ? "Read Receipt" : "Identify Items"}
                </button>
              </div>
            </div>
          )}
          {status && <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: status.includes("✅") ? "rgba(45,212,191,0.1)" : "var(--glass-border)", fontSize: 12, color: status.includes("✅") ? "#2dd4bf" : "var(--text-secondary)" }}>{status}</div>}
          {result && mode === "receipt" && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Found on receipt:</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Vendor: {result.vendor} · {result.date} · R{result.total}</div>
              {result.items?.map((item: any, i: number) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: "0.5px solid var(--glass-border)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                  <span>{item.item_name} × {item.quantity}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "#2dd4bf" }}>R{item.total_cost}</span>
                </div>
              ))}
              <button onClick={confirmReceipt} disabled={loading} style={{ ...btn(true, "#60a5fa"), marginTop: 16, width: "100%", justifyContent: "center" }}>
                <CheckCircle size={14} /> Confirm & Save
              </button>
            </div>
          )}
          {result && mode === "stocktake" && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Items identified:</div>
              {result.found?.map((item: any, i: number) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: "0.5px solid var(--glass-border)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                  <span>{item.item_name}</span>
                  <span style={{ color: "#a78bfa" }}>Qty: {item.estimated_quantity} · {item.notes}</span>
                </div>
              ))}
              <button onClick={confirmStockTake} disabled={loading} style={{ ...btn(true, "#a78bfa"), marginTop: 16, width: "100%", justifyContent: "center" }}>
                <CheckCircle size={14} /> Update Stock Levels
              </button>
            </div>
          )}
        </Card>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
