/**
 * AudioRecorder Component
 * Records audio with waveform visualization
 */

import React, { useState, useRef, useEffect } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid'

const log = createNamespacedLogger('AudioRecorder')

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  maxDuration?: number // seconds, default 180 (3 minutes)
}

export function AudioRecorder({
  onRecordingComplete,
  maxDuration = 180,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const animationFrameRef = useRef<number>()
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<NodeJS.Timeout>()

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Setup audio analyzer for waveform
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        onRecordingComplete(audioBlob)

        // Cleanup
        stream.getTracks().forEach(track => track.stop())
        audioContext.close()
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            stopRecording()
          }
          return newDuration
        })
      }, 1000)

      // Start audio level monitoring
      updateAudioLevel()
    } catch (error) {
      log.error('Error starting recording:', error)
      alert('Não foi possível acessar o microfone. Verifique as permissões.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  // Update audio level for visualization
  const updateAudioLevel = () => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    setAudioLevel(average / 255) // Normalize to 0-1

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Recording controls */}
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
          >
            <MicrophoneIcon className="h-5 w-5" />
            <span>Gravar Áudio</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition-all shadow-lg animate-pulse"
          >
            <StopIcon className="h-5 w-5" />
            <span>Parar</span>
          </button>
        )}

        {isRecording && (
          <span className="text-lg font-mono text-gray-700">
            {formatDuration(duration)} / {formatDuration(maxDuration)}
          </span>
        )}
      </div>

      {/* Waveform visualization */}
      {isRecording && (
        <div className="flex items-center gap-1 h-16 px-4 bg-gray-50 rounded-lg">
          {Array.from({ length: 40 }).map((_, i) => {
            const height = Math.random() * audioLevel * 100 + 10
            return (
              <div
                key={i}
                className="flex-1 bg-red-500 rounded-full transition-all duration-100"
                style={{
                  height: `${height}%`,
                  opacity: 0.5 + audioLevel * 0.5,
                }}
              />
            )
          })}
        </div>
      )}

      {/* Help text */}
      {!isRecording && (
        <p className="text-sm text-gray-500">
          Grave até {Math.floor(maxDuration / 60)} minutos de áudio para capturar seu
          momento
        </p>
      )}
    </div>
  )
}
