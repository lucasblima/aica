/**
 * useTelegramLink Hook
 * Telegram Integration — Phase 1
 *
 * Manages Telegram account linking flow:
 * - Generate 6-char alphanumeric link code
 * - Query link status (unlinked | pending | linked)
 * - Unlink Telegram account
 * - Real-time subscription for live status updates
 *
 * @example
 * const { status, linkCode, generateCode, unlinkTelegram } = useTelegramLink()
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useTelegramLink')

// =============================================================================
// TYPES
// =============================================================================

export type TelegramLinkStatus = 'unlinked' | 'pending' | 'linked'

export interface TelegramLinkData {
  id: string
  user_id: string
  link_code: string | null
  status: TelegramLinkStatus
  telegram_username: string | null
  linked_at: string | null
  code_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface UseTelegramLinkReturn {
  status: TelegramLinkStatus
  linkData: TelegramLinkData | null
  linkCode: string | null
  isLoading: boolean
  isGenerating: boolean
  error: string | null
  generateCode: () => Promise<void>
  unlinkTelegram: () => Promise<void>
}

// =============================================================================
// HELPERS
// =============================================================================

function generateAlphanumericCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length]
  }
  return code
}

// =============================================================================
// HOOK
// =============================================================================

export function useTelegramLink(): UseTelegramLinkReturn {
  const [linkData, setLinkData] = useState<TelegramLinkData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Derive status from linkData
  const status: TelegramLinkStatus = linkData?.status ?? 'unlinked'
  const linkCode = linkData?.link_code ?? null

  // Fetch current link status
  const fetchLinkStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: queryError } = await supabase
        .from('user_telegram_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (queryError) throw queryError

      if (data) {
        // Check if pending code has expired
        if (data.status === 'pending' && data.code_expires_at) {
          const expiresAt = new Date(data.code_expires_at)
          if (expiresAt < new Date()) {
            setLinkData({ ...data, status: 'unlinked' })
            return
          }
        }
        setLinkData(data as TelegramLinkData)
      } else {
        setLinkData(null)
      }
    } catch (err) {
      log.error('Failed to fetch Telegram link status:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar status')
    }
  }, [])

  // Generate a new link code
  const generateCode = useCallback(async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const code = generateAlphanumericCode(6)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min expiry

      // Upsert: if record exists, update it; otherwise, insert new
      const { data, error: upsertError } = await supabase
        .from('user_telegram_links')
        .upsert(
          {
            user_id: user.id,
            link_code: code,
            status: 'pending' as TelegramLinkStatus,
            code_expires_at: expiresAt,
            telegram_username: null,
            linked_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single()

      if (upsertError) throw upsertError

      setLinkData(data as TelegramLinkData)
    } catch (err) {
      log.error('Failed to generate link code:', err)
      setError(err instanceof Error ? err.message : 'Erro ao gerar codigo')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  // Unlink Telegram account
  const unlinkTelegram = useCallback(async () => {
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: updateError } = await supabase
        .from('user_telegram_links')
        .update({
          status: 'unlinked' as TelegramLinkStatus,
          link_code: null,
          telegram_username: null,
          linked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      setLinkData(data as TelegramLinkData)
    } catch (err) {
      log.error('Failed to unlink Telegram:', err)
      setError(err instanceof Error ? err.message : 'Erro ao desvincular')
    }
  }, [])

  // Real-time subscription for live status updates
  useEffect(() => {
    let mounted = true

    const setup = async () => {
      setIsLoading(true)
      await fetchLinkStatus()
      if (mounted) setIsLoading(false)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return

      // Subscribe to changes on user_telegram_links for this user
      const channel = supabase
        .channel(`telegram-link-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_telegram_links',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!mounted) return
            log.info('Telegram link status changed:', payload.eventType)
            const newData = payload.new as TelegramLinkData
            if (newData) {
              setLinkData(newData)
            }
          }
        )
        .subscribe()

      channelRef.current = channel
    }

    setup()

    return () => {
      mounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchLinkStatus])

  return {
    status,
    linkData,
    linkCode,
    isLoading,
    isGenerating,
    error,
    generateCode,
    unlinkTelegram,
  }
}

export default useTelegramLink
