/**
 * PatternDashboard Component
 * Container that orchestrates pattern visualization sub-components (Issue #208)
 */

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useJourneyPatterns } from '../../hooks/useJourneyPatterns'
import { EmotionTrendChart } from './EmotionTrendChart'
import { ActivityHeatmap } from './ActivityHeatmap'
import { ThemeClusters } from './ThemeClusters'
import { ChartBarIcon } from '@heroicons/react/24/solid'

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

export function PatternDashboard({ userId }: PatternDashboardProps) {
  const { emotionTrends, activityData, topThemes, isLoading, refresh } = useJourneyPatterns(userId)

  // Fetch patterns when component mounts (lazy — only shown on insights tab)
  useEffect(() => {
    if (userId) refresh()
  }, [userId, refresh])

  if (isLoading) {
    return <PatternDashboardSkeleton />
  }

  const hasData = emotionTrends.length > 0 || activityData.length > 0 || topThemes.length > 0

  if (!hasData) {
    return (
      <div className="ceramic-tile p-8 text-center">
        <ChartBarIcon className="h-10 w-10 text-[#C4A574] mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-[#5C554B] mb-1">Padrões em Construção</h4>
        <p className="text-xs text-[#948D82] max-w-sm mx-auto">
          Continue registrando momentos e respondendo perguntas. Seus padrões aparecerão aqui conforme dados se acumulam.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-[#5C554B]">Padrões da Jornada</h3>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <EmotionTrendChart data={emotionTrends} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <ActivityHeatmap data={activityData} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ThemeClusters themes={topThemes} />
      </motion.div>
    </div>
  )
}
