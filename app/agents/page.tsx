"use client";
import { useState } from "react";
import { useStore } from "@/store/useStore";
import Card from "@/components/Card";
import { Zap, Play, Trash2, CheckCircle, AlertCircle, Clock } from "lucide-react";

const AGENT_TYPES = [
  { type: "receipt_extract", label: "Receipt extractor", desc: "Reads invoice/receipt images and logs to finance", color: "var(--accent-teal)" },
  { type: "content_generate", label: "Content generator", desc: "Generates batch posts for IG, TikTok, Facebook", color: "var(--accent-purple)" },
  { type: "whatsapp_reply", label: "WhatsApp handler", desc: "Handles incoming orders and sends confirmations", color: "var(--accent-green)" },
  { type: "follow_up", label: "Follow-up drafter", desc: "Drafts reorder messages for clients", color: "var(--accent-blue)" },
  { type: "inventory_check", label: "Inventory monitor", desc: "Checks stock levels and flags reorder needs", color: "var(--accent-amber)" },
  { type: "analytics", label: "Analytics summariser", desc: "Analyses performance and gives business insights", color: "var(--accent-coral)" },
];

export default function AgentsPage() {
  const { agents, spawnAgent, removeAgent, updateAgent } = useStore();
  const [running, setRunning] = useState<string | null>(null);

  const launchAgent = (type: string, name: string) => {
    const id = spawnAgent({ type: type as any, name });
    setRunning(id);
    // Simulate agent completing after 3-5s then auto-remove
    const duration = 3000 + Math.random() * 2000;
    setTimeout(() => {
      updateAgent(id, { status: "done", result: `${name} completed successfully` });
      setTimeout(() => { removeAgent(id); setRunning(null); }, 2000);
    }, duration);
  };

  const statusIcon = (status: string) => {
    if (status === "running") return <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-teal)", boxShadow: "0 0 6px var(--accent-teal)" }} />;
    if (status === "done") return <CheckCircle size={14} color="var(--accent-green)" />;
    if (status === "error") return <AlertCircle size={14} color="var(--accent-red)" />;
    return <Clock size={14} color="var(--text-tertiary)" />;
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }} className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Agents</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
          Spawn task agents as needed — they run, complete, then are removed automatically
        </p>
      </div>

      {/* Active agents */}
      {agents.length > 0 && (
        <Card padding="20px" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Active agents</div>
          {agents.map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--glass-border)" }}>
              {statusIcon(a.status)}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {a.status === "running" ? "Running..." : a.result}
                </div>
              </div>
              <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: a.status === "running" ? "var(--accent-teal-dim)" : "var(--glass-white)", color: a.status === "running" ? "var(--accent-teal)" : "var(--text-tertiary)" }}>
                {a.status}
              </div>
              <button onClick={() => removeAgent(a.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </Card>
      )}

      {/* Agent catalogue */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {AGENT_TYPES.map(a => {
          const isRunning = agents.some(ag => ag.type === a.type && ag.status === "running");
          return (
            <Card key={a.type} padding="18px">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${a.color}22`, border: `0.5px solid ${a.color}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap size={12} color={a.color} />
                </div>
                <button
                  className="btn"
                  disabled={isRunning}
                  onClick={() => launchAgent(a.type, a.label)}
                  style={{ padding: "5px 12px", fontSize: 11, background: isRunning ? "var(--glass-white)" : `${a.color}22`, border: `0.5px solid ${a.color}44`, color: isRunning ? "var(--text-tertiary)" : a.color, cursor: isRunning ? "not-allowed" : "pointer" }}
                >
                  {isRunning ? "Running" : <><Play size={10} /> Spawn</>}
                </button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5 }}>{a.desc}</div>
            </Card>
          );
        })}
      </div>

      <Card padding="18px" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>How agents work</div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.8 }}>
          Agents are spawned on demand for specific tasks and automatically removed when done. New task types get fresh agents — no stale state, no accuracy drift. Repeatable tasks (like daily content generation) spawn the same agent type fresh each time. The LLM powering each agent is Groq (free tier) for text tasks and Gemini (free tier) for vision tasks like reading receipts.
        </div>
      </Card>
    </div>
  );
}
