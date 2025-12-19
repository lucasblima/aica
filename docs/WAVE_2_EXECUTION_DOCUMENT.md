# Wave 2 Execution Document - Operation Ceramic Concierge

**Master Architect:** Claude (Opus 4.5)
**Created:** 2025-12-18
**Status:** READY FOR EXECUTION

---

## Executive Summary

This document provides finalized prompts and execution guidance for **Wave 2** of Operation Ceramic Concierge. Wave 1 has been verified as complete, and all dependencies are satisfied.

### Wave 1 Verification Status

| Task | Component | Status | Location |
|------|-----------|--------|----------|
| FASE 1.1 | IdentityPassport clickable | COMPLETE | `src/components/IdentityPassport/IdentityPassport.tsx` |
| FASE 1.2 | Tabs hidden | COMPLETE | `src/pages/Home.tsx` line 165 |
| FASE 1.3 | EfficiencyFlowCard relocated | COMPLETE | `src/components/ProfileModal/ProfileModal.tsx` lines 174-183 |
| FASE 2.1 | ContextCard created | COMPLETE | `src/components/ContextCard/ContextCard.tsx` |
| FASE 2.3 | ModuleTray created | COMPLETE | `src/components/ModuleTray/ModuleTray.tsx` |
| FASE 3.2 | Voice Glow | COMPLETE | `components/BottomNav.tsx` lines 38-56 |
| GAP 3 | Daily Questions AI | COMPLETE | `src/modules/journey/services/dailyQuestionService.ts` |
| GAP 4 | Schema Validation | COMPLETE | `src/services/journeyValidator.ts` |
| GAP 5 | VitalStatsTray removed | COMPLETE | Home.tsx cleaned |
| GAP 6 | Grid minimalista | COMPLETE | Home.tsx lines 269-331 |

**All Wave 1 dependencies satisfied. Wave 2 is CLEARED FOR LAUNCH.**

---

## Wave 2 Tracks Overview

| Track | Task | Duration | Dependencies |
|-------|------|----------|--------------|
| Track 3 | useContextSource hook | 60 min | ContextCard, dailyQuestionService, journeyValidator |
| Track 4 | AreaQuickActionModal + ContextCard confirmation | 75 min | ContextCard, ModuleTray |
| Track 6B | ProfileModal tabs | 45 min | EfficiencyFlowCard in ProfileModal |

**Recommended Execution:** All 3 tracks can run in PARALLEL.

---

## Track 3: Context Logic (useContextSource)

### Context Atualizado

Wave 1 created critical dependencies that this track consumes:
- `dailyQuestionService.ts` provides `getDailyQuestionWithContext(userId)` and `saveDailyResponse()`
- `journeyValidator.ts` provides `journeyValidator.isJourneyBlocked()` and `getNextRequiredField()`
- `useJourneyValidation.ts` hook provides React integration with `isBlocked`, `missingFields`, `nextRequiredField`

### Arquivos a Ler Primeiro

1. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/modules/journey/services/dailyQuestionService.ts` - Para entender interface de getDailyQuestionWithContext
2. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/modules/journey/hooks/useJourneyValidation.ts` - Para reutilizar hook existente
3. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/services/journeyValidator.ts` - Para entender JourneyValidationResult
4. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ContextCard/ContextCard.tsx` - Para entender interface de props

### Implementacao

**Novo Arquivo:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/hooks/useContextSource.ts`

```typescript
/**
 * useContextSource Hook
 * Track 3: Context Logic - FASE 2.2
 *
 * Intelligent context source hook that determines what question/prompt
 * to show in the ContextCard based on user state.
 *
 * Priority Hierarchy:
 * 1. Event-based: Upcoming calendar event in next 2 hours
 * 2. Journey-based: Active journey with blocked/incomplete state
 * 3. Daily Question: AI-generated or fallback question
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getDailyQuestionWithContext,
  saveDailyResponse,
} from '@/modules/journey/services/dailyQuestionService';
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';

// ============================================================
// Types
// ============================================================

export interface ContextSource {
  /** The contextual question/prompt */
  question: string;
  /** Source type for UI styling */
  source: 'event' | 'journey' | 'daily';
  /** Human-readable source label */
  sourceLabel: string;
  /** Metadata about the source */
  metadata?: {
    eventId?: string;
    journeyId?: string;
    questionId?: string;
    eventTime?: Date;
  };
  /** Handler when user responds */
  onRespond: (response: string) => Promise<void>;
  /** Handler to dismiss this context */
  onDismiss: () => void;
}

