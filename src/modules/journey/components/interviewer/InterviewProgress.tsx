import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useInterviewStats } from '../../hooks/useInterviewer'
import { getCategoryCompletion } from '../../services/interviewerService'
import type { InterviewCategory } from '../../types/interviewer'
import { INTERVIEW_CATEGORY_META } from '../../types/interviewer'

const ALL_CATEGORIES: InterviewCategory[] = ['biografia', 'anamnese', 'censo', 'preferencias', 'conexoes', 'objetivos']

interface CategoryCompletion {
  total: number
  answered: number
  percentage: number
}

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

export function InterviewProgress() {
  const { user } = useAuth()
  const { stats, isLoading: isLoadingStats } = useInterviewStats()
  const [completions, setCompletions] = useState<Record<InterviewCategory, CategoryCompletion> | null>(null)

  const loadCompletions = useCallback(async () => {
    if (!user?.id) return
    const data = await getCategoryCompletion(user.id)
    setCompletions(data)
  }, [user?.id])

  useEffect(() => {
    loadCompletions()
  }, [loadCompletions])

  if (isLoadingStats || !completions) return null

  const totalAnswered = stats.total_answered
  const overallPercentage = stats.completion_percentage
  const sessionsCompleted = stats.categories_completed
  const cpEarned = stats.total_cp_earned

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="ceramic-card p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-ceramic-text-primary">Seu Perfil</h3>
        <span className="text-sm font-semibold text-amber-500">
          {overallPercentage}% completo
        </span>
      </div>

      {/* Central ring + category mini-rings */}
      <div className="flex items-center gap-6">
        {/* Overall completion ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="relative flex-shrink-0"
        >
          <CompletionRing percentage={overallPercentage} color="#F59E0B" size={100} />
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-ceramic-text-primary">
            {overallPercentage}%
          </span>
        </motion.div>

        {/* 6 category mini-rings (3x2 grid) */}
        <div className="grid grid-cols-3 gap-3 flex-1">
          {ALL_CATEGORIES.map((category, index) => {
            const meta = INTERVIEW_CATEGORY_META[category]
            const completion = completions[category] || { total: 0, answered: 0, percentage: 0 }

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.06 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="relative">
                  <CompletionRing percentage={completion.percentage} color={meta.color} size={48} />
                  <span className="absolute inset-0 flex items-center justify-center text-base">
                    {meta.icon}
                  </span>
                </div>
                <span className="text-[10px] text-ceramic-text-secondary text-center leading-tight truncate w-full">
                  {meta.label}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="bg-ceramic-cool/30 rounded-lg p-3 text-center">
          <span className="block text-lg font-bold text-ceramic-text-primary">{totalAnswered}</span>
          <span className="text-[10px] text-ceramic-text-secondary">Respondidas</span>
        </div>
        <div className="bg-ceramic-cool/30 rounded-lg p-3 text-center">
          <span className="block text-lg font-bold text-ceramic-text-primary">{sessionsCompleted}</span>
          <span className="text-[10px] text-ceramic-text-secondary">Completas</span>
        </div>
        <div className="bg-ceramic-cool/30 rounded-lg p-3 text-center">
          <span className="block text-lg font-bold text-amber-500">{cpEarned}</span>
          <span className="text-[10px] text-ceramic-text-secondary">CP Ganhos</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
