/**
 * VidaUniversalInput — Multi-modal input for VidaPage
 *
 * Text + voice input with dynamic action pills and quick action chips.
 * Replaces VidaChatHero with a more powerful first point of interaction.
 *
 * Flow:
 * 1. User types or speaks
 * 2. classifyIntent() detects module (zero API call)
 * 3. Action pills appear dynamically
 * 4. Quick chips allow explicit action selection
 */

import { useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Square, Send, ClipboardList, CalendarPlus,
  Sparkles, MessageCircle, CheckCircle2, Loader2, AlertCircle,
} from 'lucide-react'
import { useVidaInputActions, type ActionType } from './useVidaInputActions'
import { DailyQuestionsCarousel } from './DailyQuestionsCarousel'
import { ContextualCTACarousel } from './ContextualCTACarousel'
import { useContextualCTAs } from '@/hooks/useContextualCTAs'

const ACTION_ICONS: Record<string, typeof ClipboardList> = {
  clipboard: ClipboardList,
  calendar: CalendarPlus,
  sparkles: Sparkles,
  message: MessageCircle,
}

const QUICK_CHIPS: { type: ActionType; label: string; icon: typeof ClipboardList }[] = [
  { type: 'task', label: 'Tarefa', icon: ClipboardList },
  { type: 'event', label: 'Evento', icon: CalendarPlus },
  { type: 'moment', label: 'Momento', icon: Sparkles },
  { type: 'chat', label: 'Chat', icon: MessageCircle },
]

