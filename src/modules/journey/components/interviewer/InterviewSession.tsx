import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowLeft, Pause, SkipForward } from 'lucide-react'
import { useInterviewer } from '../../hooks/useInterviewer'
import type { InterviewAnswer, InterviewQuestion } from '../../types/interviewer'
import {
  QuestionCard,
  SingleChoiceRenderer,
  FreeTextRenderer,
  ScaleRenderer,
  MultiChoiceRenderer,
  LongTextRenderer,
  DateRenderer,
  RankedListRenderer,
} from './renderers'
import confetti from 'canvas-confetti'

interface InterviewSessionProps {
  sessionId: string
  onComplete: () => void
  onBack: () => void
}

export function InterviewSession({ sessionId, onComplete, onBack }: InterviewSessionProps) {
  const {
    session,
    currentQuestion,
    currentIndex,
    isLoading,
    isSubmitting,
    isComplete,
    progress,
    error,
    submitAnswer,
    skipQuestion,
    pauseSession,
  } = useInterviewer(sessionId)

  const [localAnswer, setLocalAnswer] = useState<Record<string, unknown>>({})
  const [showCPAnimation, setShowCPAnimation] = useState(false)
  const [lastCPEarned, setLastCPEarned] = useState(0)
  const [levelUpName, setLevelUpName] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!currentQuestion) return

    let answer: InterviewAnswer
    switch (currentQuestion.question_type) {
      case 'single_choice':
        if (!localAnswer.selected) return
        answer = { selected: localAnswer.selected as string }
        break
      case 'multi_choice':
        if (!localAnswer.selected || !(localAnswer.selected as string[]).length) return
        answer = { selected: localAnswer.selected as string[] }
        break
      case 'scale':
        if (localAnswer.value == null) return
        answer = { value: localAnswer.value as number }
        break
      case 'date':
        if (!localAnswer.date) return
        answer = { date: localAnswer.date as string }
        break
      case 'ranked_list':
        if (!localAnswer.ranked || !(localAnswer.ranked as string[]).length) return
        answer = { ranked: localAnswer.ranked as string[] }
        break
      case 'long_text':
        if (!localAnswer.text || !(localAnswer.text as string).trim()) return
        answer = { text: (localAnswer.text as string).trim() }
        break
      case 'free_text':
      default:
        if (!localAnswer.text || !(localAnswer.text as string).trim()) return
        answer = { text: (localAnswer.text as string).trim() }
        break
    }

    const result = await submitAnswer(answer)

    if (result.success) {
      // Show CP animation
      setLastCPEarned(result.cp_earned)
      setShowCPAnimation(true)
      setTimeout(() => setShowCPAnimation(false), 1500)

      // Show level up notification if applicable
      if (result.cp_result?.leveled_up) {
        setLevelUpName(result.cp_result.level_name)
        setTimeout(() => setLevelUpName(null), 3000)
      }

      // Reset local answer for next question
      setLocalAnswer({})
    }
  }

  const handleSkip = () => {
    setLocalAnswer({})
    skipQuestion()
  }

  const handlePause = async () => {
    await pauseSession()
    onBack()
  }

  const isAnswerValid = (): boolean => {
    if (!currentQuestion) return false
    switch (currentQuestion.question_type) {
      case 'single_choice':
        return !!localAnswer.selected
      case 'multi_choice':
        return Array.isArray(localAnswer.selected) && (localAnswer.selected as string[]).length > 0
      case 'scale':
        return localAnswer.value != null
      case 'date':
        return !!localAnswer.date
      case 'ranked_list':
        return Array.isArray(localAnswer.ranked) && (localAnswer.ranked as string[]).length > 0
      case 'free_text':
      case 'long_text':
      default:
        return !!(localAnswer.text && (localAnswer.text as string).trim())
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="ceramic-card p-6 animate-pulse">
          <div className="h-2 w-full bg-ceramic-cool/30 rounded-full mb-6" />
          <div className="h-6 w-3/4 bg-ceramic-cool/30 rounded mb-4" />
          <div className="h-20 w-full bg-ceramic-cool/30 rounded" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="ceramic-card p-6 text-center space-y-3">
        <p className="text-ceramic-error font-medium">Erro ao carregar a entrevista</p>
        <p className="text-sm text-ceramic-text-secondary">{error.message}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-all"
        >
          Voltar
        </button>
      </div>
    )
  }

  // Complete state
  if (isComplete && session) {
    // Trigger confetti once
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } })

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ceramic-card p-8 text-center space-y-4"
      >
        <div className="text-5xl mb-2">{session.icon || '🎉'}</div>
        <h2 className="text-xl font-bold text-ceramic-text-primary">
          Categoria Completa!
        </h2>
        <p className="text-ceramic-text-secondary">
          Voce completou todas as {session.total_questions} perguntas de <strong>{session.title}</strong>.
        </p>
        <div className="flex items-center justify-center gap-2 text-amber-600 font-bold text-lg">
          <Sparkles className="h-5 w-5" />
          <span>+{session.cp_earned} CP ganhos</span>
        </div>
        <button
          onClick={onComplete}
          className="mt-4 px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all"
        >
          Voltar para Categorias
        </button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back button + Progress bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-ceramic-cool/30 transition-all"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5 text-ceramic-text-secondary" />
        </button>
        <div className="flex-1">
          <div className="h-2 w-full bg-ceramic-cool/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
        <span className="text-xs font-medium text-ceramic-text-secondary whitespace-nowrap">
          {progress.answered}/{progress.total}
        </span>
      </div>

      {/* Question Card with transition */}
      <AnimatePresence mode="wait">
        {currentQuestion && (
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={progress.total}
          >
            {renderQuestion(currentQuestion, localAnswer, setLocalAnswer)}
          </QuestionCard>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {currentQuestion && (
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!isAnswerValid() || isSubmitting}
            className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:bg-ceramic-cool/40 disabled:text-ceramic-text-secondary disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Salvando...' : 'Responder'}
          </button>
          <button
            onClick={handleSkip}
            className="px-4 py-3 rounded-xl font-medium text-ceramic-text-secondary hover:bg-ceramic-cool/30 transition-all flex items-center gap-1.5"
          >
            <SkipForward className="h-4 w-4" />
            Pular
          </button>
          <button
            onClick={handlePause}
            className="px-4 py-3 rounded-xl font-medium text-ceramic-text-secondary hover:bg-ceramic-cool/30 transition-all flex items-center gap-1.5"
          >
            <Pause className="h-4 w-4" />
            Pausar
          </button>
        </div>
      )}

      {/* CP Animation overlay */}
      <AnimatePresence>
        {showCPAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div className="ceramic-card p-6 text-center shadow-lg">
              <Sparkles className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-ceramic-text-primary">
                +{lastCPEarned} CP
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up notification */}
      <AnimatePresence>
        {levelUpName && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div className="ceramic-card p-8 text-center shadow-xl border-2 border-amber-400">
              <div className="text-4xl mb-3">🎖️</div>
              <div className="text-lg font-bold text-ceramic-text-primary mb-1">
                Level Up!
              </div>
              <div className="text-amber-600 font-semibold">
                {levelUpName}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function renderQuestion(
  question: InterviewQuestion,
  localAnswer: Record<string, unknown>,
  setLocalAnswer: (val: Record<string, unknown>) => void
) {
  switch (question.question_type) {
    case 'single_choice':
      return (
        <SingleChoiceRenderer
          question={question}
          value={(localAnswer.selected as string) || null}
          onChange={val => setLocalAnswer({ selected: val })}
        />
      )
    case 'multi_choice':
      return (
        <MultiChoiceRenderer
          question={question}
          value={(localAnswer.selected as string[]) || []}
          onChange={selected => setLocalAnswer({ selected })}
        />
      )
    case 'scale':
      return (
        <ScaleRenderer
          question={question}
          value={(localAnswer.value as number) ?? null}
          onChange={val => setLocalAnswer({ value: val })}
        />
      )
    case 'long_text':
      return (
        <LongTextRenderer
          value={(localAnswer.text as string) || ''}
          onChange={text => setLocalAnswer({ text })}
          placeholder="Conte com detalhes..."
          maxLength={2000}
        />
      )
    case 'date':
      return (
        <DateRenderer
          question={question}
          value={(localAnswer.date as string) || null}
          onChange={date => setLocalAnswer({ date })}
        />
      )
    case 'ranked_list':
      return (
        <RankedListRenderer
          question={question}
          value={(localAnswer.ranked as string[]) || []}
          onChange={ranked => setLocalAnswer({ ranked })}
        />
      )
    case 'free_text':
    default:
      return (
        <FreeTextRenderer
          value={(localAnswer.text as string) || ''}
          onChange={text => setLocalAnswer({ text })}
          placeholder="Sua resposta..."
        />
      )
  }
}
