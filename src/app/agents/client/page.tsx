'use client'

import { useState } from 'react'

const SCENARIOS = [
  { value: 'followup_7day', label: '7-day check-in (no purchase yet)' },
  { value: 'followup_payment', label: 'Gentle payment follow-up' },
  { value: 'reorder_prompt', label: 'Reorder nudge (past buyer)' },
  { value: 'results_celebrate', label: 'Customer shares results' },
  { value: 'doubt_objection', label: 'Customer doubts the product' },
  { value: 'delivery_update', label: 'Delivery dispatch update' },
  { value: 'new_product', label: 'New product announcement' },
  { value: 'custom', label: 'Custom — describe below' },
]

const TONE_TRAITS = [
  { label: 'Greeting', value: 'Time of day + "dear" / "mama" / "ma\'am". New leads get Hello👋' },
  { label: 'Approach', value: 'Educates before selling — asks about hair type, porosity, breakage first' },
  { label: 'When doubted', value: 'Calm, validates concern, references Facebook videos, never defensive' },
  { label: 'Late payments', value: '"No worries" — patient, trusts the customer, follows up gently after 7 days' },
  { label: 'Good news', value: 'Genuine excitement — "Whooop whooopp", 💃🏾 emojis, hearts ❤️' },
  { label: 'Problems', value: 'Owns them immediately — "My sincerest apologies", no excuses' },
  { label: 'Pricing', value: 'Transparent totals, spontaneous discounts on big orders' },
  { label: 'Sign-off', value: '🙏🏾 or "thank you for trusting me with your hair"' },
]

export default function ClientAgentPage() {
  const [scenario, setScenario] = useState('followup_7day')
  const [customerName, setCustomerName] = useState('')
  const [context, setContext] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'generate' | 'profile'>('generate')

  async function generate() {
    if (!customerName.trim()) {
      setError('Please enter a customer name')
      return
    }
    setLoading(true)
    setError('')
    setOutput('')
    setCopied(false)

    try {
      const res = await fetch('/api/agents/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, customerName: customerName.trim(), context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setOutput(data.message)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Client Agent</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Generates WhatsApp messages in your tone — learned from real conversations
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(['generate', 'profile'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-800 border border-b-white dark:border-gray-700 dark:border-b-gray-800 text-gray-900 dark:text-white -mb-px'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'generate' ? 'Generate message' : 'Tone profile'}
          </button>
        ))}
      </div>

      {activeTab === 'generate' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Scenario
              </label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                {SCENARIOS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Customer name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Theophoras"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Extra context <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              placeholder="e.g. She ordered 6 sprays and oils last time, delivery was via Bolt, she mentioned wanting a conditioner"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={generate}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Generating…' : 'Generate message'}
          </button>

          {output && (
            <div className="relative">
              <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {output}
                </pre>
              </div>
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 text-xs px-2.5 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            Learned from real WhatsApp conversations — this is the voice the agent mirrors.
          </p>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {TONE_TRAITS.map((trait) => (
              <div key={trait.label} className="flex gap-4 px-4 py-3 bg-white dark:bg-gray-800">
                <span className="text-xs font-medium text-gray-500 w-28 shrink-0 pt-0.5">
                  {trait.label}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {trait.value}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Style tags</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Warm but professional','Educate before selling','Short message bursts',
                'No pressure on payments','7-day follow-up window','Celebrate results visibly',
                'Own problems quickly',"dear / mama / ma'am",'Refer to Facebook videos',
                'Transparent pricing','Ends with 🙏🏾'
              ].map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}