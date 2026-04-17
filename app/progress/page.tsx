"use client";
import { useState, useEffect, useRef } from "react";
import Card from "@/components/Card";
import StatCard from "@/components/StatCard";
import {
  Mic, MicOff, CheckCircle, Circle, Trophy, Flame, Clock,
  Plus, Zap, AlertTriangle, Volume2, Loader, RefreshCw, Brain, Settings
} from "lucide-react";

interface Task {
  id: string;
  text: string;
  done: boolean;
  time: string;
}

interface BuildItem {
  feature: string;
  status: "done" | "in-progress" | "pending" | "paused";
  note: string;
  session: string;
  category: string;
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  done:          { label: "Done",        color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  "in-progress": { label: "In Progress", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  pending:       { label: "Pending",     color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  paused:        { label: "Paused",      color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

const MILESTONES = [
  { id: "m1", title: "App running in Docker",       desc: "Local dev environment live",              done: true,  impact: "Foundation built" },
  { id: "m2", title: "Supabase connected",          desc: "Real data saving to cloud",               done: true,  impact: "Data persists permanently" },
  { id: "m3", title: "Real products loaded",        desc: "All 13 products with correct prices",     done: true,  impact: "Store is accurate" },
  { id: "m4", title: "Agent OS foundation",         desc: "Soul, user, heartbeat — agents have a brain", done: true, impact: "AI can now operate with context" },
  { id: "m5", title: "Knowledge wizard live",       desc: "Dynamic gap system — agents ask when stuck", done: true, impact: "No more generic AI responses" },
  { id: "m6", title: "Agent preferences in settings", desc: "Edit & reset all agent answers anytime", done: true, impact: "Full owner control" },
  { id: "m7", title: "Inventory agent live",        desc: "First real working agent — stock alerts",  done: false, impact: "Agents start doing real work", next: true },
  { id: "m8", title: "WhatsApp bot active",         desc: "Customers can order via WhatsApp",         done: false, impact: "Low-data customers can order" },
  { id: "m9", title: "Content engine live",         desc: "30 posts/day auto-generated",              done: false, impact: "Consistent social presence" },
  { id: "m10", title: "First 10 orders",            desc: "Real orders through the system",           done: false, impact: "Revenue flowing through app" },
  { id: "m11", title: "Video pipeline live",        desc: "Upload, transcript, clip, post",           done: false, impact: "Full content automation" },
  { id: "m12", title: "5,000 customers reached",   desc: "Annual goal achieved",                     done: false, impact: "Business at scale" },
];

const SESSION_6_GOALS = [
  { id: "g1", text: "Build inventory agent — first real working agent", done: false, category: "Agent" },
  { id: "g2", text: "Inventory agent reads live stock from Supabase",   done: false, category: "Agent" },
  { id: "g3", text: "Low stock alerts surface in app with approval UI", done: false, category: "Agent" },
  { id: "g4", text: "Agent writes memory after each run",               done: false, category: "Agent" },
];

const STATIC_BUILD_LOG: BuildItem[] = [
  // Session 6 — today
  { feature: "Agent OS Foundation",         status: "done",        note: "soul.md, user.md, heartbeat.md stored in Supabase agent_context table. Every agent reads these before every task.", session: "S6", category: "Agent OS" },
  { feature: "Supabase Agent Schema",       status: "done",        note: "6 tables created: agent_context, agent_memory, knowledge_gaps, agent_heartbeat_log, video_assets, content_scripts.", session: "S6", category: "Agent OS" },
  { feature: "Knowledge Wizard Modal",      status: "done",        note: "Slides up from bottom on app open. Asks one question at a time. Saves permanently — never asks again.", session: "S6", category: "Agent OS" },
  { feature: "Dynamic Gap System",          status: "done",        note: "Agents register gaps when they cant proceed. Wizard surfaces them. Owner answers once, agent remembers forever.", session: "S6", category: "Agent OS" },
  { feature: "Agent Preferences — Settings", status: "done",       note: "Full preferences editor in /settings. Edit any answer, reset to re-trigger wizard. Other option on all selects.", session: "S6", category: "Agent OS" },
  { feature: "Heartbeat System",            status: "done",        note: "Fires on app open. Zero token cost — DB reads only. No scheduled timer yet — dynamic triggers only.", session: "S6", category: "Agent OS" },
  { feature: "Video Pipeline Tables",       status: "done",        note: "video_assets + content_scripts tables ready. Gemini analysis route built. Waits for video upload UI.", session: "S6", category: "Video" },
  { feature: "AgentOSProvider",             status: "done",        note: "Wraps root layout. Runs heartbeat on open. Shows wizard when gaps exist.", session: "S6", category: "Agent OS" },
  { feature: "Owner Profile — user.md",     status: "done",        note: "Dai Jean Mzumara. 8am-6pm. 7 day follow-up. Facebook primary. Warm & professional tone. Always ask for reorders.", session: "S6", category: "Agent OS" },
  // Previous sessions
  { feature: "WhatsApp Number Switch",      status: "done",        note: "Switched from Business to personal — bot unblocked.", session: "S4", category: "WhatsApp" },
  { feature: "WhatsApp Bot",                status: "done",        note: "QR scanned with personal number — bot live.", session: "S3-S4", category: "WhatsApp" },
  { feature: "Content Scheduler Page",      status: "done",        note: "app/content/page.tsx + ContentClient + API route.", session: "S3", category: "Content" },
  { feature: "Facebook Auto-Posting",       status: "done",        note: "Direct Graph API posting live. Page ID + tokens set.", session: "S4", category: "Content" },
  { feature: "Meta Developer App",          status: "done",        note: "App ID: 1627204968400712. Facebook posting via API.", session: "S3", category: "Content" },
  { feature: "Docker Stack",                status: "done",        note: "docker-compose.yml updated. whatsapp-bot service added.", session: "S3", category: "Infrastructure" },
  { feature: "Supabase content_queue",      status: "done",        note: "Table created and connected to content scheduler.", session: "S3", category: "Infrastructure" },
  { feature: "Google Drive Clips",          status: "pending",     note: "Deferred — video pipeline approach changed. Now uses Supabase storage + Gemini.", session: "S4", category: "Video" },
  { feature: "Test Content Page",           status: "pending",     note: "Topic to Groq caption to save to queue to verify in Supabase.", session: "S4", category: "Content" },
];

const NEXT_UP = [
  { title: "Inventory Agent",    desc: "First real agent — reads stock, surfaces low alerts, waits for approval", priority: "Tonight" },
  { title: "Client Agent",       desc: "Follow-up reminders via WhatsApp — 7 day timing, warm tone", priority: "This week" },
  { title: "Video Upload UI",    desc: "Upload video — Gemini reads it — transcript stored — script paired", priority: "This week" },
  { title: "Content Agent",      desc: "Schedule 30 posts/day using scripts + video highlights", priority: "Next week" },
  { title: "Facebook Upload Fix", desc: "Video posting to Facebook still broken — revisit after inventory agent", priority: "Next week" },
];

const REMINDERS = [
  { icon: "??", label: "Meta Access Token",   note: "Expires ~1hr. Refresh at developers.facebook.com/tools/explorer", urgent: true },
  { icon: "??", label: "Agent OS is live",     note: "soul.md, user.md, heartbeat.md in Supabase. All agents read these first.", urgent: false },
  { icon: "??", label: "WhatsApp Bot Files",   note: "D:\\Docker projects\\dainamic\\whatsapp-bot\\", urgent: false },
  { icon: "??", label: "C Drive Space",        note: "Use npm run dev instead of Docker for main app", urgent: false },
];

const CATEGORIES = ["All", "Agent OS", "Content", "WhatsApp", "Video", "Infrastructure"];

function speak(text: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-ZA"; u.rate = 1.05; u.pitch = 1;
  window.speechSynthesis.speak(u);
}

export default function ProgressPage() {
  const [activeTab, setActiveTab]   = useState<"brief" | "build" | "goals" | "milestones">("milestones");
  const [brief, setBrief]           = useState<string>("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [goals, setGoals]           = useState(SESSION_6_GOALS.map(g => ({ ...g })));
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [agentReply, setAgentReply] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [sessionStart]              = useState(Date.now());
  const [elapsed, setElapsed]       = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const recognitionRef              = useRef<any>(null);

  const doneMilestones = MILESTONES.filter(m => m.done).length;
  const totalMilestones = MILESTONES.length;
  const overallPct = Math.round((doneMilestones / totalMilestones) * 100);
  const doneGoals = goals.filter(g => g.done).length;
  const goalPct = goals.length ? Math.round((doneGoals / goals.length) * 100) : 0;
  const doneTasks = tasks.filter(t => t.done).length;

  useEffect(() => {
    setVoiceSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const fetchBrief = async () => {
    setBriefLoading(true);
    try {
      const res = await fetch("/api/progress-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_brief" }),
      });
      const data = await res.json();
      if (data.success) { setBrief(data.brief); speak(data.brief); }
    } catch { setBrief("Agent OS foundation complete. Tonight: build the inventory agent."); }
    setBriefLoading(false);
  };

  const askAgent = async (question: string) => {
    if (!question.trim()) return;
    setAgentLoading(true); setAgentReply("");
    try {
      const res = await fetch("/api/progress-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ask", message: question }),
      });
      const data = await res.json();
      if (data.success) { setAgentReply(data.response); speak(data.response); }
    } catch { setAgentReply("Couldn't reach the agent."); }
    setAgentLoading(false); setTranscript("");
  };

  const startListening = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = "en-ZA";
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((x: any) => x[0].transcript).join("");
      setTranscript(t);
    };
    r.onend = () => { setListening(false); if (transcript.trim()) askAgent(transcript.trim()); };
    r.start(); recognitionRef.current = r; setListening(true);
  };

