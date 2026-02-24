/**
 * VidaPage - Central hub of AICA Life OS
 *
 * Johnny Ive philosophy: radical simplicity, every pixel earns its place.
 * Inline chat center + module pulse + module grid.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Send,
  Loader2,
  Dumbbell,
  Mic,
  Wallet,
  ClipboardList,
  Compass,
  Network,
  Sparkles,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useChatSession } from '@/hooks/useChatSession'
import type { DisplayMessage } from '@/hooks/useChatSession'
import { useConsciousnessPoints } from '@/modules/journey/hooks/useConsciousnessPoints'
import { formatMarkdownToHTML } from '@/lib/formatMarkdown'
import { staggerContainer, staggerItem } from '@/lib/animations/ceramic-motion'
import { ModulePulse } from '@/components/features/ModulePulse'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

const MODULE_GRID = [
  { key: 'flux', icon: Dumbbell, label: 'Flux', route: '/flux' },
  { key: 'studio', icon: Mic, label: 'Studio', route: '/studio' },
  { key: 'finance', icon: Wallet, label: 'Finance', route: '/finance' },
  { key: 'atlas', icon: ClipboardList, label: 'Atlas', route: '/' },
  { key: 'journey', icon: Sparkles, label: 'Jornada', route: '/' },
  { key: 'connections', icon: Network, label: 'Conexoes', route: '/connections' },
  { key: 'agenda', icon: Calendar, label: 'Agenda', route: '/' },
  { key: 'grants', icon: Compass, label: 'Grants', route: '/' },
] as const

export default function VidaPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { stats } = useConsciousnessPoints()
  const {
    messages,
    isLoading,
    error,
    sendMessage,
  } = useChatSession()

  const [input, setInput] = useState('')
  const [chatExpanded, setChatExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const firstName = useMemo(() => {
    const meta = user?.user_metadata
    const full = meta?.full_name || meta?.name || user?.email || ''
    return full.split(' ')[0] || 'Voce'
  }, [user])

  // Expand chat when messages appear
  useEffect(() => {
    if (messages.length > 0) {
      setChatExpanded(true)
    }
  }, [messages.length])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    setInput('')
    setChatExpanded(true)
    await sendMessage(trimmed)
  }, [input, isLoading, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleModuleClick = useCallback((route: string, key: string) => {
    // View-state driven modules navigate via state, not route
    if (['atlas', 'journey', 'grants'].includes(key)) {
      // These are view-state driven — navigate to root which triggers ViewState
      // For now just navigate to / since they're rendered inline
      navigate('/')
      return
    }
    navigate(route)
  }, [navigate])

  return (
    <div className="min-h-screen bg-ceramic-base">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-32 space-y-8">
        {/* Greeting + Level */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-ceramic-text-primary">
            {getGreeting()}, {firstName}
          </h1>
          {stats && (
            <div className="flex items-center gap-1.5 bg-ceramic-cool rounded-full px-3 py-1">
              <span className="text-xs font-bold text-ceramic-text-secondary">
                Lv.{stats.level}
              </span>
              <span className="text-[10px] text-ceramic-text-secondary">
                {stats.level_name}
              </span>
            </div>
          )}
        </motion.div>

        {/* Inline Chat */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-ceramic-base rounded-2xl shadow-ceramic-emboss overflow-hidden"
        >
          {/* Chat messages (scrollable, shown when expanded) */}
          {chatExpanded && messages.length > 0 && (
            <div className="max-h-80 overflow-y-auto p-4 space-y-3">
              {messages.map((msg: DisplayMessage) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-white rounded-br-md'
                        : 'bg-ceramic-cool text-ceramic-text-primary rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div
                        className="prose prose-sm max-w-none [&_strong]:font-semibold [&_code]:text-xs [&_ul]:my-1 [&_li]:my-0"
                        dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(msg.content) }}
                      />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-ceramic-cool rounded-2xl rounded-bl-md px-4 py-2.5">
                    <Loader2 size={16} className="animate-spin text-ceramic-text-secondary" />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center">
                  <p className="text-xs text-ceramic-error">{error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Chat input */}
          <div className="flex items-center gap-2 p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Como posso te ajudar?"
              disabled={isLoading}
              className="flex-1 bg-ceramic-cool rounded-xl px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/60 outline-none focus:ring-2 focus:ring-amber-500/30 transition-shadow"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-amber-600 transition-colors"
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          </div>
        </motion.div>

        {/* Module Pulse */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <ModulePulse />
        </motion.div>

        {/* Module Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-4 gap-3"
        >
          {MODULE_GRID.map(({ key, icon: Icon, label, route }) => (
            <motion.button
              key={key}
              variants={staggerItem}
              whileHover="hover"
              whileTap="pressed"
              onClick={() => handleModuleClick(route, key)}
              className="flex flex-col items-center gap-2 py-3 rounded-xl bg-ceramic-base shadow-ceramic-emboss hover:shadow-lg transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-ceramic-cool flex items-center justify-center">
                <Icon size={18} className="text-ceramic-text-primary" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">
                {label}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
