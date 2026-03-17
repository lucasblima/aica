/**
 * UnifiedAgentChat — Trust-level-aware chat wrapper
 *
 * Wraps the existing ModuleAgentChat with:
 * - Trust level badge in the header area
 * - Module selector for routing to different agents
 * - Trust-level-aware behavior descriptions
 *
 * This is the unified entry point for AI chat across all modules.
 */

import React, { useState, useEffect } from 'react'
import { Bot, ChevronDown } from 'lucide-react'
import { ModuleAgentChat } from '@/components/features/ModuleAgentChat/ModuleAgentChat'
import { MODULE_AGENT_CONFIGS } from '@/components/features/ModuleAgentChat/moduleAgentConfigs'
import { TrustLevelBadge } from './TrustLevelBadge'
import { useTrustLevel } from '@/hooks/useTrustLevel'
import type { AgentModule } from '@/lib/agents'

// Modules available for selection (exclude coordinator)
const SELECTABLE_MODULES = Object.keys(MODULE_AGENT_CONFIGS) as Exclude<AgentModule, 'coordinator'>[]

const STORAGE_KEY = 'aica-unified-chat-module'

const TRUST_DESCRIPTIONS: Record<string, string> = {
  suggest_confirm: 'O agente sugere ações e aguarda sua confirmacao antes de executar.',
  execute_validate: 'O agente executa ações automaticamente e você valida os resultados.',
  jarvis: 'Modo autonomo — o agente age proativamente com base nos seus padrões.',
}

interface UnifiedAgentChatProps {
  /** Whether the chat is open */
  isOpen: boolean
  /** Callback to close the chat */
  onClose: () => void
  /** Initial module to show (default: atlas) */
  initialModule?: Exclude<AgentModule, 'coordinator'>
}

export function UnifiedAgentChat({
  isOpen,
  onClose,
  initialModule = 'atlas',
}: UnifiedAgentChatProps) {
  const [selectedModule, setSelectedModule] = useState<Exclude<AgentModule, 'coordinator'>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && SELECTABLE_MODULES.includes(saved as any)) {
        return saved as Exclude<AgentModule, 'coordinator'>
      }
    } catch {}
    return initialModule
  })
  const [showModuleSelector, setShowModuleSelector] = useState(false)
  const { trustLevel, progress, isLoading } = useTrustLevel()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selectedModule)
    } catch {}
  }, [selectedModule])

  const moduleConfig = MODULE_AGENT_CONFIGS[selectedModule]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      <div className="w-full max-w-md flex flex-col pointer-events-auto">
        {/* Trust Level + Module Selector Bar */}
        <div className="mb-2 flex items-center justify-between gap-2">
          {/* Module Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModuleSelector(!showModuleSelector)}
              className="flex items-center gap-2 px-3 py-1.5 bg-ceramic-base rounded-full shadow-ceramic-emboss border border-ceramic-border text-sm font-medium text-ceramic-text-primary hover:bg-ceramic-cool transition-colors"
            >
              <Bot size={14} className={moduleConfig.accentColor} />
              <span>{moduleConfig.displayName}</span>
              <ChevronDown size={12} className="text-ceramic-text-secondary" />
            </button>

            {/* Module Dropdown */}
            {showModuleSelector && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowModuleSelector(false)}
                />
                <div className="absolute bottom-full left-0 mb-1 z-20 bg-ceramic-base rounded-xl shadow-ceramic-elevated border border-ceramic-border py-1 min-w-[160px] max-h-[240px] overflow-y-auto">
                  {SELECTABLE_MODULES.map((mod) => {
                    const config = MODULE_AGENT_CONFIGS[mod]
                    return (
                      <button
                        key={mod}
                        onClick={() => {
                          setSelectedModule(mod)
                          setShowModuleSelector(false)
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                          mod === selectedModule
                            ? 'bg-ceramic-cool text-ceramic-text-primary font-medium'
                            : 'text-ceramic-text-secondary hover:bg-ceramic-cool hover:text-ceramic-text-primary'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${config.accentBg}`} />
                        {config.displayName}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Trust Level Badge */}
          {!isLoading && (
            <div className="group relative">
              <TrustLevelBadge level={trustLevel} progress={progress} />
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-56 p-2 bg-ceramic-base rounded-lg shadow-ceramic-elevated border border-ceramic-border text-xs text-ceramic-text-secondary z-30">
                {TRUST_DESCRIPTIONS[trustLevel]}
              </div>
            </div>
          )}
        </div>

        {/* Delegate to existing ModuleAgentChat */}
        <ModuleAgentChat
          module={selectedModule}
          displayName={moduleConfig.displayName}
          accentColor={moduleConfig.accentColor}
          accentBg={moduleConfig.accentBg}
          welcomeMessage={moduleConfig.welcomeMessage}
          placeholder={moduleConfig.placeholder}
          suggestedPrompts={moduleConfig.suggestedPrompts}
          isOpen={true}
          onClose={onClose}
        />
      </div>
    </div>
  )
}
