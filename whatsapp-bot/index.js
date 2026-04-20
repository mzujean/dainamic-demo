// whatsapp-bot/index.js
// Dainamic Hair WhatsApp Bot — powered by Baileys + Groq

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const { handleOrderMessage } = require('./orderHandler')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const logger = pino({ level: 'silent' })

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: true,
    browser: ['Dainamic Hair', 'Chrome', '1.0'],
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('\n🔗 Scan this QR code with your WhatsApp:\n')
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log(`[Bot] Disconnected. Reason: ${reason}`)

      if (reason === DisconnectReason.loggedOut) {
        console.log('[Bot] Logged out. Delete ./session and restart.')
        process.exit(0)
      } else {
        console.log('[Bot] Reconnecting in 3s...')
        setTimeout(() => startBot(), 3000)
      }
    }

    if (connection === 'open') {
      console.log('✅ Dainamic Hair WhatsApp Bot connected!')
      await logHeartbeat('connected')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      if (msg.key.fromMe) continue
      if (!msg.message) continue

      const jid = msg.key.remoteJid
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
      const isGroup = jid?.endsWith('@g.us')

      if (isGroup) continue // Only handle DMs for now

      console.log(`[Bot] Message from ${jid}: ${text.substring(0, 60)}`)

      // Log message to Supabase for agent learning
      await logMessage(jid, text)

      // Handle order flow
      const handled = await handleOrderMessage(sock, msg)

      if (!handled) {
        // Generic friendly reply for non-order messages
        await handleGenericMessage(sock, jid, text)
      }
    }
  })
}

// ─── Handle non-order messages with Groq ─────────────────────────────────
async function handleGenericMessage(sock, jid, text) {
  const Groq = require('groq-sdk')
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const prompt = `You are the Dainamic Hair WhatsApp assistant. Dainamic Hair sells natural hair products (oils, butters, sprays) for women with 4C/natural hair in South Africa. 

Be warm, helpful, and concise. If the customer asks about products or prices, encourage them to place an order. Keep responses under 3 sentences. Use a friendly, professional South African tone.

Customer message: "${text}"

Reply naturally. Do NOT use markdown bold/italic (no asterisks in the reply).`

  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    })
    const reply = res.choices[0].message.content.trim()
    await sock.sendMessage(jid, { text: reply })
  } catch (err) {
    console.error('[Bot] Generic reply error:', err)
  }
}

// ─── Log message to Supabase ──────────────────────────────────────────────
async function logMessage(jid, text) {
  await supabase.from('agent_memory').insert({
    agent: 'whatsapp-bot',
    type: 'customer_message',
    content: text.substring(0, 500),
    metadata: { jid, timestamp: new Date().toISOString() },
  }).then(() => {}).catch(() => {})
}

// ─── Log heartbeat ────────────────────────────────────────────────────────
async function logHeartbeat(status) {
  await supabase.from('agent_heartbeat_log').insert({
    agent: 'whatsapp-bot',
    status,
    notes: `Bot ${status} at ${new Date().toISOString()}`,
  }).then(() => {}).catch(() => {})
}

startBot().catch(console.error)
