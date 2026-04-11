"use client";
import { useState, useEffect, useRef } from "react";
import Card from "@/components/Card";
import StatCard from "@/components/StatCard";
import { Mic, MicOff, CheckCircle, Circle, Trophy, Flame, Clock, Target, ChevronRight, Plus } from "lucide-react";

interface Task {
  id: string;
  text: string;
  done: boolean;
  time: string;
  category: "build" | "content" | "sales" | "admin";
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  done: boolean;
  target?: string;
  impact: string;
}

const MILESTONES: Milestone[] = [
  { id: "m1", title: "App running in Docker", description: "Local dev environment live", done: true, impact: "Foundation built" },
  { id: "m2", title: "Supabase connected", description: "Real data saving to cloud", done: true, impact: "Data persists permanently" },
  { id: "m3", title: "Real products loaded", description: "All 13 products with correct prices", done: true, impact: "Store is accurate" },
  { id: "m4", title: "Live on Vercel", description: "Accessible from phone anywhere", done: false, target: "Today", impact: "Use it on your phone" },
  { id: "m5", title: "WhatsApp bot active", description: "Customers can order via WhatsApp", done: false, target: "This week", impact: "Low-data customers can order" },
  { id: "m6", title: "Content engine live", description: "30 posts/day auto-generated", done: false, target: "This week", impact: "Consistent social presence" },
  { id: "m7", title: "First 10 orders", description: "Real orders through the system", done: false, target: "This month", impact: "Revenue flowing through app" },
  { id: "m8", title: "AI avatar videos", description: "HeyGen connected and posting", done: false, target: "This month", impact: "Face of brand automated" },
  { id: "m9", title: "100 social followers", description: "Growing audience across platforms", done: false, target: "Month 2", impact: "Brand awareness building" },
  { id: "m10", title: "1,000 customers reached", description: "Social reach milestone", done: false, target: "Month 3", impact: "20% of annual goal" },
  { id: "m11", title: "5,000 customers reached", description: "Annual goal achieved", done: false, target: "End of year", impact: "R100,000+ revenue potential" },
];

const CATEGORIES = {
  build: { label: "Building", color: "#a78bfa" },
  content: { label: "Content", color: "#60a5fa" },
  sales: { label: "Sales", color: "#4ade80" },
  admin: { label: "Admin", color: "#fbbf24" },
};

const TODAY_GOALS = [
  { id: "g1", text: "Deploy to Vercel — app live on phone", category: "build" as const },
  { id: "g2", text: "Connect store to Supabase products", category: "build" as const },
  { id: "g3", text: "Test content engine batch generation", category: "content" as const },
  { id: "g4", text: "Add real bank details to store checkout", category: "admin" as const },
];

