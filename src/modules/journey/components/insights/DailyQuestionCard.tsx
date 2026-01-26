/**
 * DailyQuestionCard Component
 * Displays daily voluntary question with answer interface
 */

import React, { useState } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { QuestionWithResponse } from '../../types/dailyQuestion'

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
    }
  }, [question.id, question.user_response, lastQuestionId])

  const categoryColor = QUESTION_CATEGORY_COLORS[question.category]
  const categoryIcon = QUESTION_CATEGORY_ICONS[question.category]

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
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircleIcon className="h-6 w-6 text-green-500" />
          <h3 className="text-lg font-semibold text-green-900">Pergunta Respondida!</h3>
        </div>

        <p className="text-gray-700 mb-3">{question.question_text}</p>

        <div className="p-3 bg-white rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Sua resposta:</p>
          <p className="text-gray-900">{displayResponse}</p>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
          <SparklesIcon className="h-4 w-4" />
          <span>Você ganhou +10 CP por responder!</span>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-xl p-6"
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
          <h3 className="text-sm font-medium text-gray-600">Pergunta do Dia</h3>
          <p
            className="text-xs font-semibold"
            style={{ color: categoryColor }}
          >
            {question.category}
          </p>
        </div>

        <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
          +10 CP
        </div>
      </div>

      {/* Question */}
      <p className="text-lg font-medium text-gray-900 mb-4">{question.question_text}</p>

      {/* Answer input */}
      <div className="mb-4">
        <textarea
          value={responseText}
          onChange={e => setResponseText(e.target.value)}
          placeholder="Digite sua resposta..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
        />
        <p className="mt-1 text-xs text-gray-500">{responseText.length} caracteres</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !responseText.trim()}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? 'Salvando...' : 'Responder'}
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
          >
            Pular
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
        <SparklesIcon className="h-4 w-4 text-blue-500" />
        <span>Responda quando se sentir confortável. Não é obrigatório!</span>
      </div>
    </form>
  )
}
