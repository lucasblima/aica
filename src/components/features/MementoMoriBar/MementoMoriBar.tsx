/**
 * MementoMoriBar — Compact life progress bar with expandable year view
 *
 * Layer 1 (always visible): Life-weeks dot visualization + "Semana X de Y"
 * Layer 2 (expanded): 52-dot year view via LifeWeeksStrip + upcoming context
 *
 * Fallback: prompts user to set birthdate if not available.
 *
 * Max human lifespan used (not life expectancy):
 *   Female: 122y (Jeanne Calment)
 *   Male: 116y (Jiroemon Kimura)
 *   Default/unknown: 119y
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Calendar, CheckCircle2 } from 'lucide-react'
import { useUserBirthdate } from '@/hooks/useUserBirthdate'
import { updateUserProfile } from '@/services/supabaseService'
import { useAuth } from '@/hooks/useAuth'
import { LifeWeeksStrip } from '@/modules/journey/components/ceramic/LifeWeeksStrip'

// Max recorded human lifespan by gender (not life expectancy)
const MAX_LIFESPAN: Record<string, number> = {
  female: 122,
  feminino: 122,
  f: 122,
  male: 116,
  masculino: 116,
  m: 116,
}
const DEFAULT_MAX_LIFESPAN = 119

function getMaxLifespan(gender: string | null): number {
  if (!gender) return DEFAULT_MAX_LIFESPAN
  return MAX_LIFESPAN[gender.toLowerCase()] ?? DEFAULT_MAX_LIFESPAN
}

interface MementoMoriBarProps {
  onSetBirthdate?: () => void
}

// Validate and parse DD/MM/YYYY input → YYYY-MM-DD for DB
function parseBRDate(input: string): string | null {
  const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1920 || y > new Date().getFullYear()) return null
  // Basic day-in-month validation
  const testDate = new Date(y, m - 1, d)
  if (testDate.getMonth() !== m - 1) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Format text input as DD/MM/AAAA while typing
function formatDateInput(raw: string): string {
  // Remove non-digits
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// Compact life-weeks dot visualization for the entire lifespan
function LifeDotsVisualization({
  currentWeekTotal,
  totalWeeks,
}: {
  currentWeekTotal: number
  totalWeeks: number
}) {
  // We show years as groups of dots. Each year = 1 thin line of ~4px width.
  // Too many dots to show individually — group by year instead for compactness.
  const totalYears = Math.ceil(totalWeeks / 52)
  const yearsLived = Math.floor(currentWeekTotal / 52)
  const currentYearFraction = (currentWeekTotal % 52) / 52

  return (
    <div className="flex items-end gap-[2px] w-full flex-wrap">
      {Array.from({ length: totalYears }, (_, i) => {
        const isPast = i < yearsLived
        const isCurrent = i === yearsLived

        if (isCurrent) {
          return (
            <div
              key={i}
              className="relative flex-shrink-0"
              style={{ width: 4, height: 10 }}
              title={`Ano ${i + 1} (atual)`}
            >
              {/* Background (future portion) */}
              <div
                className="absolute inset-0 rounded-sm"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #A39E91',
                }}
              />
              {/* Lived portion overlay */}
              <div
                className="absolute bottom-0 left-0 right-0 rounded-sm"
                style={{
                  backgroundColor: '#D97706',
                  height: `${currentYearFraction * 100}%`,
                  boxShadow: '0 0 4px rgba(217,119,6,0.6)',
                }}
              />
            </div>
          )
        }

        return (
          <div
            key={i}
            className="flex-shrink-0 rounded-sm"
            style={{
              width: 4,
              height: 10,
              backgroundColor: isPast ? '#5C554B' : 'transparent',
              border: isPast ? 'none' : '1px solid #A39E91',
              opacity: isPast ? 0.7 : 0.4,
            }}
            title={`Ano ${i + 1}`}
          />
        )
      })}
    </div>
  )
}

export function MementoMoriBar({ onSetBirthdate }: MementoMoriBarProps) {
  const { user } = useAuth()
  const { birthdate, gender, isLoading } = useUserBirthdate()
  const [isExpanded, setIsExpanded] = useState(false)
  const [dateInput, setDateInput] = useState('') // DD/MM/AAAA display format
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dateError, setDateError] = useState(false)

  const maxLifespanYears = getMaxLifespan(gender)
  const totalWeeks = Math.ceil(maxLifespanYears * 52.1429)

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
    const percentLived = Math.min(Math.round((currentWeek / totalWeeks) * 100), 100)
    const remainingWeeks = Math.max(0, totalWeeks - currentWeek)

    return {
      birthDate: birth,
      currentWeek: Math.max(0, currentWeek),
      ageYears,
      percentLived,
      remainingWeeks,
    }
  }, [birthdate, totalWeeks])

  if (isLoading) {
    return (
      <div className="ceramic-card p-3 animate-pulse">
        <div className="h-3 bg-ceramic-text-secondary/10 rounded-full w-full" />
      </div>
    )
  }

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value)
    setDateInput(formatted)
    setDateError(false)
  }

  const handleSaveBirthdate = async () => {
    if (!dateInput || !user?.id || isSaving) return

    const isoDate = parseBRDate(dateInput)
    if (!isoDate) {
      setDateError(true)
      return
    }

    setIsSaving(true)
    try {
      await updateUserProfile(user.id, { birth_date: isoDate })
      setSaved(true)
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      onSetBirthdate?.()
    } finally {
      setIsSaving(false)
    }
  }

  // Fallback: no birthdate — inline date input in Brazilian format
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
            type="text"
            inputMode="numeric"
            value={dateInput}
            onChange={handleDateInputChange}
            placeholder="DD/MM/AAAA"
            maxLength={10}
            className={`flex-1 bg-ceramic-cool rounded-xl px-3 py-2 text-sm text-ceramic-text-primary outline-none focus:ring-2 transition-all ${
              dateError
                ? 'ring-2 ring-red-400/50 focus:ring-red-400/50'
                : 'focus:ring-amber-500/30'
            }`}
          />
          <button
            onClick={handleSaveBirthdate}
            disabled={dateInput.length < 10 || isSaving}
            className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-medium disabled:opacity-40 hover:bg-amber-600 transition-colors"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
        {dateError && (
          <p className="text-[10px] text-red-400 mt-1">Data invalida. Use o formato DD/MM/AAAA.</p>
        )}
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
              Semana {formatter.format(lifeData.currentWeek)} de {formatter.format(totalWeeks)}
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

        {/* Life-dots visualization — each bar = 1 year of max human lifespan */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <LifeDotsVisualization
            currentWeekTotal={lifeData.currentWeek}
            totalWeeks={totalWeeks}
          />
        </motion.div>
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
                expectedLifespan={maxLifespanYears}
              />

              <div className="mt-3 flex items-center gap-4 text-[10px] text-ceramic-text-secondary">
                <span>{formatter.format(lifeData.remainingWeeks)} semanas restantes</span>
                <span className="opacity-60">
                  {/* Amber = atual · Escuro = vivido · Vazio = futuro */}
                  Maximo: {maxLifespanYears} anos
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
