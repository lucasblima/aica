/**
 * NotebookLM service layer — singleton client for all NotebookLM operations.
 * Calls the notebooklm-proxy Edge Function which forwards to Python microservice.
 */

import { supabase } from '@/services/supabaseClient'

export type AudioFormat = 'deep-dive' | 'brief' | 'critique' | 'debate'
export type AudioLength = 'short' | 'default' | 'long'
export type NlmModule = 'studio' | 'journey' | 'finance' | 'grants' | 'connections' | 'flux' | 'atlas' | 'agenda' | 'cross'

export interface GenerateAudioParams {
  module: NlmModule
  content: string
  title?: string
  format?: AudioFormat
  length?: AudioLength
  language?: string
  instructions?: string
}

export interface NlmJob {
  id: string
  user_id: string
  job_type: string
  module: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  input_data: Record<string, unknown>
  result_url: string | null
  result_metadata: Record<string, unknown>
  error_message: string | null
  notebook_id: string | null
  artifact_id: string | null
  created_at: string
  completed_at: string | null
}

async function callProxy<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('notebooklm-proxy', {
    body: { action, payload },
  })

  if (error) {
    throw new Error(error.message || 'NotebookLM proxy call failed')
  }

  if (!data.success) {
    throw new Error(data.error || 'NotebookLM operation failed')
  }

  return data.data as T
}

export const notebookLmService = {
  generateAudio: (params: GenerateAudioParams) =>
    callProxy<{ job_id: string; status: string }>('generate_audio', params as unknown as Record<string, unknown>),

  getJobStatus: (jobId: string) =>
    callProxy<NlmJob>('get_job_status', { job_id: jobId }),

  listNotebooks: () =>
    callProxy<{ notebooks: Array<{ id: string; title: string }> }>('list_notebooks'),

  deleteNotebook: (notebookId: string) =>
    callProxy<{ deleted: string }>('delete_notebook', { notebook_id: notebookId }),
}
