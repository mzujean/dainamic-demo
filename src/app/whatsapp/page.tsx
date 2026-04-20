'use client'
// src/app/whatsapp/page.tsx
// WhatsApp Orders Dashboard — view orders, parse test messages, update status

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const PAYMENT_COLORS: Record<string, string> = {
  awaiting: 'bg-orange-100 text-orange-800',
  paid: 'bg-emerald-100 text-emerald-800',
  refunded: 'bg-gray-100 text-gray-600',
}

export default function WhatsAppPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [testMsg, setTestMsg] = useState('')
  const [parsed, setParsed] = useState<any>(null)
  const [parsing, setParsing] = useState(false)
  const [activeTab, setActiveTab] = useState<'orders' | 'test' | 'setup'>('orders')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    setLoading(true)
    const res = await fetch('/api/agents/whatsapp')
    const data = await res.json()
    setOrders(data.orders || [])
    setLoading(false)
  }

  async function parseTestMessage() {
    if (!testMsg.trim()) return
    setParsing(true)
    setParsed(null)
    const res = await fetch('/api/agents/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'parse_order', message: testMsg }),
    })
    const data = await res.json()
    setParsed(data)
    setParsing(false)
  }

  async function updateStatus(orderId: string, status: string, paymentStatus?: string) {
    setUpdatingId(orderId)
    await fetch('/api/agents/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_order_status', orderId, status, paymentStatus }),
    })
    await fetchOrders()
    setUpdatingId(null)
  }

  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total || 0), 0)
  const pendingPayment = orders.filter(o => o.payment_status === 'awaiting').reduce((s, o) => s + (o.total || 0), 0)

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">WhatsApp Orders</h1>
          <p className="text-gray-400 text-sm mt-1">Orders received via WhatsApp bot</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Orders', value: orders.length, color: 'text-white' },
            { label: 'Paid Revenue', value: `R${totalRevenue.toFixed(0)}`, color: 'text-emerald-400' },
            { label: 'Awaiting Payment', value: `R${pendingPayment.toFixed(0)}`, color: 'text-amber-400' },
            { label: 'Pending Orders', value: orders.filter(o => o.status === 'pending').length, color: 'text-orange-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 border-b border-white/10 pb-2">
          {(['orders', 'test', 'setup'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>
              {tab === 'test' ? '🧪 Test Parser' : tab === 'setup' ? '⚙️ Setup' : '📦 Orders'}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {loading && <p className="text-gray-500 text-sm">Loading orders...</p>}
            {!loading && orders.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">📭</p>
                <p>No orders yet. Once your WhatsApp bot is running, orders will appear here.</p>
              </div>
            )}
            {orders.map(order => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{order.customer_name}</span>
                      <span className="text-xs text-gray-500">{order.invoice_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-700 text-gray-300'}`}>
                        {order.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_COLORS[order.payment_status] || 'bg-gray-700 text-gray-300'}`}>
                        {order.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {order.customer_phone} · {order.delivery_type === 'pudo' ? 'Pudo R70' : 'Door R100'} · {new Date(order.created_at).toLocaleDateString('en-ZA')}
                    </p>
                    {/* Items */}
                    <div className="mt-2 space-y-0.5">
                      {(order.items || []).map((item: any, i: number) => (
                        <p key={i} className="text-xs text-gray-400">
                          {item.product_name} × {item.quantity} — R{item.line_total?.toFixed(2)}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-400">R{(order.total || 0).toFixed(2)}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap justify-end">
                      {order.payment_status !== 'paid' && (
                        <button onClick={() => updateStatus(order.id, 'confirmed', 'paid')}
                          disabled={updatingId === order.id}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-50">
                          ✅ Mark Paid
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button onClick={() => updateStatus(order.id, 'shipped')}
                          disabled={updatingId === order.id}
                          className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-50">
                          🚚 Shipped
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button onClick={() => updateStatus(order.id, 'delivered')}
                          disabled={updatingId === order.id}
                          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-50">
                          📬 Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Test Parser Tab */}
        {activeTab === 'test' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h2 className="font-semibold mb-3 text-white">Test Order Parser</h2>
              <p className="text-xs text-gray-400 mb-3">Paste a WhatsApp message to see how the bot would parse it into an order.</p>
              <textarea
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                placeholder={"Hi, I want 2 hair growth oils and 1 scalp butter please. Deliver to 14 Oak Street, Soweto. My name is Thandi."}
                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 resize-none h-28 focus:outline-none focus:border-amber-500"
              />
              <button onClick={parseTestMessage} disabled={parsing || !testMsg.trim()}
                className="mt-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                {parsing ? 'Parsing...' : '🔍 Parse Order'}
              </button>
            </div>

            {parsed && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold mb-3 text-emerald-400">✅ Parsed Result</h3>
                {parsed.order ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Customer:</span> <span className="text-white">{parsed.order.customer_name || '—'}</span></div>
                      <div><span className="text-gray-500">Delivery:</span> <span className="text-white">{parsed.order.delivery_type === 'pudo' ? 'Pudo (R70)' : 'Door (R100)'}</span></div>
                      <div><span className="text-gray-500">Confidence:</span> <span className={parsed.order.confidence > 0.7 ? 'text-emerald-400' : 'text-amber-400'}>{Math.round((parsed.order.confidence || 0) * 100)}%</span></div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Items:</p>
                      {(parsed.order.items || []).map((item: any, i: number) => (
                        <p key={i} className="text-sm text-white">{item.product_name} × {item.quantity} — R{item.line_total}</p>
                      ))}
                    </div>
                    {parsed.order.notes && <p className="text-xs text-gray-400">Notes: {parsed.order.notes}</p>}
                  </div>
                ) : (
                  <p className="text-red-400 text-sm">{parsed.error || 'Could not parse order'}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h2 className="font-semibold mb-4 text-white">⚙️ WhatsApp Bot Setup</h2>
              <div className="space-y-4 text-sm">
                <div className="border-l-2 border-amber-500 pl-4">
                  <p className="font-medium text-white mb-1">Step 1 — Install bot dependencies</p>
                  <code className="block bg-black/40 rounded p-2 text-amber-300 text-xs mt-1">
                    cd whatsapp-bot && npm install
                  </code>
                </div>
                <div className="border-l-2 border-amber-500 pl-4">
                  <p className="font-medium text-white mb-1">Step 2 — Add env vars to whatsapp-bot/.env</p>
                  <code className="block bg-black/40 rounded p-2 text-amber-300 text-xs mt-1 whitespace-pre">{`NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...`}</code>
                </div>
                <div className="border-l-2 border-amber-500 pl-4">
                  <p className="font-medium text-white mb-1">Step 3 — Start the bot & scan QR</p>
                  <code className="block bg-black/40 rounded p-2 text-amber-300 text-xs mt-1">
                    node whatsapp-bot/index.js
                  </code>
                  <p className="text-gray-400 text-xs mt-1">Scan the QR code once with your WhatsApp. Session is saved — won't need to scan again.</p>
                </div>
                <div className="border-l-2 border-amber-500 pl-4">
                  <p className="font-medium text-white mb-1">Step 4 — Create receipts bucket in Supabase</p>
                  <p className="text-gray-400 text-xs">Go to Supabase Storage → New bucket → name it <strong>receipts</strong> → set to Public</p>
                </div>
                <div className="border-l-2 border-green-500 pl-4 bg-green-900/10 rounded-r-lg py-2 pr-2">
                  <p className="font-medium text-green-400 mb-1">✅ Banking Details (used in invoices)</p>
                  <p className="text-gray-300 text-xs">Nedbank · Dai-Jean Mzumara · Acc: 1197787534 · Branch: 151405 · Cheque</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-medium text-white mb-3">📍 Nearest Pudo Lockers (sent to customers)</h3>
              <div className="space-y-3">
                {[
                  { name: 'Pick n Pay Greenstone', address: 'Greenstone Shopping Centre, Edenvale', landmark: 'Next to Pick n Pay entrance' },
                  { name: 'Checkers Eastgate', address: 'Eastgate Mall, Bedfordview', landmark: 'Near Checkers, food court entrance' },
                  { name: 'Spar Meadowdale', address: 'Meadowdale Mall, Germiston', landmark: 'Inside Spar — yellow Pudo kiosk' },
                ].map((l, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-amber-400 font-bold text-sm min-w-4">{i + 1}.</span>
                    <div>
                      <p className="text-sm font-medium text-white">{l.name}</p>
                      <p className="text-xs text-gray-400">{l.address}</p>
                      <p className="text-xs text-gray-500 italic">{l.landmark}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Update these in <code>whatsapp-bot/orderHandler.js</code> → PUDO_LOCKERS array.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
