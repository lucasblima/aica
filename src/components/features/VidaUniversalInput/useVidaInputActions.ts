/**
 * useVidaInputActions — Hook for VidaUniversalInput
 *
 * Integrates classifyIntent (local, zero API), speech recognition,
 * and action handlers for creating tasks, events, moments, or opening chat.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { classifyIntent, type IntentResult } from '@/lib/agents/intentClassifier'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { createMoment } from '@/modules/journey/services/momentService'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('VidaInputActions')

export type ActionType = 'task' | 'event' | 'moment' | 'chat'
export type ActionStatus = 'idle' | 'creating' | 'success' | 'error'

export interface SuggestedAction {
  type: ActionType
  label: string
  icon: string
}

const ACTION_MAP: Record<string, SuggestedAction[]> = {
  atlas: [
    { type: 'task', label: 'Criar Tarefa', icon: 'clipboard' },
    { type: 'chat', label: 'Chat', icon: 'message' },
  ],
  agenda: [
    { type: 'event', label: 'Criar Evento', icon: 'calendar' },
    { type: 'task', label: 'Criar Tarefa', icon: 'clipboard' },
    { type: 'chat', label: 'Chat', icon: 'message' },
  ],
  journey: [
    { type: 'moment', label: 'Registrar Momento', icon: 'sparkles' },
    { type: 'chat', label: 'Chat', icon: 'message' },
  ],
  coordinator: [
    { type: 'chat', label: 'Enviar para Chat', icon: 'message' },
  ],
}

// Default for any other detected module
const DEFAULT_ACTIONS: SuggestedAction[] = [
  { type: 'chat', label: 'Enviar para Chat', icon: 'message' },
]

function getSuggestedActions(intent: IntentResult): SuggestedAction[] {
  return ACTION_MAP[intent.module] || DEFAULT_ACTIONS
}

export function useVidaInputActions() {
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [intent, setIntent] = useState<IntentResult | null>(null)
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle')
  const [lastActionType, setLastActionType] = useState<ActionType | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced intent classification
  const updateIntent = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text.trim()) {
      setIntent(null)
      return
    }
    debounceRef.current = setTimeout(() => {
      const result = classifyIntent(text)
      setIntent(result)
    }, 300)
  }, [])

  const handleInputChange = useCallback((text: string) => {
    setInput(text)
    setActionStatus('idle')
    updateIntent(text)
  }, [updateIntent])

  // Speech recognition
  const handleSpeechResult = useCallback((transcript: string) => {
    setInput(prev => {
      const next = prev ? `${prev} ${transcript}` : transcript
      updateIntent(next)
      return next
    })
  }, [updateIntent])

  const speech = useVoiceRecorder({
    onResult: handleSpeechResult,
  })

  // Clear success flash after 2s
  useEffect(() => {
    if (actionStatus === 'success') {
      const t = setTimeout(() => setActionStatus('idle'), 2000)
      return () => clearTimeout(t)
    }
  }, [actionStatus])

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // --- Action Handlers ---

  const createTask = useCallback(async () => {
    if (!user?.id || !input.trim()) return
    setActionStatus('creating')
    setLastActionType('task')
    try {
      // Insert directly (same pattern as TaskCreationQuickAdd — uses user_id, not created_by)
      const { error: insertError } = await supabase
        .from('work_items')
        .insert({
          user_id: user.id,
          title: input.trim().slice(0, 200),
          priority: 'medium',
          status: 'todo',
          task_type: 'task',
          archived: false,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      setActionStatus('success')
      setInput('')
      setIntent(null)
      log.debug('Task created from VidaInput')
    } catch (err) {
      log.error('Failed to create task:', err)
      setActionStatus('error')
    }
  }, [user?.id, input])

  const createEvent = useCallback(async () => {
    if (!user?.id || !input.trim()) return
    setActionStatus('creating')
    setLastActionType('event')
    try {
      // Insert as event (task_type='event') — same pattern as TaskCreationQuickAdd
      const { error: insertError } = await supabase
        .from('work_items')
        .insert({
          user_id: user.id,
          title: input.trim().slice(0, 200),
          priority: 'medium',
          status: 'todo',
          task_type: 'event',
          archived: false,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      setActionStatus('success')
      setInput('')
      setIntent(null)
      log.debug('Event created from VidaInput')
    } catch (err) {
      log.error('Failed to create event:', err)
      setActionStatus('error')
    }
  }, [user?.id, input])

  const createMomentEntry = useCallback(async () => {
    if (!user?.id || !input.trim()) return
    setActionStatus('creating')
    setLastActionType('moment')
    try {
      await createMoment(user.id, {
        type: 'text',
        content: input.trim(),
      })

      setActionStatus('success')
      setInput('')
      setIntent(null)
      log.debug('Moment created from VidaInput')
    } catch (err) {
      log.error('Failed to create moment:', err)
      setActionStatus('error')
    }
  }, [user?.id, input])

  const openChat = useCallback((message?: string) => {
    const text = message || input.trim()
    window.dispatchEvent(
      new CustomEvent('aica-chat-open', { detail: { message: text, fullscreen: true } })
    )
    setInput('')
    setIntent(null)
    setLastActionType('chat')
  }, [input])

  const executeAction = useCallback((type: ActionType) => {
    switch (type) {
      case 'task': return createTask()
      case 'event': return createEvent()
      case 'moment': return createMomentEntry()
      case 'chat': return openChat()
    }
  }, [createTask, createEvent, createMomentEntry, openChat])

  const suggestedActions = intent ? getSuggestedActions(intent) : []

  return {
    input,
    setInput: handleInputChange,
    intent,
    suggestedActions,
    actionStatus,
    lastActionType,
    executeAction,
    openChat,
    speech,
  }
}
