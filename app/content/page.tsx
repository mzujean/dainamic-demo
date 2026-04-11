"use client";
import { useState } from "react";
import Card from "@/components/Card";
import StatCard from "@/components/StatCard";
import { Calendar, Zap, Plus, Clock, CheckCircle, Image, Video, AlignLeft, Grid } from "lucide-react";

const PILLARS = ["Hair tips & education","Product spotlight","Routine & how-to","Myth busting","Lifestyle & motivation"];
const PLATFORMS = ["ig","tiktok","facebook"] as const;
const PLAT_LABELS = { ig: "Instagram", tiktok: "TikTok", facebook: "Facebook" };
const PLAT_COLORS = { ig: "#fb923c", tiktok: "#a78bfa", facebook: "#60a5fa" };

type Platform = typeof PLATFORMS[number];
type ContentType = "carousel" | "image" | "avatar" | "video";

interface Post {
  id: string; title: string; type: ContentType;
  platforms: Platform[]; pillar: string; time: string; status: "scheduled"|"draft"|"posted"; reach?: number;
}

const DEMO_POSTS: Post[] = [
  { id:"1", title:"3 mistakes killing your hair growth", type:"avatar", platforms:["ig","tiktok","facebook"], pillar:"Hair tips", time:"6:00 AM", status:"scheduled" },
  { id:"2", title:"The LOC method explained", type:"carousel", platforms:["ig","facebook"], pillar:"Routine & how-to", time:"8:00 AM", status:"scheduled" },
  { id:"3", title:"Myth: trimming stops growth", type:"image", platforms:["ig","tiktok","facebook"], pillar:"Myth busting", time:"10:00 AM", status:"draft" },
  { id:"4", title:"Growth Elixir — what's inside", type:"image", platforms:["ig"], pillar:"Product spotlight", time:"12:00 PM", status:"draft" },
  { id:"5", title:"Moisture retention all week", type:"carousel", platforms:["ig","facebook"], pillar:"Hair tips", time:"2:00 PM", status:"posted", reach: 1420 },
  { id:"6", title:"Your crown deserves the best", type:"image", platforms:["ig","tiktok"], pillar:"Lifestyle", time:"4:00 PM", status:"posted", reach: 847 },
];

const TypeIcon = ({ type }: { type: ContentType }) => {
  const icons = { carousel: <Grid size={11} />, image: <Image size={11} />, avatar: <Video size={11} />, video: <Video size={11} /> };
  return icons[type];
};

const StatusColors: Record<string,string> = { scheduled: "var(--accent-blue)", draft: "var(--accent-amber)", posted: "var(--text-tertiary)" };
const TypeColors: Record<string,string> = { avatar: "#a78bfa", carousel: "#2dd4bf", image: "#60a5fa", video: "#fb923c" };

