# Operation Ceramic Concierge - Parallel Execution Orchestration Plan

**Master Architect: Claude (Opus 4.5)**
**Created:** 2025-12-18
**Status:** Ready for Execution

---

## Executive Summary

This document provides the complete orchestration plan for executing the remaining 12 tasks of Operation Ceramic Concierge. The plan organizes work into **7 tracks** across **4 waves**, maximizing parallelization while respecting dependencies.

**Key Metrics:**
- Total Tasks: 12 (from 16 original, 4 completed)
- Parallel Tracks: 7
- Execution Waves: 4
- Estimated Total Time: ~6-7 hours (critical path: ~4.5 hours)
- Max Concurrent Agents: 4

---

## Completed Tasks (Reference)

| Task | Agent | Status |
|------|-------|--------|
| GAP 3: Daily Questions AI-Driven | gemini-integration-specialist | COMPLETE |
| GAP 4: Schema Validation Trilhas | backend-architect-supabase | COMPLETE |
| GAP 5: VitalStatsTray Removal | ux-design-guardian | COMPLETE |
| GAP 6: Grid Minimalista | ux-design-guardian | COMPLETE |

**Artifacts Created:**
- `src/modules/journey/services/dailyQuestionService.ts` - AI-driven question generation
- `src/services/journeyValidator.ts` - Schema validation for journeys
- `src/modules/journey/hooks/useJourneyValidation.ts` - Validation hook
- Home.tsx updated with minimal grid (lines 282-343)

---

## Wave Execution Plan

### WAVE 1 - Foundation (Parallel Start)

```
WAVE 1 (Start: T+0, Duration: ~90 min)
=======================================

  TRACK 1: Demolition Complete
  ----------------------------
  Tasks: FASE 1.1, 1.2, 1.3
  Agent: general-purpose
  Est: 60 min
  Files: IdentityPassport.tsx, HeaderGlobal.tsx, ProfileModal.tsx, Home.tsx

  TRACK 2: Foundation Components
  ------------------------------
  Tasks: FASE 2.1 (ContextCard), FASE 2.3 (ModuleTray)
  Agent: general-purpose
  Est: 70 min
  Files: NEW src/components/ContextCard/, NEW src/components/ModuleTray/

  TRACK 6A: Voice Glow (Independent)
  ----------------------------------
  Tasks: FASE 3.2
  Agent: general-purpose
  Est: 30 min
  Files: components/BottomNav.tsx
```

### WAVE 2 - Logic Layer (After Wave 1 Components)

```
WAVE 2 (Start: T+90min, Duration: ~75 min)
==========================================

  TRACK 3: Context Logic
  ----------------------
  Tasks: FASE 2.2 (useContextSource hook)
  Agent: general-purpose
  Est: 60 min
  Depends: Track 2 (ContextCard interface)
  Files: NEW src/hooks/useContextSource.ts

  TRACK 4: Modals & Confirmation
  ------------------------------
  Tasks: GAP 2 (AreaQuickActionModal), GAP 7 (ContextCard confirmation)
  Agent: general-purpose
  Est: 75 min
  Depends: Track 2 (ContextCard, ModuleTray)
  Files: NEW src/components/AreaQuickActionModal/, ContextCard updates

  TRACK 6B: ProfileModal Tabs
  ---------------------------
  Tasks: FASE 3.1
  Agent: general-purpose
  Est: 45 min
  Depends: Track 1 (EfficiencyFlowCard relocated)
  Files: ProfileModal.tsx
```

### WAVE 3 - Integration (Critical Path)

```
WAVE 3 (Start: T+165min, Duration: ~90 min)
===========================================

  TRACK 5: Home Rewrite (CRITICAL)
  --------------------------------
  Tasks: FASE 2.4
  Agent: general-purpose (single agent, careful coordination)
  Est: 90 min
  Depends: Tracks 1, 2, 3, 4 COMPLETE
  Files: src/pages/Home.tsx (complete rewrite)
```

### WAVE 4 - Polish & Testing

```
WAVE 4 (Start: T+255min, Duration: ~60 min)
===========================================

  TRACK 7: Testing & Accessibility
  --------------------------------
  Tasks: FASE 3.3
  Agent: testing-qa-playwright
  Est: 60 min
  Depends: Track 5 (Home Rewrite complete)
  Files: NEW src/__tests__/e2e/, accessibility audit
```

---

## Dependency Graph

```
          WAVE 1 (Parallel)
         /        |        \
    Track 1   Track 2   Track 6A
    (Demo)    (Found)   (Voice)
        \        /         |
         \      /          |
          WAVE 2           |
         /   |   \         |
    Track 3  |  Track 6B   |
    (Logic)  |  (Tabs)     |
             |             |
         Track 4           |
         (Modals)          |
             \            /
              \          /
               WAVE 3
                  |
              Track 5
           (Home Rewrite)
                  |
               WAVE 4
                  |
              Track 7
             (Testing)
```

---

## Track Prompts (Ready for Task Tool)

### TRACK 1: Demolition Complete

```markdown
# Track 1: Demolition Complete - FASE 1.1, 1.2, 1.3

## Context
You are implementing the Demolition phase of Operation Ceramic Concierge.
This involves removing/modifying existing UI elements to prepare for the new hierarchy.

## Tasks

### FASE 1.1: IdentityPassport Button Removal
**File:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/IdentityPassport/IdentityPassport.tsx`

**Current State:** Lines 149-160 contain a button with Settings icon that calls `onOpenProfile()`

