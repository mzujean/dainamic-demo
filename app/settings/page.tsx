"use client";
import { useState } from "react";
import Card from "@/components/Card";
import { Check } from "lucide-react";

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

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }} className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>Configure your API keys and business details</p>
      </div>

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
        <ROW label="Groq API key" desc="groq.com — free tier, fast LLM">
          <input placeholder="gsk_xxxx..." type="password" style={{ width: 220 }} />
        </ROW>
        <ROW label="Gemini API key" desc="aistudio.google.com — free, vision">
          <input placeholder="AIza..." type="password" style={{ width: 220 }} />
        </ROW>
        <ROW label="HeyGen API key" desc="AI avatar videos">
          <input placeholder="xxxx..." type="password" style={{ width: 220 }} />
        </ROW>
        <div style={{ padding: "0.5px 0" }} />
      </SECTION>

      <SECTION title="Supabase (free database)">
        <ROW label="Supabase URL" desc="supabase.com → project settings → API">
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
