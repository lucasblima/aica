/**
 * Audio Service
 * Shared áudio transcription service — module-agnostic.
 * Extracted from Journey's momentPersistenceService to respect DDD bounded contexts.
 */

import { GeminiClient } from '@/lib/gemini'
import { createNamespacedLogger } from '@/lib/logger'
import { trackAIUsage } from '@/services/aiUsageTrackingService'

const log = createNamespacedLogger('audioService')
const geminiClient = GeminiClient.getInstance()

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Transcribe áudio blob to text using Gemini via gemini-chat Edge Function
 *
 * @param audioBlob - Audio Blob from MediaRecorder or file input
 * @returns Transcribed text string
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const startTime = Date.now()

  try {
    const audioBase64 = await blobToBase64(audioBlob)
    const mimeType = audioBlob.type || 'áudio/webm'

    log.debug('[audioService] Transcribing áudio', {
      mimeType,
      sizeBytes: audioBlob.size,
    })

    const response = await geminiClient.call({
      action: 'transcribe_audio',
      payload: {
        audioBase64,
        mimeType,
      },
    })

    const raw = response.result?.transcription || response.result?.text || ''
    // Strip Gemini thinking tokens that may leak with 2.5 Flash
    const transcription = raw.replace(/<THINK>[\s\S]*?<\/THINK>\s*/gi, '').trim()

    // Track AI usage (non-blocking)
    trackAIUsage({
      operation_type: 'audio_transcription',
      ai_model: 'gemini-2.5-flash',
      input_tokens: response.usageMetadata?.promptTokenCount || 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      module_type: 'shared',
      duration_seconds: (Date.now() - startTime) / 1000,
      request_metadata: {
        function_name: 'transcribeAudio',
        operation: 'audio_transcription',
        audio_size_bytes: audioBlob.size,
        audio_mime_type: mimeType,
      },
    }).catch(error => {
      log.warn('[Audio AI Tracking] Non-blocking error:', error.message)
    })

    log.debug('[audioService] Audio transcribed', {
      transcriptionLength: transcription.length,
      durationMs: Date.now() - startTime,
    })

    return transcription
  } catch (error) {
    log.error('[audioService] Error transcribing áudio:', error)
    throw new Error('Falha na transcricao do áudio. Tente novamente.')
  }
}