**Required Changes:**
1. Remove the button element entirely (lines 149-160)
2. Make the entire card clickable by wrapping with `onClick={onOpenProfile}`
3. Add hover state to indicate clickability: `cursor-pointer hover:scale-[1.01] transition-transform`
4. Update the motion.div wrapper (line 71) to include the onClick handler
5. Add `role="button"` and `aria-label="Abrir perfil"` for accessibility

**Pattern Reference:**
```tsx
<motion.div
  className={`ceramic-passport cursor-pointer ${className}`}
  onClick={onOpenProfile}
  role="button"
  aria-label="Abrir perfil"
  whileHover={{ scale: 1.01 }}
  // ... existing props
>
```

### FASE 1.2: Disable Home Tabs Toggle
**File:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/pages/Home.tsx`

**Current State:** Line 166 has `showTabs={true}`

**Required Changes:**
1. Change `showTabs={true}` to `showTabs={false}` on line 166
2. Remove or comment out the tab-related state and handlers if no longer needed:
   - Line 88: `const [activeTab, setActiveTab] = useState<TabState>('personal');`
   - Lines 90-96: `handleTabChange` function
3. Keep the network tab logic for now (may be used elsewhere)

### FASE 1.3: Relocate EfficiencyFlowCard
**File Source:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/pages/Home.tsx`
**File Target:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ProfileModal/ProfileModal.tsx`

**Current State in Home.tsx:** Lines 198-208 render EfficiencyFlowCard

**Required Changes:**

1. **In Home.tsx:**
   - Remove the EfficiencyFlowCard section (lines 198-208)
   - Remove the import on line 7

2. **In ProfileModal.tsx:**
   - Add import: `import { EfficiencyFlowCard } from '@/components/EfficiencyFlowCard'`
   - Add a new section after "Account Info" (after line 171) with the card
   - Wrap in a collapsible/expandable section titled "Metricas"

**Pattern for ProfileModal:**
```tsx
{/* Efficiency Metrics Section */}
<div className="pt-4 border-t border-ceramic-text-secondary/10">
  <div className="flex items-center gap-2 mb-4">
    <TrendingUp className="w-4 h-4 text-ceramic-text-secondary" />
    <h4 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
      Metricas de Eficiencia
    </h4>
  </div>
  <EfficiencyFlowCard userId={userId} days={14} className="!p-0 !shadow-none" />
</div>
```

## Acceptance Criteria
- [ ] IdentityPassport is fully clickable (no internal button)
- [ ] Hover state shows subtle scale animation
- [ ] Accessibility attributes present (role, aria-label)
- [ ] Home.tsx tabs are hidden (showTabs={false})
- [ ] EfficiencyFlowCard removed from Home.tsx
- [ ] EfficiencyFlowCard visible in ProfileModal
- [ ] No TypeScript errors
- [ ] No console warnings

## Files to Read First
1. `src/components/IdentityPassport/IdentityPassport.tsx`
2. `src/pages/Home.tsx`
3. `src/components/ProfileModal/ProfileModal.tsx`
```

---

### TRACK 2: Foundation Components

```markdown
# Track 2: Foundation Components - FASE 2.1, 2.3

## Context
You are creating the core visual components for the new Home hierarchy.
These components follow the Ceramic Design System.

## Design System Reference
- `ceramic-card`: Elevated card with soft shadow
- `ceramic-card-flat`: Flat card, no elevation
- `ceramic-inset`: Recessed/concave element
- `ceramic-tray`: Container for pills/badges
- `ceramic-badge-gold`: Highlighted badge

## Tasks

### FASE 2.1: Create ContextCard Component
**New Directory:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ContextCard/`

**Purpose:** Hero component at top of Home showing contextual prompt/question

**Files to Create:**
1. `ContextCard.tsx` - Main component
2. `index.ts` - Export barrel

**Component Interface:**
```typescript
interface ContextCardProps {
  /** The contextual question or prompt to display */
  question: string;
  /** Source of the question: 'event' | 'journey' | 'daily' */
  source: 'event' | 'journey' | 'daily';
  /** Optional metadata about the source */
  sourceLabel?: string;
  /** Callback when user responds */
  onRespond: (response: string) => void;
  /** Callback to dismiss/skip */
  onDismiss?: () => void;
  /** Whether showing confirmation mode */
  showConfirmation?: boolean;
  /** Confirmation message when action completed */
  confirmationMessage?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Custom className */
  className?: string;
}
```

**Visual Design:**
- Full-width ceramic-card with elevated shadow
- Top: Source indicator pill (small ceramic-badge)
- Center: Question text (text-lg font-medium)
- Bottom: Quick response input OR action buttons
- Confirmation mode: Checkmark animation + message

**Animation Pattern (from ceramic-motion.ts):**
```tsx
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};
```

