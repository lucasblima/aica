/**
 * useMoments Hook
 * React hook for managing moments (CRUD operations)
 */

import { useState, useEffect, useCallback } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'

const log = createNamespacedLogger('useMoments')
import {
  Moment,
  CreateMomentInput,
  MomentWithCP,
  MomentFilter,
} from '../types/moment'
import {
  createMoment,
  getMoments,
  getMoment,
  updateMoment,
  deleteMoment as deleteMomentService,
  getMomentsCount,
} from '../services/momentService'

interface UseMomentsOptions {
  filter?: MomentFilter
  limit?: number
  autoFetch?: boolean
}

export function useMoments(options: UseMomentsOptions = {}) {
  const { user } = useAuth()
  const { filter, limit = 50, autoFetch = true } = options

  const [moments, setMoments] = useState<Moment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Fetch moments
  const fetchMoments = useCallback(
    async (offset: number = 0) => {
      if (!user?.id) return

      try {
        setIsLoading(true)
        setError(null)

        const [fetchedMoments, count] = await Promise.all([
          getMoments(user.id, filter, limit, offset),
          getMomentsCount(user.id, filter),
        ])

        if (offset === 0) {
          setMoments(fetchedMoments)
        } else {
          setMoments(prev => [...prev, ...fetchedMoments])
        }

        setTotalCount(count)
        setHasMore(offset + fetchedMoments.length < count)
      } catch (err) {
        setError(err as Error)
        log.error('Error fetching moments:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id, filter, limit]
  )

  // Load more moments
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchMoments(moments.length)
    }
  }, [fetchMoments, isLoading, hasMore, moments.length])

  // Create new moment
  const create = useCallback(
    async (input: CreateMomentInput): Promise<MomentWithCP> => {
      if (!user?.id) throw new Error('User not authenticated')

      try {
        setIsLoading(true)
        setError(null)

        const newMoment = await createMoment(user.id, input)

        // Add to beginning of list
        setMoments(prev => [newMoment, ...prev])
        setTotalCount(prev => prev + 1)

        return newMoment
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id]
  )

  // Update moment
  const update = useCallback(
    async (
      momentId: string,
      updates: Partial<Omit<Moment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
    ): Promise<Moment> => {
      if (!user?.id) throw new Error('User not authenticated')

      try {
        setIsLoading(true)
        setError(null)

        const updatedMoment = await updateMoment(user.id, momentId, updates)

        // Update in list
        setMoments(prev =>
          prev.map(m => (m.id === momentId ? updatedMoment : m))
        )

        return updatedMoment
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id]
  )

  // Delete moment
  const deleteMomentById = useCallback(
    async (momentId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated')

      try {
        setIsLoading(true)
        setError(null)

        await deleteMomentService(user.id, momentId)

        // Remove from list
        setMoments(prev => prev.filter(m => m.id !== momentId))
        setTotalCount(prev => prev - 1)
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id]
  )

  // Refresh moments
  const refresh = useCallback(() => {
    fetchMoments(0)
  }, [fetchMoments])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && user?.id) {
      fetchMoments(0)
    }
  }, [autoFetch, user?.id, fetchMoments])

  return {
    moments,
    isLoading,
    error,
    totalCount,
    hasMore,
    create,
    update,
    delete: deleteMomentById,
    loadMore,
    refresh,
  }
}

/**
 * useSingleMoment Hook
 * Hook for managing a single moment by ID
 */
export function useSingleMoment(momentId: string) {
  const { user } = useAuth()
  const [moment, setMoment] = useState<Moment | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchMoment = useCallback(async () => {
    if (!user?.id || !momentId) return

    try {
      setIsLoading(true)
      setError(null)

      const fetchedMoment = await getMoment(user.id, momentId)
      setMoment(fetchedMoment)
    } catch (err) {
      setError(err as Error)
      log.error('Error fetching moment:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, momentId])

  useEffect(() => {
    fetchMoment()
  }, [fetchMoment])

  return {
    moment,
    isLoading,
    error,
    refresh: fetchMoment,
  }
}
