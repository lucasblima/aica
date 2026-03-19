/**
 * AudioRecorder Component
 * Microphone recording for Journey QuickCapture
 *
 * States: idle -> recording -> processing
 * Uses MediaRecorder API with audio/webm;codecs=opus
 * Max recording: 5 minutes
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid'

type RecorderState = 'idle' | 'recording' | 'processing' | 'error'

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void
  onTranscriptionComplete?: (text: string) => void
  disabled?: boolean
}

const MAX_RECORDING_SECONDS = 300 // 5 minutes

export function AudioRecorder({
  onRecordingComplete,
  disabled = false,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    analyserRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      if (timerRef.current) clearInterval(timerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

   
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    const sum = dataArray.reduce((acc, val) => acc + val, 0)
    const avg = sum / dataArray.length
    setAudioLevel(Math.min(100, (avg / 128) * 100))
    // eslint-disable-next-line react-hooks/immutability
    animFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up áudio analyser for waveform
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size > 0) {
          onRecordingComplete(blob)
        }
        setState('idle')
        setSeconds(0)
        setAudioLevel(0)
      }

      mediaRecorder.start(250) // Collect data every 250ms
      setState('recording')
      setSeconds(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            stopRecording()
            return 0
          }
          return prev + 1
        })
      }, 1000)

      // Start waveform animation
      updateAudioLevel()
    } catch (err) {
      const error = err as Error
      setState('error')
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage('Permissao de microfone negada')
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('Microfone não encontrado')
      } else {
        setErrorMessage('Erro ao acessar microfone')
      }
    }
  }, [onRecordingComplete, stopRecording, updateAudioLevel])

  const handleStop = useCallback(() => {
    stopRecording()
  }, [stopRecording])

  const handleRetry = useCallback(() => {
    setState('idle')
    setErrorMessage('')
  }, [])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Generate waveform bars — use seconds counter as animation driver instead of Date.now()
  const bars = 8
  const barHeights = Array.from({ length: bars }, (_, i) => {
    const variance = Math.sin((seconds * 5) + i) * 0.3 + 0.7
    return Math.max(4, (audioLevel / 100) * 24 * variance)
  })

  if (state === 'error') {
    return (
      <button
        type="button"
        onClick={handleRetry}
        className="flex items-center gap-1.5 text-xs text-ceramic-error hover:text-ceramic-error/80 transition-colors"
        title={errorMessage}
      >
        <MicrophoneIcon className="w-4 h-4" />
        <span>Tentar novamente</span>
      </button>
    )
  }

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-3">
        {/* Waveform */}
        <div className="flex items-center gap-0.5 h-6">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="w-1 bg-ceramic-error rounded-full transition-all duration-75"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {/* Timer */}
        <span className="text-sm font-mono text-ceramic-error min-w-[3ch]">
          {formatTime(seconds)}
        </span>

        {/* Recording indicator */}
        <div className="w-2 h-2 bg-ceramic-error rounded-full animate-pulse" />

        {/* Stop button */}
        <button
          type="button"
          onClick={handleStop}
          className="ceramic-concave p-2 rounded-lg hover:scale-95 active:scale-90 transition-all"
          title="Parar gravação"
        >
          <StopIcon className="w-4 h-4 text-ceramic-error" />
        </button>
      </div>
    )
  }

  // Idle state
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="ceramic-concave p-2 rounded-lg hover:scale-95 active:scale-90 transition-all disabled:opacity-50 disabled:hover:scale-100"
      title="Gravar áudio"
    >
      <MicrophoneIcon className="w-4 h-4 text-ceramic-text-secondary" />
    </button>
  )
}
