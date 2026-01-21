/**
 * MomentCapture Component
 * Main container for capturing moments (audio, text, emotion)
 */

import React, { useState } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { EmotionPicker } from './EmotionPicker'

const log = createNamespacedLogger('MomentCapture')
import { AudioRecorder } from './AudioRecorder'
import { TagInput } from './TagInput'
import { MomentType, EmotionValue, CreateMomentInput } from '../../types/moment'
import { SparklesIcon } from '@heroicons/react/24/solid'

interface MomentCaptureProps {
  onSubmit: (moment: CreateMomentInput) => Promise<void>
  onCancel?: () => void
}

export function MomentCapture({ onSubmit, onCancel }: MomentCaptureProps) {
  const [type, setType] = useState<MomentType>('text')
  const [content, setContent] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [emotion, setEmotion] = useState<EmotionValue | undefined>()
  const [tags, setTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (type === 'text' && !content.trim()) {
      alert('Digite seu momento antes de salvar')
      return
    }

    if (type === 'audio' && !audioBlob) {
      alert('Grave um áudio antes de salvar')
      return
    }

    if (type === 'both' && (!content.trim() || !audioBlob)) {
      alert('Preencha o texto e grave o áudio')
      return
    }

    try {
      setIsSubmitting(true)

      await onSubmit({
        type,
        content: content.trim() || undefined,
        audio_blob: audioBlob || undefined,
        emotion,
        tags,
      })

      // Reset form
      setContent('')
      setAudioBlob(null)
      setEmotion(undefined)
      setTags([])
    } catch (error) {
      log.error('Error submitting moment:', error)
      alert('Erro ao salvar momento. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6 bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SparklesIcon className="h-6 w-6 text-blue-500" />
        <h3 className="text-xl font-semibold text-gray-900">Registrar Momento</h3>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType('text')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            type === 'text'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Texto
        </button>
        <button
          type="button"
          onClick={() => setType('audio')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            type === 'audio'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Áudio
        </button>
        <button
          type="button"
          onClick={() => setType('both')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            type === 'both'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Ambos
        </button>
      </div>

      {/* Text input */}
      {(type === 'text' || type === 'both') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            O que você está vivenciando?
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escreva seu momento, pensamento, ou reflexão..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
          <p className="mt-1 text-sm text-gray-500">{content.length} caracteres</p>
        </div>
      )}

      {/* Audio recorder */}
      {(type === 'audio' || type === 'both') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grave seu momento
          </label>
          <AudioRecorder
            onRecordingComplete={blob => setAudioBlob(blob)}
            maxDuration={180}
          />
          {audioBlob && (
            <p className="mt-2 text-sm text-green-600">
              ✓ Áudio gravado ({(audioBlob.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>
      )}

      {/* Emotion picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Como você está se sentindo?
        </label>
        <EmotionPicker value={emotion} onChange={setEmotion} />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (opcional)
        </label>
        <TagInput value={tags} onChange={setTags} maxTags={5} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar Momento'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
        <SparklesIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
        <p className="text-sm text-blue-900">
          Seu momento será analisado com IA para identificar sentimentos e padrões.
          Você ganhará <strong>+5 CP</strong> por registrar este momento.
        </p>
      </div>
    </form>
  )
}
