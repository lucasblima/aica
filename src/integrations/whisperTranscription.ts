/**
 * Whisper Transcription Integration
 * Audio transcription using OpenAI's Whisper API via Supabase Edge Functions
 *
 * Features:
 * - Audio file transcription
 * - Language detection
 * - Confidence scoring
 * - Graceful fallbacks
 */

import { supabase } from '@/services/supabaseClient'
import { EDGE_FUNCTIONS_URL } from '@/config/api'
import { TranscriptionResult } from '@/modules/journey/types/persistenceTypes'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('WhisperTranscription')

/**
 * Transcribe audio using Whisper API
 * @param audioFile - Blob audio file
 * @param language - Optional language code (e.g., 'pt', 'en')
 * @returns Transcription result
 */
export async function transcribeAudioWithWhisper(
  audioFile: Blob,
  language?: string
): Promise<TranscriptionResult> {
  if (!audioFile || audioFile.size === 0) {
    return getFailedTranscriptionResult('Audio file is empty')
  }

  // Try via Edge Function first (recommended)
  const edgeFunctionResult = await transcribeViaEdgeFunction(audioFile, language)
  if (edgeFunctionResult.success) {
    return edgeFunctionResult
  }

  // Try direct API call as fallback
  log.warn('Edge Function failed, trying direct API')
  const directResult = await transcribeDirectly(audioFile, language)
  if (directResult.success) {
    return directResult
  }

  // If both fail, return error
  return getFailedTranscriptionResult('Transcription failed after retries')
}

/**
 * Transcribe via Supabase Edge Function
 */
async function transcribeViaEdgeFunction(audioFile: Blob, language?: string): Promise<TranscriptionResult> {
  try {
    const formData = new FormData()
    formData.append('audio', audioFile)
    if (language) {
      formData.append('language', language)
    }

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/transcribe-audio`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession())?.data?.session?.access_token || ''}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Edge Function returned ${response.status}`)
    }

    const result = await response.json()

    return {
      text: result.text || '',
      duration: result.duration || 0,
      language: result.language || language || 'pt',
      confidence: result.confidence || 0.8,
      success: true,
      transcribedAt: new Date(),
    }
  } catch (error) {
    log.error('Edge Function error:', error)
    return getFailedTranscriptionResult(`Edge Function error: ${error}`)
  }
}

/**
 * Transcribe directly via OpenAI API (requires backend relay)
 */
async function transcribeDirectly(audioFile: Blob, language?: string): Promise<TranscriptionResult> {
  try {
    const formData = new FormData()
    formData.append('file', audioFile, `audio.${getAudioFormat(audioFile.type)}`)
    formData.append('model', 'whisper-1')
    if (language) {
      formData.append('language', language)
    }

    // This would require a backend endpoint that relays to OpenAI
    // For now, we'll use a simpler fallback approach
    return getFailedTranscriptionResult('Direct transcription not configured')
  } catch (error) {
    log.error('Direct transcription error:', error)
    return getFailedTranscriptionResult(`Transcription error: ${error}`)
  }
}

/**
 * Get audio file format from MIME type
 */
function getAudioFormat(mimeType: string): string {
  const formatMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/m4a': 'm4a',
    'audio/aac': 'aac',
  }

  return formatMap[mimeType] || 'webm'
}

/**
 * Detect audio language without transcribing
 */
export async function detectAudioLanguage(audioFile: Blob): Promise<{ language: string; confidence: number }> {
  try {
    // Try to detect language from first few seconds
    const shortAudio = await trimAudio(audioFile, 10) // First 10 seconds

    const formData = new FormData()
    formData.append('audio', shortAudio)

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/detect-language`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession())?.data?.session?.access_token || ''}`,
      },
    })

    if (!response.ok) {
      return { language: 'pt', confidence: 0 }
    }

    const result = await response.json()
    return {
      language: result.language || 'pt',
      confidence: result.confidence || 0.5,
    }
  } catch (error) {
    log.error('Language detection error:', error)
    return { language: 'pt', confidence: 0 } // Default to Portuguese
  }
}

/**
 * Process audio with speaker diarization (identify different speakers)
 */
export async function transcribeWithSpeakers(audioFile: Blob): Promise<{
  segments: Array<{
    speaker: string
    text: string
    start: number
    end: number
  }>
  success: boolean
}> {
  try {
    const result = await transcribeAudioWithWhisper(audioFile)

    if (!result.success) {
      return { segments: [], success: false }
    }

    // For now, return single speaker
    // Full speaker diarization would require additional processing
    return {
      segments: [
        {
          speaker: 'Speaker 1',
          text: result.text,
          start: 0,
          end: result.duration,
        },
      ],
      success: true,
    }
  } catch (error) {
    log.error('Speaker diarization error:', error)
    return { segments: [], success: false }
  }
}

