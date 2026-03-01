/**
 * useCognitiveProfile Hook
 * CRUD for user cognitive profiles (chronotype, peak hours, planning fallacy).
 */

import { useState, useEffect, useCallback } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabaseClient'
import {
  updatePlanningFallacyMultiplier,
  type CognitiveProfile,
} from '../services/atlasScoring'

const log = createNamespacedLogger('useCognitiveProfile')

/** Default profile values for new users */
const DEFAULT_PROFILE: Omit<CognitiveProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  chronotype: 'intermediate',
  peak_hours: [9, 12],
  avg_focus_minutes: 25,
  planning_fallacy_multiplier: 1.5,
  decisions_today: 0,
  last_break_at: null,
  preferred_break_type: 'rest',
}

interface UseCognitiveProfileReturn {
  profile: CognitiveProfile | null
  isLoading: boolean
  error: Error | null
  updateProfile: (partial: Partial<CognitiveProfile>) => Promise<void>
  updatePlanningFallacy: (taskId: string, actualMinutes: number) => Promise<number>
  incrementDecisions: () => Promise<void>
  recordBreak: () => Promise<void>
  refresh: () => Promise<void>
}

export function useCognitiveProfile(): UseCognitiveProfileReturn {
  const { user } = useAuth()
  const [profile, setProfile] = useState<CognitiveProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      setError(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('user_cognitive_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        // If no profile exists, create one with defaults
        if (fetchError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('user_cognitive_profiles')
            .insert({
              user_id: user.id,
              ...DEFAULT_PROFILE,
            })
            .select()
            .single()

          if (createError) throw new Error(createError.message)
          setProfile(newProfile as CognitiveProfile)
          log.info('Created default cognitive profile for user')
          return
        }
        throw new Error(fetchError.message)
      }

      setProfile(data as CognitiveProfile)
    } catch (err) {
      const e = err as Error
      setError(e)
      setProfile(null)
      log.error('Error fetching cognitive profile:', e)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const updateProfileFn = useCallback(async (partial: Partial<CognitiveProfile>) => {
    if (!user?.id || !profile) return

    try {
      setError(null)

      const { error: updateError } = await supabase
        .from('user_cognitive_profiles')
        .update({
          ...partial,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) throw new Error(updateError.message)

      setProfile(prev => prev ? { ...prev, ...partial } : null)
    } catch (err) {
      const e = err as Error
      setError(e)
      log.error('Error updating cognitive profile:', e)
      throw e
    }
  }, [user?.id, profile])

  const updatePlanningFallacy = useCallback(async (
    taskId: string,
    actualMinutes: number,
  ): Promise<number> => {
    if (!user?.id) return 1.5

    const newMultiplier = await updatePlanningFallacyMultiplier(user.id, taskId, actualMinutes)
    setProfile(prev =>
      prev ? { ...prev, planning_fallacy_multiplier: newMultiplier } : null,
    )
    return newMultiplier
  }, [user?.id])

  const incrementDecisions = useCallback(async () => {
    if (!user?.id || !profile) return

    const newCount = (profile.decisions_today ?? 0) + 1
    await updateProfileFn({ decisions_today: newCount } as Partial<CognitiveProfile>)
  }, [user?.id, profile, updateProfileFn])

  const recordBreak = useCallback(async () => {
    if (!user?.id || !profile) return

    await updateProfileFn({
      last_break_at: new Date().toISOString(),
    } as Partial<CognitiveProfile>)
  }, [user?.id, profile, updateProfileFn])

  useEffect(() => {
    if (user?.id) {
      fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfileFn,
    updatePlanningFallacy,
    incrementDecisions,
    recordBreak,
    refresh: fetchProfile,
  }
}