**Implementation:**
```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Map, Sparkles, Check, X } from 'lucide-react';

const SOURCE_CONFIG = {
  event: { icon: Calendar, label: 'Evento', color: 'text-blue-600' },
  journey: { icon: Map, label: 'Trilha', color: 'text-purple-600' },
  daily: { icon: Sparkles, label: 'Reflexao', color: 'text-amber-600' },
};

export function ContextCard({
  question,
  source,
  sourceLabel,
  onRespond,
  onDismiss,
  showConfirmation = false,
  confirmationMessage,
  isLoading = false,
  className = '',
}: ContextCardProps) {
  const [inputValue, setInputValue] = useState('');
  const SourceIcon = SOURCE_CONFIG[source].icon;

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onRespond(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <motion.div
      className={`ceramic-card p-6 ${className}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      data-testid="context-card"
    >
      <AnimatePresence mode="wait">
        {showConfirmation ? (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 py-4"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-ceramic-text-primary font-medium">
              {confirmationMessage || 'Registrado com sucesso!'}
            </span>
          </motion.div>
        ) : (
          <motion.div key="question" exit={{ opacity: 0 }}>
            {/* Source Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="ceramic-badge-sm flex items-center gap-2">
                <SourceIcon className={`w-3.5 h-3.5 ${SOURCE_CONFIG[source].color}`} />
                <span className="text-xs font-bold text-ceramic-text-secondary uppercase">
                  {sourceLabel || SOURCE_CONFIG[source].label}
                </span>
              </div>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1 rounded-full hover:bg-ceramic-text-secondary/10 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4 text-ceramic-text-secondary" />
                </button>
              )}
            </div>

            {/* Question */}
            <p className="text-lg font-medium text-ceramic-text-primary mb-4">
              {question}
            </p>

            {/* Quick Response Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Sua resposta..."
                className="flex-1 px-4 py-3 ceramic-inset rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                disabled={isLoading}
              />
              <motion.button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isLoading}
                className="px-6 py-3 ceramic-card rounded-xl font-bold text-sm text-ceramic-text-primary disabled:opacity-50 hover:scale-105 active:scale-95 transition-transform"
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? '...' : 'Enviar'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ContextCard;
```

### FASE 2.3: Create ModuleTray Component
**New Directory:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ModuleTray/`

**Purpose:** Horizontal scrollable row of passive module pills

**Files to Create:**
1. `ModuleTray.tsx` - Main component
2. `ModulePill.tsx` - Individual pill component
3. `index.ts` - Export barrel

**Component Interface:**
```typescript
interface ModuleInfo {
  id: string;
  name: string;
  icon: string; // emoji
  route: ViewState;
  hasActivity?: boolean; // Shows dot indicator
  activityCount?: number;
}

interface ModuleTrayProps {
  modules: ModuleInfo[];
  onModuleClick: (moduleId: string, route: ViewState) => void;
  className?: string;
}

interface ModulePillProps {
  module: ModuleInfo;
  onClick: () => void;
}
```

**Visual Design:**
- Horizontal scroll container (no scrollbar visible)
- Each pill: ceramic-card-flat with icon + label
- Active indicator: Small amber dot if hasActivity
- Touch-friendly: min-width 80px, good tap targets

**Implementation:**
```tsx
// ModulePill.tsx
import React from 'react';
import { motion } from 'framer-motion';

export function ModulePill({ module, onClick }: ModulePillProps) {
  return (
    <motion.button
      onClick={onClick}
      className="ceramic-card-flat px-4 py-3 flex flex-col items-center gap-1.5 min-w-[80px] relative hover:scale-105 active:scale-95 transition-transform"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Activity Indicator */}
      {module.hasActivity && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500" />
      )}

      {/* Icon */}
      <span className="text-2xl">{module.icon}</span>

      {/* Label */}
      <span className="text-xs font-medium text-ceramic-text-secondary truncate max-w-full">
        {module.name}
      </span>
    </motion.button>
  );
}

// ModuleTray.tsx
import React, { useRef } from 'react';
import { ModulePill } from './ModulePill';
import type { ModuleInfo, ViewState } from '@/types';

export function ModuleTray({ modules, onModuleClick, className = '' }: ModuleTrayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className={`flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6 ${className}`}
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {modules.map((module) => (
        <div key={module.id} style={{ scrollSnapAlign: 'start' }}>
          <ModulePill
            module={module}
            onClick={() => onModuleClick(module.id, module.route)}
          />
        </div>
      ))}
    </div>
  );
}

export default ModuleTray;
```

**CSS Addition (add to global styles if needed):**
```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

## Acceptance Criteria
- [ ] ContextCard renders with all three source types
- [ ] ContextCard input submits on Enter and button click
- [ ] ContextCard confirmation mode shows animated checkmark
- [ ] ModuleTray scrolls horizontally on mobile
- [ ] ModulePill shows activity indicator when hasActivity=true
- [ ] Both components follow Ceramic Design System
- [ ] TypeScript types exported properly
- [ ] No console errors

## Files to Read First
1. `src/pages/Home.tsx` - Understand existing grid patterns
2. `src/components/ProfileModal/ProfileModal.tsx` - Modal animation patterns
3. `src/components/IdentityPassport/IdentityPassport.tsx` - Ceramic card patterns
```

---

### TRACK 3: Context Logic (useContextSource)

```markdown
# Track 3: Context Logic - FASE 2.2

## Context
You are creating the intelligent context source hook that determines
what question/prompt to show in the ContextCard based on user state.

## Priority Hierarchy
1. **Event-based:** Upcoming calendar event in next 2 hours
2. **Journey-based:** Active journey with blocked/incomplete state
3. **Daily Question:** AI-generated or fallback question

## Dependencies (Already Implemented)
- `src/modules/journey/services/dailyQuestionService.ts` - getDailyQuestionWithContext()
- `src/services/journeyValidator.ts` - journeyValidator.isJourneyBlocked()
- `src/modules/journey/hooks/useJourneyValidation.ts` - useJourneyValidation()

## Task

