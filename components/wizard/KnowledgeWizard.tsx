'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { KnowledgeGap } from '@/types/agent-os'

interface KnowledgeWizardProps {
  gaps: KnowledgeGap[]
  onAnswer: (gapKey: string, answer: string) => Promise<void>
  onDismiss?: () => void
}

const GAP_UI_CONFIG: Record<string, {
  inputType: 'text' | 'number' | 'select'
  options?: string[]
  placeholder?: string
  emoji?: string
}> = {
  'owner.name':                   { inputType: 'text',   placeholder: 'e.g. Thandi',                emoji: '👤' },
  'owner.working_hours':          { inputType: 'text',   placeholder: 'e.g. 9am-6pm weekdays',      emoji: '🕘' },
  'client.followup_days':         { inputType: 'select', options: ['7 days', '14 days', '21 days', '30 days', 'Other'], emoji: '📅' },
  'client.followup_tone':         { inputType: 'select', options: ['Casual & warm', 'Professional', 'Friendly formal', 'Other'], emoji: '💬' },
  'inventory.approval_threshold': { inputType: 'select', options: ['R200', 'R500', 'R1000', 'R2000', 'Always ask me', 'Other'], emoji: '💰' },
  'content.post_frequency':       { inputType: 'select', options: ['1x per day', '2x per day', '3x per day', 'A few times a week', 'Other'], emoji: '📲' },
  'content.primary_platform':     { inputType: 'select', options: ['Facebook', 'Instagram', 'TikTok', 'Facebook + Instagram', 'Other'], emoji: '📱' },
  'finance.weekly_summary_day':   { inputType: 'select', options: ['Monday', 'Friday', 'Sunday', 'Other'], emoji: '📊' },
}

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: 'Getting started',
  clients:    'Client management',
  inventory:  'Stock & inventory',
  content:    'Content & social',
  finance:    'Finance',
}

export default function KnowledgeWizard({ gaps, onAnswer, onDismiss }: KnowledgeWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [isOther, setIsOther] = useState(false)
  const [otherValue, setOtherValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const currentGap = gaps[currentIndex]
  const isLast = currentIndex === gaps.length - 1
  const progress = ((currentIndex) / gaps.length) * 100

  useEffect(() => {
    if (gaps.length > 0) {
      setIsVisible(true)
      setInputValue('')
      setIsOther(false)
      setOtherValue('')
    }
  }, [gaps, currentIndex])

  if (!currentGap || gaps.length === 0) return null

  const uiConfig = GAP_UI_CONFIG[currentGap.gap_key] ?? {
    inputType: 'text',
    placeholder: 'Type your answer...',
    emoji: '💡',
  }

  const category = (currentGap.context?.category as string) ?? 'general'
  const finalValue = isOther ? otherValue : inputValue

  async function handleSubmit() {
    if (!finalValue.trim()) return
    setIsSubmitting(true)

    try {
      await onAnswer(currentGap.gap_key, finalValue.trim())

      if (isLast) {
        setIsVisible(false)
        setTimeout(() => onDismiss?.(), 300)
      } else {
        setCurrentIndex((i) => i + 1)
        setInputValue('')
        setIsOther(false)
        setOtherValue('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOptionClick(option: string) {
    if (option === 'Other') {
      setIsOther(true)
      setInputValue('Other')
    } else {
      setIsOther(false)
      setInputValue(option)
      setOtherValue('')
    }
  }

  function handleSkip() {
    if (isLast) {
      setIsVisible(false)
      setTimeout(() => onDismiss?.(), 300)
    } else {
      setCurrentIndex((i) => i + 1)
      setInputValue('')
      setIsOther(false)
      setOtherValue('')
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg"
          >
            <div className="bg-[#1a1a2e] border border-[#ffffff15] rounded-t-3xl p-6 pb-10 shadow-2xl">

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#ffffff50] uppercase tracking-widest">
                    {CATEGORY_LABELS[category] ?? 'Quick question'}
                  </span>
                  <span className="text-xs text-[#ffffff50]">
                    {currentIndex + 1} of {gaps.length}
                  </span>
                </div>
                <div className="h-1 bg-[#ffffff15] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                    initial={{ width: `${progress}%` }}
                    animate={{ width: `${((currentIndex + 1) / gaps.length) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentGap.gap_key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start gap-3 mb-6">
                    <span className="text-3xl">{uiConfig.emoji}</span>
                    <h2 className="text-white text-lg font-medium leading-snug">
                      {currentGap.question}
                    </h2>
                  </div>

                  {uiConfig.inputType === 'select' && uiConfig.options ? (
                    <div className="mb-6">
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {uiConfig.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => handleOptionClick(option)}
                            className={`
                              px-4 py-3 rounded-xl text-sm font-medium transition-all
                              ${(option === 'Other' ? isOther : inputValue === option && !isOther)
                                ? 'bg-violet-600 text-white border border-violet-400'
                                : 'bg-[#ffffff0a] text-[#ffffffcc] border border-[#ffffff15] hover:border-[#ffffff30]'
                              }
                            `}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      {isOther && (
                        <motion.input
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          type="text"
                          value={otherValue}
                          onChange={(e) => setOtherValue(e.target.value)}
                          placeholder="Type your answer..."
                          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                          autoFocus
                          className="
                            w-full bg-[#ffffff0a] border border-violet-500 rounded-xl
                            px-4 py-3 text-white placeholder-[#ffffff40] text-sm
                            focus:outline-none focus:ring-1 focus:ring-violet-500
                          "
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={uiConfig.placeholder ?? 'Your answer...'}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      autoFocus
                      className="
                        w-full bg-[#ffffff0a] border border-[#ffffff20] rounded-xl
                        px-4 py-3 text-white placeholder-[#ffffff40] text-sm
                        focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500
                        mb-6
                      "
                    />
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSkip}
                      className="flex-1 py-3 rounded-xl text-sm text-[#ffffff60] border border-[#ffffff15] hover:border-[#ffffff30] transition-colors"
                    >
                      Skip for now
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!finalValue.trim() || isSubmitting}
                      className="
                        flex-2 flex-grow-[2] py-3 rounded-xl text-sm font-semibold
                        bg-gradient-to-r from-violet-600 to-pink-600 text-white
                        disabled:opacity-40 disabled:cursor-not-allowed
                        hover:from-violet-500 hover:to-pink-500 transition-all
                      "
                    >
                      {isSubmitting ? 'Saving...' : isLast ? 'Done' : 'Next'}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