  const addTask = (text: string) => {
    if (!text.trim()) return;
    setTasks(prev => [{ id: Date.now().toString(), text: text.trim(), done: false,
      time: new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) }, ...prev]);
  };

  const filteredLog = categoryFilter === "All"
    ? STATIC_BUILD_LOG
    : STATIC_BUILD_LOG.filter(b => b.category === categoryFilter);

  const tabStyle = (tab: string) => ({
    padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    cursor: "pointer", border: "none",
    background: activeTab === tab ? "var(--accent-purple-dim)" : "transparent",
    color: activeTab === tab ? "var(--accent-purple)" : "var(--text-tertiary)",
    transition: "all 0.2s",
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Progress</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
            {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} · Session 6
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(167,139,250,0.1)", border: "0.5px solid rgba(167,139,250,0.25)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "var(--accent-purple)" }}>
            <Brain size={12} /> Agent OS live
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(251,191,36,0.1)", border: "0.5px solid rgba(251,191,36,0.25)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "var(--accent-amber)" }}>
            <Flame size={12} /> 4 day streak
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Session time"      value={formatTime(elapsed)} icon={<Clock size={14} />} />
        <StatCard label="Tonight's goals"   value={`${doneGoals}/${goals.length}`} change={`${goalPct}% complete`} trend={goalPct >= 50 ? "up" : "neutral"} accent="var(--accent-purple)" />
        <StatCard label="Tasks logged"      value={tasks.length} change={`${doneTasks} completed`} trend="up" />
        <StatCard label="Overall progress"  value={`${overallPct}%`} change={`${doneMilestones}/${totalMilestones} milestones`} trend="up" accent="var(--accent-green)" glow="teal" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--glass-white)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        <button style={tabStyle("milestones")} onClick={() => setActiveTab("milestones")}>Milestones</button>
        <button style={tabStyle("brief")}      onClick={() => { setActiveTab("brief"); fetchBrief(); }}>Agent Brief</button>
        <button style={tabStyle("build")}      onClick={() => setActiveTab("build")}>Build Log</button>
        <button style={tabStyle("goals")}      onClick={() => setActiveTab("goals")}>Tonight</button>
      </div>

      {/* MILESTONES TAB */}
      {activeTab === "milestones" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card padding="20px">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                Road to 5,000 customers
              </div>
              <div style={{ fontSize: 12, color: "var(--accent-green)" }}>{doneMilestones}/{totalMilestones} done</div>
            </div>
            <div style={{ height: 4, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg, var(--accent-purple), var(--accent-green))", borderRadius: 2, transition: "width 0.6s" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {MILESTONES.map((m) => (
                <div key={m.id} style={{
                  padding: "14px 16px", borderRadius: 10,
                  background: m.done ? "rgba(74,222,128,0.06)" : m.next ? "rgba(167,139,250,0.08)" : "var(--glass-white)",
                  border: `0.5px solid ${m.done ? "rgba(74,222,128,0.2)" : m.next ? "rgba(167,139,250,0.3)" : "var(--glass-border)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    {m.done
                      ? <CheckCircle size={13} color="var(--accent-green)" />
                      : <Circle size={13} color={m.next ? "var(--accent-purple)" : "var(--text-tertiary)"} />}
                    <div style={{ fontSize: 12, fontWeight: 600, color: m.done ? "var(--accent-green)" : m.next ? "var(--accent-purple)" : "var(--text-primary)" }}>
                      {m.title}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>{m.desc}</div>
                  <div style={{ fontSize: 10, color: m.done ? "var(--accent-green)" : m.next ? "var(--accent-purple)" : "var(--text-tertiary)", fontStyle: "italic" }}>
                    {m.done ? `? ${m.impact}` : m.next ? "? Up next tonight" : m.impact}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="20px">
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>What's next — in order</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {NEXT_UP.map((n, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "var(--glass-white)", border: "0.5px solid var(--glass-border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: i === 0 ? "rgba(167,139,250,0.15)" : "var(--glass-white)", color: i === 0 ? "var(--accent-purple)" : "var(--text-tertiary)", border: `0.5px solid ${i === 0 ? "rgba(167,139,250,0.3)" : "var(--glass-border)"}`, whiteSpace: "nowrap" }}>
                    {n.priority}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{n.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* AGENT BRIEF TAB */}
      {activeTab === "brief" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card padding="24px">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={14} color="var(--accent-amber)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Session Brief — auto-generated</span>
              </div>
              <button onClick={fetchBrief} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <RefreshCw size={11} /> Refresh
              </button>
            </div>
            {briefLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-tertiary)", fontSize: 13 }}>
                <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> Reading your system state…
              </div>
            ) : (
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)", fontStyle: "italic" }}>
                "{brief || "Click refresh to load your session brief."}"
              </div>
            )}
            <button onClick={() => speak(brief)} style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, background: "none", border: "0.5px solid var(--glass-border)", borderRadius: 8, padding: "6px 12px", fontSize: 11, color: "var(--text-tertiary)", cursor: "pointer" }}>
              <Volume2 size={11} /> Play again
            </button>
          </Card>

          <Card padding="24px">
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Ask the agent anything</div>
            {voiceSupported && (
              <button onClick={listening ? () => { recognitionRef.current?.stop(); setListening(false); } : startListening} style={{
                width: "100%", padding: 16, borderRadius: 12, border: "none", cursor: "pointer",
                background: listening ? "rgba(248,113,113,0.15)" : "var(--accent-purple-dim)",
                color: listening ? "#f87171" : "var(--accent-purple)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontSize: 13, fontWeight: 500, marginBottom: 10,
              }}>
                {listening ? <><MicOff size={16} /> Listening… tap to send</> : <><Mic size={16} /> Tap & speak</>}
              </button>
            )}
            {transcript && (
              <div style={{ background: "var(--glass-white)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 10 }}>"{transcript}"</div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input id="agent-input" placeholder="Or type a question…" style={{ flex: 1, fontSize: 13 }}
                onKeyDown={e => { if (e.key === "Enter") { askAgent((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; }}} />
              <button className="btn btn-ghost" style={{ padding: "0 14px" }}
                onClick={() => { const el = document.getElementById("agent-input") as HTMLInputElement; askAgent(el.value); el.value = ""; }}>
                <Plus size={14} />
              </button>
            </div>
            {agentLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-tertiary)", fontSize: 12 }}>
                <Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> Thinking…
              </div>
            )}
            {agentReply && !agentLoading && (
              <div style={{ background: "rgba(167,139,250,0.08)", border: "0.5px solid rgba(167,139,250,0.2)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, color: "var(--accent-purple)", fontWeight: 500, marginBottom: 6 }}>Agent</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-primary)" }}>{agentReply}</div>
                <button onClick={() => speak(agentReply)} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", fontSize: 10, color: "var(--text-tertiary)", cursor: "pointer" }}>
                  <Volume2 size={10} /> Play
                </button>
              </div>
            )}
          </Card>

          <Card padding="20px">
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={13} color="#f87171" /> Remember
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {REMINDERS.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8, background: r.urgent ? "rgba(248,113,113,0.06)" : "var(--glass-white)", border: `0.5px solid ${r.urgent ? "rgba(248,113,113,0.2)" : "var(--glass-border)"}` }}>
                  <span style={{ fontSize: 14 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: r.urgent ? "#f87171" : "var(--text-primary)", marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{r.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* BUILD LOG TAB */}
      {activeTab === "build" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "0.5px solid",
                background: categoryFilter === cat ? "var(--accent-purple-dim)" : "transparent",
                borderColor: categoryFilter === cat ? "rgba(167,139,250,0.4)" : "var(--glass-border)",
                color: categoryFilter === cat ? "var(--accent-purple)" : "var(--text-tertiary)",
              }}>{cat}</button>
            ))}
          </div>
          <Card padding="20px">
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>
              Build history — {filteredLog.length} items
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredLog.map((item, i) => {
                const s = STATUS_STYLE[item.status];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", borderRadius: 8, background: "var(--glass-white)", border: "0.5px solid var(--glass-border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: s.bg, color: s.color, whiteSpace: "nowrap", marginTop: 2 }}>{s.label}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{item.feature}</span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--glass-white)", color: "var(--text-tertiary)", border: "0.5px solid var(--glass-border)" }}>{item.category}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{item.note}</div>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{item.session}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TONIGHT TAB */}
      {activeTab === "goals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card padding="20px">
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
              <span>Session 6 — tonight's goals</span>
              <span style={{ fontSize: 11, color: goalPct >= 100 ? "var(--accent-green)" : "var(--text-tertiary)" }}>{goalPct}%</span>
            </div>
            <div style={{ height: 3, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ height: "100%", width: `${goalPct}%`, background: "var(--accent-purple)", borderRadius: 2, transition: "width 0.4s" }} />
            </div>
            {goals.map(g => (
              <div key={g.id} onClick={() => setGoals(prev => prev.map(x => x.id === g.id ? { ...x, done: !x.done } : x))}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "0.5px solid var(--glass-border)", cursor: "pointer" }}>
                {g.done ? <CheckCircle size={16} color="var(--accent-green)" /> : <Circle size={16} color="var(--text-tertiary)" />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: g.done ? "var(--text-tertiary)" : "var(--text-primary)", textDecoration: g.done ? "line-through" : "none" }}>{g.text}</div>
                  <div style={{ fontSize: 10, color: "var(--accent-purple)", marginTop: 2 }}>{g.category}</div>
                </div>
              </div>
            ))}
          </Card>

          <Card padding="20px">
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Log what you did</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input id="task-input" placeholder="Type a task…" style={{ flex: 1, fontSize: 13 }}
                onKeyDown={e => { if (e.key === "Enter") { addTask((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; }}} />
              <button className="btn btn-ghost" style={{ padding: "0 12px" }}
                onClick={() => { const el = document.getElementById("task-input") as HTMLInputElement; addTask(el.value); el.value = ""; }}>
                <Plus size={14} />
              </button>
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {tasks.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "20px 0" }}>Nothing logged yet</div>
              ) : tasks.map(t => (
                <div key={t.id} onClick={() => setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", borderBottom: "0.5px solid var(--glass-border)" }}>
                  {t.done ? <CheckCircle size={13} color="var(--accent-green)" /> : <Circle size={13} color="var(--text-tertiary)" />}
                  <span style={{ fontSize: 12, flex: 1, color: t.done ? "var(--text-tertiary)" : "var(--text-primary)", textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{t.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

