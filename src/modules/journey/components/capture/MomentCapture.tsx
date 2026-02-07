/**
 * MomentCapture Component
 * Main container for capturing moments (text + emotion)
 */

import React, { useState } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { EmotionPicker } from './EmotionPicker'

const log = createNamespacedLogger('MomentCapture')
import { TagInput } from './TagInput'
import { EmotionValue, CreateMomentInput } from '../../types/moment'
import { SparklesIcon } from '@heroicons/react/24/solid'

interface MomentCaptureProps {
  onSubmit: (moment: CreateMomentInput) => Promise<void>
  onCancel?: () => void
}

export function MomentCapture({ onSubmit, onCancel }: MomentCaptureProps) {
  const [content, setContent] = useState('')
  const [emotion, setEmotion] = useState<EmotionValue | undefined>()
  const [tags, setTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      alert('Digite seu momento antes de salvar')
      return
    }

    try {
      setIsSubmitting(true)

      await onSubmit({
        type: 'text',
        content: content.trim(),
        emotion,
        tags,
      })

      // Reset form
      setContent('')
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

      {/* Text input */}
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