### FASE 2.2: Create useContextSource Hook
**New File:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/hooks/useContextSource.ts`

**Hook Interface:**
```typescript
interface ContextSource {
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

interface UseContextSourceOptions {
  userId: string;
  /** Hours ahead to check for events */
  eventLookahead?: number;
  /** Whether to enable AI questions */
  enableAI?: boolean;
}

interface UseContextSourceReturn {
  context: ContextSource | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**Implementation:**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getDailyQuestionWithContext, saveDailyResponse } from '@/modules/journey/services/dailyQuestionService';
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';

export function useContextSource({
  userId,
  eventLookahead = 2,
  enableAI = true,
}: UseContextSourceOptions): UseContextSourceReturn {
  const [context, setContext] = useState<ContextSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { validation, activeJourney, isLoading: journeyLoading } = useJourneyValidation(userId);

  const fetchContext = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // PRIORITY 1: Check for upcoming calendar events
      const eventContext = await checkUpcomingEvents(userId, eventLookahead);
      if (eventContext && !dismissed.includes(`event-${eventContext.metadata?.eventId}`)) {
        setContext(eventContext);
        setIsLoading(false);
        return;
      }

      // PRIORITY 2: Check for blocked journeys
      if (!journeyLoading && validation?.isBlocked && activeJourney) {
        const journeyContext = createJourneyContext(validation, activeJourney);
        if (!dismissed.includes(`journey-${activeJourney.id}`)) {
          setContext(journeyContext);
          setIsLoading(false);
          return;
        }
      }

      // PRIORITY 3: Daily question (AI or fallback)
      const dailyContext = await fetchDailyQuestion(userId, enableAI);
      if (dailyContext && !dismissed.includes(`daily-${dailyContext.metadata?.questionId}`)) {
        setContext(dailyContext);
        setIsLoading(false);
        return;
      }

      // No context available
      setContext(null);
    } catch (err) {
      console.error('Error fetching context:', err);
      setError('Erro ao carregar contexto');
    } finally {
      setIsLoading(false);
    }
  }, [userId, eventLookahead, enableAI, dismissed, validation, activeJourney, journeyLoading]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const handleDismiss = useCallback((contextId: string) => {
    setDismissed(prev => [...prev, contextId]);
    setContext(null);
    // Re-fetch to get next priority context
    setTimeout(() => fetchContext(), 100);
  }, [fetchContext]);

  return {
    context,
    isLoading,
    error,
    refresh: fetchContext,
  };
}

// Helper: Check for upcoming calendar events
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
    const minutesUntil = Math.round((eventTime.getTime() - now.getTime()) / 60000);

    return {
      question: `Voce tem "${event.title}" em ${minutesUntil} minutos. Como deseja se preparar?`,
      source: 'event',
      sourceLabel: formatEventTime(eventTime),
      metadata: {
        eventId: event.id,
        eventTime,
      },
      onRespond: async (response) => {
        // Save preparation note to event
        await supabase
          .from('event_notes')
          .insert({
            event_id: event.id,
            user_id: userId,
            note: response,
            type: 'preparation',
          });
      },
      onDismiss: () => {}, // Will be set by hook
    };
  } catch (err) {
    console.error('Error checking events:', err);
    return null;
  }
}

// Helper: Create journey context from validation result
function createJourneyContext(
  validation: JourneyValidationResult,
  journey: any
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
    onRespond: async (response) => {
      // Save journey context response
      if (nextField) {
        await supabase
          .from('journey_context')
          .upsert({
            journey_id: journey.id,
            field_key: nextField.key,
            value: response,
          });
      }
    },
    onDismiss: () => {},
  };
}

// Helper: Fetch daily question
async function fetchDailyQuestion(
  userId: string,
  enableAI: boolean
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
      onRespond: async (response) => {
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
    console.error('Error fetching daily question:', err);
    return null;
  }
}

// Helper: Format event time for display
function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default useContextSource;
```

## Acceptance Criteria
- [ ] Hook returns event-based context when upcoming event exists
- [ ] Hook returns journey-based context when journey is blocked
- [ ] Hook returns daily question as fallback
- [ ] Dismissed contexts don't reappear
- [ ] refresh() function re-fetches context
- [ ] TypeScript types are complete and exported
- [ ] No console errors

## Files to Read First
1. `src/modules/journey/services/dailyQuestionService.ts`
2. `src/services/journeyValidator.ts`
3. `src/modules/journey/hooks/useJourneyValidation.ts`
```

---

### TRACK 4: Modals & Confirmation

```markdown
# Track 4: Modals & Confirmation - GAP 2, GAP 7

## Context
You are creating modal interactions for life area quick actions
and enhancing ContextCard with inline confirmation feedback.

## Tasks

### GAP 2: Create AreaQuickActionModal
**New Directory:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/AreaQuickActionModal/`

**Purpose:** Modal showing area summary with quick action buttons

**Files to Create:**
1. `AreaQuickActionModal.tsx` - Main modal component
2. `index.ts` - Export barrel

**Component Interface:**
```typescript
interface AreaSummary {
  id: string;
  name: string;
  icon: string;
  status: 'healthy' | 'attention' | 'critical';
  pendingTasks: number;
  recentActivity?: string;
  nextAction?: {
    label: string;
    action: () => void;
  };
}

interface AreaQuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  area: AreaSummary;
  onNavigateToArea: () => void;
}
```

**Visual Design (follow ProfileModal pattern):**
- Backdrop with blur
- Centered ceramic-card
- Spring animation entrance
- Area icon + name header
- Status indicator (colored pill)
- Summary stats (pending tasks, recent activity)
- Action buttons: "Ver Detalhes" + custom quick action

**Implementation:**
```tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Saudavel' },
  attention: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Atencao' },
  critical: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Critico' },
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

export function AreaQuickActionModal({
  isOpen,
  onClose,
  area,
  onNavigateToArea,
}: AreaQuickActionModalProps) {
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
                <h2 id="area-modal-title" className="text-xl font-bold text-ceramic-text-primary">
                  {area.name}
                </h2>
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusConfig.bg}`}>
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
                <span className="text-sm text-ceramic-text-secondary">Tarefas Pendentes</span>
                <span className="text-lg font-bold text-ceramic-text-primary">
                  {area.pendingTasks}
                </span>
              </div>
              {area.recentActivity && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ceramic-text-secondary">Ultima Atividade</span>
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
                  onClick={area.nextAction.action}
                  className="w-full py-3 px-4 ceramic-card font-bold text-ceramic-text-primary flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                  whileTap={{ scale: 0.98 }}
                >
                  {area.nextAction.label}
                </motion.button>
              )}

              <motion.button
                onClick={onNavigateToArea}
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

