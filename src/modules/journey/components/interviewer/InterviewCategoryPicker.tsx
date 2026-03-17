import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useInterviewSessions } from '../../hooks/useInterviewer'
import { getCategoryCompletion } from '../../services/interviewerService'
import type { InterviewCategory } from '../../types/interviewer'
import { INTERVIEW_CATEGORY_META } from '../../types/interviewer'
import { InterviewProgress } from './InterviewProgress'

interface InterviewCategoryPickerProps {
  onSessionStart: (sessionId: string) => void
}

interface CategoryCompletion {
  total: number
  answered: number
  percentage: number
}

const ALL_CATEGORIES: InterviewCategory[] = ['biografia', 'anamnese', 'censo', 'preferências', 'conexoes', 'objetivos']

function CompletionRing({ percentage, color, size = 48 }: { percentage: number; color: string; size?: number }) {
  const radius = (size - 4) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E0DDD5"
        strokeWidth="3"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  )
}

export function InterviewCategoryPicker({ onSessionStart }: InterviewCategoryPickerProps) {
  const { user } = useAuth()
  const { sessions, startNew, isLoading: isLoadingSessions } = useInterviewSessions()
  const [completions, setCompletions] = useState<Record<InterviewCategory, CategoryCompletion> | null>(null)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [startingCategory, setStartingCategory] = useState<InterviewCategory | null>(null)

  const loadCompletions = useCallback(async () => {
    if (!user?.id) return
    try {
      setCompletionError(null)
      const data = await getCategoryCompletion(user.id)
      setCompletions(data)
    } catch (err) {
      console.warn('Failed to load category completions:', err)
      setCompletionError('Não foi possível carregar o progresso das categorias')
    }
  }, [user?.id])

  useEffect(() => {
    loadCompletions()
  }, [loadCompletions])

  const handleStartCategory = async (category: InterviewCategory) => {
    // Check if there's an existing active session for this category
    const existing = sessions.find(
      s => s.category === category && (s.status === 'in_progress' || s.status === 'paused')
    )

    if (existing) {
      onSessionStart(existing.id)
      return
    }

    // Create a new session
    setStartingCategory(category)
    const newSession = await startNew(category)
    setStartingCategory(null)

    if (newSession) {
      onSessionStart(newSession.id)
    }
  }

  const getButtonLabel = (category: InterviewCategory): string => {
    const existing = sessions.find(
      s => s.category === category && (s.status === 'in_progress' || s.status === 'paused')
    )
    if (existing) return 'Continuar'

    const completion = completions?.[category]
    if (completion && completion.percentage >= 100) return 'Revisar'

    return 'Iniciar'
  }

  const hasAnsweredAny = useMemo(() => {
    if (!completions) return false
    return Object.values(completions).some(c => c.answered > 0)
  }, [completions])

  return (
    <div className="space-y-4">
      {/* Progress dashboard — only if user has answered at least 1 question */}
      {hasAnsweredAny && <InterviewProgress />}

      {/* Header */}
      <div className="ceramic-card p-5">
        <h2 className="text-lg font-bold text-ceramic-text-primary mb-1">
          Entrevista de Perfil
        </h2>
        <p className="text-sm text-ceramic-text-secondary">
          Responda perguntas para que a AICA te conheca melhor. Cada resposta gera Pontos de Consciência (CP) e personaliza sua experiência.
        </p>
      </div>

      {/* Completion load error */}
      {completionError && (
        <div className="ceramic-card p-4 border border-ceramic-error/20 bg-ceramic-error/5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-ceramic-error text-sm">{completionError}</span>
            <button
              onClick={() => loadCompletions()}
              className="text-sm text-ceramic-error underline hover:no-underline whitespace-nowrap"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Category grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ALL_CATEGORIES.map((category, index) => {
          const meta = INTERVIEW_CATEGORY_META[category]
          const completion = completions?.[category] || { total: 0, answered: 0, percentage: 0 }
          const isStarting = startingCategory === category
          const buttonLabel = getButtonLabel(category)

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="ceramic-card p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Completion ring with icon */}
                <div className="relative flex-shrink-0">
                  <CompletionRing percentage={completion.percentage} color={meta.color} />
                  <span className="absolute inset-0 flex items-center justify-center text-xl">
                    {meta.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-ceramic-text-primary">
                    {meta.label}
                  </h3>
                  <p className="text-xs text-ceramic-text-secondary mt-0.5 line-clamp-2">
                    {meta.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-ceramic-text-secondary">
                      {completion.answered}/{completion.total} perguntas
                    </span>
                    {completion.percentage > 0 && (
                      <span
                        className="text-xs font-bold"
                        style={{ color: meta.color }}
                      >
                        {completion.percentage}%
                      </span>
                    )}
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => handleStartCategory(category)}
                    disabled={isStarting || isLoadingSessions}
                    className="mt-3 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: meta.color }}
                  >
                    {isStarting ? 'Carregando...' : buttonLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
