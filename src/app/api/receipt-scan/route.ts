// src/app/api/receipt-scan/route.ts
// Scans receipt image with Gemini Vision, saves to finance_expenses + uploads to receipts bucket

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('receipt') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Convert to base64 for Gemini
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = file.type || 'image/jpeg'

  // 1. Extract data with Gemini Vision
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const prompt = `You are a receipt scanner for a South African small business. 
Extract the following from this receipt image and return ONLY valid JSON, no markdown:
{
  "vendor": "store/vendor name",
  "date": "YYYY-MM-DD (if visible, else today)",
  "amount": numeric total amount in rands (numbers only),
  "category": one of: "Ingredients", "Packaging", "Marketing", "Equipment", "Transport", "Office", "Other",
  "description": "brief 1-line description of what was purchased",
  "payment_method": "Cash", "Card", "EFT", or "Unknown",
  "line_items": [{"name": "item", "amount": 0.00}] (up to 5 key items),
  "confidence": 0.0-1.0
}

If you cannot read the receipt clearly, set confidence below 0.5.`

  let extracted: any = null
  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } }
    ])
    const text = result.response.text().trim()
    extracted = JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch (err) {
    return NextResponse.json({ error: 'Could not read receipt. Please try a clearer photo.' }, { status: 422 })
  }

  // 2. Upload image to Supabase receipts bucket
  const timestamp = Date.now()
  const fileName = `receipts/${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(fileName, Buffer.from(arrayBuffer), {
      contentType: mimeType,
      upsert: false,
    })

  let receiptImageUrl: string | null = null
  if (!uploadError) {
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName)
    receiptImageUrl = urlData.publicUrl
  }

  // 3. Save to finance_expenses
  const { data: expenseRow, error: expenseError } = await supabase
    .from('finance_expenses')
    .insert({
      date: extracted.date || new Date().toISOString().split('T')[0],
      vendor: extracted.vendor || 'Unknown',
      category: extracted.category || 'Other',
      description: extracted.description || 'Receipt scan',
      amount: extracted.amount || 0,
      payment_method: extracted.payment_method || 'Unknown',
      notes: receiptImageUrl ? `Receipt: ${receiptImageUrl}` : 'Scanned receipt',
      receipt_url: receiptImageUrl,
    })
    .select()
    .single()

  if (expenseError) {
    return NextResponse.json({ error: expenseError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    extracted,
    expense: expenseRow,
    receiptImageUrl,
    message: `✅ Receipt scanned! R${extracted.amount} added to expenses.`,
  })
}
