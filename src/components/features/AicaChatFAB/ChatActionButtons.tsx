/**
 * ChatActionButtons — Renders deterministic action chips below assistant messages.
 *
 * Each button represents a server-suggested action (complete task, create moment, etc.)
 * with loading/success/error states and auto-reset after 3 seconds.
 */

import { useState, useCallback } from 'react'
import {
  CheckCircle,
  Play,
  Calendar,
  Star,
  PenLine,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { ChatAction, ChatActionStatus } from '@/types/chatActions'

const ICON_MAP: Record<string, typeof CheckCircle> = {
  CheckCircle,
  Play,
  Calendar,
  Star,
  PenLine,
  Plus,
}

interface ChatActionButtonsProps {
  actions: ChatAction[]
  onExecute: (action: ChatAction) => Promise<void>
}

export function ChatActionButtons({ actions, onExecute }: ChatActionButtonsProps) {
  const [statuses, setStatuses] = useState<Record<string, ChatActionStatus>>({})

  const handleClick = useCallback(async (action: ChatAction) => {
    const currentStatus = statuses[action.id]
    if (currentStatus === 'loading' || currentStatus === 'success') return

    setStatuses(prev => ({ ...prev, [action.id]: 'loading' }))

    try {
      await onExecute(action)
      setStatuses(prev => ({ ...prev, [action.id]: 'success' }))
      setTimeout(() => {
        setStatuses(prev => ({ ...prev, [action.id]: 'idle' }))
      }, 3000)
    } catch {
      setStatuses(prev => ({ ...prev, [action.id]: 'error' }))
      setTimeout(() => {
        setStatuses(prev => ({ ...prev, [action.id]: 'idle' }))
      }, 3000)
    }
  }, [statuses, onExecute])

  if (!actions.length) return null

  const visibleActions = actions.slice(0, 5)

  return (
    <div className="aica-fab-actions">
      {visibleActions.map(action => {
        const status = statuses[action.id] || 'idle'
        const IconComponent = ICON_MAP[action.icon]

        return (
          <button
            key={action.id}
            className={`aica-fab-action-btn aica-fab-action-btn--${status}`}
            onClick={() => handleClick(action)}
            disabled={status === 'loading'}
            title={action.label}
          >
            {status === 'loading' ? (
              <Loader2 size={12} className="aica-fab-loading-icon" />
            ) : status === 'success' ? (
              <CheckCircle size={12} />
            ) : status === 'error' ? (
              <AlertCircle size={12} />
            ) : IconComponent ? (
              <IconComponent size={12} />
            ) : (
              <Star size={12} />
            )}
            <span>{status === 'success' ? 'Feito!' : action.label}</span>
          </button>
        )
      })}
    </div>
  )
}
