/**
 * useVoiceRecorder — Voice input with Web Speech API + MediaRecorder fallback
 *
 * Strategy:
 *   1. Try Web Speech API first (real-time streaming, no time limit, free)
 *   2. Fall back to MediaRecorder + Gemini transcription (works on Safari, 60s limit)
 *
 * Web Speech API: text appears as you speak (interim results).
 * MediaRecorder: records blob, transcribes after stop (batch).
 *
 * API: { isListening, isTranscribing, isSupported, audioLevel, recordSeconds, interimText, toggle }
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { transcribeAudio } from '@/services/audioService'

// Web Speech API types (not in all TS libs)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface UseVoiceRecorderOptions {
  onResult: (transcript: string) => void
  /** Called with interim (partial) text while speaking — Web Speech API only */
  onInterim?: (text: string) => void
  /** Max recording duration in seconds for MediaRecorder fallback (default: 120) */
  maxSeconds?: number
}

interface UseVoiceRecorderReturn {
  isListening: boolean
  isTranscribing: boolean
  isSupported: boolean
  audioLevel: number
  recordSeconds: number
  /** Interim transcription text (Web Speech API only — updates in real-time) */
  interimText: string
  /** Which mode is active: 'speech-api' | 'media-recorder' | null */
  mode: 'speech-api' | 'media-recorder' | null
  toggle: () => void
  startListening: () => void
  stopListening: () => void
}

const checkMediaRecorderSupport = () =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof MediaRecorder !== 'undefined'

const checkSpeechApiSupport = () =>
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

export function useVoiceRecorder({
  onResult,
  onInterim,
  maxSeconds = 120,
}: UseVoiceRecorderOptions): UseVoiceRecorderReturn {
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [interimText, setInterimText] = useState('')
  const [mode, setMode] = useState<'speech-api' | 'media-recorder' | null>(null)

  const hasSpeechApi = checkSpeechApiSupport()
  const hasMediaRecorder = checkMediaRecorderSupport()
  const isSupported = hasSpeechApi || hasMediaRecorder

  // Refs for MediaRecorder fallback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Refs for Web Speech API
  const recognitionRef = useRef<any>(null)
  const shouldRestartRef = useRef(false)
  const finalTranscriptRef = useRef('')

  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const onInterimRef = useRef(onInterim)
  onInterimRef.current = onInterim

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    const sum = dataArray.reduce((acc, val) => acc + val, 0)
    const avg = sum / dataArray.length
    setAudioLevel(Math.min(100, (avg / 128) * 100))
    animFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [])

  const cleanup = useCallback(() => {
    // Speech API cleanup
    shouldRestartRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    finalTranscriptRef.current = ''
    setInterimText('')

    // MediaRecorder cleanup
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null }
    analyserRef.current = null
    setAudioLevel(0)
    setRecordSeconds(0)
    setMode(null)
  }, [])

  // ── Web Speech API ──────────────────────────────────────────────
  const startSpeechApi = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return false

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    finalTranscriptRef.current = ''
    shouldRestartRef.current = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let finalText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (finalText) {
        finalTranscriptRef.current += finalText
      }

      const currentInterim = finalTranscriptRef.current + interim
      setInterimText(currentInterim)
      onInterimRef.current?.(currentInterim)
    }

    recognition.onend = () => {
      // Auto-restart if user hasn't explicitly stopped
      if (shouldRestartRef.current) {
        try {
          recognition.start()
        } catch {
          // Recognition ended permanently — deliver final result
          shouldRestartRef.current = false
          setIsListening(false)
          setMode(null)
          const finalResult = finalTranscriptRef.current.trim()
          if (finalResult) {
            onResultRef.current(finalResult)
          }
          finalTranscriptRef.current = ''
          setInterimText('')
        }
      } else {
        // User stopped — deliver final result
        setIsListening(false)
        setMode(null)
        const finalResult = finalTranscriptRef.current.trim()
        if (finalResult) {
          onResultRef.current(finalResult)
        }
        finalTranscriptRef.current = ''
        setInterimText('')
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' and 'aborted' are non-fatal — recognition auto-restarts
      if (event.error === 'no-speech' || event.error === 'aborted') return

      console.warn('[useVoiceRecorder] Speech API error:', event.error)
      shouldRestartRef.current = false
      setIsListening(false)
      setMode(null)

      // Deliver whatever we have
      const finalResult = finalTranscriptRef.current.trim()
      if (finalResult) {
        onResultRef.current(finalResult)
      }
      finalTranscriptRef.current = ''
      setInterimText('')
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
      setMode('speech-api')
      setRecordSeconds(0)

      // Timer for duration display
      intervalRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1)
      }, 1000)

      return true
    } catch {
      return false
    }
  }, [])

  const stopSpeechApi = useCallback(() => {
    shouldRestartRef.current = false
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setRecordSeconds(0)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      // onend handler will deliver final result and clean up
    }
  }, [])

  // ── MediaRecorder fallback ──────────────────────────────────────
  const startMediaRecorder = useCallback(async () => {
    if (!hasMediaRecorder || isListening || isTranscribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

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
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (audioContextRef.current) audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
        analyserRef.current = null
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = null
        setAudioLevel(0)
        setRecordSeconds(0)

        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size === 0) {
          setIsListening(false)
          setMode(null)
          return
        }

        setIsListening(false)
        setMode(null)
        setIsTranscribing(true)
        try {
          const transcript = await transcribeAudio(blob)
          if (transcript) onResultRef.current(transcript)
        } catch {
          // Transcription failed silently
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start(250)
      setIsListening(true)
      setMode('media-recorder')
      setRecordSeconds(0)

      intervalRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1)
      }, 1000)

      updateAudioLevel()

      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, maxSeconds * 1000)
    } catch {
      setIsListening(false)
      setMode(null)
    }
  }, [hasMediaRecorder, isListening, isTranscribing, maxSeconds, updateAudioLevel])

  const stopMediaRecorder = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  // ── Unified API ─────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (isListening || isTranscribing) return

    // Try Speech API first (real-time, no limit)
    if (hasSpeechApi) {
      const started = startSpeechApi()
      if (started) return
    }

    // Fall back to MediaRecorder
    if (hasMediaRecorder) {
      await startMediaRecorder()
    }
  }, [isListening, isTranscribing, hasSpeechApi, hasMediaRecorder, startSpeechApi, startMediaRecorder])

  const stopListening = useCallback(() => {
    if (mode === 'speech-api') {
      stopSpeechApi()
    } else if (mode === 'media-recorder') {
      stopMediaRecorder()
    }
  }, [mode, stopSpeechApi, stopMediaRecorder])

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  useEffect(() => {
    return () => { cleanup() }
  }, [cleanup])

  return {
    isListening,
    isTranscribing,
    isSupported,
    audioLevel,
    recordSeconds,
    interimText,
    mode,
    toggle,
    startListening,
    stopListening,
  }
}
