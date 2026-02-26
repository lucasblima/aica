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
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { useUserBirthdate } from '@/hooks/useUserBirthdate'
import { LifeWeeksStrip } from '@/modules/journey/components/ceramic/LifeWeeksStrip'

const LIFE_EXPECTANCY_YEARS = 73.1
const TOTAL_WEEKS = Math.ceil(LIFE_EXPECTANCY_YEARS * 52.1429)

interface MementoMoriBarProps {
  onSetBirthdate?: () => void
}

export function MementoMoriBar({ onSetBirthdate }: MementoMoriBarProps) {
  const { birthdate, isLoading } = useUserBirthdate()
  const [isExpanded, setIsExpanded] = useState(false)

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

  // Fallback: no birthdate
  if (!birthdate || !lifeData) {
    return (
      <div
        className="ceramic-card p-3 cursor-pointer hover:bg-white/30 transition-colors"
        onClick={onSetBirthdate}
      >
        <div className="flex items-center gap-2 text-ceramic-text-secondary">
          <Calendar className="w-4 h-4" />
          <p className="text-xs">
            Defina sua data de nascimento para ver sua linha do tempo
          </p>
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
