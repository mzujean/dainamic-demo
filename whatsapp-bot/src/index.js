import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
const logger = pino({ level: 'silent' })

// ── bot active flag ────────────────────────────────────────────────
const BOT_ACTIVE = process.env.BOT_ACTIVE === 'true'
const TEST_NUMBERS = (process.env.TEST_NUMBERS || '').split(',').map(n => n.trim()).filter(Boolean)

// ── intent detection ───────────────────────────────────────────────
function detectIntent(text) {
  const t = text.toLowerCase()
  if (/\b(order|buy|purchase|want|get|send me)\b/.test(t)) return 'order'
  if (/\b(price|cost|how much|product|what do you sell|catalogue|catalog|range)\b/.test(t)) return 'products'
  if (/\b(proof|pop|payment|paid|transferred|sent)\b/.test(t)) return 'proof_of_payment'
  if (/\b(hi|hello|hey|good morning|good afternoon|sawubona|hola)\b/.test(t)) return 'greeting'
  return 'unknown'
}

// ── fetch products from supabase ───────────────────────────────────
async function getProducts() {
  const { data, error } = await supabase.from('products').select('name, price, description')
  if (error || !data?.length) return null
  return data
}

// ── generate invoice PDF ───────────────────────────────────────────
async function generateInvoice(customerName, items) {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { height } = page.getSize()

  page.drawText(process.env.BUSINESS_NAME, { x: 50, y: height - 60, size: 24, font: bold, color: rgb(0.07, 0.62, 0.46) })
  page.drawText('INVOICE', { x: 50, y: height - 90, size: 14, font: bold, color: rgb(0.3, 0.3, 0.3) })

  const date = new Date().toLocaleDateString('en-ZA')
  page.drawText(`Date: ${date}`, { x: 50, y: height - 115, size: 10, font, color: rgb(0.4, 0.4, 0.4) })
  page.drawText(`Customer: ${customerName}`, { x: 50, y: height - 132, size: 10, font, color: rgb(0.4, 0.4, 0.4) })

  page.drawLine({ start: { x: 50, y: height - 145 }, end: { x: 545, y: height - 145 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })

  let y = height - 170
  page.drawText('Item', { x: 50, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) })
  page.drawText('Qty', { x: 350, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) })
  page.drawText('Price', { x: 420, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) })
  page.drawText('Total', { x: 490, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) })
  y -= 18

  let grandTotal = 0
  for (const item of items) {
    const lineTotal = item.price * item.qty
    grandTotal += lineTotal
    page.drawText(item.name, { x: 50, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(String(item.qty), { x: 360, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(`R${item.price.toFixed(2)}`, { x: 415, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(`R${lineTotal.toFixed(2)}`, { x: 485, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
    y -= 18
  }

  y -= 10
  page.drawLine({ start: { x: 50, y: y + 8 }, end: { x: 545, y: y + 8 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
  page.drawText(`TOTAL: R${grandTotal.toFixed(2)}`, { x: 415, y: y - 8, size: 12, font: bold, color: rgb(0.07, 0.62, 0.46) })

  y -= 60
  page.drawText('Banking Details', { x: 50, y, size: 12, font: bold, color: rgb(0.2, 0.2, 0.2) })
  y -= 20
  const bankLines = [
    `Bank: ${process.env.BANK_NAME}`,
    `Account name: ${process.env.ACCOUNT_NAME}`,
    `Account number: ${process.env.ACCOUNT_NUMBER}`,
    `Branch code: ${process.env.BRANCH_CODE}`,
    `Reference: ${customerName.replace(/\s+/g, '').toUpperCase()}`,
  ]
  for (const line of bankLines) {
    page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) })
    y -= 16
  }

  y -= 20
  page.drawText('Please send proof of payment to confirm your order. Thank you!', {
    x: 50, y, size: 9, font, color: rgb(0.5, 0.5, 0.5)
  })

  return await doc.save()
}

// ── pending orders (in-memory) ─────────────────────────────────────
const pendingOrders = new Map()

// ── message handler ────────────────────────────────────────────────
async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid
  if (!jid || msg.key.fromMe) return

  const senderNumber = jid.replace('@s.whatsapp.net', '').replace('@g.us', '')

  // ── GATE: bot inactive — only allow test numbers ──
  if (!BOT_ACTIVE) {
    const isTestNumber = TEST_NUMBERS.some(n => senderNumber.includes(n))
    if (!isTestNumber) {
      console.log(`[TEST MODE] Ignored message from ${senderNumber}`)
      return
    }
    console.log(`[TEST MODE] Responding to test number: ${senderNumber}`)
  }

  const body = msg.message?.conversation
    || msg.message?.extendedTextMessage?.text
    || ''

  const hasImage = !!(msg.message?.imageMessage)
  const intent = detectIntent(body)
  const customerName = msg.pushName || 'Customer'

  if (hasImage && pendingOrders.has(jid)) {
    const order = pendingOrders.get(jid)
    await supabase.from('finance_income').insert({
      date: new Date().toISOString().split('T')[0],
      customer_name: customerName,
      category: 'Products Sold',
      description: order.items.map(i => i.name).join(', '),
      amount: order.total,
      payment_method: 'EFT',
      notes: 'PoP received via WhatsApp — pending confirmation',
    })
    pendingOrders.delete(jid)
    await sock.sendMessage(jid, {
      text: `Thank you ${customerName}! Your proof of payment has been received. We'll confirm and process your order shortly. 🌿`
    })
    return
  }

  if (intent === 'greeting') {
    await sock.sendMessage(jid, {
      text: `Hi ${customerName}! 👋 Welcome to *${process.env.BUSINESS_NAME}*.\n\nYou can:\n• Ask about our *products*\n• Place an *order*\n• Send *proof of payment*\n\nHow can I help you today?`
    })
    return
  }

  if (intent === 'products') {
    const products = await getProducts()
    if (!products) {
      await sock.sendMessage(jid, { text: 'Sorry, I couldn\'t load our products right now. Please try again shortly.' })
      return
    }
    const list = products.map(p => `• *${p.name}* — R${p.price}\n  ${p.description || ''}`).join('\n\n')
    await sock.sendMessage(jid, {
      text: `Here's our current range:\n\n${list}\n\nReply with *order* and the product name to place an order! 🌿`
    })
    return
  }

  if (intent === 'order') {
    const products = await getProducts()
    if (!products) {
      await sock.sendMessage(jid, { text: 'Sorry, something went wrong. Please try again.' })
      return
    }
    const mentioned = products.filter(p =>
      body.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
    )
    const orderItems = mentioned.length
      ? mentioned.map(p => ({ name: p.name, price: Number(p.price), qty: 1 }))
      : [{ name: 'Custom order — details TBC', price: 0, qty: 1 }]

    const total = orderItems.reduce((s, i) => s + i.price * i.qty, 0)
    const pdfBytes = await generateInvoice(customerName, orderItems)

    pendingOrders.set(jid, { items: orderItems, total })

    await supabase.from('orders').insert({
      customer_name: customerName,
      items: JSON.stringify(orderItems),
      total,
      status: 'pending_payment',
      created_at: new Date().toISOString(),
    }).maybeSingle()

    await sock.sendMessage(jid, {
      text: `Thank you ${customerName}! Here's your invoice. Please make payment using the banking details on the PDF and reply with your *proof of payment*. 🌿`
    })
    await sock.sendMessage(jid, {
      document: Buffer.from(pdfBytes),
      mimetype: 'application/pdf',
      fileName: `Dainamic_Invoice_${customerName.replace(/\s+/g, '_')}.pdf`,
    })
    return
  }

  if (intent === 'proof_of_payment') {
    await sock.sendMessage(jid, {
      text: `Thanks ${customerName}! Please send the *screenshot or photo* of your proof of payment and we'll get your order confirmed. 📸`
    })
    return
  }

  await sock.sendMessage(jid, {
    text: `Hi ${customerName}! I didn't quite get that. You can ask about:\n• *products* — see our range\n• *order* — place an order\n• *proof of payment* — confirm payment\n\nOr reply *hi* to start over.`
  })
}

// ── connection ─────────────────────────────────────────────────────
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
  })

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Scan this QR code with WhatsApp:\n')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'close') {
      const shouldReconnect = (new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Connection closed. Reconnecting:', shouldReconnect)
      if (shouldReconnect) connectToWhatsApp()
    }
    if (connection === 'open') {
      console.log(`✅ Dainamic WhatsApp bot is live! Mode: ${BOT_ACTIVE ? 'LIVE 🟢' : 'TEST MODE 🟡'}`)
      if (!BOT_ACTIVE && TEST_NUMBERS.length) {
        console.log(`📋 Test numbers: ${TEST_NUMBERS.join(', ')}`)
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      try {
        await handleMessage(sock, msg)
      } catch (err) {
        console.error('Message handling error:', err)
      }
    }
  })
}

connectToWhatsApp()
