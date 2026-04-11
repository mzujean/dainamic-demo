"use client";
import { useMemo } from "react";
import Card from "@/components/Card";
import StatCard from "@/components/StatCard";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

const COLORS = ["#a78bfa","#60a5fa","#2dd4bf","#fbbf24","#fb923c"];

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-2)", border: "0.5px solid var(--glass-border)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || "var(--text-primary)", marginBottom: 2 }}>
          {p.name}: R{Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsClient({ income, expenses, inventory }: { income: any[], expenses: any[], inventory: any[] }) {
  const totalIncome = useMemo(() => income.filter(r => r.category !== "Capital").reduce((s, r) => s + Number(r.amount), 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, r) => s + Number(r.amount), 0), [expenses]);
  const netProfit = totalIncome - totalExpenses;
  const totalInventoryCost = useMemo(() => inventory.reduce((s, r) => s + Number(r.total_cost || 0), 0), [inventory]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string, revenue: number, expenses: number, profit: number }> = {};
    income.filter(r => r.category !== "Capital").forEach(r => {
      const m = r.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, revenue: 0, expenses: 0, profit: 0 };
      map[m].revenue += Number(r.amount);
    });
    expenses.forEach(r => {
      const m = r.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, revenue: 0, expenses: 0, profit: 0 };
      map[m].expenses += Number(r.amount);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(r => ({
      ...r,
      profit: r.revenue - r.expenses,
      month: new Date(r.month + "-01").toLocaleString("default", { month: "short" }),
    }));
  }, [income, expenses]);

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(r => {
      const cat = r.category || "Other";
      map[cat] = (map[cat] || 0) + Number(r.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Facebook Ads anomaly
  const fbAnomalies = useMemo(() =>
    expenses.filter(r => r.vendor?.toLowerCase().includes("facebook") && r.notes?.toLowerCase().includes("no marketing")),
  [expenses]);
  const fbAnomalyTotal = fbAnomalies.reduce((s, r) => s + Number(r.amount), 0);

  // Top inventory items
  const topInventory = useMemo(() =>
    [...inventory].sort((a, b) => Number(b.total_cost) - Number(a.total_cost)).slice(0, 5),
  [inventory]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Analytics</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>Live data from your Supabase database</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Revenue" value={`R${totalIncome.toLocaleString()}`} change="All sales" trend="up" accent="var(--accent-purple)" glow="purple" />
        <StatCard label="Net Profit" value={`R${netProfit.toLocaleString()}`} change={netProfit > 0 ? "Profitable" : "Loss"} trend={netProfit > 0 ? "up" : "down"} accent="var(--accent-teal)" glow="teal" />
        <StatCard label="Total Expenses" value={`R${totalExpenses.toLocaleString()}`} change="All costs" trend="down" accent="var(--accent-blue)" glow="blue" />
        <StatCard label="Inventory Cost" value={`R${totalInventoryCost.toLocaleString()}`} change={`${inventory.length} items`} trend="up" accent="var(--accent-amber)" />
      </div>

      {/* Revenue chart */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 12 }}>
        <Card padding="20px">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Revenue, expenses & profit</span>
            <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
              <span style={{ color: "#a78bfa" }}>● Revenue</span>
              <span style={{ color: "#60a5fa" }}>● Expenses</span>
              <span style={{ color: "#2dd4bf" }}>● Profit</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData}>
              <defs>
                {[["gR","#a78bfa"],["gE","#60a5fa"],["gP","#2dd4bf"]].map(([id,c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} tickFormatter={v => `R${v}`} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gR)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#60a5fa" strokeWidth={1.5} fill="url(#gE)" />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#2dd4bf" strokeWidth={1.5} fill="url(#gP)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Expenses by category */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 16 }}>Expenses by category</div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} strokeWidth={0}>
                {expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `R${Number(v).toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          {expensesByCategory.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 6 }}>
              <span style={{ color: COLORS[i % COLORS.length] }}>● {c.name}</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>R{c.value.toLocaleString()}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Top inventory + Facebook anomaly */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Top inventory items by cost</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={topInventory} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} tickFormatter={v => `R${v}`} />
              <YAxis type="category" dataKey="item_name" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={110} />
              <Tooltip formatter={(v: any) => `R${Number(v).toLocaleString()}`} />
              <Bar dataKey="total_cost" name="Cost" fill="#a78bfa" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>⚠️ Facebook Ads anomaly</div>
          {fbAnomalies.length > 0 ? (
            <>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 12, lineHeight: 1.6 }}>
                {fbAnomalies.length} charges detected when no ads were active
              </div>
              {fbAnomalies.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "6px 0", borderBottom: "0.5px solid var(--glass-border)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{r.date}</span>
                  <span style={{ color: "#fb923c", fontFamily: "var(--font-mono)" }}>R{Number(r.amount).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: "10px", background: "rgba(251,146,60,0.1)", borderRadius: 8, fontSize: 11, color: "#fb923c", lineHeight: 1.6 }}>
                Total unexpected charges: R{fbAnomalyTotal.toFixed(2)} — consider disputing with Meta
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>No anomalies detected ✅</div>
          )}
        </Card>
      </div>

      {/* Profit summary */}
      <Card padding="20px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Business health summary</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: netProfit > 0 ? "var(--accent-teal)" : "#fb923c" }}>
            {netProfit > 0 ? "Profitable ✅" : "Loss ⚠️"}
          </span>
        </div>
        <div style={{ height: 8, background: "var(--glass-border)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: `${Math.min((totalIncome / (totalIncome + totalExpenses)) * 100, 100)}%`, background: "linear-gradient(90deg, var(--accent-purple), var(--accent-teal))", borderRadius: 4, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-tertiary)" }}>
          <span>Revenue: R{totalIncome.toLocaleString()}</span>
          <span>Expenses: R{totalExpenses.toLocaleString()}</span>
          <span>Net: R{netProfit.toLocaleString()}</span>
        </div>
      </Card>
    </div>
  );
}
