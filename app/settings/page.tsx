"use client";
import { useState, useEffect } from "react";
import Card from "@/components/Card";
import { Check, ChevronRight, RotateCcw } from "lucide-react";

const SECTION = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>{title}</div>
    <Card padding="0" style={{ overflow: "hidden" }}>{children}</Card>
  </div>
);

const ROW = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: "0.5px solid var(--glass-border)" }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
      {desc && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>{desc}</div>}
    </div>
    {children}
  </div>
);

const PREFERENCE_KEYS = [
  { key: "owner.name",                   label: "Your name",                  category: "onboarding", emoji: "👤" },
  { key: "owner.working_hours",          label: "Working hours",              category: "onboarding", emoji: "🕘" },
  { key: "client.followup_days",         label: "Client follow-up timing",    category: "clients",    emoji: "📅" },
  { key: "client.followup_tone",         label: "Follow-up message tone",     category: "clients",    emoji: "💬" },
  { key: "inventory.approval_threshold", label: "Reorder approval threshold", category: "inventory",  emoji: "💰" },
  { key: "content.post_frequency",       label: "Posting frequency",          category: "content",    emoji: "📲" },
  { key: "content.primary_platform",     label: "Primary platform",           category: "content",    emoji: "📱" },
  { key: "finance.weekly_summary_day",   label: "Weekly summary day",         category: "finance",    emoji: "📊" },
]

interface GapRow {
  gap_key: string
  answer: string | null
  question: string
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState<GapRow[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSaved, setPrefSaved] = useState<string | null>(null);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  useEffect(() => {
    fetch("/api/agents/preferences")
      .then((r) => r.json())
      .then((data) => setPreferences(data.preferences ?? []))
      .catch(() => {});
  }, []);

  function getAnswer(key: string) {
    return preferences.find((p) => p.gap_key === key)?.answer ?? null;
  }

  async function savePreference(key: string, value: string) {
    setPrefSaving(true);
    await fetch("/api/agents/answer-gap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gapKey: key, answer: value }),
    });
    setPreferences((prev) =>
      prev.map((p) => p.gap_key === key ? { ...p, answer: value } : p)
    );
    setEditingKey(null);
    setEditValue("");
    setPrefSaving(false);
    setPrefSaved(key);
    setTimeout(() => setPrefSaved(null), 2000);
  }

  async function clearPreference(key: string) {
    await fetch("/api/agents/clear-gap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gapKey: key }),
    });
    setPreferences((prev) =>
      prev.map((p) => p.gap_key === key ? { ...p, answer: null } : p)
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }} className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>Configure your API keys and business details</p>
      </div>

      <SECTION title="Agent Preferences">
        {PREFERENCE_KEYS.map(({ key, label, emoji }) => {
          const answer = getAnswer(key);
          const isEditing = editingKey === key;
          return (
            <div key={key} style={{ borderBottom: "0.5px solid var(--glass-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                <span style={{ fontSize: 18 }}>{emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                  {!isEditing && (
                    <div style={{ fontSize: 12, color: answer ? "var(--accent-purple)" : "var(--text-tertiary)", marginTop: 2 }}>
                      {answer ?? "Not set — will ask when needed"}
                    </div>
                  )}
                  {isEditing && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editValue.trim()) savePreference(key, editValue.trim());
                          if (e.key === "Escape") { setEditingKey(null); setEditValue(""); }
                        }}
                        style={{ flex: 1, fontSize: 12, padding: "6px 10px", borderRadius: 8, background: "var(--glass-bg)", border: "1px solid var(--accent-purple)", color: "var(--text-primary)" }}
                        placeholder="Type new value..."
                      />
                      <button
                        onClick={() => editValue.trim() && savePreference(key, editValue.trim())}
                        disabled={!editValue.trim() || prefSaving}
                        style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, background: "var(--accent-purple)", color: "white", opacity: editValue.trim() ? 1 : 0.4, cursor: editValue.trim() ? "pointer" : "not-allowed" }}
                      >
                        {prefSaving ? "..." : "Save"}
                      </button>
                      <button
                        onClick={() => { setEditingKey(null); setEditValue(""); }}
                        style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, background: "var(--glass-bg)", color: "var(--text-tertiary)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <div style={{ display: "flex", gap: 6 }}>
                    {answer && (
                      <button
                        onClick={() => clearPreference(key)}
                        title="Clear — will ask again when needed"
                        style={{ padding: "4px 6px", borderRadius: 6, background: "transparent", color: "var(--text-tertiary)", cursor: "pointer" }}
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingKey(key); setEditValue(answer ?? ""); }}
                      style={{ padding: "4px 8px", borderRadius: 6, background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                    >
                      {answer ? "Edit" : "Set"} <ChevronRight size={10} />
                    </button>
                  </div>
                )}
                {prefSaved === key && (
                  <span style={{ fontSize: 11, color: "var(--accent-purple)" }}>
                    <Check size={12} /> Saved
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </SECTION>

      <SECTION title="Business">
        <ROW label="Business name" desc="Shown on receipts and messages">
          <input defaultValue="Dainamic Hair" style={{ width: 200 }} />
        </ROW>
        <ROW label="WhatsApp number" desc="Your business WhatsApp">
          <input defaultValue="+27 XX XXX XXXX" style={{ width: 200 }} />
        </ROW>
        <ROW label="Bank name">
          <input defaultValue="FNB" style={{ width: 200 }} />
        </ROW>
        <ROW label="Account name">
          <input defaultValue="Dainamic Hair" style={{ width: 200 }} />
        </ROW>
        <ROW label="Account number">
          <input defaultValue="62XXXXXXXX" style={{ width: 200 }} />
        </ROW>
        <div style={{ padding: "0.5px 0" }} />
      </SECTION>

      <SECTION title="Free API Keys">
        <ROW label="Groq API key" desc="groq.com - free tier, fast LLM">
          <input placeholder="gsk_xxxx..." type="password" style={{ width: 220 }} />
        </ROW>
        <ROW label="Gemini API key" desc="aistudio.google.com - free, vision">
          <input placeholder="AIza..." type="password" style={{ width: 220 }} />
        </ROW>
        <ROW label="HeyGen API key" desc="AI avatar videos">
          <input placeholder="xxxx..." type="password" style={{ width: 220 }} />
        </ROW>
        <div style={{ padding: "0.5px 0" }} />
      </SECTION>

      <SECTION title="Supabase (free database)">
        <ROW label="Supabase URL" desc="supabase.com - project settings - API">
          <input placeholder="https://xxxx.supabase.co" style={{ width: 220 }} />
        </ROW>
        <ROW label="Anon key">
          <input placeholder="eyJ..." type="password" style={{ width: 220 }} />
        </ROW>
        <div style={{ padding: "0.5px 0" }} />
      </SECTION>

      <SECTION title="Social media">
        <ROW label="Meta access token" desc="Instagram + Facebook posting">
          <input placeholder="EAA..." type="password" style={{ width: 220 }} />
        </ROW>
        <ROW label="Instagram user ID">
          <input placeholder="xxxxxxxxx" style={{ width: 220 }} />
        </ROW>
        <ROW label="TikTok access token">
          <input placeholder="xxxx..." type="password" style={{ width: 220 }} />
        </ROW>
        <div style={{ padding: "0.5px 0" }} />
      </SECTION>

      <button className="btn btn-primary" style={{ width: "100%", padding: 13 }} onClick={save}>
        {saved ? <><Check size={14} /> Saved!</> : "Save settings"}
      </button>
    </div>
  );
}