export default function ProgressPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState(TODAY_GOALS.map(g => ({ ...g, done: false })));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [sessionStart] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [streak, setStreak] = useState(3);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setVoiceSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-ZA";
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setTranscript(t);
    };
    recognition.onend = () => {
      setListening(false);
      if (transcript.trim()) addTask(transcript.trim());
    };
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const addTask = (text: string) => {
    if (!text.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      text: text.trim(),
      done: false,
      time: new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
      category: "build",
    };
    setTasks(prev => [newTask, ...prev]);
    setTranscript("");
  };

  const toggleTask = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const toggleGoal = (id: string) => setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));

  const doneTasks = tasks.filter(t => t.done).length;
  const doneGoals = goals.filter(g => g.done).length;
  const goalPct = Math.round((doneGoals / goals.length) * 100);
  const doneMilestones = MILESTONES.filter(m => m.done).length;
  const overallPct = Math.round((doneMilestones / MILESTONES.length) * 100);
  const beating = doneGoals >= Math.ceil(goals.length / 2);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Progress</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
            {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {beating && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.1)", border: "0.5px solid rgba(74,222,128,0.25)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "var(--accent-green)" }}>
              <Trophy size={12} /> Beating today's goal!
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(251,191,36,0.1)", border: "0.5px solid rgba(251,191,36,0.25)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "var(--accent-amber)" }}>
            <Flame size={12} /> {streak} day streak
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Session time" value={formatTime(elapsed)} icon={<Clock size={14} />} />
        <StatCard label="Today's goals" value={`${doneGoals}/${goals.length}`} change={`${goalPct}% complete`} trend={goalPct >= 50 ? "up" : "neutral"} accent="var(--accent-purple)" />
        <StatCard label="Tasks logged" value={tasks.length} change={`${doneTasks} completed`} trend="up" />
        <StatCard label="Overall progress" value={`${overallPct}%`} change={`${doneMilestones}/${MILESTONES.length} milestones`} trend="up" accent="var(--accent-teal)" glow="teal" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Today's goals */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
            <span>Today's goals</span>
            <span style={{ color: goalPct >= 100 ? "var(--accent-green)" : "var(--text-tertiary)", fontSize: 11 }}>{goalPct}%</span>
          </div>
          <div style={{ height: 3, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${goalPct}%`, background: "var(--accent-purple)", borderRadius: 2, transition: "width 0.4s" }} />
          </div>
          {goals.map(g => (
            <div key={g.id} onClick={() => toggleGoal(g.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--glass-border)", cursor: "pointer" }}>
              {g.done ? <CheckCircle size={16} color="var(--accent-green)" /> : <Circle size={16} color="var(--text-tertiary)" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: g.done ? "var(--text-tertiary)" : "var(--text-primary)", textDecoration: g.done ? "line-through" : "none" }}>{g.text}</div>
                <div style={{ fontSize: 10, color: CATEGORIES[g.category].color, marginTop: 1 }}>{CATEGORIES[g.category].label}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Voice task logger */}
        <Card padding="20px">
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Log what you're doing</div>

          {voiceSupported ? (
            <div style={{ marginBottom: 14 }}>
              <button onClick={listening ? stopListening : startListening} style={{
                width: "100%", padding: "14px", borderRadius: 10, border: "none", cursor: "pointer",
                background: listening ? "rgba(248,113,113,0.15)" : "var(--accent-purple-dim)",
                color: listening ? "var(--accent-red)" : "var(--accent-purple)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 500,
                marginBottom: 8,
              }}>
                {listening ? <><MicOff size={16} /> Stop recording</> : <><Mic size={16} /> Tap to speak</>}
              </button>
              {transcript && (
                <div style={{ background: "var(--glass-white)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
                  "{transcript}"
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 14 }}>Voice not supported in this browser. Use Chrome or Safari.</div>
          )}

          {/* Manual input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input placeholder="Or type a task..." id="task-input" style={{ flex: 1, fontSize: 13 }}
              onKeyDown={e => { if (e.key === "Enter") { addTask((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; }}} />
            <button className="btn btn-ghost" style={{ padding: "0 12px", flexShrink: 0 }}
              onClick={() => { const el = document.getElementById("task-input") as HTMLInputElement; addTask(el.value); el.value = ""; }}>
              <Plus size={14} />
            </button>
          </div>

          {/* Task list */}
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {tasks.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "20px 0" }}>
                Speak or type what you just completed
              </div>
            ) : tasks.map(t => (
              <div key={t.id} onClick={() => toggleTask(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", borderBottom: "0.5px solid var(--glass-border)" }}>
                {t.done ? <CheckCircle size={13} color="var(--accent-green)" /> : <Circle size={13} color="var(--text-tertiary)" />}
                <span style={{ fontSize: 12, flex: 1, color: t.done ? "var(--text-tertiary)" : "var(--text-primary)", textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{t.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Milestones */}
      <Card padding="20px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Milestones — road to 5,000 customers</div>
          <div style={{ fontSize: 11, color: "var(--accent-purple)", fontFamily: "var(--font-mono)" }}>{doneMilestones}/{MILESTONES.length} done</div>
        </div>
        <div style={{ height: 4, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg, var(--accent-purple), var(--accent-teal))", borderRadius: 2, transition: "width 0.6s" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {MILESTONES.map(m => (
            <div key={m.id} style={{ padding: "12px 14px", borderRadius: 10, background: m.done ? "rgba(74,222,128,0.06)" : "var(--glass-white)", border: `0.5px solid ${m.done ? "rgba(74,222,128,0.2)" : "var(--glass-border)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {m.done ? <CheckCircle size={13} color="var(--accent-green)" /> : <Circle size={13} color="var(--text-tertiary)" />}
                <span style={{ fontSize: 12, fontWeight: 500, color: m.done ? "var(--accent-green)" : "var(--text-primary)" }}>{m.title}</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4, paddingLeft: 21 }}>{m.description}</div>
              {!m.done && m.target && (
                <div style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "var(--accent-purple-dim)", color: "var(--accent-purple)", display: "inline-block", marginLeft: 21 }}>
                  {m.target}
                </div>
              )}
              <div style={{ fontSize: 10, color: m.done ? "var(--accent-green)" : "var(--text-tertiary)", marginTop: 4, paddingLeft: 21, fontStyle: "italic" }}>
                → {m.impact}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
