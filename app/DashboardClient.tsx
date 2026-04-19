"use client";
import { useMemo, useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import Card from "@/components/Card";
import { TrendingUp, Package, AlertTriangle, Users, Brain } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-2)", border: "0.5px solid var(--glass-border)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#a78bfa" }}>Revenue: R{payload[0]?.value?.toLocaleString()}</div>
      <div style={{ color: "#60a5fa" }}>Expenses: R{payload[1]?.value?.toLocaleString()}</div>
    </div>
  );
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Hey";
}

export default function DashboardClient({ income, expenses, inventory, clients, products }: {
  income: any[], expenses: any[], inventory: any[], clients: any[], products: any[]
}) {
  const [agentInsight, setAgentInsight] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    setGreeting(getGreeting());
    // Load latest agent memory insight
    fetch("/api/agents/feedback?agent_type=inventory&limit=1")
      .then(r => r.json())
      .then(d => { if (d.memories?.[0]) setAgentInsight(d.memories[0].insight); })
      .catch(() => {});
  }, []);

  const totalRevenue = useMemo(() =>
    income.filter(r => r.category !== "Capital").reduce((s, r) => s + Number(r.amount || 0), 0), [income]);
  const totalExpenses = useMemo(() =>
    expenses.reduce((s, r) => s + Number(r.amount || 0), 0), [expenses]);
  const netProfit = totalRevenue - totalExpenses;

  // Today's revenue
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRevenue = useMemo(() =>
    income.filter(r => r.date === todayStr).reduce((s, r) => s + Number(r.amount || 0), 0), [income]);

  // Follow-ups due
  const followUpsDue = useMemo(() =>
    clients.filter(c => c.follow_up_status === "due"), [clients]);

  // Monthly chart
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string, revenue: number, expenses: number }> = {};
    income.filter(r => r.category !== "Capital").forEach(r => {
      const m = r.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, revenue: 0, expenses: 0 };
      map[m].revenue += Number(r.amount || 0);
    });
    expenses.forEach(r => {
      const m = r.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, revenue: 0, expenses: 0 };
      map[m].expenses += Number(r.amount || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(r => ({
      ...r,
      month: new Date(r.month + "-01").toLocaleString("default", { month: "short" }),
    }));
  }, [income, expenses]);

  // Top customers
  const topSales = useMemo(() => {
    const map: Record<string, number> = {};
    income.filter(r => r.category !== "Capital").forEach(r => {
      const key = r.customer_name || "Unknown";
      map[key] = (map[key] || 0) + Number(r.amount || 0);
    });
    return Object.entries(map).map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total).slice(0, 5);
  }, [income]);
  const maxSale = topSales[0]?.total || 1;

  // Low stock
  const lowStock = useMemo(() =>
    inventory.filter(r => r.quantity !== null && Number(r.quantity) <= 2), [inventory]);

  // Expense breakdown
  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(r => {
      const cat = r.category?.trim() || "Other";
      map[cat] = (map[cat] || 0) + Number(r.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Tax year progress (Mar-Feb)
  const now = new Date();
  const taxYearStart = now.getMonth() >= 2
    ? new Date(now.getFullYear(), 2, 1)
    : new Date(now.getFullYear() - 1, 2, 1);
  const taxYearEnd = new Date(taxYearStart.getFullYear() + 1, 1, 28);
  const taxDaysTotal = (taxYearEnd.getTime() - taxYearStart.getTime()) / 86400000;
  const taxDaysGone = (now.getTime() - taxYearStart.getTime()) / 86400000;
  const taxPct = Math.min(100, Math.round((taxDaysGone / taxDaysTotal) * 100));
  const taxDaysLeft = Math.max(0, Math.round(taxDaysTotal - taxDaysGone));

  const today = now.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>
          {greeting}, Dai 👋
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{today}</p>
      </div>

      {/* Daily snapshot */}
      <Card padding="16px 20px" style={{ marginBottom: 20, border: "0.5px solid rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.04)" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--accent-purple)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Today at a glance</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Today's revenue</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: todayRevenue > 0 ? "#2dd4bf" : "var(--text-primary)" }}>
              R{todayRevenue.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Follow-ups due</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: followUpsDue.length > 0 ? "#fbbf24" : "var(--text-primary)" }}>
              {followUpsDue.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Low stock items</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: lowStock.length > 0 ? "#fb923c" : "var(--text-primary)" }}>
              {lowStock.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Tax year left</div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{taxDaysLeft}d</div>
          </div>
        </div>
        {agentInsight && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "0.5px solid var(--glass-border)", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Brain size={12} color="#a78bfa" style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{agentInsight}</p>
          </div>
        )}
      </Card>

      {/* Alerts */}
      {lowStock.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(251,191,36,0.08)", border: "0.5px solid rgba(251,191,36,0.25)", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "var(--accent-amber)" }}>
            <AlertTriangle size={12} />
            {lowStock.length} item{lowStock.length > 1 ? "s" : ""} low — {lowStock.slice(0, 3).map(p => p.item_name).join(", ")}{lowStock.length > 3 ? ` +${lowStock.length - 3} more` : ""}
          </div>
        </div>
      )}

      {/* Stat cards — responsive grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Revenue" value={`R${totalRevenue.toLocaleString()}`} change="All time sales" trend="up" accent="var(--accent-purple)" glow="purple" icon={<TrendingUp size={14} />} />
        <StatCard label="Total Expenses" value={`R${totalExpenses.toLocaleString()}`} change="All time costs" trend="down" accent="var(--accent-blue)" />
        <StatCard label="Net Profit" value={`R${Math.abs(netProfit).toLocaleString()}`} change={netProfit >= 0 ? "Profitable" : "Loss"} trend={netProfit >= 0 ? "up" : "down"} accent="var(--accent-teal)" glow="teal" />
        <StatCard label="Clients" value={clients.length} change={`${followUpsDue.length} follow-ups due`} trend={followUpsDue.length > 0 ? "down" : "up"} accent="var(--accent-amber)" icon={<Users size={14} />} />
      </div>

      {/* Tax year bar */}
      <Card padding="14px 20px" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Tax year progress (Mar 2025 – Feb 2026)</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{taxPct}% · {taxDaysLeft} days left</div>
        </div>
        <div style={{ height: 4, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${taxPct}%`, background: "linear-gradient(90deg, #a78bfa, #2dd4bf)", borderRadius: 2 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
          <span>Income: R{totalRevenue.toLocaleString()}</span>
          <span>Expenses: R{totalExpenses.toLocaleString()}</span>
          <span style={{ color: netProfit >= 0 ? "#2dd4bf" : "#f87171" }}>Net: R{Math.abs(netProfit).toLocaleString()}</span>
        </div>
      </Card>

      {/* Chart + top customers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span>Revenue vs expenses</span>
            <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
              <span style={{ color: "#a78bfa" }}>● Revenue</span>
              <span style={{ color: "#60a5fa" }}>● Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} tickFormatter={v => `R${v}`} width={48} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gRev)" />
              <Area type="monotone" dataKey="expenses" stroke="#60a5fa" strokeWidth={1.5} fill="url(#gExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Top customers</div>
          {topSales.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No sales recorded yet</p>
          ) : topSales.map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>R{s.total.toLocaleString()}</span>
              </div>
              <div style={{ height: 3, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(s.total / maxSale) * 100}%`, background: "var(--accent-purple)", borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Spend by category</div>
          {expenseBreakdown.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No expenses logged yet</p>
          ) : expenseBreakdown.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < expenseBreakdown.length - 1 ? "0.5px solid var(--glass-border)" : "none" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{e.name}</span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>R{e.value.toLocaleString()}</span>
            </div>
          ))}
        </Card>

        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Stock alerts</div>
          {lowStock.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>All stock levels OK ✅</p>
          ) : lowStock.slice(0, 6).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{p.item_name}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{p.quantity} units left</div>
              </div>
              <div style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>Low</div>
            </div>
          ))}
        </Card>

        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Recent clients</div>
          {clients.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No clients yet</p>
          ) : clients.slice(0, 5).map((c: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(96,165,250,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: "#60a5fa", flexShrink: 0 }}>
                {c.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>R{c.total_spent || 0} · {c.order_count || 0} orders</div>
              </div>
              {c.follow_up_status === "due" && (
                <div style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(251,191,36,0.12)", color: "#fbbf24", flexShrink: 0 }}>Due</div>
              )}
            </div>
          ))}
          {clients.length > 5 && (
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>+{clients.length - 5} more</div>
          )}
        </Card>
      </div>
    </div>
  );
}