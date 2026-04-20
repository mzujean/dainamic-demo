// whatsapp-bot/orderHandler.js
// Handles incoming WhatsApp messages, parses orders, generates PDF invoices

const { createClient } = require('@supabase/supabase-js')
const Groq = require('groq-sdk')
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── Pudo locker lookup (3 nearest Johannesburg lockers with landmarks) ────
const PUDO_LOCKERS = [
  { name: 'Pick n Pay Greenstone', address: 'Greenstone Shopping Centre, Edenvale', landmark: 'Next to Pick n Pay entrance, Greenstone Mall' },
  { name: 'Checkers Eastgate', address: 'Eastgate Mall, Bedfordview', landmark: 'Near Checkers, Eastgate Shopping Centre food court entrance' },
  { name: 'Spar Meadowdale', address: 'Meadowdale Mall, Germiston', landmark: 'Inside Spar, Meadowdale Mall — look for the yellow Pudo kiosk' },
]

const DELIVERY_OPTIONS = {
  door: { label: 'Door-to-door delivery', price: 100 },
  pudo: { label: 'Pudo locker collection', price: 70 },
}

const BANKING = {
  bank: 'Nedbank',
  accountHolder: 'Dai-Jean Mzumara',
  accountNumber: '1197787534',
  branchCode: '151405',
  accountType: 'Cheque',
}

// ─── Parse order from WhatsApp message using Groq ─────────────────────────
async function parseOrder(messageText) {
  const products = await getProducts()
  const productList = products.map(p => `${p.name} - R${p.price}`).join('\n')

  const prompt = `You are an order parser for Dainamic Hair, a South African natural hair products business.

Available products:
${productList}

Parse this WhatsApp message into a structured order. Extract:
- customer_name (if mentioned)
- items: array of { product_name, quantity, unit_price, line_total }
- delivery_type: "door" or "pudo" (door if they mention delivery/address, pudo if they mention locker/collect)
- delivery_address (if door delivery)
- pudo_locker (if pudo, suggest nearest based on area mentioned)
- notes (any special requests)

Message: "${messageText}"

Respond ONLY with valid JSON. No markdown. Example:
{"customer_name":"Thandi","items":[{"product_name":"Hair Growth Oil","quantity":1,"unit_price":120,"line_total":120}],"delivery_type":"door","delivery_address":"14 Oak St Soweto","pudo_locker":null,"notes":""}`

  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 500,
  })

  try {
    const text = res.choices[0].message.content.trim()
    return JSON.parse(text)
  } catch {
    return null
  }
}

// ─── Get products from Supabase ───────────────────────────────────────────
async function getProducts() {
  const { data } = await supabase.from('products').select('*').eq('active', true)
  return data || []
}

// ─── Save order to Supabase ───────────────────────────────────────────────
async function saveOrder(order, customerPhone) {
  const subtotal = order.items.reduce((sum, i) => sum + i.line_total, 0)
  const deliveryFee = order.delivery_type === 'pudo' ? 70 : 100
  const total = subtotal + deliveryFee

  const invoiceNumber = `INV-${Date.now()}`

  const { data, error } = await supabase.from('orders').insert({
    invoice_number: invoiceNumber,
    customer_name: order.customer_name || 'WhatsApp Customer',
    customer_phone: customerPhone,
    items: order.items,
    subtotal,
    delivery_type: order.delivery_type,
    delivery_fee: deliveryFee,
    delivery_address: order.delivery_address || null,
    pudo_locker: order.pudo_locker || null,
    total,
    status: 'pending',
    payment_status: 'awaiting',
    notes: order.notes || null,
    source: 'whatsapp',
  }).select().single()

  if (error) throw error
  return { ...data, invoiceNumber, subtotal, total, deliveryFee }
}

