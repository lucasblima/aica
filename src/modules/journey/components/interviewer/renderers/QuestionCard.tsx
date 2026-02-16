import React from 'react'
import { motion } from 'framer-motion'
import type { InterviewQuestion } from '../../../types/interviewer'
import { INTERVIEW_CATEGORY_META } from '../../../types/interviewer'

interface QuestionCardProps {
  question: InterviewQuestion
  questionNumber: number
  totalQuestions: number
  children: React.ReactNode
}

export function QuestionCard({ question, questionNumber, totalQuestions, children }: QuestionCardProps) {
  const meta = INTERVIEW_CATEGORY_META[question.category]

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

      {/* Renderer slot */}
      {children}
    </motion.div>
  )
}
