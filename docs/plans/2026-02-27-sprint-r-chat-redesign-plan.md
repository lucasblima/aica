# Sprint R — Bug Fixes + Full Chat Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 user-reported bugs (#502, #501, #503) and deliver full chat redesign with streaming, progress feedback, module chats, and history browser (#500, #194).

**Architecture:** Group 1 (bugs) are independent fixes parallelizable across 3 teammates. Group 2 (chat redesign) is layered: shared components first, then backend streaming, then module UIs, then history/ADK.

**Tech Stack:** React 18, framer-motion, Supabase Edge Functions (Deno), Gemini 2.5, TypeScript, Ceramic Design System.

---

## GROUP 1: Bug Fixes

---

### Task 1: Fix #502 — Chat "Registrar Momento" type error

**Files:**
- Modify: `supabase/functions/gemini-chat/index.ts:962` (action suggestion)
- Modify: `supabase/functions/gemini-chat/index.ts:2482` (action handler fallback)

**Step 1: Fix the action suggestion type**

In `supabase/functions/gemini-chat/index.ts`, line 962, change `'reflection'` to `'text'`:

```typescript
// Line 962 — BEFORE:
params: { content: message.substring(0, 500), emotion: 'thoughtful', type: 'reflection' },

// Line 962 — AFTER:
params: { content: message.substring(0, 500), emotion: 'thoughtful', type: 'text' },
```

**Step 2: Fix the action handler fallback**

In the same file, line 2482, change the fallback:

```typescript
// Line 2482 — BEFORE:
type: params.type || 'reflection',

// Line 2482 — AFTER:
type: params.type || 'text',
```

**Step 3: Verify no other references to `'reflection'` type**

Run: `grep -n "reflection" supabase/functions/gemini-chat/index.ts`
Expected: Only the two lines just fixed (plus maybe comments).

**Step 4: Deploy Edge Function**

```bash
SUPABASE_ACCESS_TOKEN=sbp_8121477da3256d7ea9b7ab915774f8ff631eee85 npx supabase functions deploy gemini-chat --no-verify-jwt
```

**Step 5: Commit**

```bash
git add supabase/functions/gemini-chat/index.ts
git commit -m "fix(chat): use valid moment type 'text' instead of 'reflection' (#502)"
```

---

### Task 2: Fix #501 — Pauta generation error (Studio)

**Files:**
- Modify: `supabase/functions/gemini-chat/index.ts` (verify handlers)
- Modify: `supabase/functions/deep-research/index.ts` (verify health)
- Modify: `src/modules/studio/services/pautaGeneratorService.ts` (error propagation)
- Modify: `src/modules/studio/components/workspace/PautaGeneratorPanel.tsx` (step-level errors)

**Step 1: Check Edge Function logs for errors**

```bash
# Check deep-research logs
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="supabase" AND textPayload=~"deep-research"' --limit=20 --project=gen-lang-client-0948335762 --format="table(timestamp, textPayload)"

# Or via Supabase dashboard: check Edge Function logs for deep-research and gemini-chat
```

**Step 2: Verify Gemini API key is valid**

Check `supabase/functions/gemini-chat/index.ts` — the handlers at lines 497-540 use `MODELS.smart` which maps to `gemini-2.5-pro`. Verify the key supports this model.

**Step 3: Improve error propagation in pautaGeneratorService**

The current service catches errors and returns fallbacks silently. The user sees success but with garbage data, OR the error bubbles up as generic. Make errors include the step name.

In `src/modules/studio/services/pautaGeneratorService.ts`, modify `generateCompletePauta` (around line 233):

```typescript
// Line 233-280 — wrap each step with step-aware error:
try {
  // Step 1: Deep Research (30%)
  onProgress?.('Pesquisando informacoes sobre o convidado...', 10)
  const research = await this.performDeepResearch(guestName.trim(), theme?.trim(), sources)
  onProgress?.('Pesquisa concluida', 30)

  // Step 2: Generate Outline (50%)
  onProgress?.('Criando estrutura da pauta...', 40)
  const outline = await this.generateOutline(
    guestName,
    theme || research.suggestedTheme,
    research,
    style,
    duration
  )
  onProgress?.('Estrutura criada', 50)

  // Step 3: Generate Questions (75%)
  onProgress?.('Gerando perguntas...', 60)
  const questions = await this.generateQuestions(
    guestName,
    outline,
    research,
    context
  )
  onProgress?.('Perguntas geradas', 75)

  // Step 4: Generate Ice Breakers (90%)
  onProgress?.('Criando perguntas quebra-gelo...', 80)
  const iceBreakers = await this.generateIceBreakers(guestName, research)
  onProgress?.('Quebra-gelos criados', 90)

  // Step 5: Compile Final Pauta (100%)
  onProgress?.('Finalizando pauta...', 95)
  const pauta = this.compilePauta(outline, questions, iceBreakers, research, duration)
  onProgress?.('Pauta completa!', 100)

  return pauta
} catch (error) {
  log.error('Error generating pauta:', error)
  // Re-throw with user-friendly message including step info
  const msg = error instanceof Error ? error.message : 'Erro desconhecido'
  throw new Error(`Erro na geracao da pauta: ${msg}`)
}
```

