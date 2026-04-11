"use client";
import { useState } from "react";
import Card from "@/components/Card";
import StatCard from "@/components/StatCard";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const MONTHS = ["Oct","Nov","Dec","Jan","Feb","Mar","Apr"];
const REVENUE = [800,1200,1800,2100,2800,3600,4200];
const EXPENSES = [400,600,700,900,1100,1400,1800];
const PROFIT = REVENUE.map((r,i) => r - EXPENSES[i]);

const SOCIAL = [
  { month: "Feb", ig: 1200, tk: 400, fb: 300 },
  { month: "Mar", ig: 2100, tk: 900, fb: 500 },
  { month: "Apr", ig: 3800, tk: 1900, fb: 740 },
];

const CONTENT_PERFORMANCE = [
  { type: "Avatar video", reach: 2140, color: "#a78bfa" },
  { type: "Carousel", reach: 1420, color: "#60a5fa" },
  { type: "Product image", reach: 860, color: "#2dd4bf" },
  { type: "Quote/text", reach: 620, color: "#fbbf24" },
];

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-2)", border: "0.5px solid var(--glass-border)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || "var(--text-primary)", marginBottom: 2 }}>
          {p.name}: {typeof p.value === "number" ? (p.name?.includes("R") || p.dataKey?.includes("revenue") || p.dataKey?.includes("profit") || p.dataKey?.includes("expense") ? `R${p.value.toLocaleString()}` : p.value.toLocaleString()) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const chartData = MONTHS.map((m, i) => ({ month: m, revenue: REVENUE[i], expenses: EXPENSES[i], profit: PROFIT[i] }));

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Analytics</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>Business performance and social insights</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["month","quarter","year"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: "5px 14px", borderRadius: 999, border: `0.5px solid ${period === p ? "var(--glass-border-strong)" : "var(--glass-border)"}`, background: period === p ? "var(--glass-white-hover)" : "transparent", color: period === p ? "var(--text-primary)" : "var(--text-tertiary)", fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Revenue" value="R4,200" change="+18% vs Mar" trend="up" accent="var(--accent-purple)" glow="purple" />
        <StatCard label="Profit" value="R2,400" change="+28% vs Mar" trend="up" accent="var(--accent-teal)" glow="teal" />
        <StatCard label="Social reach" value="6,440" change="+22% this month" trend="up" accent="var(--accent-blue)" glow="blue" />
        <StatCard label="To goal (5k)" value="4,991" change="9 customers away" trend="up" accent="var(--accent-amber)" />
      </div>

      {/* Revenue + profit chart */}
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
            <AreaChart data={chartData}>
              <defs>
                {[["gR","#a78bfa"],["gE","#60a5fa"],["gP","#2dd4bf"]].map(([id,c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gR)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#60a5fa" strokeWidth={1.5} fill="url(#gE)" />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#2dd4bf" strokeWidth={1.5} fill="url(#gP)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Content performance */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 16 }}>Content reach by type</div>
          {CONTENT_PERFORMANCE.map((c, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                <span style={{ color: "var(--text-secondary)" }}>{c.type}</span>
                <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{c.reach.toLocaleString()}</span>
              </div>
              <div style={{ height: 4, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(c.reach / 2140) * 100}%`, background: c.color, borderRadius: 2, transition: "width 0.6s ease" }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Social reach */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card padding="20px">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Social reach by platform</span>
            <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
              <span style={{ color: "#fb923c" }}>● IG</span>
              <span style={{ color: "#a78bfa" }}>● TikTok</span>
              <span style={{ color: "#60a5fa" }}>● FB</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={SOCIAL} barGap={4}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="ig" name="Instagram" fill="#fb923c" radius={[3,3,0,0]} />
              <Bar dataKey="tk" name="TikTok" fill="#a78bfa" radius={[3,3,0,0]} />
              <Bar dataKey="fb" name="Facebook" fill="#60a5fa" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Platform breakdown */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>This month</div>
          {[
            { platform: "Instagram", reach: "3,800", change: "+19%", color: "#fb923c" },
            { platform: "TikTok", reach: "1,900", change: "+41%", color: "#a78bfa" },
            { platform: "Facebook", reach: "740", change: "+2%", color: "#60a5fa" },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 2 ? "0.5px solid var(--glass-border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
                <span style={{ fontSize: 12 }}>{p.platform}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-mono)" }}>{p.reach}</div>
                <div style={{ fontSize: 10, color: "var(--accent-green)" }}>{p.change}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: "10px", background: "var(--accent-purple-dim)", borderRadius: 8, fontSize: 11, color: "var(--accent-purple)", lineHeight: 1.6 }}>
            TikTok growing fastest at +41% — consider doubling post frequency there
          </div>
        </Card>
      </div>

      {/* Goal tracker */}
      <Card padding="20px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Goal: 5,000 customers by end of year</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--accent-amber)" }}>9 away</span>
        </div>
        <div style={{ height: 8, background: "var(--glass-border)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: "99.82%", background: "linear-gradient(90deg, var(--accent-purple), var(--accent-teal))", borderRadius: 4, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-tertiary)" }}>
          <span>4,991 reached</span>
          <span>5,000 goal</span>
        </div>
      </Card>
    </div>
  );
}