export function VidaUniversalInput() {
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    input,
    setInput,
    intent,
    suggestedActions,
    actionStatus,
    lastActionType,
    executeAction,
    openChat,
    speech,
  } = useVidaInputActions()
  const { ctas, isLoading: ctasLoading, isEmpty: ctasEmpty } = useContextualCTAs()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (suggestedActions.length > 0) {
        executeAction(suggestedActions[0].type)
      } else if (input.trim()) {
        openChat()
      }
    }
  }

  const handleSend = () => {
    if (suggestedActions.length > 0) {
      executeAction(suggestedActions[0].type)
    } else if (input.trim()) {
      openChat()
    }
  }

  // Waveform bars from audio level
  const waveformBars = useMemo(() => {
    const bars = 8
    return Array.from({ length: bars }, (_, i) => {
      const variance = Math.sin((Date.now() / 200) + i) * 0.3 + 0.7
      return Math.max(4, (speech.audioLevel / 100) * 24 * variance)
    })
  }, [speech.audioLevel])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isCreating = actionStatus === 'creating'
  const isSuccess = actionStatus === 'success'
  const isError = actionStatus === 'error'

  const handleSelectQuestion = useCallback((text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }, [setInput])

  const handleCtaNavigate = useCallback((viewState: string) => {
    window.dispatchEvent(
      new CustomEvent('aica-navigate', { detail: { view: viewState } })
    )
  }, [])

  const handleCtaChatAction = useCallback((text: string) => {
    openChat(text)
  }, [openChat])

  const handleCtaInputAction = useCallback((text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }, [setInput])

  return (
    <div className="ceramic-card overflow-hidden">
      {/* Contextual CTAs or Daily Questions — above input */}
      {!input.trim() && (
        <div className="px-3 pt-3 pb-1">
          {ctasEmpty ? (
            <DailyQuestionsCarousel onSelectQuestion={handleSelectQuestion} />
          ) : (
            <ContextualCTACarousel
              ctas={ctas}
              isLoading={ctasLoading}
              onNavigate={handleCtaNavigate}
              onChatAction={handleCtaChatAction}
              onInputAction={handleCtaInputAction}
            />
          )}
        </div>
      )}

      {/* Success / Error flash */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-ceramic-success/10 border-b border-ceramic-success/20"
          >
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-ceramic-success">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {lastActionType === 'task' && 'Tarefa criada!'}
                {lastActionType === 'event' && 'Evento criado!'}
                {lastActionType === 'moment' && 'Momento registrado!'}
                {lastActionType === 'chat' && 'Abrindo chat...'}
              </span>
            </div>
          </motion.div>
        )}
        {isError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-ceramic-error/10 border-b border-ceramic-error/20"
          >
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-ceramic-error">
              <AlertCircle className="w-4 h-4" />
              <span>Erro ao criar. Tente novamente.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording waveform strip */}
      <AnimatePresence>
        {speech.isListening && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-ceramic-error/5 border-b border-ceramic-error/20"
          >
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="flex items-center gap-0.5 h-6">
                {waveformBars.map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-ceramic-error rounded-full transition-all duration-75"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <span className="text-sm font-mono text-ceramic-error min-w-[3ch]">
                {formatTime(speech.recordSeconds)}
              </span>
              <div className="w-2 h-2 bg-ceramic-error rounded-full animate-pulse" />
              <span className="text-xs text-ceramic-text-secondary flex-1">Gravando...</span>
            </div>
          </motion.div>
        )}
        {speech.isTranscribing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-b border-amber-200"
          >
            <div className="flex items-center gap-2 px-4 py-2">
              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
              <span className="text-xs text-amber-700">Transcrevendo...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="flex items-center gap-2 p-3">
        {/* Chat icon — opens fullscreen chat directly */}
        <button
          onClick={() => openChat()}
          disabled={isCreating}
          className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center hover:bg-amber-500/20 transition-colors disabled:opacity-40"
          aria-label="Abrir chat"
        >
          <MessageCircle className="w-4 h-4 text-amber-600" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={speech.isListening ? 'Gravando audio...' : 'O que voce quer fazer?'}
          disabled={isCreating || speech.isListening}
          className="flex-1 bg-ceramic-cool rounded-xl px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/60 outline-none focus:ring-2 focus:ring-amber-500/30 transition-shadow disabled:opacity-60"
        />

        {/* Mic button */}
        {speech.isSupported && (
          <button
            onClick={speech.toggle}
            disabled={isCreating || speech.isTranscribing}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              speech.isListening
                ? 'bg-ceramic-error text-white animate-pulse'
                : speech.isTranscribing
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-border'
            } disabled:opacity-40`}
            aria-label={speech.isListening ? 'Parar gravacao' : speech.isTranscribing ? 'Transcrevendo...' : 'Gravar voz'}
          >
            {speech.isTranscribing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : speech.isListening ? (
              <Square className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Send / Loading */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || isCreating}
          className="shrink-0 w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-amber-600 transition-colors"
          aria-label="Enviar"
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Dynamic action pills — appear when intent is classified */}
      <AnimatePresence>
        {suggestedActions.length > 0 && input.trim() && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-ceramic-border/50"
          >
            <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">
              {intent && intent.module !== 'coordinator' && (
                <span className="text-[10px] text-ceramic-text-secondary shrink-0 uppercase tracking-wider">
                  {intent.actionHint}
                </span>
              )}
              {suggestedActions.map((action) => {
                const Icon = ACTION_ICONS[action.icon] || MessageCircle
                return (
                  <motion.button
                    key={action.type}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={() => executeAction(action.type)}
                    disabled={isCreating}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 text-xs font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {action.label}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick action chips — always visible below input */}
      <div className="flex items-center gap-2 px-3 pb-3">
        {QUICK_CHIPS.map((chip) => {
          const Icon = chip.icon
          return (
            <button
              key={chip.type}
              onClick={() => {
                if (input.trim()) {
                  executeAction(chip.type)
                } else {
                  // No text — focus input with hint
                  inputRef.current?.focus()
                }
              }}
              disabled={isCreating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-ceramic-cool text-ceramic-text-secondary text-[11px] font-medium hover:bg-ceramic-border hover:text-ceramic-text-primary transition-colors disabled:opacity-40"
            >
              <Icon className="w-3 h-3" />
              {chip.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
