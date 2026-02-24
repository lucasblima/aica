/**
 * useUserRole - Detects user role based on database associations.
 *
 * Roles:
 *  - 'athlete': user has a row in `athletes` where auth_user_id = their id
 *  - 'coach': user has created athletes (coach_id = their id)
 *  - 'guest': user has platform_contacts with invitation_status = 'accepted'
 *  - 'regular': default
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

export type UserRole = 'athlete' | 'guest' | 'coach' | 'regular'

export interface UseUserRoleReturn {
  role: UserRole
  isLoading: boolean
  primaryModule: string | null
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth()
  const [role, setRole] = useState<UserRole>('regular')
  const [isLoading, setIsLoading] = useState(true)
  const [primaryModule, setPrimaryModule] = useState<string | null>(null)

  const detect = useCallback(async () => {
    if (!user?.id) {
      setRole('regular')
      setPrimaryModule(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      // Check athlete (auth_user_id match)
      const { count: athleteCount } = await supabase
        .from('athletes')
        .select('*', { head: true, count: 'exact' })
        .eq('auth_user_id', user.id)

      if (athleteCount && athleteCount > 0) {
        setRole('athlete')
        setPrimaryModule('flux')
        setIsLoading(false)
        return
      }

      // Check coach (created athletes)
      const { count: coachCount } = await supabase
        .from('athletes')
        .select('*', { head: true, count: 'exact' })
        .eq('coach_id', user.id)

      if (coachCount && coachCount > 0) {
        setRole('coach')
        setPrimaryModule('flux')
        setIsLoading(false)
        return
      }

      // Check guest (platform_contacts with accepted invitation)
      const { count: guestCount } = await supabase
        .from('platform_contacts')
        .select('*', { head: true, count: 'exact' })
        .eq('auth_user_id', user.id)
        .eq('invitation_status', 'accepted')

      if (guestCount && guestCount > 0) {
        setRole('guest')
        setPrimaryModule('studio')
        setIsLoading(false)
        return
      }

      // Default
      setRole('regular')
      setPrimaryModule(null)
    } catch {
      setRole('regular')
      setPrimaryModule(null)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    detect()
  }, [detect])

  return { role, isLoading, primaryModule }
}