export interface UseContextSourceOptions {
  userId: string;
  /** Hours ahead to check for events (default: 2) */
  eventLookahead?: number;
  /** Whether to enable AI questions (default: true) */
  enableAI?: boolean;
  /** Journey ID to check for blocked state (optional) */
  activeJourneyId?: string;
}

export interface UseContextSourceReturn {
  context: ContextSource | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Format event time for display
 */
function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Check for upcoming calendar events
 */
async function checkUpcomingEvents(
  userId: string,
  hoursAhead: number
): Promise<ContextSource | null> {
  try {
    const now = new Date();
    const lookahead = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('id, title, start_time, description')
      .eq('user_id', userId)
      .gte('start_time', now.toISOString())
      .lte('start_time', lookahead.toISOString())
      .order('start_time', { ascending: true })
      .limit(1);

    if (error || !events || events.length === 0) return null;

    const event = events[0];
    const eventTime = new Date(event.start_time);
    const minutesUntil = Math.round(
      (eventTime.getTime() - now.getTime()) / 60000
    );

    return {
      question: `Voce tem "${event.title}" em ${minutesUntil} minutos. Como deseja se preparar?`,
      source: 'event',
      sourceLabel: formatEventTime(eventTime),
      metadata: {
        eventId: event.id,
        eventTime,
      },
      onRespond: async (response: string) => {
        await supabase.from('event_notes').insert({
          event_id: event.id,
          user_id: userId,
          note: response,
          type: 'preparation',
        });
      },
      onDismiss: () => {},
    };
  } catch (err) {
    console.error('[useContextSource] Error checking events:', err);
    return null;
  }
}

/**
 * Create journey context from validation result
 */
function createJourneyContext(
  validation: { isBlocked: boolean; nextRequiredField?: { key: string; label: string } | null },
  journey: { id: string; name: string },
  userId: string
): ContextSource {
  const nextField = validation.nextRequiredField;
  const question = nextField
    ? `Para continuar sua trilha, precisamos saber: ${nextField.label}`
    : `Sua trilha "${journey.name}" precisa de atencao. O que gostaria de fazer?`;

  return {
    question,
    source: 'journey',
    sourceLabel: journey.name,
    metadata: {
      journeyId: journey.id,
    },
    onRespond: async (response: string) => {
      if (nextField) {
        await supabase.from('journey_context').upsert({
          journey_id: journey.id,
          user_id: userId,
          field_key: nextField.key,
          value: response,
          updated_at: new Date().toISOString(),
        });
      }
    },
    onDismiss: () => {},
  };
}

/**
 * Fetch daily question using the 3-tier cascade
 */
async function fetchDailyQuestion(
  userId: string
): Promise<ContextSource | null> {
  try {
    const result = await getDailyQuestionWithContext(userId);

    return {
      question: result.question.question_text,
      source: 'daily',
      sourceLabel: result.source === 'ai' ? 'IA' : 'Reflexao',
      metadata: {
        questionId: result.question.id,
      },
      onRespond: async (response: string) => {
        await saveDailyResponse(
          userId,
          result.question.id,
          response,
          result.source
        );
      },
      onDismiss: () => {},
    };
  } catch (err) {
    console.error('[useContextSource] Error fetching daily question:', err);
    return null;
  }
}

// ============================================================
// Main Hook
// ============================================================

export function useContextSource({
  userId,
  eventLookahead = 2,
  enableAI = true,
  activeJourneyId,
}: UseContextSourceOptions): UseContextSourceReturn {
  const [context, setContext] = useState<ContextSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Use existing validation hook for journey checks
  const {
    isBlocked: journeyBlocked,
    nextRequiredField,
    schema: journeySchema,
  } = useJourneyValidation(activeJourneyId || 'default', null, {
    autoValidate: !!activeJourneyId,
  });

  // Build unique context ID for dismissal tracking
  const getContextId = useCallback((ctx: ContextSource): string => {
    if (ctx.source === 'event' && ctx.metadata?.eventId) {
      return `event-${ctx.metadata.eventId}`;
    }
    if (ctx.source === 'journey' && ctx.metadata?.journeyId) {
      return `journey-${ctx.metadata.journeyId}`;
    }
    if (ctx.source === 'daily' && ctx.metadata?.questionId) {
      return `daily-${ctx.metadata.questionId}`;
    }
    return `${ctx.source}-${Date.now()}`;
  }, []);

  // Main fetch function
  const fetchContext = useCallback(async () => {
    if (!userId) {
      setContext(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // PRIORITY 1: Check for upcoming calendar events
      const eventContext = await checkUpcomingEvents(userId, eventLookahead);
      if (eventContext) {
        const contextId = getContextId(eventContext);
        if (!dismissed.includes(contextId)) {
          // Wire up dismiss handler
          eventContext.onDismiss = () => {
            setDismissed((prev) => [...prev, contextId]);
            setContext(null);
          };
          setContext(eventContext);
          setIsLoading(false);
          return;
        }
      }

      // PRIORITY 2: Check for blocked journeys
      if (activeJourneyId && journeyBlocked && journeySchema) {
        const journeyContext = createJourneyContext(
          { isBlocked: journeyBlocked, nextRequiredField },
          { id: activeJourneyId, name: journeySchema.journeyId },
          userId
        );
        const contextId = getContextId(journeyContext);
        if (!dismissed.includes(contextId)) {
          journeyContext.onDismiss = () => {
            setDismissed((prev) => [...prev, contextId]);
            setContext(null);
          };
          setContext(journeyContext);
          setIsLoading(false);
          return;
        }
      }

      // PRIORITY 3: Daily question (AI or fallback)
      if (enableAI) {
        const dailyContext = await fetchDailyQuestion(userId);
        if (dailyContext) {
          const contextId = getContextId(dailyContext);
          if (!dismissed.includes(contextId)) {
            dailyContext.onDismiss = () => {
              setDismissed((prev) => [...prev, contextId]);
              setContext(null);
            };
            setContext(dailyContext);
            setIsLoading(false);
            return;
          }
        }
      }

      // No context available
      setContext(null);
    } catch (err) {
      console.error('[useContextSource] Error:', err);
      setError('Erro ao carregar contexto');
      setContext(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    eventLookahead,
    enableAI,
    activeJourneyId,
    dismissed,
    journeyBlocked,
    nextRequiredField,
    journeySchema,
    getContextId,
  ]);

  // Initial fetch and re-fetch on dependency changes
  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  // Re-fetch after dismiss with slight delay
  useEffect(() => {
    if (dismissed.length > 0 && !context) {
      const timer = setTimeout(() => fetchContext(), 100);
      return () => clearTimeout(timer);
    }
  }, [dismissed, context, fetchContext]);

  return {
    context,
    isLoading,
    error,
    refresh: fetchContext,
  };
}

export default useContextSource;
```

### Integracao com Wave 1

O hook reutiliza diretamente:
- `getDailyQuestionWithContext` de dailyQuestionService (GAP 3)
- `useJourneyValidation` hook (GAP 4)
- Interface ContextCardProps para tipo de source

### Criterios de Aceitacao

- [ ] Hook retorna event-based context quando existe evento proximo
- [ ] Hook retorna journey-based context quando trilha esta bloqueada
- [ ] Hook retorna daily question como fallback (cascata AI -> journey -> pool)
- [ ] Contextos dismissed nao reaparecem na mesma sessao
- [ ] `refresh()` funcao re-busca contexto
- [ ] TypeScript types exportados corretamente
- [ ] Sem erros de console
- [ ] Build passa sem erros

---

## Track 4: Modals & Confirmation

### Context Atualizado

Esta track cria o AreaQuickActionModal e aprimora o ContextCard com modo de confirmacao auto-dismiss.

### Arquivos a Ler Primeiro

1. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ProfileModal/ProfileModal.tsx` - Padrao de modal (backdrop, variants, animacao)
2. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ContextCard/ContextCard.tsx` - Componente base a ser aprimorado

### Part A: AreaQuickActionModal

**Novo Diretorio:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/AreaQuickActionModal/`

**Arquivos a Criar:**
1. `AreaQuickActionModal.tsx`
2. `index.ts`

```typescript
// AreaQuickActionModal.tsx
/**
 * AreaQuickActionModal Component
 * Track 4: Modals & Confirmation - GAP 2
 *
 * Modal showing life area summary with quick action buttons
 * Opens when user taps a ModuleTray pill
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import type { ViewState } from '../../../types';

// ============================================================
// Types
// ============================================================

export type AreaStatus = 'healthy' | 'attention' | 'critical';

export interface AreaSummary {
  id: string;
  name: string;
  icon: string;
  route: ViewState;
  status: AreaStatus;
  pendingTasks: number;
  recentActivity?: string;
  nextAction?: {
    label: string;
    action: () => void;
  };
}

export interface AreaQuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  area: AreaSummary | null;
  onNavigateToArea: () => void;
}

// ============================================================
// Constants
// ============================================================

const STATUS_CONFIG: Record<
  AreaStatus,
  { icon: typeof CheckCircle; color: string; bg: string; label: string }
> = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-100',
    label: 'Saudavel',
  },
  attention: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    label: 'Atencao',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    label: 'Critico',
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

// ============================================================
// Component
// ============================================================

export function AreaQuickActionModal({
  isOpen,
  onClose,
  area,
  onNavigateToArea,
}: AreaQuickActionModalProps) {
  // Early return if no area
  if (!area) return null;

  const statusConfig = STATUS_CONFIG[area.status];
  const StatusIcon = statusConfig.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-sm ceramic-card p-6 overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="area-modal-title"
            data-testid="area-quick-action-modal"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-ceramic-text-secondary/10 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 text-ceramic-text-secondary" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 ceramic-inset rounded-xl flex items-center justify-center">
                <span className="text-3xl">{area.icon}</span>
              </div>
              <div>
                <h2
                  id="area-modal-title"
                  className="text-xl font-bold text-ceramic-text-primary"
                >
                  {area.name}
                </h2>
                <div
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusConfig.bg}`}
                >
                  <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color}`} />
                  <span className={`text-xs font-bold ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="ceramic-stats-tray p-4 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-ceramic-text-secondary">
                  Tarefas Pendentes
                </span>
                <span className="text-lg font-bold text-ceramic-text-primary">
                  {area.pendingTasks}
                </span>
              </div>
              {area.recentActivity && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ceramic-text-secondary">
                    Ultima Atividade
                  </span>
                  <span className="text-sm text-ceramic-text-primary">
                    {area.recentActivity}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {area.nextAction && (
                <motion.button
                  onClick={() => {
                    area.nextAction?.action();
                    onClose();
                  }}
                  className="w-full py-3 px-4 ceramic-card font-bold text-ceramic-text-primary flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                  whileTap={{ scale: 0.98 }}
                >
                  {area.nextAction.label}
                </motion.button>
              )}

              <motion.button
                onClick={() => {
                  onNavigateToArea();
                  onClose();
                }}
                className="w-full py-3 px-4 ceramic-inset font-medium text-ceramic-text-secondary flex items-center justify-center gap-2 hover:text-ceramic-text-primary transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Ver Detalhes
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AreaQuickActionModal;
```

```typescript
// index.ts
export { AreaQuickActionModal } from './AreaQuickActionModal';
export type {
  AreaQuickActionModalProps,
  AreaSummary,
  AreaStatus,
} from './AreaQuickActionModal';
```

### Part B: ContextCard Confirmation Enhancement

**Arquivo:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ContextCard/ContextCard.tsx`

**Modificacoes Necessarias:**

1. Adicionar prop `onConfirmationComplete`
2. Implementar auto-dismiss apos 3 segundos
3. Melhorar animacao do checkmark

```typescript
// Adicionar a interface de props:
interface ContextCardProps {
  // ... props existentes ...
  /** Callback when confirmation auto-dismisses */
  onConfirmationComplete?: () => void;
}

// Adicionar useEffect para auto-dismiss:
import { useEffect } from 'react';

// Dentro do componente, apos os estados:
useEffect(() => {
  if (showConfirmation && onConfirmationComplete) {
    const timer = setTimeout(() => {
      onConfirmationComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }
}, [showConfirmation, onConfirmationComplete]);

// Melhorar animacao do checkmark na confirmacao:
{showConfirmation ? (
  <motion.div
    key="confirmation"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="flex items-center gap-3 py-4"
  >
    <motion.div
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center"
    >
      <Check className="w-6 h-6 text-green-600" />
    </motion.div>
    <span className="text-ceramic-text-primary font-medium">
      {confirmationMessage || 'Registrado com sucesso!'}
    </span>
  </motion.div>
) : (
  // ... resto do codigo ...
)}
```

### Integracao com Wave 1

- Modal segue mesmo padrao de ProfileModal (backdrop, variants)
- ContextCard ja tem estrutura de confirmacao, apenas adicionamos auto-dismiss

### Criterios de Aceitacao

- [ ] AreaQuickActionModal abre/fecha suavemente
- [ ] Indicador de status mostra cor/icone correto (healthy/attention/critical)
- [ ] Botao de quick action dispara callback e fecha modal
- [ ] Botao "Ver Detalhes" chama onNavigateToArea e fecha modal
- [ ] ContextCard confirmacao auto-dismiss apos 3s
- [ ] Animacao de checkmark e suave (spring animation)
- [ ] TypeScript types completos
- [ ] Atributos de acessibilidade presentes (role, aria-modal, aria-labelledby)

---

## Track 6B: ProfileModal Tabs

### Context Atualizado

Wave 1 FASE 1.3 ja relocou EfficiencyFlowCard para ProfileModal (linhas 174-183). Esta track adiciona navegacao por tabs para separar "Perfil" de "Metricas".

### Arquivos a Ler Primeiro

1. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ProfileModal/ProfileModal.tsx` - Estado atual com EfficiencyFlowCard

### Implementacao

**Arquivo:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ProfileModal/ProfileModal.tsx`

**Modificacoes:**

1. Adicionar estado de tab:
```typescript
const [activeTab, setActiveTab] = useState<'profile' | 'metrics'>('profile');
```

2. Adicionar seletor de tabs apos o header (apos linha 120):
```typescript
{/* Tab Selector */}
<div className="flex border-b border-ceramic-text-secondary/10">
  <button
    onClick={() => setActiveTab('profile')}
    className={`flex-1 py-3 text-sm font-bold transition-colors ${
      activeTab === 'profile'
        ? 'text-ceramic-text-primary border-b-2 border-amber-500'
        : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
    }`}
  >
    Perfil
  </button>
  <button
    onClick={() => setActiveTab('metrics')}
    className={`flex-1 py-3 text-sm font-bold transition-colors ${
      activeTab === 'metrics'
        ? 'text-ceramic-text-primary border-b-2 border-amber-500'
        : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
    }`}
  >
    Metricas
  </button>
</div>
```

3. Condicional de conteudo (substituir o bloco `<div className="p-6 space-y-6">`):
```typescript
{/* Content */}
<div className="p-6 space-y-6">
  {activeTab === 'profile' ? (
    <>
      {/* User Info */}
      <div className="flex items-center gap-4">
        {/* ... conteudo existente de User Info ... */}
      </div>

      {/* Account Info */}
      <div className="ceramic-stats-tray space-y-4">
        {/* ... conteudo existente de Account Info ... */}
      </div>

      {/* Data Sovereignty Section */}
      <div className="pt-4">
        {/* ... conteudo existente de Data Sovereignty + DangerZone ... */}
      </div>
    </>
  ) : (
    <>
      {/* Metrics Tab */}
      <div className="space-y-6">
        {/* Efficiency Metrics */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-ceramic-text-secondary" />
            <h4 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Metricas de Eficiencia
            </h4>
          </div>
          <EfficiencyFlowCard userId={userId} days={30} />
        </div>

        {/* Placeholder for future metrics */}
        <div className="ceramic-inset p-4 text-center">
          <p className="text-sm text-ceramic-text-secondary">
            Mais metricas em breve...
          </p>
        </div>
      </div>
    </>
  )}
</div>
```

4. Remover a secao duplicada de "Efficiency Metrics" que esta atualmente na tab de perfil (linhas 174-183) pois ela agora vive exclusivamente na tab "Metricas".

### Integracao com Wave 1

- EfficiencyFlowCard ja foi relocado para ProfileModal (FASE 1.3)
- Import do componente ja existe
- Apenas reorganizamos em tabs

### Criterios de Aceitacao

- [ ] ProfileModal tem navegacao por tabs funcional
- [ ] Tab "Perfil" mostra: User Info, Account Info, Data Sovereignty, DangerZone
- [ ] Tab "Metricas" mostra EfficiencyFlowCard com days={30}
- [ ] Transicao entre tabs e suave
- [ ] Tab ativa tem indicador visual (border-amber-500)
- [ ] Tab padrao e "profile"
- [ ] Sem duplicacao de EfficiencyFlowCard

---

## Ordem de Execucao

### Recomendacao: PARALELO

Todos os 3 tracks da Wave 2 podem ser executados em paralelo:

```
Wave 2 (Start: T+0, Duration: ~75 min)
=======================================

  Agent 1: Track 3 (useContextSource)
  -----------------------------------
  Cria: src/hooks/useContextSource.ts
  Nao modifica arquivos existentes

  Agent 2: Track 4 (Modals)
  -------------------------
  Cria: src/components/AreaQuickActionModal/
  Modifica: src/components/ContextCard/ContextCard.tsx

  Agent 3: Track 6B (ProfileModal Tabs)
  -------------------------------------
  Modifica: src/components/ProfileModal/ProfileModal.tsx
```

**Nenhum conflito:** Cada track modifica arquivos diferentes.

---

## Checkpoint 2 Criteria

Antes de iniciar Wave 3 (Track 5: Home Rewrite), validar:

### Build Verification
- [ ] `npm run build` passa sem erros
- [ ] `npm run type-check` passa (se disponivel)
- [ ] Zero TypeScript errors

### Component Verification
- [ ] ContextCard renderiza com todos os 3 tipos de source
- [ ] ContextCard confirmacao auto-dismiss funciona (3s)
- [ ] ModuleTray pills clicaveis
- [ ] AreaQuickActionModal abre/fecha corretamente
- [ ] ProfileModal tabs funcionam

### Hook Verification
- [ ] useContextSource retorna context ou null
- [ ] useContextSource.refresh() funciona
- [ ] useContextSource.isLoading e error funcionam

### Integration Points
- [ ] useContextSource usa dailyQuestionService corretamente
- [ ] useContextSource usa useJourneyValidation corretamente
- [ ] AreaQuickActionModal recebe AreaSummary do parent

### Accessibility
- [ ] Modais tem role="dialog" e aria-modal="true"
- [ ] Botoes tem aria-label quando necessario
- [ ] Focus trap funciona nos modais

---

## Risk Matrix

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| **useJourneyValidation interface mismatch** | Media | Medio | Verificar tipos exportados de useJourneyValidation antes de usar |
| **Calendar events table missing** | Media | Baixo | Hook retorna null se tabela nao existe; fallback para daily question |
| **ContextCard prop breaking change** | Baixa | Alto | Nova prop onConfirmationComplete e opcional (backwards compatible) |
| **ProfileModal state reset on tab change** | Baixa | Baixo | Estado de DangerZone e local, nao afetado por tabs |
| **Animation performance** | Baixa | Medio | Usar will-change sparingly; testar em mobile |

---

## Quick Reference: Wave 1 Artifacts

| Artifact | Path | Key Exports |
|----------|------|-------------|
| ContextCard | `src/components/ContextCard/ContextCard.tsx` | `ContextCard`, `ContextCardProps` |
| ModuleTray | `src/components/ModuleTray/ModuleTray.tsx` | `ModuleTray`, `ModuleTrayProps` |
| ModulePill | `src/components/ModuleTray/ModulePill.tsx` | `ModulePill`, `ModuleInfo` |
| dailyQuestionService | `src/modules/journey/services/dailyQuestionService.ts` | `getDailyQuestionWithContext`, `saveDailyResponse` |
| journeyValidator | `src/services/journeyValidator.ts` | `journeyValidator` (singleton), `JourneyValidator` (class) |
| useJourneyValidation | `src/modules/journey/hooks/useJourneyValidation.ts` | `useJourneyValidation`, `useMultipleJourneyValidation`, `useFieldValidation` |

---

## Execution Commands

### Launch Wave 2 (3 agents in parallel)

```
Agent 1 - Track 3:
Task: "Implementar useContextSource hook conforme especificacao Wave 2 Track 3"

Agent 2 - Track 4:
Task: "Criar AreaQuickActionModal e aprimorar ContextCard conforme Wave 2 Track 4"

Agent 3 - Track 6B:
Task: "Adicionar tabs ao ProfileModal conforme Wave 2 Track 6B"
```

### After Wave 2 Complete

1. Run `npm run build` to verify no build errors
2. Run `npm run lint` if available
3. Manual smoke test in browser
4. Proceed to Wave 3 (Track 5: Home Rewrite) if Checkpoint 2 passes

---

**Document Status:** READY FOR EXECUTION
**Next Action:** Launch all 3 Wave 2 tracks in parallel
