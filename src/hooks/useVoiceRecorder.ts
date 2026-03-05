/**
 * useVoiceRecorder — MediaRecorder + Gemini transcription hook
 *
 * Drop-in replacement for useSpeechRecognition that actually works on mobile Safari.
 * Uses MediaRecorder to capture audio, then transcribeAudio() via Gemini Edge Function.
 *
 * API mirrors useSpeechRecognition: { isListening, isSupported, toggle }
 * plus isTranscribing for loading state and audioLevel for waveform visualization.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { transcribeAudio } from '@/services/audioService'

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
  /** Audio input level 0-100, updated via rAF while recording (for waveform) */
  audioLevel: number
  /** Recording duration in seconds */
  recordSeconds: number
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
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const isSupported = checkSupport()

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

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
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(0)
    setRecordSeconds(0)
  }, [])

  const startListening = useCallback(async () => {
    if (!isSupported || isListening || isTranscribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio analyser for waveform
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
        // Stop stream tracks
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        // Stop analyser
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
          return
        }

        setIsListening(false)
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
      setRecordSeconds(0)

      // Timer for recording duration display
      intervalRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1)
      }, 1000)

      // Start audio level monitoring
      updateAudioLevel()

      // Auto-stop after maxSeconds
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, maxSeconds * 1000)
    } catch {
      setIsListening(false)
    }
  }, [isSupported, isListening, isTranscribing, maxSeconds, updateAudioLevel])

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

  useEffect(() => {
    return () => { cleanup() }
  }, [cleanup])

  return { isListening, isTranscribing, isSupported, audioLevel, recordSeconds, toggle, startListening, stopListening }
}
