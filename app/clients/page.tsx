"use client";
import { useState } from "react";
import { useStore } from "@/store/useStore";
import Card from "@/components/Card";
import StatCard from "@/components/StatCard";
import { MessageCircle, Send, CheckCheck, Clock, User } from "lucide-react";

const WA_TEMPLATES: Record<string, (name: string, product?: string) => string> = {
  reorder: (name, product) =>
    `Hi ${name}! 👋 It's been about a month since your last order of ${product || "your Dainamic Hair products"}. How's your hair journey going? Let me know if you're ready to restock — I'll sort you out! 💚`,
  followup: (name) =>
    `Hi ${name}! Just checking in — how are your Dainamic Hair products working for you? Would love to hear your feedback. Ready to reorder whenever you are! 🌿`,
  newcustomer: (name) =>
    `Welcome to Dainamic Hair, ${name}! 🎉 So excited to be part of your natural hair journey. Reply anytime to place an order or ask questions. Here for you! 💚`,
};

export default function ClientsPage() {
  const { clients, orders } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<keyof typeof WA_TEMPLATES>("reorder");
  const [copied, setCopied] = useState(false);

  const selectedClient = clients.find(c => c.id === selected);
  const draft = selectedClient ? WA_TEMPLATES[msgType](selectedClient.name.split(" ")[0], "Leave-in Cream") : "";

  const copy = () => {
    navigator.clipboard?.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const due = clients.filter(c => c.followUpStatus === "due");
  const ok = clients.filter(c => c.followUpStatus === "ok");

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Clients</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>Customer tracking and WhatsApp follow-ups</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total clients" value={clients.length} />
        <StatCard label="Follow-ups due" value={due.length} trend={due.length > 0 ? "down" : "neutral"} accent={due.length > 0 ? "var(--accent-amber)" : undefined} change={due.length > 0 ? "send today" : "all clear"} />
        <StatCard label="Avg order value" value="R183" trend="up" change="+R22 vs last month" accent="var(--accent-purple)" />
        <StatCard label="Repeat rate" value="80%" trend="up" change="4 of 5 reordered" accent="var(--accent-teal)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        {/* Client list */}
        <div>
          {due.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Follow-up due</div>
              {due.map(c => (
                <Card key={c.id} padding="14px 16px" style={{ marginBottom: 8, cursor: "pointer", border: selected === c.id ? "0.5px solid var(--glass-border-strong)" : "0.5px solid var(--glass-border)", background: selected === c.id ? "var(--glass-white-hover)" : "var(--glass-white)" }} onClick={() => setSelected(c.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-amber-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "var(--accent-amber)", flexShrink: 0 }}>
                      {c.name.split(" ").map((w: string) => w[0]).join("")}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Last order: {c.lastOrderDate} · R{c.totalSpent} total</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}>Follow up</span>
                      <Clock size={12} color="var(--accent-amber)" />
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}

          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: "16px 0 10px" }}>All clients</div>
          {ok.map(c => (
            <Card key={c.id} padding="14px 16px" style={{ marginBottom: 8, cursor: "pointer", border: selected === c.id ? "0.5px solid var(--glass-border-strong)" : "0.5px solid var(--glass-border)", background: selected === c.id ? "var(--glass-white-hover)" : "var(--glass-white)" }} onClick={() => setSelected(c.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--glass-white)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", flexShrink: 0 }}>
                  {c.name.split(" ").map((w: string) => w[0]).join("")}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.orderCount} order{c.orderCount !== 1 ? "s" : ""} · R{c.totalSpent} total</div>
                </div>
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: "var(--accent-teal-dim)", color: "var(--accent-teal)" }}>OK</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Message panel */}
        <div style={{ position: "sticky", top: 24 }}>
          {selectedClient ? (
            <Card padding="20px">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: "0.5px solid var(--glass-border)" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--accent-purple-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "var(--accent-purple)" }}>
                  {selectedClient.name.split(" ").map((w: string) => w[0]).join("")}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{selectedClient.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{selectedClient.phone}</div>
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

              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Draft message</div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 14, minHeight: 100 }}>
                {draft}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }} onClick={copy}>
                  {copied ? <><CheckCheck size={12} /> Copied!</> : "Copy message"}
                </button>
                <a
                  href={`https://wa.me/${selectedClient.phone.replace(/\D/g, "")}?text=${encodeURIComponent(draft)}`}
                  target="_blank" rel="noreferrer"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(74,222,128,0.1)", border: "0.5px solid rgba(74,222,128,0.25)", borderRadius: 10, color: "var(--accent-green)", fontSize: 12, fontWeight: 500, textDecoration: "none", padding: "10px 14px" }}
                >
                  <MessageCircle size={12} /> Open WhatsApp
                </a>
              </div>
            </Card>
          ) : (
            <Card padding="32px" style={{ textAlign: "center" }}>
              <User size={28} color="var(--text-tertiary)" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Select a client to draft a WhatsApp message</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
