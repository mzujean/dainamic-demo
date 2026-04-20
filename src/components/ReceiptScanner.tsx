'use client'
// src/components/ReceiptScanner.tsx
// Drag-and-drop receipt scanner — Gemini Vision extracts, shows preview, saves to expenses

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ExtractedData {
  vendor: string
  date: string
  amount: number
  category: string
  description: string
  payment_method: string
  line_items: { name: string; amount: number }[]
  confidence: number
}

export default function ReceiptScanner({ onSaved }: { onSaved?: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{ extracted: ExtractedData; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
    setError(null)
    setSaved(false)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) handleFile(f)
  }

  async function scanReceipt() {
    if (!file) return
    setScanning(true)
    setError(null)
    setResult(null)

    const form = new FormData()
    form.append('receipt', file)

    try {
      const res = await fetch('/api/receipt-scan', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setResult(data)
      setSaved(true)
      onSaved?.()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setScanning(false)
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setSaved(false)
  }

  const confidenceColor = (c: number) =>
    c >= 0.8 ? 'text-emerald-400' : c >= 0.5 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🧾</span>
        <h3 className="font-semibold text-white">Scan Receipt</h3>
        <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">Gemini Vision</span>
      </div>

      {/* Drop Zone */}
      {!preview && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragging ? 'border-amber-500 bg-amber-500/10' : 'border-white/20 hover:border-white/40'
          }`}
        >
          <p className="text-3xl mb-2">📷</p>
          <p className="text-sm text-gray-300">Tap to take photo or upload receipt</p>
          <p className="text-xs text-gray-500 mt-1">or drag & drop here</p>
          <input ref={inputRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        </div>
      )}

      {/* Preview + Scan */}
      {preview && !result && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden max-h-48">
            <img src={preview} alt="Receipt" className="w-full h-48 object-cover" />
          </div>
          <div className="flex gap-2">
            <button onClick={scanReceipt} disabled={scanning}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
              {scanning ? '🔍 Scanning...' : '🔍 Scan Receipt'}
            </button>
            <button onClick={reset}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors">
              ✕
            </button>
          </div>
          {scanning && (
            <p className="text-xs text-gray-400 text-center animate-pulse">Gemini is reading your receipt...</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 mt-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={reset} className="text-xs text-gray-400 mt-2 underline">Try again</button>
        </div>
      )}

      {/* Result */}
      {result && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-3">
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3">
              <p className="text-emerald-400 text-sm font-medium">✅ {result.message}</p>
            </div>

            <div className="bg-black/30 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-white">{result.extracted.vendor}</p>
                  <p className="text-xs text-gray-400">{result.extracted.date} · {result.extracted.payment_method}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-amber-400">R{result.extracted.amount?.toFixed(2)}</p>
                  <p className={`text-xs ${confidenceColor(result.extracted.confidence)}`}>
                    {Math.round(result.extracted.confidence * 100)}% confident
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-300">{result.extracted.description}</p>
              <span className="inline-block text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                {result.extracted.category}
              </span>

              {result.extracted.line_items?.length > 0 && (
                <div className="mt-2 border-t border-white/10 pt-2">
                  <p className="text-xs text-gray-500 mb-1">Items detected:</p>
                  {result.extracted.line_items.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-400">
                      <span>{item.name}</span>
                      <span>R{item.amount?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={reset}
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors">
              📷 Scan Another Receipt
            </button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