### GAP 7: ContextCard Confirmation Mode
**File:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ContextCard/ContextCard.tsx`

**Note:** This may already be implemented in Track 2. If so, enhance it:

**Required Enhancements:**
1. Add auto-dismiss after 3 seconds in confirmation mode
2. Add subtle success animation (checkmark scales in)
3. Support custom confirmation messages
4. After dismiss, trigger parent to fetch next context

**Animation Enhancement:**
```tsx
// Add to confirmation mode
useEffect(() => {
  if (showConfirmation) {
    const timer = setTimeout(() => {
      onConfirmationComplete?.();
    }, 3000);
    return () => clearTimeout(timer);
  }
}, [showConfirmation, onConfirmationComplete]);

// Enhanced checkmark animation
<motion.div
  initial={{ scale: 0, rotate: -45 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
  className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center"
>
  <Check className="w-6 h-6 text-green-600" />
</motion.div>
```

## Acceptance Criteria
- [ ] AreaQuickActionModal opens/closes smoothly
- [ ] Status indicator shows correct color/icon
- [ ] Quick action button triggers callback
- [ ] Navigate button calls onNavigateToArea
- [ ] ContextCard confirmation auto-dismisses after 3s
- [ ] Checkmark animation is smooth
- [ ] TypeScript types complete
- [ ] Accessibility attributes present

## Files to Read First
1. `src/components/ProfileModal/ProfileModal.tsx` - Modal pattern
2. `src/components/ContextCard/ContextCard.tsx` - If exists from Track 2
```

---

### TRACK 5: Home Rewrite (CRITICAL)

```markdown
# Track 5: Home Rewrite - FASE 2.4

## CRITICAL WARNING
This is the most sensitive task. Only ONE agent should work on this.
Ensure all dependencies (Tracks 1-4) are COMPLETE before starting.

## Context
Rewrite Home.tsx with the new visual hierarchy:
1. ContextCard (hero)
2. IdentityPassport (clickable)
3. ModuleTray (horizontal scroll)
4. Primary Modules Grid (Finance, Grants)
5. Secondary Modules Grid (minimal icons)

## Dependencies (MUST BE COMPLETE)
- Track 1: IdentityPassport clickable, tabs hidden, EfficiencyFlow relocated
- Track 2: ContextCard, ModuleTray components exist
- Track 3: useContextSource hook exists
- Track 4: AreaQuickActionModal exists

## Task

### FASE 2.4: Rewrite Home.tsx
**File:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/pages/Home.tsx`

**New Hierarchy:**
```
<Home>
  <HeaderGlobal showTabs={false} />

  <main>
    {/* 1. Context Card - Full Width Hero */}
    <ContextCard />  // From useContextSource

    {/* 2. Identity Passport - Clickable */}
    <IdentityPassport onClick={openProfile} />

    {/* 3. Module Tray - Horizontal Scroll */}
    <ModuleTray modules={SECONDARY_MODULES} />

    {/* 4. Primary Modules - Finance & Grants */}
    <div className="grid grid-cols-2 gap-4">
      <FinanceCard />
      <GrantsCard />
    </div>

    {/* 5. Network & Studio Cards */}
    <div className="grid grid-cols-2 gap-4">
      <NetworkCard />
      <PodcastCard />
    </div>
  </main>

  <ProfileModal />
  <AreaQuickActionModal />
</Home>
```

**Implementation Approach:**

1. **Imports to Add:**
```tsx
import { ContextCard } from '@/components/ContextCard';
import { ModuleTray } from '@/components/ModuleTray';
import { AreaQuickActionModal } from '@/components/AreaQuickActionModal';
import { useContextSource } from '@/hooks/useContextSource';
```

2. **State to Add:**
```tsx
const [selectedArea, setSelectedArea] = useState<AreaSummary | null>(null);
const [showAreaModal, setShowAreaModal] = useState(false);
const [showConfirmation, setShowConfirmation] = useState(false);
```

3. **Hook Usage:**
```tsx
const { context, isLoading: contextLoading, refresh: refreshContext } = useContextSource({
  userId,
  eventLookahead: 2,
  enableAI: true,
});
```

4. **Module Tray Data:**
```tsx
const TRAY_MODULES: ModuleInfo[] = [
  { id: 'health', name: 'Saude', icon: '🫀', route: 'health' },
  { id: 'education', name: 'Educacao', icon: '📚', route: 'education' },
  { id: 'legal', name: 'Juridico', icon: '⚖️', route: 'legal' },
  { id: 'professional', name: 'Profissional', icon: '💼', route: 'professional' },
  { id: 'relationships', name: 'Relacionamentos', icon: '💝', route: 'relationships' },
];
```

5. **Context Card Handler:**
```tsx
const handleContextRespond = async (response: string) => {
  if (context) {
    await context.onRespond(response);
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
      refreshContext();
    }, 3000);
  }
};
```

6. **Render Structure:**
```tsx
return (
  <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
    <HeaderGlobal
      title="Minha Vida"
      subtitle="LIFE OS"
      showTabs={false}
      // ... other props
    />

    <main className="flex-1 overflow-y-auto px-6 pb-40 pt-4 space-y-6">
      {/* 1. Context Card */}
      {context && !contextLoading && (
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
          <ContextCard
            question={context.question}
            source={context.source}
            sourceLabel={context.sourceLabel}
            onRespond={handleContextRespond}
            onDismiss={context.onDismiss}
            showConfirmation={showConfirmation}
          />
        </motion.div>
      )}

      {/* 2. Identity Passport */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
        <IdentityPassport
          userId={userId}
          onOpenProfile={() => setProfileModalOpen(true)}
        />
        {/* Streak Badge */}
        <motion.div className="absolute top-4 right-4">
          {/* ... existing streak badge code ... */}
        </motion.div>
      </motion.div>

      {/* 3. Module Tray */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
        <ModuleTray
          modules={TRAY_MODULES}
          onModuleClick={(id, route) => {
            // Find area summary and show modal
            setSelectedArea(getAreaSummary(id));
            setShowAreaModal(true);
          }}
        />
      </motion.div>

      {/* 4. Primary Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Finance Card */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
          <FinanceCard userId={userId} onClick={() => onNavigateToView('finance')} />
        </motion.div>

        {/* Grants Card */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}>
          <GrantsCard
            activeProjects={grantsActiveProjects}
            upcomingDeadlines={grantsUpcomingDeadlines}
            recentProjects={grantsRecentProjects}
            onOpenModule={() => onNavigateToView('grants')}
            onCreateProject={() => onNavigateToView('grants')}
          />
        </motion.div>
      </div>

      {/* 5. Network & Studio Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Network Card - same as existing */}
        {/* Podcast Card - same as existing */}
      </div>
    </main>

    {/* Modals */}
    <ProfileModal ... />

    <AreaQuickActionModal
      isOpen={showAreaModal}
      onClose={() => setShowAreaModal(false)}
      area={selectedArea}
      onNavigateToArea={() => {
        setShowAreaModal(false);
        if (selectedArea) {
          onNavigateToView(selectedArea.route);
        }
      }}
    />
  </div>
);
```

## Acceptance Criteria
- [ ] ContextCard renders at top when context available
- [ ] IdentityPassport is clickable (no button)
- [ ] ModuleTray shows all secondary modules
- [ ] Clicking ModuleTray pill opens AreaQuickActionModal
- [ ] Primary modules grid unchanged
- [ ] All animations work smoothly
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Mobile responsive
- [ ] Profile modal still works

## Files to Read First
1. Current `src/pages/Home.tsx`
2. `src/components/ContextCard/ContextCard.tsx`
3. `src/components/ModuleTray/ModuleTray.tsx`
4. `src/hooks/useContextSource.ts`
5. `src/components/AreaQuickActionModal/AreaQuickActionModal.tsx`

## MERGE CONFLICT PREVENTION
- Do NOT edit Home.tsx until Tracks 1-4 confirm completion
- Read the latest Home.tsx before making changes
- Use atomic commits for each section
```

---

### TRACK 6: Polish (ProfileModal Tabs + Voice Glow)

```markdown
# Track 6: Polish - FASE 3.1, 3.2

## Tasks

### FASE 3.1: ProfileModal Tabs
**File:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/components/ProfileModal/ProfileModal.tsx`

**Note:** This depends on Track 1.3 (EfficiencyFlowCard relocated)

**Purpose:** Add tab navigation to ProfileModal: "Perfil" | "Metricas"

**Implementation:**
```tsx
// Add state
const [activeTab, setActiveTab] = useState<'profile' | 'metrics'>('profile');

// Add tab selector after header
<div className="flex border-b border-ceramic-text-secondary/10">
  <button
    onClick={() => setActiveTab('profile')}
    className={`flex-1 py-3 text-sm font-bold transition-colors ${
      activeTab === 'profile'
        ? 'text-ceramic-text-primary border-b-2 border-amber-500'
        : 'text-ceramic-text-secondary'
    }`}
  >
    Perfil
  </button>
  <button
    onClick={() => setActiveTab('metrics')}
    className={`flex-1 py-3 text-sm font-bold transition-colors ${
      activeTab === 'metrics'
        ? 'text-ceramic-text-primary border-b-2 border-amber-500'
        : 'text-ceramic-text-secondary'
    }`}
  >
    Metricas
  </button>
</div>

// Conditional content
{activeTab === 'profile' ? (
  // Existing profile content
) : (
  // Metrics tab with EfficiencyFlowCard
  <div className="p-6">
    <EfficiencyFlowCard userId={userId} days={30} />
  </div>
)}
```

### FASE 3.2: Voice Button Amber Glow
**File:** `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/components/BottomNav.tsx`

**Purpose:** Add ambient amber glow animation to Voice button when idle

**Current State (lines 37-50):**
```tsx
<button
  onClick={onMicClick}
  className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${isListening
    ? 'bg-rose-500 animate-pulse shadow-rose-500/50'
    : 'ceramic-concave hover:scale-105'
  }`}
>
```

**Required Changes:**
Add subtle amber glow when NOT listening:

```tsx
{/* Voice Button with Ambient Glow */}
<div className="relative -top-8">
  {/* Ambient Glow Ring - only when not listening */}
  {!isListening && (
    <motion.div
      className="absolute inset-0 rounded-full"
      animate={{
        boxShadow: [
          '0 0 20px 2px rgba(217, 119, 6, 0.2)',
          '0 0 30px 4px rgba(217, 119, 6, 0.3)',
          '0 0 20px 2px rgba(217, 119, 6, 0.2)',
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )}

  <button
    onClick={onMicClick}
    className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
      isListening
        ? 'bg-rose-500 animate-pulse shadow-lg shadow-rose-500/50'
        : 'ceramic-concave hover:scale-105'
    }`}
  >
    <Mic className={`w-6 h-6 ${isListening ? 'text-white' : 'text-ceramic-text-primary opacity-80'}`} />
    {isListening && (
      <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75" />
    )}
  </button>
</div>
```

**Import to Add:**
```tsx
import { motion } from 'framer-motion';
```

## Acceptance Criteria
- [ ] ProfileModal has working tab navigation
- [ ] Metrics tab shows EfficiencyFlowCard
- [ ] Tab transitions are smooth
- [ ] Voice button has subtle amber glow animation
- [ ] Glow disappears when listening
- [ ] No performance issues with animation

## Files to Read First
1. `src/components/ProfileModal/ProfileModal.tsx`
2. `components/BottomNav.tsx`
```

---

### TRACK 7: Testing

```markdown
# Track 7: Testing & Accessibility - FASE 3.3

## Context
Final verification of all implemented features with E2E tests
and accessibility audit.

## Tasks

### FASE 3.3: E2E Tests + Accessibility

**Test Files to Create:**
1. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/__tests__/e2e/home.spec.ts`
2. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/src/__tests__/e2e/contextCard.spec.ts`

**Test Scenarios:**

```typescript
// home.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Home Page - Ceramic Concierge', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to home
    await page.goto('/');
    // ... auth setup
  });

  test('renders ContextCard when context available', async ({ page }) => {
    const contextCard = page.getByTestId('context-card');
    await expect(contextCard).toBeVisible();

    // Check source badge
    const sourceBadge = contextCard.locator('[class*="ceramic-badge"]');
    await expect(sourceBadge).toBeVisible();
  });

  test('IdentityPassport is fully clickable', async ({ page }) => {
    const passport = page.getByTestId('identity-passport');

    // Should not have internal button
    const internalButton = passport.locator('button');
    await expect(internalButton).toHaveCount(0);

    // Click opens profile modal
    await passport.click();
    const profileModal = page.getByTestId('profile-modal');
    await expect(profileModal).toBeVisible();
  });

  test('ModuleTray scrolls horizontally', async ({ page }) => {
    const tray = page.locator('.scrollbar-hide');
    await expect(tray).toBeVisible();

    // Check pills exist
    const pills = tray.locator('[class*="ceramic-card-flat"]');
    await expect(pills).toHaveCount(5); // 5 secondary modules
  });

  test('clicking ModuleTray pill opens AreaQuickActionModal', async ({ page }) => {
    const pill = page.getByText('Saude').closest('button');
    await pill?.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Saude');
  });

  test('ContextCard confirmation mode works', async ({ page }) => {
    const contextCard = page.getByTestId('context-card');
    const input = contextCard.locator('input');
    const submitBtn = contextCard.locator('button', { hasText: 'Enviar' });

    await input.fill('Test response');
    await submitBtn.click();

    // Check confirmation appears
    const checkmark = contextCard.locator('svg.text-green-600');
    await expect(checkmark).toBeVisible();

    // Auto-dismiss after 3s
    await page.waitForTimeout(3500);
    await expect(contextCard).not.toContainText('Registrado');
  });

  test('tabs hidden in HeaderGlobal', async ({ page }) => {
    const tabSelector = page.locator('[class*="CeramicTabSelector"]');
    await expect(tabSelector).not.toBeVisible();
  });
});