**Step 4: Show step-level error in PautaGeneratorPanel**

In `src/modules/studio/components/workspace/PautaGeneratorPanel.tsx`, the error display (around line 529) should show progress step context:

```typescript
// Around line 227-229 — update error handler:
} catch (err: unknown) {
  const errorMsg = err instanceof Error ? err.message : 'Erro ao gerar pauta'
  setError(errorMsg)
  // Keep progress visible so user sees which step failed
}
```

And in the UI error block (around line 529), include the last progress step:

```tsx
{error && (
  <div className="rounded-xl p-4 bg-ceramic-error/10 border border-ceramic-error/20">
    <p className="text-ceramic-error text-sm font-medium">{error}</p>
    {progress && (
      <p className="text-ceramic-text-secondary text-xs mt-1">
        Ultimo passo: {progress.step} ({progress.percentage}%)
      </p>
    )}
  </div>
)}
```

**Step 5: Commit**

```bash
git add src/modules/studio/services/pautaGeneratorService.ts src/modules/studio/components/workspace/PautaGeneratorPanel.tsx
git commit -m "fix(studio): improve pauta generation error reporting with step context (#501)"
```

---

### Task 3: Fix #503 — Mobile swipe navigation between Atlas views

**Files:**
- Modify: `src/views/AgendaView.tsx` (add swipe gesture)
- Modify: `src/components/domain/AgendaModeToggle.tsx` (add dot indicators)

**Step 1: Add swipe handler to AgendaView mobile section**

In `src/views/AgendaView.tsx`, add imports at top (after existing framer-motion imports):

```typescript
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
```

Note: `motion` and `AnimatePresence` are likely already imported — just add `PanInfo` to the import.

**Step 2: Add swipe constants and handler**

After the `mobileMode` state declaration (around line 83), add:

```typescript
const MOBILE_VIEWS: AgendaMode[] = ['agenda', 'list', 'kanban', 'matrix'];
const SWIPE_THRESHOLD = 60; // px

const handleSwipe = useCallback((_: unknown, info: PanInfo) => {
  if (isDesktop) return;
  const currentIndex = MOBILE_VIEWS.indexOf(mobileMode);

  if (info.offset.x < -SWIPE_THRESHOLD && info.velocity.x < -100 && currentIndex < MOBILE_VIEWS.length - 1) {
    // Swipe left → next view
    setMobileMode(MOBILE_VIEWS[currentIndex + 1]);
  } else if (info.offset.x > SWIPE_THRESHOLD && info.velocity.x > 100 && currentIndex > 0) {
    // Swipe right → previous view
    setMobileMode(MOBILE_VIEWS[currentIndex - 1]);
  }
}, [mobileMode, isDesktop]);
```

**Step 3: Wrap mobile content with drag gesture**

Replace the mobile `<AnimatePresence>` block (lines 1002-1052) to add a drag wrapper:

```tsx
) : (
  /* ======== ALL OTHER MODES: full-width content with swipe ======== */
  <AnimatePresence mode="wait">
    <motion.main
      key={mobileMode}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      dragDirectionLock
      onDragEnd={handleSwipe}
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 overflow-y-auto px-4 pb-32 pt-6 space-y-6 touch-pan-y"
    >
      {/* ... existing content unchanged ... */}
    </motion.main>
  </AnimatePresence>
)}
```

Key additions: `drag="x"`, `dragConstraints`, `dragElastic`, `dragDirectionLock` (prevents vertical scroll interference), `onDragEnd`, `touch-pan-y` CSS class.

**Step 4: Add dot indicators to AgendaModeToggle**

In `src/components/domain/AgendaModeToggle.tsx`, add dots below the toggle for mobile swipe affordance:

```tsx
export const AgendaModeToggle: React.FC<AgendaModeToggleProps> = ({
  mode,
  onModeChange,
}) => {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex items-center gap-1 rounded-full p-1 shadow-[inset_2px_2px_4px_rgba(163,158,145,0.25),inset_-2px_-2px_4px_rgba(255,255,255,0.95)] bg-ceramic-cool">
        {segments.map((seg) => {
          const isActive = mode === seg.key;
          const Icon = seg.icon;
          return (
            <button
              key={seg.key}
              onClick={() => onModeChange(seg.key)}
              className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200"
            >
              {isActive && (
                <motion.div
                  layoutId="agenda-mode-pill"
                  className="absolute inset-0 rounded-full bg-amber-500 shadow-md"
                  transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 1.0 }}
                />
              )}
              <span className={`relative flex items-center gap-1.5 ${isActive ? 'text-white' : 'text-ceramic-text-secondary'}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{seg.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      {/* Swipe dot indicators — mobile only */}
      <div className="flex gap-1.5 sm:hidden">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
              mode === seg.key ? 'bg-amber-500' : 'bg-ceramic-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
```

**Step 5: Test on mobile viewport**

Run: `npm run dev`
Open browser devtools → toggle mobile viewport (375x812).
- Verify swipe left/right navigates views
- Verify vertical scroll still works
- Verify desktop layout unchanged
- Verify dot indicators appear on mobile only

**Step 6: Commit**

```bash
git add src/views/AgendaView.tsx src/components/domain/AgendaModeToggle.tsx
git commit -m "feat(atlas): add mobile swipe navigation between Agenda/List/Kanban/Matrix views (#503)"
```

---

## GROUP 2: Full Chat Redesign

---

### Task 4: Create shared ProgressSteps component (#500)

**Files:**
- Create: `src/components/ui/ProgressSteps.tsx`
- Create: `src/hooks/useProgressTracker.ts`

**Step 1: Create the ProgressSteps component**

Create `src/components/ui/ProgressSteps.tsx`:

```tsx
import React from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

export interface ProgressStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed' | 'error'
}

interface ProgressStepsProps {
  steps: ProgressStep[]
  /** Overall percentage 0-100 */
  percentage?: number
  /** Compact mode: single line with current step */
  compact?: boolean
  className?: string
}

export function ProgressSteps({ steps, percentage, compact, className }: ProgressStepsProps) {
  const activeStep = steps.find(s => s.status === 'active')

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs text-ceramic-text-secondary ${className || ''}`}>
        <Loader2 size={12} className="animate-spin text-amber-500" />
        <span>{activeStep?.label || 'Processando...'}</span>
        {percentage != null && (
          <span className="text-ceramic-text-secondary/60">{percentage}%</span>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-2 text-xs">
          {step.status === 'completed' ? (
            <Check size={12} className="text-ceramic-success shrink-0" />
          ) : step.status === 'active' ? (
            <Loader2 size={12} className="animate-spin text-amber-500 shrink-0" />
          ) : step.status === 'error' ? (
            <div className="w-3 h-3 rounded-full bg-ceramic-error/20 border border-ceramic-error shrink-0" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-ceramic-border shrink-0" />
          )}
          <span className={
            step.status === 'active' ? 'text-ceramic-text-primary font-medium' :
            step.status === 'completed' ? 'text-ceramic-text-secondary' :
            step.status === 'error' ? 'text-ceramic-error' :
            'text-ceramic-text-secondary/50'
          }>
            {step.label}
          </span>
        </div>
      ))}
      {percentage != null && (
        <div className="mt-2">
          <div className="h-1 bg-ceramic-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create the useProgressTracker hook**

Create `src/hooks/useProgressTracker.ts`:

```typescript
import { useState, useCallback } from 'react'
import type { ProgressStep } from '@/components/ui/ProgressSteps'

export interface UseProgressTrackerReturn {
  steps: ProgressStep[]
  percentage: number
  isActive: boolean
  startStep: (id: string) => void
  completeStep: (id: string) => void
  failStep: (id: string) => void
  setPercentage: (pct: number) => void
  reset: () => void
}

export function useProgressTracker(stepDefs: Array<{ id: string; label: string }>): UseProgressTrackerReturn {
  const [steps, setSteps] = useState<ProgressStep[]>(
    stepDefs.map(s => ({ ...s, status: 'pending' as const }))
  )
  const [percentage, setPercentage] = useState(0)

  const isActive = steps.some(s => s.status === 'active')

  const startStep = useCallback((id: string) => {
    setSteps(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'active' } :
      s.status === 'active' ? { ...s, status: 'completed' } : s
    ))
  }, [])

  const completeStep = useCallback((id: string) => {
    setSteps(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'completed' } : s
    ))
  }, [])

  const failStep = useCallback((id: string) => {
    setSteps(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'error' } : s
    ))
  }, [])

  const reset = useCallback(() => {
    setSteps(stepDefs.map(s => ({ ...s, status: 'pending' as const })))
    setPercentage(0)
  }, [stepDefs])

  return { steps, percentage, isActive, startStep, completeStep, failStep, setPercentage, reset }
}
```

**Step 3: Export from barrel**

Add to `src/components/ui/index.ts`:

```typescript
export { ProgressSteps } from './ProgressSteps'
```

**Step 4: Commit**

```bash
git add src/components/ui/ProgressSteps.tsx src/hooks/useProgressTracker.ts src/components/ui/index.ts
git commit -m "feat(ui): add ProgressSteps component and useProgressTracker hook (#500)"
```

---

### Task 5: Add streaming support to chat (#194)

**Files:**
- Modify: `supabase/functions/gemini-chat/index.ts` (add streaming path for `chat_aica`)
- Modify: `src/hooks/useChatSession.ts` (use `GeminiClient.stream()`)
- Modify: `src/components/features/AicaChatFAB/AicaChatFAB.tsx` (streaming message display)

**Step 1: Add streaming response path in gemini-chat Edge Function**

In `supabase/functions/gemini-chat/index.ts`, detect `stream: true` in the request body near the top-level serve handler. For the `chat_aica` action, use `generateContentStream` instead of `generateContent`:

Add a streaming handler function (before the main `serve`):

```typescript
async function handleStreamingChat(
  genAI: GoogleGenerativeAI,
  payload: { message: string; context?: any; history?: any[]; systemPrompt?: string },
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<ReadableStream> {
  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  })

  // Build system prompt + history (same logic as handleLegacyChat)
  const systemPrompt = payload.systemPrompt || getSystemPromptForAgent('coordinator', payload.context)
  const contents = [
    ...(payload.history || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: payload.message }] },
  ]

  const result = await model.generateContentStream({
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
  })

  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`))
        controller.close()
      }
    },
  })
}
```

