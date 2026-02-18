/**
 * Task Extraction Service
 * Processes voice recordings into structured task data via Gemini LLM.
 *
 * Pipeline: AudioBlob → transcribeAudio() → extractTaskFromVoice() → ExtractedTaskData
 */

import { GeminiClient } from '@/lib/gemini'
import { transcribeAudio } from '@/modules/journey/services/momentPersistenceService'
import { createNamespacedLogger } from '@/lib/logger'

const geminiClient = GeminiClient.getInstance()
const log = createNamespacedLogger('TaskExtraction')

export interface ExtractedTaskData {
  title: string
  description?: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  is_urgent: boolean
  is_important: boolean
  due_date?: string          // YYYY-MM-DD
  scheduled_time?: string    // HH:MM (e.g. "12:00", "15:30")
  estimated_duration?: number // minutes
}

/**
 * Extract structured task data from a transcription using Gemini
 */
export async function extractTaskFromVoice(transcription: string): Promise<ExtractedTaskData> {
  try {
    const response = await geminiClient.call({
      action: 'extract_task_from_voice',
      payload: { transcription },
    })

    const data = response.result as ExtractedTaskData

    // Validate and sanitize
    return {
      title: data.title || transcription.slice(0, 100),
      description: data.description || undefined,
      priority: ['urgent', 'high', 'medium', 'low'].includes(data.priority) ? data.priority : 'medium',
      is_urgent: Boolean(data.is_urgent),
      is_important: Boolean(data.is_important),
      due_date: data.due_date && /^\d{4}-\d{2}-\d{2}$/.test(data.due_date) ? data.due_date : undefined,
      scheduled_time: data.scheduled_time && /^\d{2}:\d{2}$/.test(data.scheduled_time) ? data.scheduled_time : undefined,
      estimated_duration: data.estimated_duration && data.estimated_duration >= 1 && data.estimated_duration <= 480
        ? data.estimated_duration
        : undefined,
    }
  } catch (err) {
    log.error('Failed to extract task from voice:', err)
    // Fallback: use transcription as title
    return {
      title: transcription.slice(0, 100),
      priority: 'medium',
      is_urgent: false,
      is_important: false,
    }
  }
}

/**
 * Full pipeline: audio blob → transcription → structured task data
 * @param onStage - optional callback to report pipeline progress ('extracting')
 */
export async function processVoiceToTask(
  audioBlob: Blob,
  onStage?: (stage: 'extracting') => void,
): Promise<{
  transcription: string
  extractedTask: ExtractedTaskData
}> {
  log.debug('Starting voice-to-task pipeline', { sizeBytes: audioBlob.size })

  const transcription = await transcribeAudio(audioBlob)
  if (!transcription.trim()) {
    throw new Error('Nao foi possivel transcrever o audio. Tente novamente.')
  }

  onStage?.('extracting')
  const extractedTask = await extractTaskFromVoice(transcription)

  log.debug('Voice-to-task pipeline complete', { title: extractedTask.title })

  return { transcription, extractedTask }
}