// contextCard.spec.ts
test.describe('ContextCard Component', () => {
  test('shows event source correctly', async ({ page }) => {
    // Setup mock with event context
    // ...
    const badge = page.locator('[class*="ceramic-badge"]');
    await expect(badge).toContainText('Evento');
  });

  test('shows journey source correctly', async ({ page }) => {
    // Setup mock with journey context
    // ...
    const badge = page.locator('[class*="ceramic-badge"]');
    await expect(badge).toContainText('Trilha');
  });

  test('shows daily source correctly', async ({ page }) => {
    // Setup mock with daily question
    // ...
    const badge = page.locator('[class*="ceramic-badge"]');
    await expect(badge).toContainText('Reflexao');
  });
});
```

**Accessibility Audit Checklist:**
- [ ] All interactive elements have focus indicators
- [ ] ContextCard input has proper label
- [ ] Modal traps focus correctly
- [ ] Escape key closes modals
- [ ] Color contrast meets WCAG AA
- [ ] Animations respect prefers-reduced-motion
- [ ] Screen reader announces context changes

**Accessibility Test:**
```typescript
test.describe('Accessibility', () => {
  test('home page passes axe audit', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Animations should be disabled
    const contextCard = page.getByTestId('context-card');
    const styles = await contextCard.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('animation-duration')
    );
    expect(styles).toBe('0s');
  });
});
```

## Acceptance Criteria
- [ ] All E2E tests pass
- [ ] No accessibility violations (axe-core)
- [ ] Focus management works correctly
- [ ] Keyboard navigation complete
- [ ] Screen reader compatible

## Files to Read First
1. Existing test setup if any
2. `src/pages/Home.tsx` (final version)
3. All new components from Tracks 2, 4
```

