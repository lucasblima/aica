/**
 * useAudioRecording Hook
 *
 * Hook for managing audio recording using Web Speech API (SpeechRecognition).
 * Provides real-time transcription with fallback for browsers without support.
 *
 * Features:
 * - Real-time speech-to-text transcription
 * - State management: idle, recording, transcribing
 * - Browser compatibility detection
 * - Error handling and recovery
 * - Portuguese language support
 *
 * @module journey/hooks
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useAudioRecording')

// Web Speech API types (not included in TypeScript by default)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onerror: ((event: any) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'error'

export interface UseAudioRecordingReturn {
  /** Current state of the recording */
  state: RecordingState
  /** Current transcript (interim + final) */
  transcript: string
  /** Interim (non-final) transcript part */
  interimTranscript: string
  /** Final (confirmed) transcript part */
  finalTranscript: string
  /** Whether Speech API is supported in this browser */
  isSupported: boolean
  /** Error message if any */
  error: string | null
  /** Start recording audio */
  startRecording: () => void
  /** Stop recording and return final transcript */
  stopRecording: () => string
  /** Cancel recording and clear transcript */
  cancelRecording: () => void
  /** Clear transcript without stopping */
  clearTranscript: () => void
}

/**
 * Check if Web Speech API is supported
 */
const checkSpeechRecognitionSupport = (): boolean => {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

/**
 * useAudioRecording Hook
 *
 * @example
 * ```tsx
 * const {
 *   state,
 *   transcript,
 *   isSupported,
 *   startRecording,
 *   stopRecording
 * } = useAudioRecording()
 *
 * if (!isSupported) {
 *   return <div>Speech recognition not supported</div>
 * }
 *
 * return (
 *   <button onClick={state === 'recording' ? stopRecording : startRecording}>
 *     {state === 'recording' ? 'Stop' : 'Start'}
 *   </button>
 * )
 * ```
 */
export function useAudioRecording(): UseAudioRecordingReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported] = useState(checkSpeechRecognitionSupport())

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isSupported) {
      log.warn('Web Speech API not supported in this browser')
      return
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()

    // Configuration
    recognition.continuous = true // Keep listening until stopped
    recognition.interimResults = true // Get partial results
    recognition.lang = 'pt-BR' // Portuguese (Brazil)
    recognition.maxAlternatives = 1 // Only need top result

    // Handle results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript

        if (result.isFinal) {
          final += transcript + ' '
        } else {
          interim += transcript
        }
      }

      if (final) {
        setFinalTranscript(prev => prev + final)
        setInterimTranscript('')
      } else {
        setInterimTranscript(interim)
      }

      setState('recording')
      log.debug('Transcript updated:', { final, interim })
    }

    // Handle start
    recognition.onstart = () => {
      setState('recording')
      setError(null)
      log.debug('Recording started')
    }

    // Handle end
    recognition.onend = () => {
      if (state === 'recording') {
        // If stopped unexpectedly, try to restart
        log.debug('Recognition ended unexpectedly, restarting...')
        try {
          recognition.start()
        } catch (err) {
          log.warn('Failed to restart recognition:', err)
          setState('idle')
        }
      } else {
        setState('idle')
        log.debug('Recording ended')
      }
    }

    // Handle errors
    recognition.onerror = (event: any) => {
      const errorMessage = event.error || 'Unknown error'

      // Ignore 'no-speech' error (common when user pauses)
      if (errorMessage === 'no-speech') {
        log.debug('No speech detected (user paused)')
        return
      }

      // Ignore 'aborted' error (intentional stop)
      if (errorMessage === 'aborted') {
        log.debug('Recognition aborted')
        return
      }

      log.error('Speech recognition error:', errorMessage)
      setError(`Erro ao gravar: ${errorMessage}`)
      setState('error')
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [isSupported, state])

  /**
   * Start recording audio
   */
  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Seu navegador não suporta reconhecimento de voz')
      setState('error')
      return
    }

    if (!recognitionRef.current) {
      setError('Reconhecimento de voz não inicializado')
      setState('error')
      return
    }

    try {
      // Clear previous session
      setFinalTranscript('')
      setInterimTranscript('')
      setError(null)

      recognitionRef.current.start()
      log.debug('Starting recording...')
    } catch (err: any) {
      // If already started, ignore error
      if (err.name === 'InvalidStateError') {
        log.debug('Recognition already started')
        return
      }

      log.error('Failed to start recording:', err)
      setError('Falha ao iniciar gravação')
      setState('error')
    }
  }, [isSupported])

  /**
   * Stop recording and return final transcript
   */
  const stopRecording = useCallback((): string => {
    if (!recognitionRef.current) {
      log.warn('No recognition instance to stop')
      return finalTranscript
    }

    try {
      recognitionRef.current.stop()
      setState('idle')
      log.debug('Recording stopped')
    } catch (err) {
      log.error('Failed to stop recording:', err)
    }

    // Return combined transcript
    const fullTranscript = (finalTranscript + ' ' + interimTranscript).trim()
    setInterimTranscript('') // Clear interim
    return fullTranscript
  }, [finalTranscript, interimTranscript])

  /**
   * Cancel recording and clear transcript
   */
  const cancelRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    setFinalTranscript('')
    setInterimTranscript('')
    setError(null)
    setState('idle')
    log.debug('Recording cancelled')
  }, [])

  /**
   * Clear transcript without stopping recording
   */
  const clearTranscript = useCallback(() => {
    setFinalTranscript('')
    setInterimTranscript('')
    log.debug('Transcript cleared')
  }, [])

  return {
    state,
    transcript: (finalTranscript + ' ' + interimTranscript).trim(),
    interimTranscript,
    finalTranscript,
    isSupported,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearTranscript,
  }
}
