import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle } from 'lucide-react'
import type { InterviewQuestion, InterviewCategory } from '../../../types/interviewer'
import { INTERVIEW_CATEGORY_META } from '../../../types/interviewer'

// TODO (#514): Implement dynamic adaptive interviewer agent — deferred to future sprint

/** Hint text explaining why a question category matters */
const CATEGORY_HINTS: Record<InterviewCategory, string> = {
  biografia: 'Conhecer sua historia ajuda a personalizar recomendacoes e entender seu contexto de vida.',
  anamnese: 'Reconhecer padroes de saude e bem-estar ajuda a identificar o que impacta sua energia e humor.',
  censo: 'Entender seu contexto socioeconomico permite sugestoes mais relevantes para sua realidade.',
  preferencias: 'Saber como voce aprende e trabalha permite adaptar a experiencia ao seu estilo.',
  conexoes: 'Mapear seus relacionamentos ajuda a fortalecer sua rede de apoio e conexoes importantes.',
  objetivos: 'Refletir sobre metas mantem o foco no que importa e ajuda a acompanhar seu progresso.',
}

interface QuestionCardProps {
  question: InterviewQuestion
  questionNumber: number
  totalQuestions: number
  children: React.ReactNode
}

export function QuestionCard({ question, questionNumber, totalQuestions, children }: QuestionCardProps) {
  const meta = INTERVIEW_CATEGORY_META[question.category]
  const [showHint, setShowHint] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="ceramic-card p-6 space-y-5"
    >
      {/* Header: category badge + difficulty + question number */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: meta.color }}
          >
            <span>{meta.icon}</span>
            {meta.label}
          </span>
          {/* Difficulty dots */}
          <div className="flex gap-0.5">
            {[1, 2, 3].map(level => (
              <div
                key={level}
                className={`w-1.5 h-1.5 rounded-full ${
                  level <= question.difficulty_level ? 'bg-amber-500' : 'bg-ceramic-cool/40'
                }`}
              />
            ))}
          </div>
        </div>
        <span className="text-xs text-ceramic-text-secondary">
          {questionNumber}/{totalQuestions}
        </span>
      </div>

      {/* Question text */}
      <h3 className="text-lg font-semibold text-ceramic-text-primary leading-relaxed">
        {question.question_text}
      </h3>

      {/* Hint: "Por que perguntamos isso?" */}
      <div>
        <button
          type="button"
          onClick={() => setShowHint(prev => !prev)}
          className="flex items-center gap-1.5 text-xs text-ceramic-text-secondary hover:text-ceramic-info transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Por que perguntamos isso?
        </button>
        <AnimatePresence>
          {showHint && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 text-xs text-ceramic-text-secondary leading-relaxed pl-5"
            >
              {CATEGORY_HINTS[question.category]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Renderer slot */}
      {children}
    </motion.div>
  )
}
