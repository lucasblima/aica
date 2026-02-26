/**
 * MementoMoriBar — Compact life progress bar with expandable year view
 *
 * Layer 1 (always visible): Progress bar showing % of life lived + "Semana X de Y"
 * Layer 2 (expanded): 52-dot year view via LifeWeeksStrip + upcoming context
 *
 * Fallback: prompts user to set birthdate if not available.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Calendar, CheckCircle2 } from 'lucide-react'
import { useUserBirthdate } from '@/hooks/useUserBirthdate'
import { updateUserProfile } from '@/services/supabaseService'
import { useAuth } from '@/hooks/useAuth'
import { LifeWeeksStrip } from '@/modules/journey/components/ceramic/LifeWeeksStrip'

const LIFE_EXPECTANCY_YEARS = 73.1
const TOTAL_WEEKS = Math.ceil(LIFE_EXPECTANCY_YEARS * 52.1429)

interface MementoMoriBarProps {
  onSetBirthdate?: () => void
}

export function MementoMoriBar({ onSetBirthdate }: MementoMoriBarProps) {
  const { user } = useAuth()
  const { birthdate, isLoading } = useUserBirthdate()
  const [isExpanded, setIsExpanded] = useState(false)
  const [dateInput, setDateInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const lifeData = useMemo(() => {
    if (!birthdate) return null

    const parts = birthdate.split('-')
    if (parts.length !== 3) return null

    const year = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const day = parseInt(parts[2])
    const birth = new Date(year, month, day)
    const now = new Date()

    const diffMs = now.getTime() - birth.getTime()
    const currentWeek = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))
    const ageYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))
    const percentLived = Math.min(Math.round((currentWeek / TOTAL_WEEKS) * 100), 100)
    const remainingWeeks = Math.max(0, TOTAL_WEEKS - currentWeek)

    return {
      birthDate: birth,
      currentWeek: Math.max(0, currentWeek),
      ageYears,
      percentLived,
      remainingWeeks,
    }
  }, [birthdate])

  if (isLoading) {
    return (
      <div className="ceramic-card p-3 animate-pulse">
        <div className="h-3 bg-ceramic-text-secondary/10 rounded-full w-full" />
      </div>
    )
  }

  const handleSaveBirthdate = async () => {
    if (!dateInput || !user?.id || isSaving) return
    setIsSaving(true)
    try {
      await updateUserProfile(user.id, { birth_date: dateInput })
      setSaved(true)
      // Reload page after short delay to show updated bar
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      // Fallback to profile drawer if inline save fails
      onSetBirthdate?.()
    } finally {
      setIsSaving(false)
    }
  }

  // Fallback: no birthdate — inline date picker
  if (!birthdate || !lifeData) {
    if (saved) {
      return (
        <div className="ceramic-card p-3">
          <div className="flex items-center gap-2 text-ceramic-success">
            <CheckCircle2 className="w-4 h-4" />
            <p className="text-xs font-medium">Data salva! Carregando linha do tempo...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="ceramic-card p-3">
        <div className="flex items-center gap-2 mb-2 text-ceramic-text-secondary">
          <Calendar className="w-4 h-4" />
          <p className="text-xs">Quando voce nasceu?</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            min="1920-01-01"
            className="flex-1 bg-ceramic-cool rounded-xl px-3 py-2 text-sm text-ceramic-text-primary outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <button
            onClick={handleSaveBirthdate}
            disabled={!dateInput || isSaving}
            className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-medium disabled:opacity-40 hover:bg-amber-600 transition-colors"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    )
  }

  const formatter = new Intl.NumberFormat('pt-BR')

  return (
    <div className="ceramic-card overflow-hidden">
      {/* Layer 1 — Compact bar (always visible) */}
      <div
        className="p-3 cursor-pointer hover:bg-white/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-ceramic-text-secondary">
              Semana {formatter.format(lifeData.currentWeek)} de {formatter.format(TOTAL_WEEKS)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-ceramic-text-primary">
              {lifeData.percentLived}%
            </span>
            <span className="text-[10px] text-ceramic-text-secondary">
              {lifeData.ageYears} anos
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-ceramic-text-secondary" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-ceramic-text-secondary" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="ceramic-life-track h-2 rounded-full">
          <motion.div
            className="ceramic-life-fill h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${lifeData.percentLived}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />
        </div>
      </div>

      {/* Layer 2 — Expanded year view */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-ceramic-border/50 overflow-hidden"
          >
            <div className="p-3">
              <p className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mb-2">
                {new Date().getFullYear()} — Semanas do ano
              </p>

              <LifeWeeksStrip
                birthDate={lifeData.birthDate}
                expectedLifespan={LIFE_EXPECTANCY_YEARS}
              />

              <div className="mt-3 flex items-center gap-4 text-[10px] text-ceramic-text-secondary">
                <span>{formatter.format(lifeData.remainingWeeks)} semanas restantes</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
