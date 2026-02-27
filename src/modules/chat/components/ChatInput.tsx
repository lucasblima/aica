/**
 * ChatInput — Text input with send button
 *
 * Uses textarea for Shift+Enter newline support.
 * Enter sends, disabled when loading/streaming.
 * Auto-focuses on mount.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [])

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    adjustHeight()
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    setValue('')
    // Reset height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onSend(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-input-bar">
      <textarea
        ref={textareaRef}
        className="chat-input-textarea"
        placeholder="Pergunte algo..."
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
      />
      <button
        className="chat-send-btn"
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        aria-label="Enviar"
      >
        <Send size={18} />
      </button>
    </div>
  )
}
