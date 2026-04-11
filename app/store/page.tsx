"use client";
import { useState, useEffect } from "react";
import Card from "@/components/Card";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";

type CartItem = { productId: string; name: string; size: string; qty: number; price: number };
const DELIVERY = { pudo: { label: "PUDO locker", desc: "Pick up at nearest locker", cost: 60 }, door: { label: "Door-to-door", desc: "The Courier Guy", cost: 100 } };

export default function StorePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [delivery, setDelivery] = useState<"pudo" | "door">("pudo");
  const [view, setView] = useState<"shop" | "checkout" | "done">("shop");
  const [filter, setFilter] = useState<"all" | "single" | "bundle">("all");

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase.from("products").select("*").order("category").order("price");
      if (data) setProducts(data);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const addToCart = (p: any, size: string) => {
    setCart(prev => {
      const exists = prev.find(i => i.productId === p.id && i.size === size);
      if (exists) return prev.map(i => i.productId === p.id && i.size === size ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, size, qty: 1, price: p.price }];
    });
  };

  const changeQty = (productId: string, size: string, d: number) => {
    setCart(prev => prev.map(i => i.productId === productId && i.size === size ? { ...i, qty: i.qty + d } : i).filter(i => i.qty > 0));
  };

  const cartTotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const orderRef = `DHR-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const filtered = products.filter(p => filter === "all" || p.category === filter);

  if (loading) return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 0", textAlign: "center" }}>
      <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Loading products...</div>
    </div>
  );

  if (view === "done") return (
    <div style={{ maxWidth: 560, margin: "60px auto" }} className="fade-up">
      <Card padding="36px" style={{ textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--accent-teal-dim)", border: "0.5px solid rgba(45,212,191,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>✓</div>
        <h2 style={{ fontSize: 18, fontWeight: 400, marginBottom: 8 }}>Order placed</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.7 }}>
          Transfer <strong>R{(cartTotal + DELIVERY[delivery].cost).toLocaleString()}</strong> using reference <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-purple)" }}>{orderRef}</span>
        </p>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 16, textAlign: "left", marginBottom: 20, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid var(--glass-border)" }}><span style={{ color: "var(--text-tertiary)" }}>Bank</span><span>FNB</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid var(--glass-border)" }}><span style={{ color: "var(--text-tertiary)" }}>Account name</span><span>Dainamic Hair</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid var(--glass-border)" }}><span style={{ color: "var(--text-tertiary)" }}>Account no.</span><span style={{ fontFamily: "var(--font-mono)" }}>62XXXXXXXX</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}><span style={{ color: "var(--text-tertiary)" }}>Reference</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-purple)" }}>{orderRef}</span></div>
        </div>
        <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => { setCart([]); setView("shop"); }}>Back to shop</button>
      </Card>
    </div>
  );

  if (view === "checkout") return (
    <div style={{ maxWidth: 560, margin: "0 auto" }} className="fade-up">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setView("shop")}>← Back</button>
        <h1 style={{ fontSize: 18, fontWeight: 400 }}>Checkout</h1>
      </div>
      <Card padding="20px" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Your order</div>
        {cart.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < cart.length - 1 ? "0.5px solid var(--glass-border)" : "none" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{item.size}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <button onClick={() => changeQty(item.productId, item.size, -1)} style={{ width: 20, height: 20, borderRadius: 4, border: "0.5px solid var(--glass-border)", background: "transparent", cursor: "pointer", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={10} /></button>
                <span style={{ fontSize: 12, minWidth: 16, textAlign: "center" }}>{item.qty}</span>
                <button onClick={() => changeQty(item.productId, item.size, 1)} style={{ width: 20, height: 20, borderRadius: 4, border: "0.5px solid var(--glass-border)", background: "transparent", cursor: "pointer", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={10} /></button>
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>R{(item.price * item.qty).toLocaleString()}</span>
          </div>
        ))}
      </Card>
      <Card padding="20px" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 12 }}>Delivery</div>
        {(Object.entries(DELIVERY) as [keyof typeof DELIVERY, typeof DELIVERY["pudo"]][]).map(([key, d]) => (
          <div key={key} onClick={() => setDelivery(key)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px", borderRadius: 8, cursor: "pointer", background: delivery === key ? "var(--glass-white-hover)" : "transparent", marginBottom: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${delivery === key ? "var(--accent-purple)" : "var(--glass-border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {delivery === key && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-purple)" }} />}
            </div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</div><div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{d.desc}</div></div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>R{d.cost}</span>
          </div>
        ))}
      </Card>
      <Card padding="20px" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}><span>Products</span><span>R{cartTotal.toLocaleString()}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}><span>Delivery</span><span>R{DELIVERY[delivery].cost}</span></div>
        <div className="divider" style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 500 }}><span>Total</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-purple)" }}>R{(cartTotal + DELIVERY[delivery].cost).toLocaleString()}</span></div>
      </Card>
      <Card padding="20px" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Payment — EFT</div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 14 }}>No card needed. Bank details provided after placing order.</div>
        <button className="btn btn-primary" style={{ width: "100%", padding: 12 }} onClick={() => setView("done")}>Place order — R{(cartTotal + DELIVERY[delivery].cost).toLocaleString()}</button>
      </Card>
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Store</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>Natural hair care products</p>
        </div>
        {cart.length > 0 && (
          <button className="btn btn-accent-purple" onClick={() => setView("checkout")}>
            <ShoppingCart size={14} /> Cart ({cart.reduce((a, i) => a + i.qty, 0)}) — R{cartTotal.toLocaleString()}
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all", "single", "bundle"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 999, border: `0.5px solid ${filter === f ? "var(--glass-border-strong)" : "var(--glass-border)"}`, background: filter === f ? "var(--glass-white-hover)" : "transparent", color: filter === f ? "var(--text-primary)" : "var(--text-tertiary)", fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {filtered.filter(p => p.price > 0).map(p => (
          <Card key={p.id} padding="16px">
            <div style={{ height: 80, borderRadius: 8, background: "var(--glass-white)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 28 }}>✦</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>{p.sizes?.join(" / ")}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent-purple)" }}>R{p.price}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {p.sizes?.map((s: string) => (
                  <button key={s} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => addToCart(p, s)}>
                    {p.sizes.length > 1 ? s : "Add"}
                  </button>
                ))}
              </div>
            </div>
            {p.stock <= p.low_stock_threshold && p.stock > 0 && (
              <div style={{ marginTop: 8, fontSize: 10, color: "var(--accent-amber)" }}>{p.stock} left — low stock</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

