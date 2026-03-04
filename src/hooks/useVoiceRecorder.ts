/**
 * useVoiceRecorder — MediaRecorder + Gemini transcription hook
 *
 * Drop-in replacement for useSpeechRecognition that actually works on mobile Safari.
 * Uses MediaRecorder to capture audio, then transcribeAudio() via Gemini Edge Function.
 *
 * API mirrors useSpeechRecognition: { isListening, isSupported, toggle }
 * plus isTranscribing for showing a loading state during server-side transcription.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { transcribeAudio } from '@/modules/journey/services/momentPersistenceService'

interface UseVoiceRecorderOptions {
  onResult: (transcript: string) => void
  /** Max recording duration in seconds (default: 60) */
  maxSeconds?: number
}

interface UseVoiceRecorderReturn {
  /** Currently recording audio */
  isListening: boolean
  /** Transcribing recorded audio via Gemini */
  isTranscribing: boolean
  /** Browser supports MediaRecorder + getUserMedia */
  isSupported: boolean
  toggle: () => void
  startListening: () => void
  stopListening: () => void
}

const checkSupport = () =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof MediaRecorder !== 'undefined'

export function useVoiceRecorder({
  onResult,
  maxSeconds = 60,
}: UseVoiceRecorderOptions): UseVoiceRecorderReturn {
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const isSupported = checkSupport()

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startListening = useCallback(async () => {
    if (!isSupported || isListening || isTranscribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        // Stop stream tracks
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size === 0) {
          setIsListening(false)
          return
        }

        setIsListening(false)
        setIsTranscribing(true)
        try {
          const transcript = await transcribeAudio(blob)
          if (transcript) onResultRef.current(transcript)
        } catch {
          // Transcription failed silently — user sees transcribing state end
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start(250)
      setIsListening(true)

      // Auto-stop after maxSeconds
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, maxSeconds * 1000)
    } catch {
      // Mic permission denied or not available
      setIsListening(false)
    }
  }, [isSupported, isListening, isTranscribing, maxSeconds, cleanup])

  const stopListening = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup() }
  }, [cleanup])

  return { isListening, isTranscribing, isSupported, toggle, startListening, stopListening }
}
