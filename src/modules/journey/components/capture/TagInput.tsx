/**
 * TagInput Component
 * Quick tags with autocomplete
 */

import React, { useState, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { QUICK_TAGS } from '../../types/moment'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
}

export function TagInput({ value, onChange, maxTags = 5 }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = QUICK_TAGS.filter(
    tag =>
      !value.includes(tag) &&
      tag.toLowerCase().includes(inputValue.toLowerCase().replace('#', ''))
  )

  const addTag = (tag: string) => {
    if (value.length >= maxTags) return
    if (!tag.startsWith('#')) tag = '#' + tag
    if (!value.includes(tag)) {
      onChange([...value, tag])
      setInputValue('')
      setShowSuggestions(false)
      inputRef.current?.focus()
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue.trim())
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-white min-h-[50px]">
        {/* Selected tags */}
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Input */}
        {value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
              setShowSuggestions(true)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={value.length === 0 ? 'Adicionar tags...' : ''}
            className="flex-1 min-w-[120px] outline-none text-sm"
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestions.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Help text */}
      <p className="mt-1 text-xs text-gray-500">
        {value.length}/{maxTags} tags • Digite ou selecione tags rápidas
      </p>
    </div>
  )
}
