/**
 * DailyQuestionCard Component
 * Displays daily voluntary question with answer interface
 */

import React, { useState, useCallback } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { QuestionWithResponse } from '../../types/dailyQuestion'
import { AudioRecorder } from '../capture/AudioRecorder'
import { transcribeAudio } from '../../services/momentPersistenceService'

const log = createNamespacedLogger('DailyQuestionCard')
import {
  QUESTION_CATEGORY_COLORS,
  QUESTION_CATEGORY_ICONS,
} from '../../types/dailyQuestion'
import { SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/solid'

interface DailyQuestionCardProps {
  question: QuestionWithResponse
  onAnswer: (questionId: string, responseText: string) => Promise<void>
  onSkip?: () => void
}

export function DailyQuestionCard({ question, onAnswer, onSkip }: DailyQuestionCardProps) {
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isAnswered, setIsAnswered] = useState(!!question.user_response)
  const [savedResponse, setSavedResponse] = useState(question.user_response?.response_text || '')
  const [lastQuestionId, setLastQuestionId] = useState(question.id)

  // Reset state when question changes (new question loaded)
  React.useEffect(() => {
    if (question.id !== lastQuestionId) {
      log.debug('Question changed, resetting state', {
        oldId: lastQuestionId,
        newId: question.id
      })
      setLastQuestionId(question.id)
      setIsAnswered(!!question.user_response)
      setSavedResponse(question.user_response?.response_text || '')
      setResponseText('')
      setIsSubmitting(false) // Reset submitting state when question changes
    }
  }, [question.id, question.user_response, lastQuestionId])

  const categoryColor = QUESTION_CATEGORY_COLORS[question.category]
  const categoryIcon = QUESTION_CATEGORY_ICONS[question.category]

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    try {
      setIsTranscribing(true)
      log.debug('Transcribing audio for question answer', { size: blob.size })
      const text = await transcribeAudio(blob)
      if (text) {
        setResponseText(prev => prev ? `${prev}\n${text}` : text)
      }
    } catch (err) {
      log.error('Transcription failed:', err)
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!responseText.trim()) {
      alert('Digite sua resposta antes de enviar')
      return
    }

    try {
      setIsSubmitting(true)
      await onAnswer(question.id, responseText.trim())
      setSavedResponse(responseText.trim()) // Save locally for immediate display
      setIsAnswered(true)
      setResponseText('')
    } catch (error) {
      log.error('Error answering question:', error)
      alert('Erro ao salvar resposta. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get the response text from either the saved state or the question object
  const displayResponse = savedResponse || question.user_response?.response_text || ''

  // If already answered, show confirmation
  if (isAnswered && displayResponse) {
    return (
      <div className="bg-ceramic-success/10 border-2 border-ceramic-success/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircleIcon className="h-6 w-6 text-ceramic-success" />
          <h3 className="text-lg font-semibold text-ceramic-text-primary">Pergunta Respondida!</h3>
        </div>

        <p className="text-ceramic-text-primary mb-3">{question.question_text}</p>

        <div className="p-3 bg-ceramic-base rounded-lg">
          <p className="text-sm text-ceramic-text-secondary mb-1">Sua resposta:</p>
          <p className="text-ceramic-text-primary">{displayResponse}</p>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-ceramic-success">
          <SparklesIcon className="h-4 w-4" />
          <span>CP ganhos com base na qualidade da sua resposta!</span>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gradient-to-br from-ceramic-base to-ceramic-info/10 border-2 border-ceramic-info/30 rounded-xl p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ backgroundColor: categoryColor + '20' }}
        >
          {categoryIcon}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-ceramic-text-secondary">Pergunta do Dia</h3>
          <p
            className="text-xs font-semibold"
            style={{ color: categoryColor }}
          >
            {question.category}
          </p>
        </div>

        <div className="px-3 py-1 bg-ceramic-warning/15 text-ceramic-warning text-xs font-bold rounded-full">
          2-20 CP
        </div>
      </div>

      {/* Question */}
      <p className="text-lg font-medium text-ceramic-text-primary mb-4">{question.question_text}</p>

      {/* Answer input */}
      <div className="mb-4">
        <textarea
          value={responseText}
          onChange={e => setResponseText(e.target.value)}
          placeholder={isTranscribing ? 'Transcrevendo áudio...' : 'Digite ou grave sua resposta...'}
          rows={4}
          disabled={isTranscribing}
          className="w-full px-4 py-3 border border-ceramic-text-secondary/20 rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:outline-none resize-none disabled:bg-ceramic-base"
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-ceramic-text-secondary">
            {isTranscribing ? 'Transcrevendo...' : `${responseText.length} caracteres`}
          </p>
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            disabled={isSubmitting || isTranscribing}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !responseText.trim()}
          className="flex-1 px-4 py-2 bg-ceramic-info text-white rounded-lg font-medium hover:bg-ceramic-info/80 disabled:bg-ceramic-neutral disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? 'Salvando...' : 'Responder'}
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 bg-ceramic-highlight text-ceramic-text-primary rounded-lg font-medium hover:bg-ceramic-highlight transition-all"
          >
            Pular
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 flex items-center gap-2 text-xs text-ceramic-text-secondary">
        <SparklesIcon className="h-4 w-4 text-ceramic-info" />
        <span>Responda quando se sentir confortável. Não é obrigatório!</span>
      </div>
    </form>
  )
}
