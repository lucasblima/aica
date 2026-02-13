/**
 * CeramicMomentCard Component
 * Timeline card with Digital Ceramic design system
 * Elevated tile appearance with angular aesthetics
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrashIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getEmotionDisplay } from '../../types/emotionHelper'

export interface CeramicMomentCardProps {
  moment: {
    id: string
    content?: string
    emotion?: string
    tags?: string[]
    created_at: string
  }
  onDelete?: (id: string) => void
}

export function CeramicMomentCard({ moment, onDelete }: CeramicMomentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const createdAt = new Date(moment.created_at)
  const dateFormatted = format(createdAt, "dd 'de' MMMM", { locale: ptBR })
  const timeFormatted = format(createdAt, 'HH:mm', { locale: ptBR })
  const emotionDisplay = getEmotionDisplay(moment.emotion)

  const handleDelete = () => {
    if (onDelete) {
      const confirmed = window.confirm(
        'Tem certeza que deseja deletar este momento? Esta ação não pode ser desfeita.'
      )
      if (confirmed) {
        setIsDeleting(true)
        onDelete(moment.id)
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        ceramic-tile p-5 transition-all duration-300
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Header: Emotion, Date, and Time */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Emotion */}
          {moment.emotion && (
            <motion.span
              className="text-3xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              title={emotionDisplay.label}
            >
              {emotionDisplay.emoji}
            </motion.span>
          )}

          {/* Date */}
          <div className="flex flex-col">
            <span className="text-lg font-bold text-etched capitalize">
              {dateFormatted}
            </span>
            <span className="text-sm text-[#948D82]">{timeFormatted}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {moment.content && (
        <div className="mb-4">
          <p className="text-base text-[#5C554B] leading-relaxed whitespace-pre-wrap">
            {moment.content}
          </p>
        </div>
      )}

      {/* Tags */}
      {moment.tags && moment.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {moment.tags.map((tag, index) => (
            <motion.span
              key={`${tag}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="ceramic-inset-shallow px-3 py-1 text-xs text-[#5C554B] rounded-full"
            >
              {tag}
            </motion.span>
          ))}
        </div>
      )}

      {/* Delete Button */}
      <AnimatePresence>
        {isHovered && onDelete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center pt-2 border-t border-[#E0DDD5]"
          >
            <button
              onClick={handleDelete}
              className="
                ceramic-inset
                px-4 py-2
                flex items-center gap-2
                text-sm text-[#DC2626]
                hover:bg-[#FEE2E2]
                transition-all duration-200
                rounded-full
              "
            >
              <TrashIcon className="h-4 w-4" />
              <span className="font-medium">Deletar momento</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
