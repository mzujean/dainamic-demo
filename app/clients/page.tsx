"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Card from "@/components/Card";
import { MessageCircle, CheckCheck, User, Plus, X, Phone, ShoppingBag } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WA_TEMPLATES: Record<string, (name: string, product?: string) => string> = {
  reorder: (name, product) =>
    `Hi ${name}! 👋 It's been a while since your last order of ${product || "your Dainamic Hair products"}. How's your hair journey going? Let me know if you're ready to restock — I'll sort you out! 💚`,
  followup: (name) =>
    `Hi ${name}! Just checking in — how are your Dainamic Hair products working for you? Would love to hear your feedback. Ready to reorder whenever you are! 🌿`,
  newcustomer: (name) =>
    `Welcome to Dainamic Hair, ${name}! 🎉 So excited to be part of your natural hair journey. Reply anytime to place an order or ask questions. Here for you! 💚`,
};

type Client = {
  id: string;
  name: string;
  phone: string;
  last_order_date?: string;
  total_spent?: number;
  order_count?: number;
  notes?: string;
  follow_up_status?: string;
};

type Mode = "list" | "add-client" | "log-sale" | "log-expense";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Client | null>(null);
  const [msgType, setMsgType] = useState<keyof typeof WA_TEMPLATES>("reorder");
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<Mode>("list");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [newClient, setNewClient] = useState({ name: "", phone: "", notes: "" });
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().slice(0, 10),
    vendor: "", category: "Cost of Sales", description: "", amount: "", payment_method: "EFT", notes: ""
  });

  const [newSale, setNewSale] = useState({
    customer_name: "", phone: "", description: "", amount: "", payment_method: "EFT",
    date: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    setLoading(true);
    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (clientData?.length) {
      setClients(clientData);
      setLoading(false);
      return;
    }

    // Fallback: build client list from finance_income if clients table is empty
    const { data: incomeData } = await supabase
      .from("finance_income")
      .select("customer_name, amount, date, description")
      .order("date", { ascending: false });

    if (incomeData?.length) {
      const map: Record<string, Client> = {};
      incomeData.forEach((row, i) => {
        const name = row.customer_name || "Unknown";
        if (!map[name]) {
          map[name] = {
            id: `income_${i}`,
            name,
            phone: "",
            last_order_date: row.date,
            total_spent: 0,
            order_count: 0,
          };
        }
        map[name].total_spent! += Number(row.amount || 0);
        map[name].order_count! += 1;
      });
      setClients(Object.values(map));
    }
    setLoading(false);
  }

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

  async function logExpense() {
    if (!newExpense.vendor.trim() || !newExpense.amount) return;
    setStatus("Saving...");
    const { error } = await supabase.from("finance_expenses").insert({
      date: newExpense.date || new Date().toISOString().slice(0, 10),
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
    setTimeout(() => { setMode("list"); setStatus(""); }, 1200);
  }

  async function addClient() {
    if (!newClient.name.trim()) return;
    setStatus("Saving...");
    const { error } = await supabase.from("clients").insert({
      name: newClient.name.trim(),
      phone: newClient.phone.trim(),
      follow_up_status: "ok",
      order_count: 0,
      total_spent: 0,
    });
    if (error) { setStatus("Error: " + error.message); return; }
    setStatus("✅ Client added!");
    setNewClient({ name: "", phone: "", notes: "" });
    loadClients();
    setTimeout(() => { setMode("list"); setStatus(""); }, 1200);
  }

  async function logSale() {
    if (!newSale.customer_name.trim() || !newSale.amount) return;
    setStatus("Saving...");

    // Log to finance_income
    const { error: incomeError } = await supabase.from("finance_income").insert({
      date: newSale.date || new Date().toISOString().slice(0, 10),
      customer_name: newSale.customer_name.trim(),
      category: "Products Sold",
      description: newSale.description || "Sale",
      amount: parseFloat(newSale.amount),
      payment_method: newSale.payment_method,
      notes: "Added via clients page",
    });
    if (incomeError) { setStatus("Error: " + incomeError.message); return; }

    // Upsert client record
    const { data: existing } = await supabase
      .from("clients")
      .select("id, total_spent, order_count")
      .ilike("name", newSale.customer_name.trim())
      .limit(1);

    if (existing?.length) {
      await supabase.from("clients").update({
        total_spent: (existing[0].total_spent || 0) + parseFloat(newSale.amount),
        order_count: (existing[0].order_count || 0) + 1,
        last_order_date: newSale.date || new Date().toISOString().slice(0, 10),
        follow_up_status: "ok",
      }).eq("id", existing[0].id);
    } else {
      await supabase.from("clients").insert({
        name: newSale.customer_name.trim(),
        phone: newSale.phone.trim(),
        total_spent: parseFloat(newSale.amount),
        order_count: 1,
        last_order_date: newSale.date || new Date().toISOString().slice(0, 10),
        follow_up_status: "ok",
      });
    }

    setStatus("✅ Sale logged!");
    setNewSale({ customer_name: "", phone: "", description: "", amount: "", payment_method: "EFT", date: new Date().toISOString().slice(0, 10) });
    loadClients();
    setTimeout(() => { setMode("list"); setStatus(""); }, 1200);
  }

  const draft = selected
    ? WA_TEMPLATES[msgType](selected.name.split(" ")[0], "your Dainamic products")
    : "";

  const copy = () => {
    navigator.clipboard?.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const due = filtered.filter(c => c.follow_up_status === "due");
  const rest = filtered.filter(c => c.follow_up_status !== "due");

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
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Clients</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
          {clients.length} customers tracked
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={btn(mode === "list")} onClick={() => setMode("list")}>
          <User size={13} /> All Clients
        </button>
        <button style={btn(mode === "log-sale", "#2dd4bf")} onClick={() => setMode("log-sale")}>
          <ShoppingBag size={13} /> Log Sale
        </button>
        <button style={btn(mode === "add-client", "#60a5fa")} onClick={() => setMode("add-client")}>
          <Plus size={13} /> Add Client
        </button>
        <button style={btn(mode === "log-expense", "#f87171")} onClick={() => setMode("log-expense")}>
          <Plus size={13} /> Log Expense
        </button>
      </div>

      {/* LOG EXPENSE */}
      {mode === "log-expense" && (
        <Card padding="24px" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20, color: "var(--text-secondary)" }}>
            💸 Log a business expense
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Date</div>
          <input type="date" value={newExpense.date} onChange={e => setNewExpense(s => ({ ...s, date: e.target.value }))} style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Supplier / Vendor</div>
          <input value={newExpense.vendor} onChange={e => setNewExpense(s => ({ ...s, vendor: e.target.value }))} placeholder="e.g. Atlas Trading, Mabira Pack" style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>SARS Category</div>
          <select value={newExpense.category} onChange={e => setNewExpense(s => ({ ...s, category: e.target.value }))} style={input}>
            {SARS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Description</div>
          <input value={newExpense.description} onChange={e => setNewExpense(s => ({ ...s, description: e.target.value }))} placeholder="e.g. Shea butter 1kg x 5, 50ml amber bottles x 100" style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Amount (R)</div>
          <input value={newExpense.amount} onChange={e => setNewExpense(s => ({ ...s, amount: e.target.value }))} placeholder="e.g. 450" style={input} />
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Payment method</div>
          <select value={newExpense.payment_method} onChange={e => setNewExpense(s => ({ ...s, payment_method: e.target.value }))} style={input}>
            <option>EFT</option><option>Cash</option><option>Card</option>
          </select>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Notes (optional — e.g. receipt number, invoice ref)</div>
          <input value={newExpense.notes} onChange={e => setNewExpense(s => ({ ...s, notes: e.target.value }))} placeholder="e.g. Invoice #1234, for Growth Elixir batch" style={input} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={logExpense} style={{ ...btn(true, "#f87171"), flex: 1, justifyContent: "center", padding: "12px" }}>
              Log Expense
            </button>
            <button onClick={() => setMode("list")} style={{ ...btn(false), padding: "12px 16px" }}>
              <X size={14} />
            </button>
          </div>
          {status && <div style={{ marginTop: 12, fontSize: 12, color: status.includes("✅") ? "#2dd4bf" : "#f87171" }}>{status}</div>}
        </Card>
      )}

      {/* LOG SALE */}
      {mode === "log-sale" && (
        <Card padding="24px" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20, color: "var(--text-secondary)" }}>
            💰 Log a sale
          </div>
          {[
            { label: "Customer name", key: "customer_name", placeholder: "e.g. Thandi Mzumara" },
            { label: "Phone (optional)", key: "phone", placeholder: "e.g. 0821234567" },
            { label: "Products sold", key: "description", placeholder: "e.g. Growth Elixir 100ml + Leave-in Cream" },
            { label: "Amount (R)", key: "amount", placeholder: "e.g. 195" },
    { label: "Date of sale", key: "date", placeholder: "YYYY-MM-DD", type: "date" },
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>{f.label}</div>
              <input
                type={(f as any).type || "text"}
                value={(newSale as any)[f.key]}
                onChange={e => setNewSale(s => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={input}
              />
            </div>
          ))}
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Payment method</div>
          <select value={newSale.payment_method}
            onChange={e => setNewSale(s => ({ ...s, payment_method: e.target.value }))}
            style={{ ...input }}>
            <option>EFT</option><option>Cash</option><option>Card</option>
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={logSale}
              style={{ ...btn(true, "#2dd4bf"), flex: 1, justifyContent: "center", padding: "12px" }}>
              <ShoppingBag size={14} /> Log Sale
            </button>
            <button onClick={() => setMode("list")} style={{ ...btn(false), padding: "12px 16px" }}>
              <X size={14} />
            </button>
          </div>
          {status && <div style={{ marginTop: 12, fontSize: 12, color: "#2dd4bf" }}>{status}</div>}
        </Card>
      )}

      {/* ADD CLIENT */}
      {mode === "add-client" && (
        <Card padding="24px" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20, color: "var(--text-secondary)" }}>
            ➕ Add new client
          </div>
          {[
            { label: "Full name", key: "name", placeholder: "e.g. Nomsa Dlamini" },
            { label: "Phone number", key: "phone", placeholder: "e.g. 0821234567" },
        
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>{f.label}</div>
              <input
                value={(newClient as any)[f.key]}
                onChange={e => setNewClient(s => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={input}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addClient}
              style={{ ...btn(true, "#60a5fa"), flex: 1, justifyContent: "center", padding: "12px" }}>
              <Plus size={14} /> Save Client
            </button>
            <button onClick={() => setMode("list")} style={{ ...btn(false), padding: "12px 16px" }}>
              <X size={14} />
            </button>
          </div>
          {status && <div style={{ marginTop: 12, fontSize: 12, color: "#2dd4bf" }}>{status}</div>}
        </Card>
      )}

      {/* CLIENT LIST + MESSAGE PANEL */}
      {mode === "list" && (
        <>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            style={{ ...input, marginBottom: 16 }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
            <div>
              {loading ? (
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: 20 }}>Loading clients...</div>
              ) : filtered.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: 20 }}>
                  No clients yet. Log a sale or add a client to get started.
                </div>
              ) : (
                <>
                  {due.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Follow-up due</div>
                      {due.map(c => <ClientRow key={c.id} c={c} selected={selected?.id === c.id} onSelect={() => setSelected(c)} accent="#fbbf24" />)}
                    </>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: "16px 0 10px" }}>All clients</div>
                  {rest.map(c => <ClientRow key={c.id} c={c} selected={selected?.id === c.id} onSelect={() => setSelected(c)} />)}
                </>
              )}
            </div>

            {/* Message panel */}
            <div style={{ position: "sticky", top: 24 }}>
              {selected ? (
                <Card padding="20px">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: "0.5px solid var(--glass-border)" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "#a78bfa" }}>
                      {selected.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{selected.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        {selected.phone || "No phone"} · R{selected.total_spent || 0} total
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Message type</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                    {(Object.keys(WA_TEMPLATES) as (keyof typeof WA_TEMPLATES)[]).map(t => (
                      <button key={t} onClick={() => setMsgType(t)} style={{ padding: "4px 10px", borderRadius: 6, border: `0.5px solid ${msgType === t ? "var(--glass-border-strong)" : "var(--glass-border)"}`, background: msgType === t ? "var(--glass-white-hover)" : "transparent", color: msgType === t ? "var(--text-primary)" : "var(--text-tertiary)", fontSize: 11, cursor: "pointer", textTransform: "capitalize" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 14, minHeight: 100 }}>
                    {draft}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={copy} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "0.5px solid var(--glass-border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {copied ? <><CheckCheck size={12} /> Copied!</> : "Copy"}
                    </button>
                    {selected.phone && (
                      <a href={`https://wa.me/${selected.phone.replace(/\D/g, "")}?text=${encodeURIComponent(draft)}`}
                        target="_blank" rel="noreferrer"
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(74,222,128,0.1)", border: "0.5px solid rgba(74,222,128,0.25)", borderRadius: 10, color: "#4ade80", fontSize: 12, fontWeight: 500, textDecoration: "none", padding: "10px 14px" }}>
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    )}
                  </div>
                </Card>
              ) : (
                <Card padding="32px" style={{ textAlign: "center" }}>
                  <User size={28} color="var(--text-tertiary)" style={{ margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Select a client to message them</div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ClientRow({ c, selected, onSelect, accent }: { c: Client; selected: boolean; onSelect: () => void; accent?: string }) {
  return (
    <div onClick={onSelect} style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px", borderRadius: 12, cursor: "pointer", marginBottom: 8,
      border: `0.5px solid ${selected ? "var(--glass-border-strong)" : "var(--glass-border)"}`,
      background: selected ? "var(--glass-white-hover)" : "var(--glass-white)",
      transition: "all 0.15s",
    }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: accent ? `${accent}22` : "rgba(167,139,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: accent || "#a78bfa", flexShrink: 0 }}>
        {c.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {c.order_count || 0} order{(c.order_count || 0) !== 1 ? "s" : ""} · R{c.total_spent || 0} total
          {c.last_order_date ? ` · ${c.last_order_date}` : ""}
        </div>
      </div>
      {accent && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${accent}22`, color: accent }}>Follow up</span>}
    </div>
  );
}