export default function ContentPage() {
  const [tab, setTab] = useState<"calendar"|"generate"|"queue">("calendar");
  const [activePlatforms, setActivePlatforms] = useState<Platform[]>(["ig","tiktok","facebook"]);
  const [postsPerPlat, setPostsPerPlat] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [genPct, setGenPct] = useState(0);

  const togglePlatform = (p: Platform) => {
    setActivePlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const totalPosts = postsPerPlat * activePlatforms.length;

  const runGeneration = () => {
    setGenerating(true);
    setGenerated(false);
    const steps = [
      ["Generating topic ideas from pillars...", 15],
      ["Writing captions for each platform...", 35],
      ["Creating carousel scripts...", 55],
      ["Allocating avatar video slots...", 72],
      ["Scheduling optimal post times...", 88],
      ["Finalising queue...", 100],
    ] as [string, number][];
    let i = 0;
    const iv = setInterval(() => {
      if (i >= steps.length) { clearInterval(iv); setGenerating(false); setGenerated(true); return; }
      setGenStep(steps[i][0]); setGenPct(steps[i][1]); i++;
    }, 700);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }} className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Content</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>Schedule and generate posts across all platforms</p>
        </div>
        <button className="btn btn-accent-purple" onClick={() => setTab("generate")}>
          <Zap size={13} /> Generate batch
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Scheduled today" value={DEMO_POSTS.filter(p=>p.status==="scheduled").length} />
        <StatCard label="HeyGen credits" value="3 min" change="left this month" trend="down" accent="var(--accent-amber)" />
        <StatCard label="Avg reach (7d)" value="1,108" change="+24% vs last week" trend="up" accent="var(--accent-purple)" />
        <StatCard label="Total posts (Apr)" value="62" change="+18 vs Mar" trend="up" />
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, background: "var(--glass-white)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["calendar","generate","queue"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 16px", borderRadius: 7, border: "none", background: tab === t ? "var(--bg-2)" : "transparent", color: tab === t ? "var(--text-primary)" : "var(--text-tertiary)", fontSize: 12, cursor: "pointer", fontWeight: tab === t ? 500 : 400, transition: "all 0.15s", textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {/* CALENDAR TAB */}
      {tab === "calendar" && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Today — {new Date().toLocaleDateString("en-ZA", { weekday:"long", day:"numeric", month:"long" })}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DEMO_POSTS.map(post => (
              <Card key={post.id} padding="14px 16px">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", minWidth: 52 }}>{post.time}</div>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${TypeColors[post.type]}18`, display: "flex", alignItems: "center", justifyContent: "center", color: TypeColors[post.type], flexShrink: 0 }}>
                    <TypeIcon type={post.type} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{post.title}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {post.platforms.map(p => (
                        <span key={p} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${PLAT_COLORS[p]}18`, color: PLAT_COLORS[p] }}>{PLAT_LABELS[p]}</span>
                      ))}
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "var(--glass-white)", color: "var(--text-tertiary)" }}>{post.pillar}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${StatusColors[post.status]}18`, color: StatusColors[post.status], marginBottom: 3 }}>
                      {post.status}
                    </div>
                    {post.reach && <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{post.reach.toLocaleString()} reach</div>}
                  </div>
                </div>
              </Card>
            ))}
            <Card padding="14px 16px" style={{ borderStyle: "dashed", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={14} color="var(--text-tertiary)" />
              <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Add post</span>
            </Card>
          </div>
        </div>
      )}

      {/* GENERATE TAB */}
      {tab === "generate" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <Card padding="20px" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 14 }}>Platforms</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => togglePlatform(p)} style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: `0.5px solid ${activePlatforms.includes(p) ? PLAT_COLORS[p] : "var(--glass-border)"}`, background: activePlatforms.includes(p) ? `${PLAT_COLORS[p]}15` : "transparent", color: activePlatforms.includes(p) ? PLAT_COLORS[p] : "var(--text-tertiary)", fontSize: 12, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                    {PLAT_LABELS[p]}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 10 }}>Posts per platform per day</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <button onClick={() => setPostsPerPlat(p => Math.max(1,p-1))} style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--glass-border)", background: "transparent", cursor: "pointer", color: "var(--text-primary)", fontSize: 18 }}>−</button>
                <span style={{ fontSize: 24, fontWeight: 300, flex: 1, textAlign: "center" }}>{postsPerPlat}</span>
                <button onClick={() => setPostsPerPlat(p => Math.min(20,p+1))} style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--glass-border)", background: "transparent", cursor: "pointer", color: "var(--text-primary)", fontSize: 18 }}>+</button>
              </div>

              <div style={{ background: "var(--accent-purple-dim)", border: "0.5px solid rgba(167,139,250,0.2)", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--accent-purple)" }}>Total posts to generate</span>
                <span style={{ fontSize: 24, fontWeight: 300, color: "var(--accent-purple)", fontFamily: "var(--font-mono)" }}>{totalPosts}</span>
              </div>
            </Card>

            <Card padding="20px">
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 12 }}>Content mix</div>
              {[
                { label: "Carousels / tips", pct: 40, count: Math.round(totalPosts * 0.4), color: "#2dd4bf" },
                { label: "Image + text", pct: 30, count: Math.round(totalPosts * 0.3), color: "#60a5fa" },
                { label: "AI avatar video", pct: 17, count: Math.round(totalPosts * 0.17), color: "#a78bfa" },
                { label: "Product image", pct: 13, count: Math.round(totalPosts * 0.13), color: "#fb923c" },
              ].map((m, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{m.label}</span>
                    <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{m.count} posts</span>
                  </div>
                  <div style={{ height: 4, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${m.pct}%`, background: m.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>

          <div>
            <Card padding="20px" style={{ marginBottom: 14, border: "0.5px solid rgba(167,139,250,0.25)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--accent-purple)", marginBottom: 14 }}>AI batch generation</div>

              {!generating && !generated && (
                <>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 16 }}>
                    Ready to generate <strong style={{ color: "var(--text-primary)" }}>{totalPosts} posts</strong> across {activePlatforms.length} platform{activePlatforms.length !== 1 ? "s" : ""}.<br />
                    Powered by <span style={{ color: "var(--accent-purple)" }}>Groq Llama 3.3</span> (free tier).<br />
                    All posts follow your 5 content pillars.
                  </div>
                  <button className="btn" style={{ width: "100%", padding: 13, background: "var(--accent-purple)", color: "white", fontSize: 13 }} onClick={runGeneration}>
                    <Zap size={14} /> Generate {totalPosts} posts now
                  </button>
                </>
              )}

              {generating && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{genStep}</div>
                  <div style={{ height: 6, background: "var(--glass-border)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", width: `${genPct}%`, background: "var(--accent-purple)", borderRadius: 3, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{genPct}%</div>
                </div>
              )}

              {generated && (
                <div style={{ textAlign: "center" }}>
                  <CheckCircle size={32} color="var(--accent-teal)" style={{ margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 15, fontWeight: 400, marginBottom: 6 }}>{totalPosts} posts generated</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", marginBottom: 14 }}>
                    {activePlatforms.map(p => (
                      <span key={p} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${PLAT_COLORS[p]}18`, color: PLAT_COLORS[p] }}>
                        {PLAT_LABELS[p]}: {postsPerPlat}
                      </span>
                    ))}
                  </div>
                  <button className="btn btn-ghost" style={{ width: "100%", fontSize: 12 }} onClick={() => setTab("queue")}>View queue</button>
                </div>
              )}
            </Card>

            <Card padding="20px">
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 10 }}>When avatar credits run out</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                Avatar slots auto-swap to:<br />
                <span style={{ color: "var(--text-primary)" }}>1.</span> AI-generated product image + text overlay<br />
                <span style={{ color: "var(--text-primary)" }}>2.</span> Quote card (your branding, auto-generated)<br />
                <span style={{ color: "var(--text-primary)" }}>3.</span> Canva-style educational infographic<br />
                <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>Your schedule never has empty slots.</span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* QUEUE TAB */}
      {tab === "queue" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {activePlatforms.map(p => (
              <div key={p} style={{ padding: "5px 12px", borderRadius: 6, background: `${PLAT_COLORS[p]}15`, border: `0.5px solid ${PLAT_COLORS[p]}40`, fontSize: 11, color: PLAT_COLORS[p] }}>
                {PLAT_LABELS[p]} — {postsPerPlat} posts scheduled
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DEMO_POSTS.concat(DEMO_POSTS.map(p => ({...p, id:p.id+"x", time:"6:30 PM", status:"draft" as const}))).slice(0,10).map((post, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--glass-white)", border: "0.5px solid var(--glass-border)", borderRadius: 10 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", minWidth: 46 }}>{post.time}</span>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: TypeColors[post.type], flexShrink: 0 }} />
                <span style={{ fontSize: 12, flex: 1 }}>{post.title}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {post.platforms.map(p => <span key={p} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: `${PLAT_COLORS[p]}18`, color: PLAT_COLORS[p] }}>{p.toUpperCase()}</span>)}
                </div>
                <span style={{ fontSize: 10, color: StatusColors[post.status] }}>{post.status}</span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "12px 0" }}>
              + {Math.max(0, totalPosts - 10)} more posts in queue today
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
