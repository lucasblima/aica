/**
 * MultiModalInput — Unified text + áudio + photo input component
 *
 * Combines auto-resizing textarea, áudio recording with transcription,
 * and photo capture into a single reusable input.
 *
 * States: idle | recording | transcribing | submitting
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  MicrophoneIcon,
  StopIcon,
  CameraIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/solid'
import { transcribeAudio } from '@/services/audioService'

// ─── Types ────────────────────────────────────────────────────────────

export interface MultiModalOutput {
  text: string
  type: 'text' | 'audio' | 'photo'
  metadata?: {
    audioBlob?: Blob
    photoFile?: File
    photoPreviewUrl?: string
  }
}

type InputState = 'idle' | 'recording' | 'transcribing' | 'submitting'

interface MultiModalInputProps {
  onSubmit: (input: MultiModalOutput) => Promise<void>
  placeholder?: string
  compact?: boolean
  disabled?: boolean
  showAudio?: boolean
  showPhoto?: boolean
  minRows?: number
  submitLabel?: string
  onCancel?: () => void
  /** Called on every text change (for debounced analysis, etc.) */
  onTextChange?: (text: string) => void
}

const MAX_RECORDING_SECONDS = 300 // 5 minutes

// ─── Component ────────────────────────────────────────────────────────

