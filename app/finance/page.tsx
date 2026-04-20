"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Card from "@/components/Card";
import { Plus, X, Edit2, Trash2, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SARS_CATEGORIES = [
  "Cost of Sales",
  "Packaging & Labels",
  "Marketing & Advertising",
  "Transport & Delivery",
  "Bank Charges",
  "Equipment & Tools",
  "Professional Fees",
  "Data & Airtime",
  "Other Operating Expenses",
];

type Tab = "income" | "expenses";
type Mode = "list" | "add-income" | "add-expense";

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("income");
  const [mode, setMode] = useState<Mode>("list");
  const [income, setIncome] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<any>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newIncome, setNewIncome] = useState({
    date: new Date().toISOString().slice(0, 10),
    customer_name: "", description: "", amount: "", payment_method: "EFT",
  });

  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().slice(0, 10),
    vendor: "", category: "Cost of Sales", description: "", amount: "",
    payment_method: "EFT", notes: "",
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: inc }, { data: exp }] = await Promise.all([
      supabase.from("finance_income").select("*").order("date", { ascending: false }),
      supabase.from("finance_expenses").select("*").order("date", { ascending: false }),
    ]);
    setIncome(inc || []);
    setExpenses(exp || []);
    setLoading(false);
  }

  async function addIncome() {
    if (!newIncome.customer_name || !newIncome.amount) return;
    setStatus("Saving...");
    const { error } = await supabase.from("finance_income").insert({
      date: newIncome.date,
      customer_name: newIncome.customer_name.trim(),
      category: "Products Sold",
      description: newIncome.description.trim(),
      amount: parseFloat(newIncome.amount),
      payment_method: newIncome.payment_method,
    });
    if (error) { setStatus("Error: " + error.message); return; }
    setStatus("✅ Sale logged!");
    setNewIncome({ date: new Date().toISOString().slice(0, 10), customer_name: "", description: "", amount: "", payment_method: "EFT" });
    loadAll();
    setTimeout(() => { setMode("list"); setStatus(""); }, 1200);
  }

  async function addExpense() {
    if (!newExpense.vendor || !newExpense.amount) return;
    setStatus("Saving...");
    const { error } = await supabase.from("finance_expenses").insert({
      date: newExpense.date,
      vendor: newExpense.vendor.trim(),
      category: newExpense.category,
      description: newExpense.description.trim(),
      amount: parseFloat(newExpense.amount),
      payment_method: newExpense.payment_method,
      notes: newExpense.notes.trim(),
    });
    if (error) { setStatus("Error: " + error.message); return; }
    setStatus("✅ Expense logged!");
    setNewExpense({ date: new Date().toISOString().slice(0, 10), vendor: "", category: "Cost of Sales", description: "", amount: "", payment_method: "EFT", notes: "" });
    loadAll();
    setTimeout(() => { setMode("list"); setStatus(""); }, 1200);
  }

  async function saveEdit(table: string, id: string) {
    setStatus("Saving...");
    const { error } = await supabase.from(table).update(editRow).eq("id", id);
    if (error) { setStatus("Error: " + error.message); return; }
    setStatus("✅ Updated!");
    setEditingId(null);
    loadAll();
    setTimeout(() => setStatus(""), 1500);
  }

  async function deleteRow(table: string, id: string) {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    await supabase.from(table).delete().eq("id", id);
    loadAll();
  }

  const totalIncome = income.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  const input = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "0.5px solid var(--glass-border)", background: "var(--bg-2)",
    color: "var(--text-primary)", fontSize: 13,
    boxSizing: "border-box" as const, marginBottom: 12,
  };

  const btn = (active: boolean, color = "#a78bfa") => ({
    padding: "9px 16px", borderRadius: 10,
    border: `0.5px solid ${active ? color : "var(--glass-border)"}`,
    background: active ? `${color}22` : "transparent",
    color: active ? color : "var(--text-tertiary)",
    fontSize: 12, cursor: "pointer", display: "flex",
    alignItems: "center", gap: 6, fontWeight: active ? 500 : 400,
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Finance</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
          Tax year: Mar 2025 – Feb 2026
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total income", value: `R${totalIncome.toLocaleString()}`, color: "#2dd4bf" },
          { label: "Total expenses", value: `R${totalExpenses.toLocaleString()}`, color: "#60a5fa" },
          { label: "Net profit", value: `R${Math.abs(netProfit).toLocaleString()}`, color: netProfit >= 0 ? "#4ade80" : "#f87171" },
        ].map(s => (
          <Card key={s.label} padding="16px 20px">
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Tabs + actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button style={btn(tab === "income" && mode === "list")} onClick={() => { setTab("income"); setMode("list"); }}>
          Sales ({income.length})
        </button>
        <button style={btn(tab === "expenses" && mode === "list", "#60a5fa")} onClick={() => { setTab("expenses"); setMode("list"); }}>
          Expenses ({expenses.length})
        </button>
        <div style={{ flex: 1 }} />
        <button style={btn(mode === "add-income", "#2dd4bf")} onClick={() => setMode("add-income")}>
          <Plus size={13} /> Log Sale
        </button>
        <button style={btn(mode === "add-expense", "#f87171")} onClick={() => setMode("add-expense")}>
          <Plus size={13} /> Log Expense
        </button>
      </div>

      {/* Add income form */}
      {mode === "add-income" && (
        <Card padding="24px" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: "var(--text-secondary)" }}>💰 Log a sale</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Date</div>
          <input type="date" value={newIncome.date} onChange={e => setNewIncome(s => ({ ...s, date: e.target.value }))} style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Customer name</div>
          <input value={newIncome.customer_name} onChange={e => setNewIncome(s => ({ ...s, customer_name: e.target.value }))} placeholder="e.g. Thandi Mzumara" style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Products sold</div>
          <input value={newIncome.description} onChange={e => setNewIncome(s => ({ ...s, description: e.target.value }))} placeholder="e.g. Growth Elixir 100ml + Leave-in Cream" style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Amount (R)</div>
          <input value={newIncome.amount} onChange={e => setNewIncome(s => ({ ...s, amount: e.target.value }))} placeholder="e.g. 195" style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Payment method</div>
          <select value={newIncome.payment_method} onChange={e => setNewIncome(s => ({ ...s, payment_method: e.target.value }))} style={input}>
            <option>EFT</option><option>Cash</option><option>Card</option>
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addIncome} style={{ ...btn(true, "#2dd4bf"), flex: 1, justifyContent: "center", padding: "12px" }}>
              <Plus size={14} /> Save Sale
            </button>
            <button onClick={() => setMode("list")} style={{ ...btn(false), padding: "12px 16px" }}><X size={14} /></button>
          </div>
          {status && <div style={{ marginTop: 10, fontSize: 12, color: "#2dd4bf" }}>{status}</div>}
        </Card>
      )}

      {/* Add expense form */}
      {mode === "add-expense" && (
        <Card padding="24px" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: "var(--text-secondary)" }}>💸 Log an expense</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Date</div>
          <input type="date" value={newExpense.date} onChange={e => setNewExpense(s => ({ ...s, date: e.target.value }))} style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Supplier / Vendor</div>
          <input value={newExpense.vendor} onChange={e => setNewExpense(s => ({ ...s, vendor: e.target.value }))} placeholder="e.g. Atlas Trading, Mabira Pack" style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>SARS Category</div>
          <select value={newExpense.category} onChange={e => setNewExpense(s => ({ ...s, category: e.target.value }))} style={input}>
            {SARS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Description</div>
          <input value={newExpense.description} onChange={e => setNewExpense(s => ({ ...s, description: e.target.value }))} placeholder="e.g. Shea butter 1kg x5, amber bottles x100" style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Amount (R)</div>
          <input value={newExpense.amount} onChange={e => setNewExpense(s => ({ ...s, amount: e.target.value }))} placeholder="e.g. 450" style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Payment method</div>
          <select value={newExpense.payment_method} onChange={e => setNewExpense(s => ({ ...s, payment_method: e.target.value }))} style={input}>
            <option>EFT</option><option>Cash</option><option>Card</option>
          </select>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Notes (receipt ref, invoice #)</div>
          <input value={newExpense.notes} onChange={e => setNewExpense(s => ({ ...s, notes: e.target.value }))} placeholder="e.g. Invoice #1234" style={input} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addExpense} style={{ ...btn(true, "#f87171"), flex: 1, justifyContent: "center", padding: "12px" }}>
              <Plus size={14} /> Save Expense
            </button>
            <button onClick={() => setMode("list")} style={{ ...btn(false), padding: "12px 16px" }}><X size={14} /></button>
          </div>
          {status && <div style={{ marginTop: 10, fontSize: 12, color: "#2dd4bf" }}>{status}</div>}
        </Card>
      )}

      {/* Income list */}
      {mode === "list" && tab === "income" && (
        <div>
          {loading ? (
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: 20 }}>Loading...</div>
          ) : income.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: 20 }}>No sales logged yet.</div>
          ) : income.map(row => (
            <Card key={row.id} padding="14px 16px" style={{ marginBottom: 8 }}>
              {editingId === row.id ? (
                <div>
                  <input type="date" value={editRow.date || ""} onChange={e => setEditRow((s: any) => ({ ...s, date: e.target.value }))} style={{ ...input, marginBottom: 8 }} />
                  <input value={editRow.customer_name || ""} onChange={e => setEditRow((s: any) => ({ ...s, customer_name: e.target.value }))} placeholder="Customer name" style={{ ...input, marginBottom: 8 }} />
                  <input value={editRow.description || ""} onChange={e => setEditRow((s: any) => ({ ...s, description: e.target.value }))} placeholder="Description" style={{ ...input, marginBottom: 8 }} />
                  <input value={editRow.amount || ""} onChange={e => setEditRow((s: any) => ({ ...s, amount: e.target.value }))} placeholder="Amount" style={{ ...input, marginBottom: 8 }} />
                  <select value={editRow.payment_method || "EFT"} onChange={e => setEditRow((s: any) => ({ ...s, payment_method: e.target.value }))} style={{ ...input, marginBottom: 12 }}>
                    <option>EFT</option><option>Cash</option><option>Card</option>
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => saveEdit("finance_income", row.id)} style={{ ...btn(true, "#2dd4bf"), flex: 1, justifyContent: "center" }}>
                      <CheckCircle size={13} /> Save
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ ...btn(false), padding: "9px 16px" }}><X size={13} /></button>
                  </div>
                  {status && <div style={{ marginTop: 8, fontSize: 12, color: "#2dd4bf" }}>{status}</div>}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{row.customer_name || "Unknown"}</span>
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(45,212,191,0.1)", color: "#2dd4bf" }}>{row.payment_method}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      {row.date} · {row.description || "No description"}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#2dd4bf", marginRight: 8 }}>R{Number(row.amount).toLocaleString()}</div>
                  <button onClick={() => { setEditingId(row.id); setEditRow({ ...row }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => deleteRow("finance_income", row.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 4 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Expenses list */}
      {mode === "list" && tab === "expenses" && (
        <div>
          {loading ? (
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: 20 }}>Loading...</div>
          ) : expenses.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: 20 }}>No expenses logged yet.</div>
          ) : expenses.map(row => (
            <Card key={row.id} padding="14px 16px" style={{ marginBottom: 8 }}>
              {editingId === row.id ? (
                <div>
                  <input type="date" value={editRow.date || ""} onChange={e => setEditRow((s: any) => ({ ...s, date: e.target.value }))} style={{ ...input, marginBottom: 8 }} />
                  <input value={editRow.vendor || ""} onChange={e => setEditRow((s: any) => ({ ...s, vendor: e.target.value }))} placeholder="Vendor" style={{ ...input, marginBottom: 8 }} />
                  <select value={editRow.category || "Cost of Sales"} onChange={e => setEditRow((s: any) => ({ ...s, category: e.target.value }))} style={{ ...input, marginBottom: 8 }}>
                    {SARS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input value={editRow.description || ""} onChange={e => setEditRow((s: any) => ({ ...s, description: e.target.value }))} placeholder="Description" style={{ ...input, marginBottom: 8 }} />
                  <input value={editRow.amount || ""} onChange={e => setEditRow((s: any) => ({ ...s, amount: e.target.value }))} placeholder="Amount" style={{ ...input, marginBottom: 8 }} />
                  <input value={editRow.notes || ""} onChange={e => setEditRow((s: any) => ({ ...s, notes: e.target.value }))} placeholder="Notes" style={{ ...input, marginBottom: 12 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => saveEdit("finance_expenses", row.id)} style={{ ...btn(true, "#f87171"), flex: 1, justifyContent: "center" }}>
                      <CheckCircle size={13} /> Save
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ ...btn(false), padding: "9px 16px" }}><X size={13} /></button>
                  </div>
                  {status && <div style={{ marginTop: 8, fontSize: 12, color: "#2dd4bf" }}>{status}</div>}
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{row.vendor}</span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>{row.category}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        {row.date} · {row.description || "No description"}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#f87171", marginRight: 8 }}>R{Number(row.amount).toLocaleString()}</div>
                    <button onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
                      {expandedId === row.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button onClick={() => { setEditingId(row.id); setEditRow({ ...row }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteRow("finance_expenses", row.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {expandedId === row.id && row.notes && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-tertiary)", paddingTop: 8, borderTop: "0.5px solid var(--glass-border)" }}>
                      Notes: {row.notes}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
