/**
 * Hook for subscribing to NotebookLM job status updates via Supabase Realtime.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { notebookLmService, type NlmJob, type GenerateAudioParams } from '@/services/notebookLmService'

interface UseNotebookLmJobReturn {
  job: NlmJob | null
  isLoading: boolean
  error: string | null
  generateAudio: (params: GenerateAudioParams) => Promise<void>
}

export function useNotebookLmJob(): UseNotebookLmJobReturn {
  const [job, setJob] = useState<NlmJob | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!job?.id || job.status === 'completed' || job.status === 'failed') return

    const channel = supabase
      .channel(`nlm-job:${job.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notebooklm_jobs',
          filter: `id=eq.${job.id}`,
        },
        (payload) => {
          const updated = payload.new as NlmJob
          setJob(updated)
          if (updated.status === 'completed' || updated.status === 'failed') {
            setIsLoading(false)
            if (updated.status === 'failed') {
              setError(updated.error_message || 'Generation failed')
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [job?.id, job?.status])

  const generateAudio = useCallback(async (params: GenerateAudioParams) => {
    setIsLoading(true)
    setError(null)
    setJob(null)

    try {
      const { job_id } = await notebookLmService.generateAudio(params)
      setJob({
        id: job_id,
        status: 'pending',
        job_type: 'audio',
        module: params.module,
        result_url: null,
      } as NlmJob)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
      setIsLoading(false)
    }
  }, [])

  return { job, isLoading, error, generateAudio }
}