---

## Checkpoints

### Checkpoint 1: After Wave 1 (T+90min)
**Verification:**
- [ ] Track 1: IdentityPassport clickable (no button)
- [ ] Track 1: HeaderGlobal showTabs={false}
- [ ] Track 1: EfficiencyFlowCard in ProfileModal
- [ ] Track 2: ContextCard component exists and renders
- [ ] Track 2: ModuleTray component exists and scrolls
- [ ] Track 6A: Voice button has amber glow

**Blocker Check:**
- If any Track 1 task incomplete -> Block Wave 2 Tracks 3, 4, 6B
- If Track 2 incomplete -> Block Wave 2 Tracks 3, 4

### Checkpoint 2: After Wave 2 (T+165min)
**Verification:**
- [ ] Track 3: useContextSource hook works
- [ ] Track 4: AreaQuickActionModal renders
- [ ] Track 4: ContextCard confirmation mode works
- [ ] Track 6B: ProfileModal tabs work

**Blocker Check:**
- If ANY Wave 2 task incomplete -> Block Track 5 (Home Rewrite)

### Checkpoint 3: After Wave 3 (T+255min) - CRITICAL
**Verification:**
- [ ] Home.tsx renders with new hierarchy
- [ ] ContextCard shows at top
- [ ] ModuleTray functional
- [ ] No visual regressions
- [ ] No TypeScript errors
- [ ] App builds successfully (`npm run build`)

