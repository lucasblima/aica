/**
 * useUserBirthdate — Fetch birthdate and gender from user profile
 *
 * Reads birth_date from the `users` table (where updateUserProfile writes it).
 * Falls back to `user_profiles` for compatibility.
 * Returns birth_date string (YYYY-MM-DD) or null if not set.
 */

import { useState, useEffect } from 'react'
import { getUserProfile } from '@/services/supabaseService'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabaseClient'

export function useUserBirthdate() {
  const { user } = useAuth()
  const [birthdate, setBirthdate] = useState<string | null>(null)
  const [gender, setGender] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        // Primary: read birth_date from users table (where updateUserProfile writes)
        const { data: userData } = await supabase
          .from('users')
          .select('birth_date')
          .eq('id', user!.id)
          .single()

        if (!cancelled && userData?.birth_date) {
          setBirthdate(userData.birth_date)
          return
        }

        // Fallback: try user_profiles table for backward compatibility
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

  return { birthdate, gender, isLoading }
}
