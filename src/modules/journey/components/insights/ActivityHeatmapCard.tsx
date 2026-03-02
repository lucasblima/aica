/**
 * ActivityHeatmapCard — Standalone wrapper for ActivityHeatmap
 * Fetches heatmap data independently so it can be rendered outside PatternDashboard.
 * Gated by `activity_heatmap` (level 3), separate from `pattern_dashboard` (level 4).
 * Issue #637
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabaseClient'
import { ActivityHeatmap } from './ActivityHeatmap'
import type { ActivityDay } from '../../hooks/useJourneyPatterns'

interface ActivityHeatmapCardProps {
  userId?: string
}

export function ActivityHeatmapCard({ userId }: ActivityHeatmapCardProps) {
  const { data: activityData = [], isLoading } = useQuery<ActivityDay[]>({
    queryKey: ['journey-heatmap', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase.rpc('get_journey_activity_heatmap', {
        p_user_id: userId,
        p_days: 90,
      })
      if (error) throw error
      return (data || []).map((d: { activity_date: string; moment_count: number }) => ({
        date: d.activity_date,
        count: Number(d.moment_count),
      }))
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="ceramic-tile p-4 animate-pulse">
        <div className="h-4 w-32 bg-[#E0DDD5] rounded mb-3" />
        <div className="h-24 w-full bg-[#E0DDD5] rounded" />
      </div>
    )
  }

  return <ActivityHeatmap data={activityData} />
}