In the main request handler, add streaming detection before the action switch:

```typescript
// After parsing body and before the action switch:
if (body.stream && (body.action === 'chat_aica' || body.action === 'finance_chat')) {
  const stream = await handleStreamingChat(genAI, body.payload || body, supabaseAdmin, userId)
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

**Step 2: Update useChatSession to support streaming**

In `src/hooks/useChatSession.ts`, add streaming path in `sendMessage`:

```typescript
// Replace the GeminiClient.call() block (lines 178-198) with:

// Call AI — prefer streaming for chat responses
const client = GeminiClient.getInstance()
let finalText = ''
let respondingAgent = 'aica_coordinator'
let sources: Array<{ title: string; url: string }> = []
let responseActions: ChatAction[] = []

// Add streaming message placeholder
const streamingMsgId = `streaming-${Date.now()}`
const streamingMsg: DisplayMessage = {
  id: streamingMsgId,
  role: 'assistant',
  content: '',
  created_at: new Date().toISOString(),
}
setMessages(prev => [...prev, streamingMsg])

try {
  await client.stream(
    {
      action: 'agent_chat',
      payload: {
        message: trimmed,
        session_id: currentSession.id,
        history,
        context: userContext,
      },
    },
    {
      onChunk: (chunk: string) => {
        // Parse SSE data lines
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              finalText += data.text
              setMessages(prev =>
                prev.map(m => m.id === streamingMsgId ? { ...m, content: finalText } : m)
              )
            }
            if (data.agent) respondingAgent = data.agent
            if (data.actions) responseActions = data.actions
            if (data.sources) sources = data.sources
          } catch { /* skip malformed chunks */ }
        }
      },
      onComplete: () => { /* handled below */ },
      onError: (err: Error) => {
        // Fallback to non-streaming
        throw err
      },
    }
  )
} catch {
  // Fallback: non-streaming call
  const response = await client.call({
    action: 'agent_chat',
    payload: { message: trimmed, session_id: currentSession.id, history, context: userContext },
  })
  const result = response?.result
  const responseText = result?.response || result || 'Desculpe, nao consegui gerar uma resposta.'
  finalText = typeof responseText === 'string' ? responseText : JSON.stringify(responseText)
  respondingAgent = result?.agent || 'aica_coordinator'
  sources = result?.sources || []
  responseActions = Array.isArray(result?.actions) ? result.actions : []
}

// Finalize: save to DB and update message
if (!finalText) finalText = 'Desculpe, nao consegui gerar uma resposta.'

const savedAssistantMsg = await chatService.saveMessage({
  sessionId: currentSession.id,
  userId,
  content: finalText,
  direction: 'outbound',
  modelUsed: 'gemini-2.5-flash',
})