// ─── Generate PDF invoice ─────────────────────────────────────────────────
async function generateInvoicePDF(orderData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const filePath = path.join('/tmp', `${orderData.invoice_number}.pdf`)
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    // Header
    doc.fontSize(22).fillColor('#1a1a2e').font('Helvetica-Bold').text('DAINAMIC HAIR', 50, 50)
    doc.fontSize(9).fillColor('#666').font('Helvetica').text('Natural Hair Products for 4C Hair', 50, 76)
    doc.fontSize(9).text('dainamic.vercel.app', 50, 88)

    // Invoice label
    doc.fontSize(18).fillColor('#c4944a').font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' })
    doc.fontSize(10).fillColor('#333').font('Helvetica')
      .text(`Invoice No: ${orderData.invoice_number}`, 400, 76, { align: 'right' })
      .text(`Date: ${new Date().toLocaleDateString('en-ZA')}`, 400, 90, { align: 'right' })
      .text(`Status: AWAITING PAYMENT`, 400, 104, { align: 'right' })

    // Divider
    doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#e0c890').lineWidth(1.5).stroke()

    // Bill To
    doc.fontSize(9).fillColor('#888').font('Helvetica-Bold').text('BILL TO', 50, 140)
    doc.fontSize(11).fillColor('#1a1a2e').font('Helvetica-Bold').text(orderData.customer_name || 'Customer', 50, 155)
    if (orderData.customer_phone) {
      doc.fontSize(10).fillColor('#444').font('Helvetica').text(orderData.customer_phone, 50, 170)
    }

    // Delivery info
    doc.fontSize(9).fillColor('#888').font('Helvetica-Bold').text('DELIVERY', 300, 140)
    const delivLabel = orderData.delivery_type === 'pudo' ? 'Pudo Locker (R70)' : 'Door Delivery (R100)'
    doc.fontSize(10).fillColor('#444').font('Helvetica').text(delivLabel, 300, 155)
    if (orderData.delivery_address) {
      doc.fontSize(9).text(orderData.delivery_address, 300, 168, { width: 245 })
    } else if (orderData.pudo_locker) {
      doc.fontSize(9).text(orderData.pudo_locker, 300, 168, { width: 245 })
    }

    // Items table header
    const tableTop = 220
    doc.rect(50, tableTop, 495, 22).fillColor('#1a1a2e').fill()
    doc.fontSize(9).fillColor('#fff').font('Helvetica-Bold')
      .text('ITEM', 58, tableTop + 7)
      .text('QTY', 340, tableTop + 7)
      .text('UNIT PRICE', 375, tableTop + 7)
      .text('TOTAL', 490, tableTop + 7, { align: 'right' })

    // Items rows
    let y = tableTop + 28
    doc.fillColor('#1a1a2e').font('Helvetica')
    orderData.items.forEach((item, i) => {
      if (i % 2 === 0) doc.rect(50, y - 4, 495, 20).fillColor('#f9f5ec').fill()
      doc.fillColor('#1a1a2e').fontSize(10)
        .text(item.product_name, 58, y, { width: 270 })
        .text(String(item.quantity), 342, y)
        .text(`R${item.unit_price.toFixed(2)}`, 375, y)
        .text(`R${item.line_total.toFixed(2)}`, 490, y, { align: 'right' })
      y += 22
    })

    // Subtotal / delivery / total
    y += 10
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#ddd').lineWidth(0.5).stroke()
    y += 8
    doc.fontSize(10).fillColor('#555').font('Helvetica')
      .text('Subtotal', 350, y)
      .text(`R${orderData.subtotal.toFixed(2)}`, 490, y, { align: 'right' })
    y += 18
    doc.text('Delivery', 350, y)
      .text(`R${orderData.delivery_fee.toFixed(2)}`, 490, y, { align: 'right' })
    y += 8
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#c4944a').lineWidth(1).stroke()
    y += 10
    doc.fontSize(13).fillColor('#1a1a2e').font('Helvetica-Bold')
      .text('TOTAL', 350, y)
      .text(`R${orderData.total.toFixed(2)}`, 490, y, { align: 'right' })

    // Banking details
    y += 50
    doc.rect(50, y, 495, 85).fillColor('#f9f5ec').fill()
    doc.fontSize(9).fillColor('#888').font('Helvetica-Bold').text('PAYMENT DETAILS — EFT ONLY', 60, y + 10)
    doc.fontSize(10).fillColor('#1a1a2e').font('Helvetica')
      .text(`Bank: ${BANKING.bank}`, 60, y + 24)
      .text(`Account Holder: ${BANKING.accountHolder}`, 60, y + 38)
      .text(`Account Number: ${BANKING.accountNumber}`, 60, y + 52)
      .text(`Branch Code: ${BANKING.branchCode}  |  Type: ${BANKING.accountType}`, 60, y + 66)
    doc.fontSize(9).fillColor('#c4944a').font('Helvetica-Bold')
      .text(`Reference: ${orderData.invoice_number}`, 60, y + 80)

    // Footer
    doc.fontSize(9).fillColor('#aaa').font('Helvetica')
      .text('Thank you for supporting Dainamic Hair 💛 | dainamic.vercel.app', 50, 760, { align: 'center', width: 495 })

    doc.end()
    stream.on('finish', () => resolve(filePath))
    stream.on('error', reject)
  })
}

