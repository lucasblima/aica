/**
 * EmotionPicker Component
 * Emoji wheel selector for capturing emotions
 */

import React, { useState } from 'react'
import { AVAILABLE_EMOTIONS, EmotionValue } from '../../types/moment'

interface EmotionPickerProps {
  value?: EmotionValue
  onChange: (emotion: EmotionValue) => void
  size?: 'sm' | 'md' | 'lg'
}

export function EmotionPicker({ value, onChange, size = 'md' }: EmotionPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selectedEmotion = AVAILABLE_EMOTIONS.find(e => e.value === value)

  const filteredEmotions = AVAILABLE_EMOTIONS.filter(emotion =>
    emotion.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  }

  return (
    <div className="relative">
      {/* Selected emotion display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 p-4 rounded-lg border-2 ${
          selectedEmotion
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        } transition-all`}
      >
        {selectedEmotion ? (
          <>
            <span className={sizeClasses[size]}>{selectedEmotion.emoji}</span>
            <span className="text-lg font-medium text-gray-900">
              {selectedEmotion.name}
            </span>
          </>
        ) : (
          <span className="text-gray-500">Como você está se sentindo?</span>
        )}
      </button>

      {/* Emotion picker dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Buscar emoção..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Emotion grid */}
          <div className="overflow-y-auto p-3">
            <div className="grid grid-cols-3 gap-2">
              {filteredEmotions.map(emotion => (
                <button
                  key={emotion.value}
                  type="button"
                  onClick={() => {
                    onChange(emotion.value)
                    setIsOpen(false)
                    setSearchQuery('')
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                    value === emotion.value
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <span className="text-3xl">{emotion.emoji}</span>
                  <span className="text-xs text-gray-700">{emotion.name}</span>
                </button>
              ))}
            </div>

            {filteredEmotions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma emoção encontrada
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false)
            setSearchQuery('')
          }}
        />
      )}
    </div>
  )
}
