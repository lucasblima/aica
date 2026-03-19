/**
 * useChatContextData - Fetches user AI context only when chat is expanded
 *
 * Avoids unnecessary queries in drawer mode by gating the fetch
 * behind the isExpanded flag. Uses getUserAIContext() with force refresh
 * on expand to ensure fresh data.
 */

import { useState, useEffect } from 'react'
import { getUserAIContext, type UserAIContext } from '@/services/userAIContextService'

interface ChatContextDataResult {
  context: UserAIContext | null
  isLoading: boolean
}

export function useChatContextData(isExpanded: boolean): ChatContextDataResult {
  const [context, setContext] = useState<UserAIContext | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isExpanded) return

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)

    getUserAIContext(true).then((data) => {
      if (!cancelled) {
        setContext(data)
        setIsLoading(false)
      }
    }).catch((error) => {
      if (!cancelled) {
        console.error('Failed to fetch chat context:', error)
        setIsLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [isExpanded])

  return { context, isLoading }
}
