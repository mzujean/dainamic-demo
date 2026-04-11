"use client";
import { useMemo } from "react";
import StatCard from "@/components/StatCard";
import Card from "@/components/Card";
import { TrendingUp, ShoppingBag, Package, AlertTriangle, Users } from "lucide-react";
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

export default function DashboardClient({ income, expenses, inventory, clients, products }: {
  income: any[], expenses: any[], inventory: any[], clients: any[], products: any[]
}) {
  const totalRevenue = useMemo(() => income.filter(r => r.category !== "Capital").reduce((s, r) => s + Number(r.amount), 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, r) => s + Number(r.amount), 0), [expenses]);
  const netProfit = totalRevenue - totalExpenses;

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string, revenue: number, expenses: number }> = {};
    income.filter(r => r.category !== "Capital").forEach(r => {
      const m = r.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, revenue: 0, expenses: 0 };
      map[m].revenue += Number(r.amount);
    });
    expenses.forEach(r => {
      const m = r.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, revenue: 0, expenses: 0 };
      map[m].expenses += Number(r.amount);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(r => ({
      ...r,
      month: new Date(r.month + "-01").toLocaleString("default", { month: "short" }),
    }));
  }, [income, expenses]);

  // Top income sources
  const topSales = useMemo(() => {
    const map: Record<string, number> = {};
    income.filter(r => r.category !== "Capital").forEach(r => {
      const key = r.customer_name || "Unknown";
      map[key] = (map[key] || 0) + Number(r.amount);
    });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [income]);

  const maxSale = topSales[0]?.total || 1;

  // Low stock items from inventory (quantity <= 2)
  const lowStock = useMemo(() => inventory.filter(r => r.quantity !== null && Number(r.quantity) <= 2), [inventory]);

  // Expense category breakdown
  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(r => {
      const cat = r.category ? r.category.trim().toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Other";
      map[cat] = (map[cat] || 0) + Number(r.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const today = new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Good morning, Dai
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{today}</p>
      </div>

      {/* Alerts */}
      {lowStock.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--accent-amber-dim)", border: "0.5px solid rgba(251,191,36,0.25)", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "var(--accent-amber)" }}>
            <AlertTriangle size={12} />
            {lowStock.length} inventory item{lowStock.length > 1 ? "s" : ""} low — {lowStock.map(p => p.item_name).join(", ")}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Revenue" value={`R${totalRevenue.toLocaleString()}`} change="All time sales" trend="up" accent="var(--accent-purple)" glow="purple" icon={<TrendingUp size={14} />} />
        <StatCard label="Total Expenses" value={`R${totalExpenses.toLocaleString()}`} change="All time costs" trend="down" accent="var(--accent-blue)" glow="blue" />
        <StatCard label="Net Profit" value={`R${Math.abs(netProfit).toLocaleString()}`} change={netProfit >= 0 ? "Profitable" : "Currently a loss"} trend={netProfit >= 0 ? "up" : "down"} accent="var(--accent-teal)" glow="teal" />
        <StatCard label="Inventory Items" value={`${inventory.length}`} change={`${lowStock.length} low stock`} trend={lowStock.length > 0 ? "down" : "up"} accent="var(--accent-amber)" icon={<Package size={14} />} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 20 }}>
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
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
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} tickFormatter={v => `R${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gRev)" />
              <Area type="monotone" dataKey="expenses" stroke="#60a5fa" strokeWidth={1.5} fill="url(#gExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Top customers */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Top customers</div>
          {topSales.map((s, i) => (
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {/* Expense breakdown */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Spend breakdown</div>
          {expenseBreakdown.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < expenseBreakdown.length - 1 ? "0.5px solid var(--glass-border)" : "none" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{e.name}</span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>R{e.value.toLocaleString()}</span>
            </div>
          ))}
        </Card>

        {/* Low stock */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Stock alerts</div>
          {lowStock.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>All stock levels ok ✅</p>
          ) : lowStock.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{p.item_name}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{p.quantity} units left</div>
              </div>
              <div style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}>Low</div>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
            {inventory.length - lowStock.length} items well stocked
          </div>
        </Card>

        {/* Clients snapshot */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Clients</div>
          {clients.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No clients added yet</p>
          ) : clients.slice(0, 4).map((c: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-blue-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: "var(--accent-blue)", flexShrink: 0 }}>
                {c.name?.split(" ").map((w: string) => w[0]).join("") || "?"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{c.email || c.phone || "No contact info"}</div>
              </div>
            </div>
          ))}
          {clients.length > 4 && (
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>+{clients.length - 4} more clients</div>
          )}
        </Card>
      </div>
    </div>
  );
}
