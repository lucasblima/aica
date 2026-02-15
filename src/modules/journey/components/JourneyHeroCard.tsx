/**
 * JourneyHeroCard Component
 * Unified hero card combining IdentityPassport and JourneyCardCollapsed
 * Digital Ceramic V2 - Dashboard Redesign
 *
 * Displays user identity, CP progress, and journey preview in a cohesive card
 * Layer 2 (Elevated) - The "physical card" on the ceramic table
 */

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ChevronRight, MessageCircleQuestion, Flame } from 'lucide-react'
import { useConsciousnessPoints } from '../hooks/useConsciousnessPoints'
import { useMoments } from '../hooks/useMoments'
import { useDailyQuestion } from '../hooks/useDailyQuestion'
import { useAuth } from '@/hooks/useAuth'
import { LEVEL_COLORS } from '../types/consciousnessPoints'
import { getEmotionDisplay } from '../types/emotionHelper'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface JourneyHeroCardProps {
  onOpenProfile?: () => void
  onOpenJourney?: () => void
  className?: string
}

export function JourneyHeroCard({
  onOpenProfile,
  onOpenJourney,
  className = '',
}: JourneyHeroCardProps) {
  const { user } = useAuth()
  const { stats, progress, isLoading } = useConsciousnessPoints()
  const { moments } = useMoments({ limit: 1, autoFetch: true })
  const { question } = useDailyQuestion()

  // Computed values
  const progressPercentage = useMemo(() => {
    if (!progress) return 0
    return progress.progress_percentage || 0
  }, [progress])

  const levelColor = useMemo(() => {
    if (!stats) return LEVEL_COLORS[1]
    return LEVEL_COLORS[stats.level]
  }, [stats])

  const displayName = useMemo(() => {
    if (!user) return 'Usuario'
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'
  }, [user])

  const initials = useMemo(() => {
    return displayName.slice(0, 2).toUpperCase()
  }, [displayName])

  const lastMoment = moments[0]
  const hasUnansweredQuestion = question && !question.user_response
  const hasStreak = stats && stats.current_streak > 0

  // Track if avatar image failed to load
  const [avatarError, setAvatarError] = useState(false)
  const avatarUrl = user?.user_metadata?.avatar_url
  const showAvatarImage = avatarUrl && !avatarError

  if (isLoading) {
    return (
      <div
        className={`ceramic-passport ${className}`}
        data-testid="journey-hero-card"
      >
        <div className="flex flex-col gap-6 animate-pulse">
          {/* Hero section skeleton */}
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-ceramic-text-secondary/10 rounded-full" />
            <div className="flex-1">
              <div className="h-6 bg-ceramic-text-secondary/10 rounded w-32 mb-2" />
              <div className="h-3 bg-ceramic-text-secondary/10 rounded w-full" />
            </div>
            <div className="w-24 h-10 bg-ceramic-text-secondary/10 rounded-full" />
          </div>
          {/* Journey section skeleton */}
          <div className="h-32 bg-ceramic-text-secondary/10 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={`ceramic-passport ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      data-testid="journey-hero-card"
    >
      {/* HERO SECTION */}
      <div className="relative mb-6">
        {/* Streak badge - top right corner (inside card) */}
        {hasStreak && (
          <motion.div
            className="absolute top-0 right-0 ceramic-inset-sm px-3 py-1.5 rounded-full flex items-center gap-1.5"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
            data-testid="journey-hero-streak"
          >
            <Flame className="h-4 w-4 text-ceramic-warning" />
            <span className="text-xs font-bold text-ceramic-text-primary">
              {stats!.current_streak} dias
            </span>
          </motion.div>
        )}

        {/* Hero content - mobile: stack, desktop: horizontal */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Avatar - clickable */}
          <motion.div
            className="ceramic-avatar-recessed flex-shrink-0 cursor-pointer"
            onClick={onOpenProfile}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
            role="button"
            aria-label="Abrir perfil"
            data-testid="journey-hero-avatar"
          >
            {showAvatarImage ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-14 h-14 rounded-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: levelColor }}
              >
                {initials}
              </div>
            )}
          </motion.div>

          {/* Level Badge */}
          <motion.div
            className="ceramic-badge-gold flex items-center gap-2 flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
            data-testid="journey-hero-level-badge"
          >
            <span className="text-lg font-black">{stats?.level || 1}</span>
            <span className="text-sm font-medium">
              {stats?.level_name || 'Observador'}
            </span>
          </motion.div>

          {/* Progress Bar */}
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-ceramic-text-secondary truncate">
                {displayName}
              </span>
              <span className="text-xs font-bold text-ceramic-text-primary">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <div
              className="ceramic-progress-groove"
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso para o próximo nível"
              data-testid="journey-hero-progress-bar"
            >
              <motion.div
                className="ceramic-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-ceramic-text-secondary">
                {stats?.total_points?.toLocaleString() || 0} CP
              </span>
              <span className="text-xs text-ceramic-text-secondary">
                {progress?.points_to_next || 0} para próximo nível
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* JOURNEY SECTION */}
      <div data-testid="journey-hero-journey-section">
        {/* Header - clickable */}
        <motion.div
          className="flex items-center justify-between mb-4 cursor-pointer group"
          onClick={onOpenJourney}
          whileHover={{ x: 2 }}
          transition={{ type: 'spring', stiffness: 300 }}
          role="button"
          aria-label="Abrir Minha Jornada"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-amber-600" />
            <h3 className="text-xl font-bold text-etched">Minha Jornada</h3>
          </div>
          <ChevronRight className="h-5 w-5 text-[#948D82] group-hover:text-[#5C554B] transition-colors" />
        </motion.div>

        {/* Last moment preview */}
        {lastMoment && (
          <motion.div
            className="mb-4 p-3 ceramic-inset-shallow rounded-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#948D82]">Último momento</span>
              <span className="text-xs text-[#948D82]">
                {format(new Date(lastMoment.created_at), 'HH:mm', {
                  locale: ptBR,
                })}
              </span>
            </div>

            <div className="flex items-start gap-2">
              {lastMoment.emotion && (
                <span className="text-xl">{getEmotionDisplay(lastMoment.emotion).emoji}</span>
              )}
              <p className="text-sm text-[#5C554B] line-clamp-2">
                {lastMoment.content || 'Áudio gravado'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Daily Question CTA */}
        {hasUnansweredQuestion && (
          <motion.div
            className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200/50 cursor-pointer group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={onOpenJourney}
            whileHover={{ scale: 1.01 }}
            role="button"
            aria-label="Responder pergunta do dia"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 flex-shrink-0">
                <MessageCircleQuestion className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-700 mb-1">
                  Pergunta do dia
                </p>
                <p className="text-sm font-medium text-[#5C554B] line-clamp-2 group-hover:text-[#3D3830] transition-colors">
                  "{question.question_text}"
                </p>
                <p className="text-xs text-amber-600 mt-2 font-medium group-hover:text-amber-700 transition-colors">
                  Toque para responder →
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Mini stats grid */}
        {stats && (
          <motion.div
            className="grid grid-cols-3 gap-2 pt-4 border-t border-[#A39E91]/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-center">
              <div className="text-lg font-bold text-[#5C554B]">
                {stats.total_moments}
              </div>
              <div className="text-xs text-[#948D82]">Momentos</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-[#5C554B]">
                {stats.total_questions_answered}
              </div>
              <div className="text-xs text-[#948D82]">Perguntas</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-[#5C554B]">
                {stats.longest_streak}
              </div>
              <div className="text-xs text-[#948D82]">Recorde</div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default JourneyHeroCard
