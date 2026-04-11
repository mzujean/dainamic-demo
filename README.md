# Dainamic Hair — Business OS

Mobile-first business operating system for Dainamic Hair.

## Stack
- **Next.js 16** (App Router, TypeScript)
- **Supabase** — database + storage (free tier)
- **Groq API** — fast LLM inference, free tier (text agents)
- **Gemini API** — vision + text, free tier (receipt reading)
- **Zustand** — client state
- **Recharts** — analytics charts
- **Framer Motion** — animations
- **Baileys** — WhatsApp Web automation (free)

## Setup

```bash
# 1. Clone and install
npm install

# 2. Copy env file and fill in your keys
cp .env.local.example .env.local

# 3. Run locally
npm run dev
```

## Modules
- `/` — Business overview dashboard
- `/store` — Product store with EFT checkout
- `/inventory` — Stock tracking + reorder alerts
- `/content` — Content scheduler (30 posts/day, all platforms)
- `/clients` — Client management + WhatsApp follow-ups
- `/analytics` — Charts and AI business insights
- `/whatsapp` — WhatsApp order automation
- `/agents` — Spawn/manage AI task agents

## Agent system
Agents are spawned on demand and removed when done.
- New task = new agent instance (no stale state)
- Repeatable tasks spawn fresh each time
- LLMs: Groq (text) + Gemini (vision), both free tier
- No single monolithic agent — specialised agents per task

## Connect WhatsApp
```bash
node scripts/whatsapp-connect.js
# Scan QR code with your phone once
# Session saved — reconnects automatically
```