**Blocker Check:**
- If Home broken -> STOP and fix before Track 7

### Checkpoint 4: Final (T+315min)
**Verification:**
- [ ] All E2E tests pass
- [ ] Accessibility audit clean
- [ ] Manual smoke test on mobile viewport
- [ ] Git commit clean (no uncommitted changes)

---

## Risk Mitigation

### Risk 1: Merge Conflicts in Home.tsx
**Probability:** HIGH
**Impact:** HIGH
**Mitigation:**
- Only Track 5 touches Home.tsx for rewrite
- Track 1 makes minimal, isolated changes first
- Use atomic commits
- Review Home.tsx state before Track 5 starts

### Risk 2: IdentityPassport Breaking Changes
**Probability:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Check if IdentityPassport used elsewhere (grep for imports)
- Maintain `onOpenProfile` prop signature
- Add backwards-compatible click handler

### Risk 3: Animation Performance
**Probability:** LOW
**Impact:** MEDIUM
**Mitigation:**
- Use `will-change` CSS property sparingly
- Test on low-end mobile viewport
- Use `transform` and `opacity` for animations (GPU accelerated)
- Respect `prefers-reduced-motion`

### Risk 4: Context Fetching Latency
**Probability:** MEDIUM
**Impact:** LOW
**Mitigation:**
- Show skeleton loader in ContextCard
- Implement 3-second timeout for AI question
- Fallback cascade (event -> journey -> pool)

### Risk 5: ProfileModal State Complexity
**Probability:** LOW
**Impact:** LOW
**Mitigation:**
- Keep tab state local to ProfileModal
- EfficiencyFlowCard receives userId prop (already available)

---

## Answers to Strategic Questions

### 1. Quantas waves sao necessarias?
**4 waves** are necessary to maintain proper dependency ordering while maximizing parallelization.

### 2. Quais tracks podem rodar 100% em paralelo na Wave 1?
**3 tracks** can run fully parallel in Wave 1:
- Track 1 (Demolition)
- Track 2 (Foundation Components)
- Track 6A (Voice Glow)

### 3. Qual a estimativa de tempo total (critical path)?
**Critical Path:** ~4.5 hours (270 minutes)
- Wave 1: 90 min
- Wave 2: 75 min (parallel, starts after Wave 1)
- Wave 3: 90 min (sequential)
- Wave 4: 60 min

**Total with parallel execution:** ~5-6 hours
**Total sequential (worst case):** ~7 hours

### 4. Ha risco de conflitos entre tracks?
**Yes, identified risks:**
- Home.tsx: Mitigated by isolating to Track 5
- ProfileModal.tsx: Low risk (Track 1.3 adds, Track 6B adds tabs)
- BottomNav.tsx: No conflict (only Track 6A touches it)

### 5. Onde estao os checkpoints criticos?
**Critical Checkpoints:**
- **Checkpoint 2** (After Wave 2): Gate before Home Rewrite
- **Checkpoint 3** (After Wave 3): Gate before Testing - must verify app builds

---

## Execution Commands

### Start Wave 1 (Parallel - 3 agents max)
```
Agent 1: Task Tool -> Track 1 Prompt
Agent 2: Task Tool -> Track 2 Prompt
Agent 3: Task Tool -> Track 6A Prompt (Voice Glow only)
```

### Start Wave 2 (After Checkpoint 1)
```
Agent 1: Task Tool -> Track 3 Prompt
Agent 2: Task Tool -> Track 4 Prompt
Agent 3: Task Tool -> Track 6B Prompt (ProfileModal tabs)
```

### Start Wave 3 (After Checkpoint 2)
```
Agent 1 ONLY: Task Tool -> Track 5 Prompt
```

### Start Wave 4 (After Checkpoint 3)
```
Agent 1: Task Tool -> Track 7 Prompt
```

---

## Appendix: File Locations Summary

| Component | Path |
|-----------|------|
| Home.tsx | `src/pages/Home.tsx` |
| IdentityPassport | `src/components/IdentityPassport/IdentityPassport.tsx` |
| ProfileModal | `src/components/ProfileModal/ProfileModal.tsx` |
| EfficiencyFlowCard | `src/components/EfficiencyFlowCard/EfficiencyFlowCard.tsx` |
| HeaderGlobal | `src/components/HeaderGlobal.tsx` |
| BottomNav | `components/BottomNav.tsx` |
| ContextCard (NEW) | `src/components/ContextCard/ContextCard.tsx` |
| ModuleTray (NEW) | `src/components/ModuleTray/ModuleTray.tsx` |
| AreaQuickActionModal (NEW) | `src/components/AreaQuickActionModal/AreaQuickActionModal.tsx` |
| useContextSource (NEW) | `src/hooks/useContextSource.ts` |
| dailyQuestionService | `src/modules/journey/services/dailyQuestionService.ts` |
| journeyValidator | `src/services/journeyValidator.ts` |

---

**Document Status:** READY FOR EXECUTION
**Next Action:** Begin Wave 1 with 3 parallel agents
