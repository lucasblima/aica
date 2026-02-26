/**
 * useUserBirthdate — Fetch birthdate from user profile
 *
 * Returns birth_date string (YYYY-MM-DD) or null if not set.
 */

import { useState, useEffect } from 'react'
import { getUserProfile } from '@/services/supabaseService'
import { useAuth } from '@/hooks/useAuth'

export function useUserBirthdate() {
  const { user } = useAuth()
  const [birthdate, setBirthdate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        const profile = await getUserProfile(user!.id)
        if (!cancelled && profile?.birth_date) {
          setBirthdate(profile.birth_date)
        }
      } catch {
        // Non-critical — profile might not exist yet
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user?.id])

  return { birthdate, isLoading }
}
