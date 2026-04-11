"use client";
import { useState } from "react";
import Card from "@/components/Card";
import { MessageCircle, Send, Bot, User, Check, CheckCheck } from "lucide-react";

interface Message {
  id: string; from: "customer" | "bot"; text: string; time: string; read?: boolean;
}

const DEMO_FLOW: Message[] = [
  { id:"1", from:"customer", text:"Hi", time:"09:14" },
  { id:"2", from:"bot", text:"Hi! Welcome to Dainamic Hair 🌿\n\nReply with a number to order:\n\n1. Daily Moisturiser (150ml) — R90\n2. Growth Elixir (50ml) — R85\n3. Shampoo (200ml) — R95\n4. Leave-in Cream (250ml) — R110\n5. Hair Butter (200ml) — R100\n6. Starter Bundle — R240\n\nOr reply INFO for more details.", time:"09:14", read:true },
  { id:"3", from:"customer", text:"1 and 4 please", time:"09:15" },
  { id:"4", from:"bot", text:"Got it! 🛒\n\nYour order:\n• Daily Moisturiser 150ml × 1 — R90\n• Leave-in Cream 250ml × 1 — R110\n\nDelivery:\nA. PUDO locker — R60\nB. Door-to-door — R100\n\nReply A or B to choose:", time:"09:15", read:true },
  { id:"5", from:"customer", text:"A", time:"09:16" },
  { id:"6", from:"bot", text:"Perfect! 📦\n\nOrder summary:\nProducts: R200\nPUDO delivery: R60\nTotal: R260\n\nPay via EFT:\n🏦 FNB — Dainamic Hair\n📋 Acc: 62XXXXXXXX\n🔑 Ref: DHR-1042\n\nSend your proof of payment here once done. I'll confirm and pack your order! 💚", time:"09:16", read:true },
  { id:"7", from:"customer", text:"[image: proof_of_payment.jpg]", time:"09:22" },
  { id:"8", from:"bot", text:"Payment received! ✅\n\nOrder DHR-1042 confirmed. I'm packing your order now.\n\nYour PDF receipt has been sent. Estimated delivery: 2-3 business days 📬\n\nThank you, Thandi! 💚", time:"09:22", read:true },
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>(DEMO_FLOW);
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"demo"|"setup"|"templates">("demo");

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = { id: Date.now().toString(), from: "customer", text: input, time: new Date().toLocaleTimeString("en-ZA", { hour:"2-digit", minute:"2-digit" }) };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setTimeout(() => {
      const botReply: Message = { id: (Date.now()+1).toString(), from:"bot", text:"Thanks for your message! Our bot is in demo mode. In production, Groq AI handles all replies automatically 24/7.", time: new Date().toLocaleTimeString("en-ZA", { hour:"2-digit", minute:"2-digit" }), read:true };
      setMessages(prev => [...prev, botReply]);
    }, 1000);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>WhatsApp</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>Order automation — no data bundle needed for customers</p>
      </div>

      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "var(--glass-white)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["demo","setup","templates"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "6px 16px", borderRadius: 7, border: "none", background: activeTab === t ? "var(--bg-2)" : "transparent", color: activeTab === t ? "var(--text-primary)" : "var(--text-tertiary)", fontSize: 12, cursor: "pointer", fontWeight: activeTab === t ? 500 : 400, textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === "demo" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
          {/* Chat window */}
          <Card padding="0" style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-green-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={16} color="var(--accent-green)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Dainamic Hair Bot</div>
                <div style={{ fontSize: 11, color: "var(--accent-green)" }}>● Online — powered by Groq + Baileys</div>
              </div>
            </div>
            <div style={{ padding: 14, height: 440, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, background: "rgba(0,0,0,0.2)" }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.from === "customer" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "78%", padding: "9px 13px", borderRadius: msg.from === "customer" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.from === "customer" ? "var(--accent-purple)" : "var(--glass-white)", border: "0.5px solid var(--glass-border)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {msg.text}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{msg.time}</span>
                      {msg.from === "bot" && msg.read && <CheckCheck size={10} color="var(--accent-teal)" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--glass-border)", display: "flex", gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Type a message..." style={{ flex: 1 }} />
              <button onClick={sendMessage} className="btn" style={{ padding: "8px 14px", background: "var(--accent-green)", color: "white" }}><Send size={14} /></button>
            </div>
          </Card>

          {/* Info panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card padding="18px">
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 12 }}>How it works</div>
              {[
                { step: "1", text: "Customer sends \"Hi\" — uses ~1KB data" },
                { step: "2", text: "Bot replies with product menu as plain text" },
                { step: "3", text: "Customer replies with numbers to order" },
                { step: "4", text: "Bot calculates total, sends EFT details + reference" },
                { step: "5", text: "Customer sends proof of payment photo" },
                { step: "6", text: "Bot confirms, generates PDF receipt, logs order to dashboard" },
              ].map(s => (
                <div key={s.step} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--accent-green-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: "var(--accent-green)", flexShrink: 0 }}>{s.step}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, paddingTop: 2 }}>{s.text}</div>
                </div>
              ))}
            </Card>
            <Card padding="18px" style={{ background: "var(--accent-green-dim)", border: "0.5px solid rgba(74,222,128,0.2)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--accent-green)", marginBottom: 6 }}>Data usage</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Full WhatsApp order: <strong style={{ color: "var(--text-primary)" }}>~5KB</strong><br />
                Web store visit: ~1–2MB<br /><br />
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>WhatsApp ordering works even on the smallest data bundle</span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "setup" && (
        <Card padding="24px">
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Connect your WhatsApp</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { step: "1", title: "Install Baileys", code: "npm install @whiskeysockets/baileys", desc: "Free WhatsApp Web library — no monthly fees" },
              { step: "2", title: "Run the connector script", code: "node scripts/whatsapp-connect.js", desc: "Starts a local server and shows a QR code" },
              { step: "3", title: "Scan the QR code", code: "", desc: "Open WhatsApp → Settings → Linked Devices → Link a Device → scan the QR code" },
              { step: "4", title: "Session saved automatically", code: "", desc: "Your session is saved locally. The bot reconnects automatically on restart — you only scan once." },
            ].map(s => (
              <div key={s.step} style={{ display: "flex", gap: 14, padding: 14, background: "var(--glass-white)", borderRadius: 10, border: "0.5px solid var(--glass-border)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-teal-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "var(--accent-teal)", flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{s.title}</div>
                  {s.code && <code style={{ display: "block", background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--accent-teal)", marginBottom: 6 }}>{s.code}</code>}
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Welcome / order menu", text: "Hi! Welcome to Dainamic Hair 🌿\n\nReply with a number to order:\n1. Daily Moisturiser — R90\n2. Growth Elixir — R85\n3. Shampoo — R95\n4. Leave-in Cream — R110\n5. Hair Butter — R100\n6. Starter Bundle — R240" },
            { label: "Payment confirmation", text: "Payment received! ✅ Order [REF] confirmed. I'm packing your order now. PDF receipt sent. Delivery in 2-3 business days 📬" },
            { label: "Follow-up (1 month)", text: "Hi [NAME]! 👋 It's been about a month since your last order. How's your hair journey going? Ready to restock? Just reply and I'll sort you out 💚" },
            { label: "Shipping update", text: "Your order [REF] has been dispatched! 📦 Track via [LINK]. Should arrive within [DAYS] business days." },
          ].map((t, i) => (
            <Card key={i} padding="16px">
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: 10 }}>{t.text}</div>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 12px" }} onClick={() => navigator.clipboard?.writeText(t.text)}>Copy</button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
