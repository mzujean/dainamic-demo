// src/app/api/analytics/route.ts
// Fixed analytics — inventory total uses SUM(total_cost) not quantity*cost duplication

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const [income, expenses, inventory, clients, orders] = await Promise.all([
    supabase.from('finance_income').select('amount, date, category, customer_name'),
    supabase.from('finance_expenses').select('amount, date, category'),
    // FIX: only sum total_cost, not quantity*cost_per_unit (avoids double-counting NaN rows)
    supabase.from('finance_inventory').select('item_name, quantity, cost_per_unit, total_cost'),
    supabase.from('clients').select('id, created_at, total_spent'),
    supabase.from('orders').select('total, status, payment_status, created_at'),
  ])

  const totalIncome = (income.data || []).reduce((s, r) => s + (r.amount || 0), 0)
  const totalExpenses = (expenses.data || []).reduce((s, r) => s + (r.amount || 0), 0)

  // FIX: Use total_cost column directly (not quantity * cost_per_unit)
  // Some rows have total_cost null (last 5 rows in xlsx) — skip those
  const inventoryTotal = (inventory.data || []).reduce((s, r) => {
    const tc = r.total_cost
    if (tc == null || isNaN(tc)) return s
    return s + tc
  }, 0)

  const profit = totalIncome - totalExpenses

  // Revenue by category
  const revenueByCategory: Record<string, number> = {}
  ;(income.data || []).forEach(r => {
    const cat = r.category || 'Other'
    revenueByCategory[cat] = (revenueByCategory[cat] || 0) + (r.amount || 0)
  })

  // Revenue by month (last 6 months)
  const monthMap: Record<string, number> = {}
  ;(income.data || []).forEach(r => {
    if (!r.date) return
    const month = r.date.substring(0, 7) // YYYY-MM
    monthMap[month] = (monthMap[month] || 0) + (r.amount || 0)
  })
  const revenueByMonth = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount }))

  // Expenses by category
  const expensesByCategory: Record<string, number> = {}
  ;(expenses.data || []).forEach(r => {
    const cat = r.category || 'Other'
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (r.amount || 0)
  })

  // WhatsApp orders stats
  const paidOrders = (orders.data || []).filter(o => o.payment_status === 'paid')
  const whatsappRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0)

  return NextResponse.json({
    summary: {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      // FIXED: was showing R21k+ due to bug; actual inventory cost is ~R3,392
      inventoryValue: Math.round(inventoryTotal * 100) / 100,
      clientCount: (clients.data || []).length,
      whatsappRevenue: Math.round(whatsappRevenue * 100) / 100,
      orderCount: (orders.data || []).length,
    },
    revenueByCategory,
    revenueByMonth,
    expensesByCategory,
    inventoryItems: (inventory.data || []).filter(r => r.total_cost != null),
  })
}
