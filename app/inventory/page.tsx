"use client";
import { useState } from "react";
import { useStore } from "@/store/useStore";
import Card from "@/components/Card";
import StatCard from "@/components/StatCard";
import { Package, AlertTriangle, Plus, Minus, RefreshCw } from "lucide-react";

export default function InventoryPage() {
  const { products, setProducts } = useStore();
  const [editId, setEditId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState(0);

  const lowStock = products.filter(p => p.stock <= p.lowStockThreshold);
  const totalValue = products.reduce((a, p) => a + p.stock * p.price, 0);

  const saveStock = (id: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, stock: editStock } : p));
    setEditId(null);
  };

  const adjust = (id: string, d: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + d) } : p));
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Inventory</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>Stock levels, reorder alerts, recipe tracking</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total SKUs" value={products.length} />
        <StatCard label="Low stock" value={lowStock.length} trend={lowStock.length > 0 ? "down" : "neutral"} change={lowStock.length > 0 ? "needs attention" : "all ok"} accent={lowStock.length > 0 ? "var(--accent-amber)" : undefined} />
        <StatCard label="Stock value" value={`R${totalValue.toLocaleString()}`} accent="var(--accent-purple)" />
        <StatCard label="Critical items" value={products.filter(p => p.stock <= 3).length} trend={products.filter(p => p.stock <= 3).length > 0 ? "down" : "neutral"} accent={products.filter(p => p.stock <= 3).length > 0 ? "var(--accent-red)" : undefined} />
      </div>

      {lowStock.length > 0 && (
        <Card padding="16px 20px" style={{ marginBottom: 16, border: "0.5px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={14} color="var(--accent-amber)" />
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--accent-amber)" }}>Reorder alerts</span>
          </div>
          {lowStock.map(p => (
            <div key={p.id} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 3 }}>
              {p.name} — {p.stock} units left (threshold: {p.lowStockThreshold}). Suggest ordering {Math.max(20, p.lowStockThreshold * 5)} units.
            </div>
          ))}
        </Card>
      )}

      <Card padding="0">
        <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>All products</span>
          <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 11, gap: 5 }}>
            <Plus size={11} /> Add product
          </button>
        </div>
        {products.map((p, i) => {
          const pct = Math.min(100, (p.stock / (p.lowStockThreshold * 4)) * 100);
          const barColor = p.stock <= 3 ? "var(--accent-red)" : p.stock <= p.lowStockThreshold ? "var(--accent-amber)" : "var(--accent-teal)";
          return (
            <div key={p.id} style={{ padding: "14px 20px", borderBottom: i < products.length - 1 ? "0.5px solid var(--glass-border)" : "none", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--glass-white)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Package size={14} color="var(--text-tertiary)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: "var(--glass-white)", color: "var(--text-tertiary)", textTransform: "capitalize" }}>{p.category}</span>
                  {p.stock <= p.lowStockThreshold && (
                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: p.stock <= 3 ? "var(--accent-red-dim)" : "var(--accent-amber-dim)", color: p.stock <= 3 ? "var(--accent-red)" : "var(--accent-amber)" }}>
                      {p.stock <= 3 ? "Critical" : "Low"}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 3, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 0.4s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", minWidth: 60, fontFamily: "var(--font-mono)" }}>{p.sizes.join(" / ")}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {editId === p.id ? (
                  <>
                    <input type="number" value={editStock} onChange={e => setEditStock(Number(e.target.value))} style={{ width: 64, textAlign: "center", padding: "4px 8px", fontSize: 13 }} />
                    <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => saveStock(p.id)}>Save</button>
                    <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setEditId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => adjust(p.id, -1)} style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--glass-border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}><Minus size={10} /></button>
                    <span style={{ fontSize: 14, fontWeight: 500, minWidth: 28, textAlign: "center", color: barColor }}>{p.stock}</span>
                    <button onClick={() => adjust(p.id, 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--glass-border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}><Plus size={10} /></button>
                    <button onClick={() => { setEditId(p.id); setEditStock(p.stock); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}><RefreshCw size={11} /></button>
                  </>
                )}
              </div>
              <div style={{ textAlign: "right", minWidth: 52 }}>
                <div style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>R{p.price}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>R{(p.stock * p.price).toLocaleString()} total</div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
