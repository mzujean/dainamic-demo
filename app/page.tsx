"use client";
import { useStore } from "@/store/useStore";
import StatCard from "@/components/StatCard";
import Card from "@/components/Card";
import { ShoppingBag, TrendingUp, Package, Users, Zap, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const revenueData = [
  { month: "Nov", revenue: 1200, expenses: 600 },
  { month: "Dec", revenue: 1800, expenses: 700 },
  { month: "Jan", revenue: 2100, expenses: 900 },
  { month: "Feb", revenue: 2800, expenses: 1100 },
  { month: "Mar", revenue: 3600, expenses: 1400 },
  { month: "Apr", revenue: 4200, expenses: 1800 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-2)", border: "0.5px solid var(--glass-border)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--accent-purple)" }}>Revenue: R{payload[0]?.value?.toLocaleString()}</div>
      <div style={{ color: "var(--accent-blue)" }}>Expenses: R{payload[1]?.value?.toLocaleString()}</div>
    </div>
  );
};

export default function Dashboard() {
  const { products, orders, clients, agents } = useStore();
  const lowStock = products.filter(p => p.stock <= p.lowStockThreshold);
  const followUpDue = clients.filter(c => c.followUpStatus === "due");
  const activeAgents = agents.filter(a => a.status === "running");

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              Good morning
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
              {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          {activeAgents.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--accent-purple-dim)", border: "0.5px solid rgba(167,139,250,0.3)",
              borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "var(--accent-purple)"
            }}>
              <Zap size={12} />
              {activeAgents.length} agent{activeAgents.length > 1 ? "s" : ""} running
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(lowStock.length > 0 || followUpDue.length > 0) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {lowStock.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--accent-amber-dim)", border: "0.5px solid rgba(251,191,36,0.25)",
              borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "var(--accent-amber)"
            }}>
              <AlertTriangle size={12} />
              {lowStock.length} item{lowStock.length > 1 ? "s" : ""} low on stock — {lowStock.map(p => p.name).join(", ")}
            </div>
          )}
          {followUpDue.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--accent-blue-dim)", border: "0.5px solid rgba(96,165,250,0.25)",
              borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "var(--accent-blue)"
            }}>
              <Users size={12} />
              {followUpDue.length} WhatsApp follow-up{followUpDue.length > 1 ? "s" : ""} due today
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Revenue (Apr)" value="R4,200" change="+18% vs Mar" trend="up" accent="var(--accent-purple)" glow="purple" icon={<TrendingUp size={14} />} />
        <StatCard label="Expenses" value="R1,800" change="+5% vs Mar" trend="down" accent="var(--accent-blue)" glow="blue" />
        <StatCard label="Orders" value={`${orders.length + 23}`} change="+4 vs Mar" trend="up" icon={<ShoppingBag size={14} />} />
        <StatCard label="Profit" value="R2,400" change="+28% vs Mar" trend="up" accent="var(--accent-teal)" glow="teal" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 20 }}>
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
            <span>Revenue vs expenses</span>
            <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
              <span style={{ color: "var(--accent-purple)" }}>● Revenue</span>
              <span style={{ color: "var(--accent-blue)" }}>● Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={revenueData}>
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
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gRev)" />
              <Area type="monotone" dataKey="expenses" stroke="#60a5fa" strokeWidth={1.5} fill="url(#gExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Top products */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Top products</div>
          {[
            { name: "Leave-in Cream", revenue: 1100, pct: 92 },
            { name: "Starter Bundle", revenue: 960, pct: 76 },
            { name: "Growth Elixir", revenue: 765, pct: 62 },
            { name: "Daily Moisturiser", revenue: 630, pct: 48 },
            { name: "Hair Butter", revenue: 400, pct: 32 },
          ].map((p, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
                <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>R{p.revenue}</span>
              </div>
              <div style={{ height: 3, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${p.pct}%`, background: "var(--accent-purple)", borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Bottom row: clients + inventory + agents */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {/* Follow-ups */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Follow-ups due</div>
          {followUpDue.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>All clear today</p>
          ) : followUpDue.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-blue-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: "var(--accent-blue)", flexShrink: 0 }}>
                {c.name.split(" ").map(w => w[0]).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Last order {c.lastOrderDate}</div>
              </div>
              <div style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}>Due</div>
            </div>
          ))}
        </Card>

        {/* Low stock */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Stock alerts</div>
          {lowStock.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>All stock levels ok</p>
          ) : lowStock.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{p.stock} units left</div>
              </div>
              <div style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: p.stock <= 3 ? "var(--accent-red-dim)" : "var(--accent-amber-dim)", color: p.stock <= 3 ? "var(--accent-red)" : "var(--accent-amber)" }}>
                {p.stock <= 3 ? "Critical" : "Low"}
              </div>
            </div>
          ))}
          {products.filter(p => p.stock > p.lowStockThreshold).length > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
              {products.filter(p => p.stock > p.lowStockThreshold).length} products well stocked
            </div>
          )}
        </Card>

        {/* Agent status */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Agent activity</div>
          {activeAgents.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No agents running</p>
          ) : activeAgents.map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-teal)", animation: "pulse-glow 1.5s infinite" }} />
              <span style={{ fontSize: 12 }}>{a.name}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
            Agents spawn on demand and are removed when done
          </div>
        </Card>
      </div>
    </div>
  );
}