export function MultiModalInput({
  onSubmit,
  placeholder = 'Digite aqui...',
  compact = false,
  disabled = false,
  showAudio = true,
  showPhoto = true,
  minRows = 3,
  submitLabel = 'Enviar',
  onCancel,
  onTextChange,
}: MultiModalInputProps) {
  const [text, setText] = useState('')
  const [state, setState] = useState<InputState>('idle')
  const [inputType, setInputType] = useState<'text' | 'audio' | 'photo'>('text')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const recordSecondsRef = useRef(0)

  // ── Auto-resize textarea ──────────────────────────────────────────

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24
    const minHeight = lineHeight * minRows
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`
  }, [minRows])

  useEffect(() => {
    resizeTextarea()
  }, [text, resizeTextarea])

  // ── Cleanup on unmount ────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopRecordingCleanup()
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [])

  // ── Recording helpers ─────────────────────────────────────────────

  const stopRecordingCleanup = useCallback(() => {
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
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
  }, [])

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    const sum = dataArray.reduce((acc, val) => acc + val, 0)
    const avg = sum / dataArray.length
    setAudioLevel(Math.min(100, (avg / 128) * 100))
    animFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError('')
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

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size === 0) {
          setState('idle')
          return
        }

        setAudioBlob(blob)
        setInputType('audio')
        setState('transcribing')

        try {
          const transcription = await transcribeAudio(blob)
          setText(prev => prev ? `${prev}\n${transcription}` : transcription)
          setState('idle')
        } catch {
          setError('Falha na transcricao. O áudio foi mantido.')
          setState('idle')
        }
      }

      mediaRecorder.start(250)
      setState('recording')
      setRecordSeconds(0)
      recordSecondsRef.current = 0

      timerRef.current = setInterval(() => {
        recordSecondsRef.current += 1
        const seconds = recordSecondsRef.current
        setRecordSeconds(seconds)
        if (seconds >= MAX_RECORDING_SECONDS) {
          stopRecordingCleanup()
        }
      }, 1000)

      updateAudioLevel()
    } catch (err) {
      const error = err as Error
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Permissao de microfone negada')
      } else if (error.name === 'NotFoundError') {
        setError('Microfone não encontrado')
      } else {
        setError('Erro ao acessar microfone')
      }
    }
  }, [stopRecordingCleanup, updateAudioLevel])

  const handleStopRecording = useCallback(() => {
    stopRecordingCleanup()
  }, [stopRecordingCleanup])

  // ── Photo helpers ─────────────────────────────────────────────────

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    const url = URL.createObjectURL(file)
    setPhotoFile(file)
    setPhotoPreview(url)
    setInputType('photo')
    // Reset file input so same file can be re-selected
    e.target.value = ''
  }, [photoPreview])

  const removePhoto = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    if (!audioBlob) setInputType('text')
  }, [photoPreview, audioBlob])

  // ── Submit ────────────────────────────────────────────────────────

  const canSubmit = text.trim().length > 0 || photoFile !== null || audioBlob !== null
  const isBusy = state === 'recording' || state === 'transcribing' || state === 'submitting'

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isBusy || disabled) return
    setState('submitting')
    try {
      await onSubmit({
        text: text.trim(),
        type: inputType,
        metadata: {
          audioBlob: audioBlob ?? undefined,
          photoFile: photoFile ?? undefined,
          photoPreviewUrl: photoPreview ?? undefined,
        },
      })
      // Reset after successful submit
      setText('')
      setInputType('text')
      setAudioBlob(null)
      removePhoto()
    } catch {
      // Caller handles errors
    } finally {
      setState('idle')
    }
  }, [canSubmit, isBusy, disabled, onSubmit, text, inputType, audioBlob, photoFile, photoPreview, removePhoto])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  // ── Format helpers ────────────────────────────────────────────────

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const waveformBars = 8
  const barHeights = Array.from({ length: waveformBars }, (_, i) => {
    const variance = Math.sin((Date.now() / 200) + i) * 0.3 + 0.7
    return Math.max(4, (audioLevel / 100) * 24 * variance)
  })

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className={`bg-ceramic-base rounded-xl border border-ceramic-border shadow-ceramic-emboss ${compact ? 'p-2' : 'p-3'} ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg bg-ceramic-error/10 text-ceramic-error text-xs">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="p-0.5 hover:bg-ceramic-error/20 rounded">
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recording overlay */}
      {state === 'recording' && (
        <div className="flex items-center gap-3 mb-2 px-2 py-2 rounded-lg bg-ceramic-error/5 border border-ceramic-error/20">
          <div className="flex items-center gap-0.5 h-6">
            {barHeights.map((h, i) => (
              <div
                key={i}
                className="w-1 bg-ceramic-error rounded-full transition-all duration-75"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <span className="text-sm font-mono text-ceramic-error min-w-[3ch]">
            {formatTime(recordSeconds)}
          </span>
          <div className="w-2 h-2 bg-ceramic-error rounded-full animate-pulse" />
          <span className="text-xs text-ceramic-text-secondary flex-1">Gravando...</span>
          <button
            type="button"
            onClick={handleStopRecording}
            className="ceramic-concave p-2 rounded-lg hover:scale-95 active:scale-90 transition-all"
            title="Parar gravação"
          >
            <StopIcon className="w-4 h-4 text-ceramic-error" />
          </button>
        </div>
      )}

      {/* Transcribing indicator */}
      {state === 'transcribing' && (
        <div className="flex items-center gap-2 mb-2 px-2 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-amber-700">Transcrevendo...</span>
        </div>
      )}

      {/* Photo preview */}
      {photoPreview && (
        <div className="relative mb-2 inline-block">
          <img
            src={photoPreview}
            alt="Preview"
            className="h-20 w-auto rounded-lg object-cover border border-ceramic-border"
          />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ceramic-text-primary text-white rounded-full flex items-center justify-center hover:bg-ceramic-error transition-colors"
            title="Remover foto"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onTextChange?.(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        placeholder={state === 'recording' ? 'Gravando áudio...' : placeholder}
        disabled={state === 'recording' || state === 'submitting'}
        rows={minRows}
        className={`w-full bg-transparent text-ceramic-text-primary placeholder-ceramic-text-secondary/50 resize-none outline-none text-sm leading-6 ${compact ? 'px-1' : 'px-2'}`}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-ceramic-border/50">
        {/* Left: mode buttons */}
        <div className="flex items-center gap-1">
          {showAudio && (
            <button
              type="button"
              onClick={state === 'recording' ? handleStopRecording : startRecording}
              disabled={state === 'transcribing' || state === 'submitting'}
              className={`p-2 rounded-lg transition-all ${
                state === 'recording'
                  ? 'bg-ceramic-error/10 text-ceramic-error'
                  : 'ceramic-concave text-ceramic-text-secondary hover:text-ceramic-text-primary hover:scale-95'
              } disabled:opacity-40 disabled:hover:scale-100`}
              title={state === 'recording' ? 'Parar gravação' : 'Gravar áudio'}
            >
              {state === 'recording' ? (
                <StopIcon className="w-4 h-4" />
              ) : (
                <MicrophoneIcon className="w-4 h-4" />
              )}
            </button>
          )}

          {showPhoto && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="ceramic-concave p-2 rounded-lg text-ceramic-text-secondary hover:text-ceramic-text-primary hover:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
                title="Adicionar foto"
              >
                <CameraIcon className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </>
          )}

          {/* Character count */}
          {text.length > 0 && (
            <span className="text-[10px] text-ceramic-text-secondary/60 ml-2 tabular-nums">
              {text.length}
            </span>
          )}
        </div>

        {/* Right: cancel + submit */}
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className="px-3 py-1.5 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary rounded-lg transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all disabled:opacity-40 disabled:hover:bg-amber-500"
          >
            {state === 'submitting' ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-3.5 h-3.5" />
            )}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