setMessages(prev =>
  prev.map(m => m.id === streamingMsgId
    ? { ...chatMsgToDisplay(savedAssistantMsg), agent: respondingAgent, actions: responseActions, sources }
    : m
  )
)
setActiveAgent(respondingAgent)
```

**Step 3: Add typing cursor CSS to AicaChatFAB**

In `src/components/features/AicaChatFAB/AicaChatFAB.css`, add:

```css
.aica-fab-message--streaming .aica-fab-message__content::after {
  content: '|';
  animation: blink 0.8s infinite;
  color: var(--ceramic-amber-500, #f59e0b);
  font-weight: bold;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

**Step 4: Deploy updated Edge Function**

```bash
SUPABASE_ACCESS_TOKEN=sbp_8121477da3256d7ea9b7ab915774f8ff631eee85 npx supabase functions deploy gemini-chat --no-verify-jwt
```

**Step 5: Commit**

```bash
git add supabase/functions/gemini-chat/index.ts src/hooks/useChatSession.ts src/components/features/AicaChatFAB/AicaChatFAB.css
git commit -m "feat(chat): add streaming responses with SSE for real-time text display (#194)"
```

---

### Task 6: Integrate ProgressSteps into chat loading (#500)

**Files:**
- Modify: `src/components/features/AicaChatFAB/AicaChatFAB.tsx` (replace Loader2 spinner)
- Modify: `src/hooks/useChatSession.ts` (expose progress state)

**Step 1: Add progress state to useChatSession**

In `src/hooks/useChatSession.ts`, add to state declarations:

```typescript
const [progressStep, setProgressStep] = useState<string | null>(null)
```

Add to return interface:

```typescript
progressStep: string | null
```

In `sendMessage`, add progress updates at key points:

```typescript
setProgressStep('Verificando creditos...')
// ... after limit check
setProgressStep('Analisando contexto...')
// ... after context enrichment
setProgressStep('Gerando resposta...')
// ... before AI call
setProgressStep(null)
// ... in finally block
```

**Step 2: Show progress in AicaChatFAB loading state**

Replace the loading block (line 390-394):

```tsx
{isLoading && (
  <div className="aica-fab-message aica-fab-message--assistant">
    <ProgressSteps
      compact
      steps={[
        { id: 'ctx', label: 'Analisando contexto', status: progressStep === 'Analisando contexto...' ? 'active' : progressStep === 'Gerando resposta...' ? 'completed' : 'pending' },
        { id: 'gen', label: 'Gerando resposta', status: progressStep === 'Gerando resposta...' ? 'active' : 'pending' },
      ]}
    />
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/hooks/useChatSession.ts src/components/features/AicaChatFAB/AicaChatFAB.tsx
git commit -m "feat(chat): show progress steps during AI response generation (#500)"
```

---

### Task 7: Build module-level chat UIs (#194)

**Files:**
- Create: `src/components/features/ModuleChat/ModuleChat.tsx`
- Create: `src/components/features/ModuleChat/ModuleChat.css`
- Modify: `src/modules/atlas/` (integrate chat)
- Modify: `src/modules/studio/` (integrate chat)
- Modify: `src/modules/journey/` (integrate chat)
- Modify: `src/modules/grants/` (integrate chat)

**Step 1: Create shared ModuleChat component**

Create `src/components/features/ModuleChat/ModuleChat.tsx`:

```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, Plus, Clock, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModuleChatSession, type ModuleDisplayMessage } from '@/hooks/useModuleChatSession'
import type { AgentModule } from '@/lib/agents/types'
import { formatMarkdownToHTML } from '@/lib/formatMarkdown'
import './ModuleChat.css'

interface ModuleChatProps {
  module: AgentModule
  /** Module-specific data injected into every message */
  moduleData?: Record<string, any>
  /** Quick action buttons shown in empty state */
  quickActions?: Array<{ label: string; message: string; icon?: React.ReactNode }>
  className?: string
}

export function ModuleChat({ module, moduleData, quickActions, className }: ModuleChatProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    session,
    sessions,
    messages,
    isLoading,
    error,
    sendMessage,
    createNewSession,
    switchSession,
    archiveSession,
    showSessions,
    setShowSessions,
  } = useModuleChatSession(module)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    setInput('')
    await sendMessage(trimmed, moduleData)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn('module-chat', className)}>
      {/* Header */}
      <div className="module-chat__header">
        <MessageCircle size={14} className="text-amber-500" />
        <span className="text-xs font-semibold text-ceramic-text-primary">
          Assistente {module}
        </span>
        <div className="flex-1" />
        <button onClick={() => setShowSessions(!showSessions)} className="module-chat__action">
          <Clock size={14} />
        </button>
        <button onClick={createNewSession} className="module-chat__action">
          <Plus size={14} />
        </button>
      </div>

      {/* Session list */}
      {showSessions ? (
        <div className="module-chat__sessions">
          {sessions.map(s => (
            <div key={s.id} className="module-chat__session-item">
              <button onClick={() => switchSession(s.id)} className="flex-1 text-left text-xs truncate">
                {s.title || 'Sem titulo'}
              </button>
              <button onClick={() => archiveSession(s.id)} className="module-chat__action">
                <Archive size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="module-chat__messages">
            {messages.length === 0 && !isLoading && quickActions && (
              <div className="module-chat__empty">
                <p className="text-xs text-ceramic-text-secondary mb-2">Como posso ajudar?</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickActions.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(qa.message, moduleData)}
                      className="module-chat__quick-action"
                    >
                      {qa.icon}
                      <span>{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'module-chat__msg',
                  msg.role === 'user' ? 'module-chat__msg--user' : 'module-chat__msg--assistant'
                )}
              >
                {msg.role === 'assistant' ? (
                  <div dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(msg.content) }} />
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="module-chat__msg module-chat__msg--assistant">
                <Loader2 size={14} className="animate-spin text-amber-500" />
              </div>
            )}

            {error && (
              <div className="module-chat__error">
                <p>{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="module-chat__input-bar">
            <input
              ref={inputRef}
              type="text"
              className="module-chat__input"
              placeholder="Pergunte algo..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              className="module-chat__send"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

**Step 2: Create ModuleChat CSS**

Create `src/components/features/ModuleChat/ModuleChat.css`:

```css
.module-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 300px;
  max-height: 500px;
  border-radius: 0.75rem;
  background: var(--ceramic-base, #faf9f7);
  border: 1px solid var(--ceramic-border, #e5e2dc);
  overflow: hidden;
}

.module-chat__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--ceramic-border, #e5e2dc);
}

.module-chat__action {
  padding: 0.25rem;
  border-radius: 0.375rem;
  color: var(--ceramic-text-secondary);
  transition: background 0.15s;
}
.module-chat__action:hover { background: rgba(0,0,0,0.05); }

.module-chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.module-chat__msg {
  max-width: 85%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  line-height: 1.4;
}

.module-chat__msg--user {
  align-self: flex-end;
  background: #f59e0b;
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.module-chat__msg--assistant {
  align-self: flex-start;
  background: white;
  border: 1px solid var(--ceramic-border, #e5e2dc);
  border-bottom-left-radius: 0.25rem;
}

.module-chat__input-bar {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem;
  border-top: 1px solid var(--ceramic-border, #e5e2dc);
}

.module-chat__input {
  flex: 1;
  padding: 0.375rem 0.625rem;
  border-radius: 0.5rem;
  border: 1px solid var(--ceramic-border, #e5e2dc);
  font-size: 0.75rem;
  background: white;
  outline: none;
}
.module-chat__input:focus { border-color: #f59e0b; }

.module-chat__send {
  padding: 0.375rem;
  border-radius: 0.5rem;
  background: #f59e0b;
  color: white;
}
.module-chat__send:disabled { opacity: 0.5; }

.module-chat__quick-action {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  background: white;
  border: 1px solid var(--ceramic-border, #e5e2dc);
  font-size: 0.625rem;
  color: var(--ceramic-text-secondary);
  transition: border-color 0.15s;
}
.module-chat__quick-action:hover { border-color: #f59e0b; }

.module-chat__error {
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  font-size: 0.625rem;
  color: var(--ceramic-error);
}

.module-chat__sessions {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.module-chat__session-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
}
.module-chat__session-item:hover { background: rgba(0,0,0,0.03); }

.module-chat__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
}
```

**Step 3: Integrate into priority modules**

For each module, add `<ModuleChat>` as a sidebar panel or tab. The exact integration point depends on each module's layout. Example for Atlas in `AgendaView.tsx`:

```tsx
// Import at top:
import { ModuleChat } from '@/components/features/ModuleChat/ModuleChat'

// Add as collapsible panel in desktop layout or as a tab in mobile:
<ModuleChat
  module="atlas"
  moduleData={{ pendingTasks: filteredTasks.length, overdueTasks: overdueTasks.length }}
  quickActions={[
    { label: 'Priorizar tarefas', message: 'Me ajude a priorizar minhas tarefas de hoje' },
    { label: 'Planejar semana', message: 'Quais tarefas devo focar esta semana?' },
  ]}
/>
```

Repeat similar pattern for Studio, Journey, Grants with module-specific quick actions.

**Step 4: Commit**

```bash
git add src/components/features/ModuleChat/
git commit -m "feat(chat): add ModuleChat component for per-module AI assistants (#194)"
```

---

### Task 8: Build Chat History Browser (#194)

**Files:**
- Create: `src/components/features/AicaChatFAB/ChatHistoryPanel.tsx`
- Modify: `src/services/chatService.ts` (add search method)
- Modify: `src/components/features/AicaChatFAB/AicaChatFAB.tsx` (integrate history panel)

**Step 1: Add search method to chatService**

In `src/services/chatService.ts`, add:

```typescript
async searchMessages(query: string, limit = 20): Promise<Array<ChatMessage & { session_title: string | null }>> {
  const { data, error } = await supabase
    .rpc('search_chat_messages', { search_query: query, result_limit: limit })

  if (error) throw error
  return data || []
},

async getSessionsGrouped(): Promise<{ today: ChatSession[]; thisWeek: ChatSession[]; older: ChatSession[] }> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw error
  const sessions = data || []

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  return {
    today: sessions.filter(s => new Date(s.updated_at) >= todayStart),
    thisWeek: sessions.filter(s => {
      const d = new Date(s.updated_at)
      return d >= weekStart && d < todayStart
    }),
    older: sessions.filter(s => new Date(s.updated_at) < weekStart),
  }
},
```

**Step 2: Create RPC for message search**

Create migration `supabase/migrations/20260227_chat_search_rpc.sql`:

```sql
CREATE OR REPLACE FUNCTION search_chat_messages(
  search_query TEXT,
  result_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  session_id UUID,
  user_id UUID,
  content TEXT,
  direction TEXT,
  channel TEXT,
  content_type TEXT,
  model_used TEXT,
  tokens_input INT,
  tokens_output INT,
  created_at TIMESTAMPTZ,
  session_title TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id, m.session_id, m.user_id, m.content, m.direction,
    m.channel, m.content_type, m.model_used, m.tokens_input, m.tokens_output,
    m.created_at,
    s.title AS session_title
  FROM chat_messages m
  JOIN chat_sessions s ON s.id = m.session_id
  WHERE m.user_id = auth.uid()
    AND m.content ILIKE '%' || search_query || '%'
  ORDER BY m.created_at DESC
  LIMIT result_limit;
$$;
```

**Step 3: Create ChatHistoryPanel component**

Create `src/components/features/AicaChatFAB/ChatHistoryPanel.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { Search, MessageCircle, Calendar } from 'lucide-react'
import { chatService, type ChatSession } from '@/services/chatService'

interface ChatHistoryPanelProps {
  onSelectSession: (sessionId: string) => void
  onClose: () => void
}

export function ChatHistoryPanel({ onSelectSession, onClose }: ChatHistoryPanelProps) {
  const [search, setSearch] = useState('')
  const [grouped, setGrouped] = useState<{ today: ChatSession[]; thisWeek: ChatSession[]; older: ChatSession[] }>({
    today: [], thisWeek: [], older: []
  })

  useEffect(() => {
    chatService.getSessionsGrouped().then(setGrouped).catch(() => {})
  }, [])

  const renderGroup = (label: string, sessions: ChatSession[]) => {
    if (sessions.length === 0) return null
    return (
      <div className="mb-3">
        <h4 className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider px-2 mb-1">{label}</h4>
        {sessions
          .filter(s => !search || (s.title || '').toLowerCase().includes(search.toLowerCase()))
          .map(s => (
            <button
              key={s.id}
              onClick={() => onSelectSession(s.id)}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-ceramic-cool/50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <MessageCircle size={10} className="text-amber-500 shrink-0" />
                <span className="text-xs text-ceramic-text-primary truncate">{s.title || 'Sem titulo'}</span>
              </div>
              {s.module && (
                <span className="text-[10px] text-ceramic-text-secondary ml-4">{s.module}</span>
              )}
            </button>
          ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-ceramic-border">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-ceramic-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-ceramic-border bg-white focus:border-amber-500 outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {renderGroup('Hoje', grouped.today)}
        {renderGroup('Esta semana', grouped.thisWeek)}
        {renderGroup('Anteriores', grouped.older)}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/components/features/AicaChatFAB/ChatHistoryPanel.tsx src/services/chatService.ts supabase/migrations/20260227_chat_search_rpc.sql
git commit -m "feat(chat): add chat history browser with search and date grouping (#194)"
```

---

### Task 9: ADK fallback and agent routing (#194)

**Files:**
- Modify: `src/hooks/useChatSession.ts` (graceful fallback)
- Modify: `supabase/functions/agent-proxy/index.ts` (health check + fallback)
- Modify: `src/lib/gemini/client.ts` (agent routing detection)

**Step 1: Add fallback logic in agent-proxy**

In `supabase/functions/agent-proxy/index.ts`, add a health check with timeout and fallback:

```typescript
// Inside the main handler, wrap the ADK call with a timeout:
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

try {
  const adkResponse = await fetch(`${AGENTS_BACKEND_URL}/api/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
  clearTimeout(timeout)

  if (!adkResponse.ok) {
    throw new Error(`ADK returned ${adkResponse.status}`)
  }

  const result = await adkResponse.json()
  return new Response(JSON.stringify({ result, source: 'adk' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
} catch (adkError) {
  clearTimeout(timeout)
  console.warn('[agent-proxy] ADK unavailable, falling back to gemini-chat:', (adkError as Error).message)

  // Fallback: forward to gemini-chat Edge Function
  const geminiResponse = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.get('Authorization') || '' },
    body: JSON.stringify({
      action: 'chat_aica',
      payload: { message: body.message, history: body.history, context: body.context },
    }),
  })

  const fallbackResult = await geminiResponse.json()
  return new Response(JSON.stringify({ result: fallbackResult.result, source: 'gemini-chat-fallback' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

**Step 2: Commit**

```bash
git add supabase/functions/agent-proxy/index.ts
git commit -m "feat(chat): add ADK fallback to gemini-chat when agent backend unavailable (#194)"
```

---

### Task 10: Build verification and final PR

**Step 1: Run build and typecheck**

```bash
npm run build && npm run typecheck
```

Expected: No errors. Fix any TypeScript errors found.

**Step 2: Run lint**

```bash
npm run lint
```

**Step 3: Deploy Edge Functions**

```bash
SUPABASE_ACCESS_TOKEN=sbp_8121477da3256d7ea9b7ab915774f8ff631eee85 npx supabase functions deploy gemini-chat --no-verify-jwt
SUPABASE_ACCESS_TOKEN=sbp_8121477da3256d7ea9b7ab915774f8ff631eee85 npx supabase functions deploy agent-proxy --no-verify-jwt
```

**Step 4: Push migration**

```bash
npx supabase db push
```

**Step 5: Create PR**

```bash
git push -u origin sprint-r-bugs-chat-redesign
gh pr create --title "feat(chat,atlas,studio): Sprint R — bug fixes + full chat redesign (#502, #501, #503, #500, #194)" --body "$(cat <<'EOF'
## Summary
- Fix #502: Chat moment registration type error ('reflection' → 'text')
- Fix #501: Studio pauta generation error reporting with step context
- Fix #503: Mobile swipe navigation between Atlas views (Agenda/List/Kanban/Matrix)
- Fix #500: ProgressSteps component for continuous feedback during AI operations
- Fix #194: Streaming chat responses (SSE), module-level chat UIs, chat history browser, ADK fallback

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] Chat "Registrar momento" creates moment successfully
- [ ] Pauta generation shows specific step on error
- [ ] Mobile swipe navigates Atlas views, desktop unaffected
- [ ] Chat responses stream incrementally
- [ ] ModuleChat works in Atlas/Studio/Journey/Grants
- [ ] Chat history search and date grouping works

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task Dependencies

```
Task 1 (fix #502) ────────────┐
Task 2 (fix #501) ────────────┤── Group 1: Independent, parallel
Task 3 (fix #503) ────────────┘
                                    ↓
Task 4 (ProgressSteps) ───────┐
                               ├── Task 6 depends on 4+5
Task 5 (Streaming backend) ───┘
                                    ↓
Task 6 (Progress in chat) ────────→ Task 7 (Module chats)
                                    ↓
Task 8 (History browser) ─────────→ Task 9 (ADK fallback)
                                    ↓
                              Task 10 (Build + PR)
```

## Team Assignment

| Task | Teammate | Agent Type | Isolation |
|------|----------|-----------|-----------|
| 1 | bug-fixer-1 | general-purpose | worktree |
| 2 | bug-fixer-2 | general-purpose | worktree |
| 3 | bug-fixer-3 | general-purpose | worktree |
| 4 | frontend-dev | general-purpose | worktree |
| 5 | backend-dev | general-purpose | worktree |
| 6 | frontend-dev | general-purpose | same branch |
| 7 | module-dev | general-purpose | worktree |
| 8 | frontend-dev | general-purpose | same branch |
| 9 | backend-dev | general-purpose | same branch |
| 10 | lead | general-purpose | main branch |
