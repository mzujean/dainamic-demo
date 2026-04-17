import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const REORDER_THRESHOLD = 3

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { approved_items } = body

    if (approved_items && Array.isArray(approved_items)) {
      await supabase.from('agent_memory').insert({
        agent_type: 'inventory',
        insight: `Owner approved reorder for ${approved_items.length} item(s): ${approved_items.join(', ')}`,
        context: {
          approved_at: new Date().toISOString(),
          items: approved_items
        },
        tags: ['reorder', 'approved']
      })
      return NextResponse.json({ success: true, action: 'approval_logged', items: approved_items })
    }

    const { data: inventory, error } = await supabase
      .from('finance_inventory')
      .select('*')
      .order('item_name')

    if (error) throw error

    const latestByItem = new Map<string, any>()
    for (const item of inventory || []) {
      const key = item.item_name?.toLowerCase().trim()
      if (!key || key === 'delivery of items above') continue
      const existing = latestByItem.get(key)
      if (!existing || new Date(item.date) >= new Date(existing.date)) {
        latestByItem.set(key, item)
      }
    }

    const uniqueItems = Array.from(latestByItem.values())
    const lowStock = uniqueItems.filter(i => (i.quantity ?? 0) <= REORDER_THRESHOLD)
    const outOfStock = uniqueItems.filter(i => (i.quantity ?? 0) === 0)

    const lowStockMapped = lowStock.map(i => ({
      id: i.id,
      item_name: i.item_name,
      quantity: i.quantity,
      supplier: i.supplier || 'Unknown',
      cost_per_unit: i.cost_per_unit || 0,
      status: i.quantity === 0 ? 'out' : i.quantity <= 1 ? 'critical' : 'low'
    }))

    await supabase.from('agent_memory').insert({
      agent_type: 'inventory',
      insight: lowStock.length > 0
        ? `${lowStock.length} item(s) below reorder threshold. Out of stock: ${outOfStock.map(i => i.item_name).join(', ') || 'none'}`
        : `All ${uniqueItems.length} inventory items are sufficiently stocked.`,
      context: {
        scanned_at: new Date().toISOString(),
        total_items: uniqueItems.length,
        low_stock_count: lowStock.length,
        low_stock: lowStockMapped
      },
      tags: ['scan', lowStock.length > 0 ? 'alert' : 'ok']
    })

    return NextResponse.json({
      success: true,
      total_items: uniqueItems.length,
      low_stock: lowStockMapped,
      scanned_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Inventory agent error:', error)
    return NextResponse.json({ error: 'Inventory scan failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('agent_type', 'inventory')
      .contains('tags', ['scan'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (!data || data.length === 0) {
      return NextResponse.json({ last_scan: null })
    }

    return NextResponse.json({
      last_scan: data[0].context,
      scanned_at: data[0].created_at
    })
  } catch (error) {
    return NextResponse.json({ error: 'Could not fetch last scan' }, { status: 500 })
  }
}