// ─── Upload PDF to Supabase storage ──────────────────────────────────────
async function uploadInvoice(filePath, invoiceNumber) {
  const fileBuffer = fs.readFileSync(filePath)
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(`invoices/${invoiceNumber}.pdf`, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(`invoices/${invoiceNumber}.pdf`)
  return urlData.publicUrl
}

// ─── Build reply message ──────────────────────────────────────────────────
function buildOrderConfirmation(orderData) {
  const items = orderData.items.map(i => `  • ${i.product_name} x${i.quantity} — R${i.line_total.toFixed(2)}`).join('\n')
  const delivInfo = orderData.delivery_type === 'pudo'
    ? `📦 *Pudo Locker* (R70)\n${orderData.pudo_locker || 'See invoice for nearest locker'}`
    : `🚚 *Door Delivery* (R100)\n${orderData.delivery_address || 'Please confirm your address'}`

  return `✅ *Order Confirmed — Dainamic Hair*\n\n` +
    `📋 *${orderData.invoice_number}*\n\n` +
    `*Items:*\n${items}\n\n` +
    `*Subtotal:* R${orderData.subtotal.toFixed(2)}\n` +
    `*Delivery:* R${orderData.delivery_fee.toFixed(2)}\n` +
    `*TOTAL: R${orderData.total.toFixed(2)}*\n\n` +
    `${delivInfo}\n\n` +
    `💳 *Pay via EFT:*\n` +
    `Bank: Nedbank\n` +
    `Acc: 1197787534\n` +
    `Branch: 151405\n` +
    `Ref: *${orderData.invoice_number}*\n\n` +
    `Your PDF invoice has been sent 📄\n` +
    `_Questions? Reply anytime 💛_`
}

// ─── Main handler (called from bot index.js) ──────────────────────────────
async function handleOrderMessage(sock, msg) {
  const jid = msg.key.remoteJid
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

  if (!text || text.length < 5) return false

  // Detect order intent
  const orderKeywords = ['order', 'buy', 'want', 'need', 'get', 'purchase', 'oils', 'butter', 'spray', 'hair']
  const isOrderIntent = orderKeywords.some(kw => text.toLowerCase().includes(kw))
  if (!isOrderIntent) return false

  await sock.sendMessage(jid, { text: '⏳ Processing your order...' })

  try {
    const parsed = await parseOrder(text)
    if (!parsed || !parsed.items?.length) {
      await sock.sendMessage(jid, {
        text: `Hi! 👋 I'd love to help you order. Could you tell me which products you'd like?\n\nReply with something like:\n_"I want 2 hair growth oils and 1 scalp butter, door delivery to Soweto"_`
      })
      return true
    }

    const customerPhone = jid.replace('@s.whatsapp.net', '')
    const orderData = await saveOrder(parsed, customerPhone)
    const pdfPath = await generateInvoicePDF(orderData)
    const invoiceUrl = await uploadInvoice(pdfPath, orderData.invoice_number)

    // Send confirmation text
    const confirmMsg = buildOrderConfirmation(orderData)
    await sock.sendMessage(jid, { text: confirmMsg })

    // Send PDF invoice as document
    const pdfBuffer = fs.readFileSync(pdfPath)
    await sock.sendMessage(jid, {
      document: pdfBuffer,
      mimetype: 'application/pdf',
      fileName: `${orderData.invoice_number}.pdf`,
      caption: `📄 Your Dainamic Hair invoice — ${orderData.invoice_number}`,
    })

    // Pudo lockers if applicable
    if (parsed.delivery_type === 'pudo') {
      const lockerText = `📍 *Nearest Pudo Lockers:*\n\n` +
        PUDO_LOCKERS.map((l, i) => `${i + 1}. *${l.name}*\n   ${l.address}\n   _${l.landmark}_`).join('\n\n')
      await sock.sendMessage(jid, { text: lockerText })
    }

    // Cleanup temp file
    fs.unlinkSync(pdfPath)

    return true
  } catch (err) {
    console.error('[orderHandler] Error:', err)
    await sock.sendMessage(jid, { text: `Sorry, something went wrong 😔 Please try again or message us directly.` })
    return false
  }
}

module.exports = { handleOrderMessage, generateInvoicePDF, parseOrder, PUDO_LOCKERS, BANKING }
