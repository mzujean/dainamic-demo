// src/app/api/agents/whatsapp/route.ts
// WhatsApp agent API — parse order, generate invoice URL, save to orders table

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const BANKING = {
  bank: 'Nedbank',
  accountHolder: 'Dai-Jean Mzumara',
  accountNumber: '1197787534',
  branchCode: '151405',
  accountType: 'Cheque',
}

const PUDO_LOCKERS = [
  { name: 'Pick n Pay Greenstone', address: 'Greenstone Shopping Centre, Edenvale', landmark: 'Next to Pick n Pay entrance, Greenstone Mall' },
  { name: 'Checkers Eastgate', address: 'Eastgate Mall, Bedfordview', landmark: 'Near Checkers, Eastgate Shopping Centre food court entrance' },
  { name: 'Spar Meadowdale', address: 'Meadowdale Mall, Germiston', landmark: 'Inside Spar, Meadowdale Mall — look for the yellow Pudo kiosk' },
]

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, ...data } = body

  if (action === 'parse_order') {
    return await handleParseOrder(data)
  }
  if (action === 'save_order') {
    return await handleSaveOrder(data)
  }
  if (action === 'get_orders') {
    return await handleGetOrders(data)
  }
  if (action === 'update_order_status') {
    return await handleUpdateStatus(data)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

async function handleParseOrder({ message }: { message: string }) {
  const { data: products } = await supabase.from('products').select('name, price, description').eq('active', true)
  const productList = (products || []).map((p: any) => `${p.name} — R${p.price}`).join('\n')

  const prompt = `You are an order parser for Dainamic Hair (South Africa). Parse this WhatsApp message into a JSON order.

Products available:
${productList || 'Hair Growth Oil — R120\nScalp Butter — R95\nHair Mist — R85'}

Message: "${message}"

Return ONLY valid JSON:
{
  "customer_name": "name or null",
  "items": [{"product_name":"...","quantity":1,"unit_price":120,"line_total":120}],
  "delivery_type": "door" or "pudo",
  "delivery_address": "address or null",
  "pudo_locker": "locker name or null",
  "notes": "any extras or empty string",
  "confidence": 0.0-1.0
}`

  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 600,
  })

  const text = res.choices[0].message.content?.trim() || '{}'
  try {
    const parsed = JSON.parse(text)
    return NextResponse.json({ success: true, order: parsed, lockers: PUDO_LOCKERS, banking: BANKING })
  } catch {
    return NextResponse.json({ success: false, error: 'Could not parse order from message' })
  }
}

async function handleSaveOrder({ order, customer_phone }: any) {
  const subtotal = (order.items || []).reduce((s: number, i: any) => s + (i.line_total || 0), 0)
  const deliveryFee = order.delivery_type === 'pudo' ? 70 : 100
  const total = subtotal + deliveryFee
  const invoiceNumber = `INV-${Date.now()}`

  const { data, error } = await supabase.from('orders').insert({
    invoice_number: invoiceNumber,
    customer_name: order.customer_name || 'WhatsApp Customer',
    customer_phone: customer_phone || null,
    items: order.items || [],
    subtotal,
    delivery_type: order.delivery_type || 'door',
    delivery_fee: deliveryFee,
    delivery_address: order.delivery_address || null,
    pudo_locker: order.pudo_locker || null,
    total,
    status: 'pending',
    payment_status: 'awaiting',
    notes: order.notes || null,
    source: 'whatsapp',
  }).select().single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  // Log to income once payment confirmed (not yet — just order placed)
  return NextResponse.json({ success: true, order: data, invoiceNumber, subtotal, deliveryFee, total, banking: BANKING })
}

async function handleGetOrders({ status, limit = 20 }: any) {
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(limit)
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, orders: data })
}

async function handleUpdateStatus({ orderId, status, paymentStatus }: any) {
  const updates: any = { status }
  if (paymentStatus) updates.payment_status = paymentStatus
  const { error } = await supabase.from('orders').update(updates).eq('id', orderId)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  // If marked paid, also add to finance_income
  if (paymentStatus === 'paid') {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
    if (order) {
      await supabase.from('finance_income').insert({
        date: new Date().toISOString().split('T')[0],
        customer_name: order.customer_name,
        category: 'Product Sale',
        description: `Order ${order.invoice_number} — WhatsApp`,
        amount: order.total,
        payment_method: 'EFT',
        notes: `Auto-logged from WhatsApp order ${order.invoice_number}`,
      })
    }
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50)
  return NextResponse.json({ orders: data || [] })
}
