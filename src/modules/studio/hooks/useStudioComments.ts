/**
 * useStudioComments Hook
 *
 * Real-time subscription to studio_comments for a specific project.
 * Fetches initial comments, subscribes to INSERT/UPDATE events,
 * and provides methods to add and resolve comments.
 *
 * @example
 * ```ts
 * const { comments, addComment, resolveComment, isLoading, error } = useStudioComments(projectId)
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Raw DB row shape for studio_comments (snake_case columns).
 * Use this for direct Supabase queries. For camelCase, see StudioComment in types/studio.ts.
 */
export interface StudioCommentRow {
  id: string
  user_id: string
  project_id: string
  asset_id: string | null
  content: string
  timestamp_seconds: number | null
  parent_comment_id: string | null
  resolved: boolean
  created_at: string
  updated_at: string
}

export interface UseStudioCommentsReturn {
  /** All comments for the project, ordered by created_at ascending */
  comments: StudioCommentRow[]
  /** Add a new comment to the project */
  addComment: (
    content: string,
    assetId?: string | null,
    timestampSeconds?: number | null,
    parentCommentId?: string | null
  ) => Promise<void>
  /** Mark a comment as resolved */
  resolveComment: (commentId: string) => Promise<void>
  /** Whether initial fetch is in progress */
  isLoading: boolean
  /** Error from fetch or subscription */
  error: Error | null
}

// =============================================================================
// HOOK
// =============================================================================

export function useStudioComments(projectId: string | undefined): UseStudioCommentsReturn {
  const { user } = useAuth()
  const [comments, setComments] = useState<StudioCommentRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // --- Fetch initial comments ---
  useEffect(() => {
    if (!projectId || !user?.id) {
      setComments([])
      return
    }

    let cancelled = false

    const fetchComments = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('studio_comments')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true })

        if (fetchError) throw new Error(fetchError.message)
        if (!cancelled) {
          setComments((data as StudioCommentRow[]) || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch comments'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchComments()

    return () => {
      cancelled = true
    }
  }, [projectId, user?.id])

  // --- Real-time subscription ---
  useEffect(() => {
    if (!projectId || !user?.id) return

    const channel = supabase
      .channel(`studio_comments_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'studio_comments',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newComment = payload.new as StudioCommentRow
          setComments((prev) => {
            // Avoid duplicates (e.g., if our own insert already added it)
            if (prev.some((c) => c.id === newComment.id)) return prev
            return [...prev, newComment]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'studio_comments',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as StudioCommentRow
          setComments((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          )
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          setError(new Error('Failed to subscribe to comments channel'))
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [projectId, user?.id])

  // --- Add comment ---
  const addComment = useCallback(
    async (
      content: string,
      assetId?: string | null,
      timestampSeconds?: number | null,
      parentCommentId?: string | null
    ) => {
      if (!projectId || !user?.id) {
        throw new Error('Project ID and authenticated user are required')
      }

      const { data, error: insertError } = await supabase
        .from('studio_comments')
        .insert({
          user_id: user.id,
          project_id: projectId,
          asset_id: assetId || null,
          content,
          timestamp_seconds: timestampSeconds ?? null,
          parent_comment_id: parentCommentId || null,
          resolved: false,
        })
        .select('*')
        .single()

      if (insertError) throw new Error(insertError.message)

      // Optimistically add to local state (realtime will deduplicate)
      if (data) {
        setComments((prev) => {
          if (prev.some((c) => c.id === data.id)) return prev
          return [...prev, data as StudioCommentRow]
        })
      }
    },
    [projectId, user?.id]
  )

  // --- Resolve comment ---
  const resolveComment = useCallback(
    async (commentId: string) => {
      if (!user?.id) {
        throw new Error('Authenticated user is required')
      }

      const { error: updateError } = await supabase
        .from('studio_comments')
        .update({ resolved: true })
        .eq('id', commentId)

      if (updateError) throw new Error(updateError.message)

      // Optimistic update (realtime will also fire)
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, resolved: true } : c))
      )
    },
    [user?.id]
  )

  return {
    comments,
    addComment,
    resolveComment,
    isLoading,
    error,
  }
}