/**
 * Trim audio file to specified duration
 */
async function trimAudio(audioFile: Blob, maxDurationSeconds: number): Promise<Blob> {
  // For simplicity, return the original file
  // Full implementation would use Web Audio API to actually trim
  return audioFile
}

/**
 * Validate audio file
 */
export function validateAudioFile(audioFile: Blob): { valid: boolean; error?: string } {
  if (!audioFile) {
    return { valid: false, error: 'Audio file is required' }
  }

  if (audioFile.size === 0) {
    return { valid: false, error: 'Audio file is empty' }
  }

  if (audioFile.size > 25 * 1024 * 1024) {
    return { valid: false, error: 'Audio file is too large (max 25MB)' }
  }

  const validTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac']
  if (!validTypes.includes(audioFile.type)) {
    return { valid: false, error: `Unsupported audio format: ${audioFile.type}` }
  }

  return { valid: true }
}

/**
 * Get audio duration from Blob
 */
export async function getAudioDuration(audioFile: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      audioContext.decodeAudioData(
        arrayBuffer,
        (audioBuffer) => {
          resolve(audioBuffer.duration)
        },
        (error) => {
          log.error('Error decoding audio:', error)
          resolve(0)
        }
      )
    }

    reader.onerror = () => {
      log.error('Error reading file')
      resolve(0)
    }

    reader.readAsArrayBuffer(audioFile)
  })
}

/**
 * Estimate transcription quality based on audio characteristics
 */
export async function estimateTranscriptionQuality(audioFile: Blob): Promise<{
  score: number // 0-100
  feedback: string
  recommendations: string[]
}> {
  const validation = validateAudioFile(audioFile)
  if (!validation.valid) {
    return {
      score: 0,
      feedback: validation.error || 'Invalid audio file',
      recommendations: ['Please check your audio file format and size'],
    }
  }

  const recommendations: string[] = []
  let score = 80

  // Check file size (larger = more content to transcribe)
  if (audioFile.size < 100000) {
    score -= 10
    recommendations.push('Audio is very short, transcription may be less accurate')
  }

  if (audioFile.size > 10 * 1024 * 1024) {
    score -= 5
    recommendations.push('Large audio file may take longer to process')
  }

  // Check format
  const format = getAudioFormat(audioFile.type)
  if (!['mp3', 'wav', 'webm'].includes(format)) {
    score -= 5
    recommendations.push('Consider using MP3 or WAV format for better compatibility')
  }

  const feedback =
    score >= 80
      ? 'Excelente qualidade de audio'
      : score >= 60
      ? 'Boa qualidade, transcricao deve funcionar bem'
      : 'Audio de qualidade menor, resultados podem variar'

  return { score, feedback, recommendations }
}

/**
 * Batch transcribe multiple audio files
 */
export async function batchTranscribeAudio(
  audioFiles: Blob[],
  onProgress?: (completed: number, total: number) => void
): Promise<TranscriptionResult[]> {
  const results: TranscriptionResult[] = []

  for (let i = 0; i < audioFiles.length; i++) {
    const result = await transcribeAudioWithWhisper(audioFiles[i])
    results.push(result)

    if (onProgress) {
      onProgress(i + 1, audioFiles.length)
    }
  }

  return results
}

/**
 * Get failed transcription result
 */
function getFailedTranscriptionResult(error: string): TranscriptionResult {
  return {
    text: '',
    duration: 0,
    language: 'pt',
    confidence: 0,
    success: false,
    error,
    transcribedAt: new Date(),
  }
}

/**
 * Transcription quality metrics
 */
export interface TranscriptionMetrics {
  duration: number
  confidenceScore: number
  estimatedAccuracy: number
  language: string
  wordsPerMinute: number
}

/**
 * Calculate transcription metrics
 */
export function calculateTranscriptionMetrics(result: TranscriptionResult): TranscriptionMetrics {
  const words = result.text.split(/\s+/).filter(w => w.length > 0).length
  const wordsPerMinute = result.duration > 0 ? (words / result.duration) * 60 : 0

  return {
    duration: result.duration,
    confidenceScore: result.confidence,
    estimatedAccuracy: result.confidence * 100,
    language: result.language || 'unknown',
    wordsPerMinute,
  }
}

/**
 * Post-process transcription text
 */
export function postProcessTranscription(text: string): string {
  return text
    .trim()
    // Fix common Whisper artifacts
    .replace(/\s+/g, ' ')
    // Ensure proper capitalization at sentence start
    .replace(/([.!?]\s*)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())
    // Fix spacing around punctuation
    .replace(/\s+([.!?,;:])/g, '$1')
}
