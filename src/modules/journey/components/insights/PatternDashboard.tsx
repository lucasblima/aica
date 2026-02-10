/**
 * PatternDashboard Component
 * Container that orchestrates pattern visualization sub-components (Issue #208)
 * Includes automatic backfill progress banner for historic moments
 */

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJourneyPatterns, BackfillProgress } from '../../hooks/useJourneyPatterns'
import { EmotionTrendChart } from './EmotionTrendChart'
import { ActivityHeatmap } from './ActivityHeatmap'
import { ThemeClusters } from './ThemeClusters'
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/solid'

interface PatternDashboardProps {
  userId?: string
}

function PatternDashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="ceramic-tile p-4">
          <div className="h-4 w-32 bg-[#E0DDD5] rounded mb-3" />
          <div className="h-24 w-full bg-[#E0DDD5] rounded" />
        </div>
      ))}
    </div>
  )
}

function BackfillBanner({ progress, onStop }: { progress: BackfillProgress; onStop: () => void }) {
  if (!progress.isRunning && progress.total === 0) return null

  const percentage = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
  const isDone = !progress.isRunning && progress.processed > 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`ceramic-tile p-4 border-l-4 ${isDone ? 'border-l-ceramic-success bg-ceramic-success/10' : 'border-l-ceramic-accent bg-ceramic-accent/10'}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <SparklesIcon className={`h-4 w-4 ${isDone ? 'text-ceramic-success' : 'text-ceramic-accent'}`} />
            <span className="text-sm font-medium text-[#5C554B]">
              {isDone
                ? `Analise concluida: ${progress.processed - progress.failed} momentos atualizados`
                : `Analisando historico com IA... ${progress.processed} de ${progress.total}`
              }
            </span>
          </div>
          {progress.isRunning && (
            <button
              onClick={onStop}
              className="p-1 hover:bg-[#E0DDD5] rounded transition-colors"
              title="Parar analise"
            >
              <XMarkIcon className="h-4 w-4 text-[#948D82]" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {progress.total > 0 && (
          <div className="w-full bg-[#E0DDD5] rounded-full h-1.5">
            <motion.div
              className={`h-1.5 rounded-full ${isDone ? 'bg-ceramic-success' : 'bg-ceramic-accent'}`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {progress.failed > 0 && (
          <p className="text-xs text-[#948D82] mt-1">
            {progress.failed} momento(s) nao puderam ser analisados
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export function PatternDashboard({ userId }: PatternDashboardProps) {
  const {
    emotionTrends,
    activityData,
    topThemes,
    isLoading,
    backfillProgress,
    stopBackfill,
    refresh,
  } = useJourneyPatterns(userId)

  // Fetch patterns when component mounts (lazy — only shown on insights tab)
  useEffect(() => {
    if (userId) refresh()
  }, [userId, refresh])

  if (isLoading) {
    return <PatternDashboardSkeleton />
  }

  const showBackfillBanner = backfillProgress.isRunning || (backfillProgress.processed > 0 && backfillProgress.total > 0)

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-[#5C554B]">Padroes da Jornada</h3>

      {/* Backfill progress banner */}
      {showBackfillBanner && (
        <BackfillBanner progress={backfillProgress} onStop={stopBackfill} />
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <ActivityHeatmap data={activityData} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <EmotionTrendChart data={emotionTrends} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ThemeClusters themes={topThemes} isBackfilling={backfillProgress.isRunning} />
      </motion.div>
    </div>
  )
}
