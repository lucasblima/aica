# Design: Refatoração gemini-chat + ReACT Agent Foundation

**Date:** 2026-03-18
**Author:** Lucas + Claude
**Status:** Draft
**Depends on:** MiroFish architecture analysis (`docs/plans/polymorphic-scribbling-yao.md`)

---

## Problem

`supabase/functions/gemini-chat/index.ts` is a 3,248-line God Object serving 26 handlers across 8 modules. It duplicates shared helpers (`extractJSON()`, CORS), has no test coverage, and is impossible to extend for ReACT without increasing tech debt.

## Decision

**Split into separate Edge Functions, phased execution.**

Phase 1-2 are the immediate scope. Phases 3-8 follow the same pattern in future PRs.

---

## Phase 1 — Shared Helpers Extraction

### Goal
Extract reusable code from gemini-chat into `_shared/` so all current and future Edge Functions can import them.

### Files to Create

#### `_shared/gemini-types.ts` (~150 lines)
All shared interfaces extracted from gemini-chat lines 44-340:
- `BaseRequest`, `ChatRequest`
- `SentimentAnalysisPayload`, `SentimentAnalysisResult`
- `WeeklySummaryPayload`, `WeeklySummaryResult`, `MomentData`, `KeyMoment`
- `GenerateDossierPayload`, `DossierResult`, `TechnicalSheet`
- `IceBreakerPayload`, `IceBreakerResult`
- `PautaQuestionsPayload`, `PautaQuestionsResult`
- `PautaOutlinePayload`, `PautaOutlineResult`, `OutlineSection`
- `DailyReportPayload`, `DailyReportResult`
- `GenerateFieldContentPayload`, `AnalyzeEditalStructurePayload`
- `ParseFormFieldsPayload`, `ParsedFormField`
- `GenerateAutoBriefingPayload`, `ImproveBriefingFieldPayload`
- `ExtractRequiredDocumentsPayload`, `ExtractTimelinePhasesPayload`
- `ParseStatementPayload`
- `ResearchGuestPayload`, `GuestProfile`
- `ChatAction`, `UserContextResult`
- `WhatsAppSentimentPayload`, `WhatsAppSentimentResult`
- `AnalyzeMomentPayload`, `AnalyzeMomentResult`
- `EvaluateQualityPayload`, `EvaluateQualityResult`
- `ChatWithAgentPayload`
- `CategorizeTransactionsPayload`

#### `_shared/context-builder.ts` (~350 lines)
Extract `buildUserContext()` (lines 613-924) + `generateSuggestedActions()` (lines 930-1053).

These are used by `chat_aica`, `chat_with_agent`, and will be used by `react-agent`.

```typescript
// _shared/context-builder.ts
import type { UserContextResult, ChatAction } from './gemini-types.ts'

export async function buildUserContext(
  supabaseAdmin: any,
  userId: string,
  module: string
): Promise<UserContextResult> { /* ... */ }

export function generateSuggestedActions(
  message: string,
  rawData: UserContextResult['rawData']
): ChatAction[] { /* ... */ }
```

#### `_shared/agent-prompts.ts` (~250 lines)
Extract `AGENT_SYSTEM_PROMPTS` (lines 1227-1273) + `INTERVIEWER_SYSTEM_PROMPT()` (lines 1141-1220).

```typescript
// _shared/agent-prompts.ts
export const AGENT_SYSTEM_PROMPTS: Record<string, {
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
}> = { /* atlas, captacao, studio, journey, finance, connections, flux, agenda, coordinator */ }

export const VALID_AGENTS = Object.keys(AGENT_SYSTEM_PROMPTS)

export function INTERVIEWER_SYSTEM_PROMPT(intent: string): string { /* ... */ }
```

#### `_shared/gemini-helpers.ts` (~80 lines)
Shared Gemini initialization + model config used by ALL Edge Functions:

```typescript
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'

export const MODELS = {
  fast: 'gemini-2.5-flash',
  smart: 'gemini-2.5-pro',
} as const

export function getGenAI(): GoogleGenerativeAI {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  return new GoogleGenerativeAI(apiKey)
}

export function getModel(
  genAI: GoogleGenerativeAI,
  model: 'fast' | 'smart',
  config?: { temperature?: number; maxOutputTokens?: number }
) {
  return genAI.getGenerativeModel({
    model: MODELS[model],
    generationConfig: {
      temperature: config?.temperature ?? 0.3,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: config?.maxOutputTokens ?? 4096,
    },
  })
}

export function getDateContext(): {
  today: string; dayOfWeek: string; tomorrow: string; timeStr: string
} { /* ... */ }
```

### Files to Modify

#### `_shared/cors.ts`
Already exists and matches gemini-chat's pattern. Add Cloud Run staging origin if missing:
```
'https://aica-staging-5562559893.southamerica-east1.run.app'
'https://aica-5562559893.southamerica-east1.run.app'
```

#### `_shared/model-router.ts`
Already has `extractJSON()`. Verify it matches gemini-chat's implementation (it does — same algorithm). No changes needed.

### Deduplications

| What | Current Location | New Location |
|------|-----------------|--------------|
| `extractJSON()` | gemini-chat/index.ts:373 (inline) | `_shared/model-router.ts` (already exists) |
| `getCorsHeaders()` | gemini-chat/index.ts:10-34 (inline) | `_shared/cors.ts` (already exists) |
| `MODELS` config | gemini-chat/index.ts:345-348 | `_shared/gemini-helpers.ts` |
| Date context builder | gemini-chat/index.ts:1096-1101 (duplicated 3x) | `_shared/gemini-helpers.ts` |

---

## Phase 2 — gemini-chat Slim + Frontend Routing

### Goal
Reduce gemini-chat to only chat-related handlers. Set up frontend routing for future module extraction.

### gemini-chat keeps ONLY:
1. `chat_aica` / `finance_chat` → `handleLegacyChat()` (~80 lines)
2. `chat_aica_stream` → streaming handler (~200 lines)
3. `chat_with_agent` → `handleChatWithAgent()` (~80 lines)
4. `classify_intent` → `handleClassifyIntent()` (~110 lines)
5. `execute_chat_action` → `handleExecuteChatAction()` (~80 lines)
6. `generate_daily_question` → already in `daily-question-handler.ts`

**Estimated size after Phase 2:** ~700 lines (down from 3,248)

### gemini-chat still TEMPORARILY hosts (until their Edge Function exists):
All other handlers stay until their phase is executed. The router dispatches to them normally. This ensures zero regression during the transition.

### Frontend Routing

Expand `DEDICATED_EDGE_FUNCTIONS` in `src/lib/gemini/client.ts`:

```typescript
// Phase 2: prepare routing (functions created in phases 3-8)
const DEDICATED_EDGE_FUNCTIONS: Record<string, string> = {
  // Existing
  'deep_research': 'deep-research',
  'create_store_v2': 'file-search-v2',
  'agent_chat': 'agent-proxy',
  'cache_get_or_create': 'context-cache',
  'run_life_council': 'run-life-council',
  'synthesize_patterns': 'synthesize-user-patterns',

  // Phase 3: Journey (added when gemini-journey is deployed)
  // 'analyze_moment_sentiment': 'gemini-journey',
  // 'generate_weekly_summary': 'gemini-journey',
  // 'analyze_moment': 'gemini-journey',
  // ... etc

  // Phase 8: ReACT
  // 'react_chat': 'react-agent',
}
```

Each phase uncomments its lines + removes handlers from gemini-chat.

### index.ts Structure After Phase 2

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { extractJSON } from '../_shared/model-router.ts'
import { getGenAI, getModel, getDateContext } from '../_shared/gemini-helpers.ts'
import { buildUserContext, generateSuggestedActions } from '../_shared/context-builder.ts'
import { AGENT_SYSTEM_PROMPTS, INTERVIEWER_SYSTEM_PROMPT } from '../_shared/agent-prompts.ts'
import type { BaseRequest } from '../_shared/gemini-types.ts'

// Chat-specific handlers (local)
import { handleLegacyChat } from './handlers/chat.ts'
import { handleChatWithAgent } from './handlers/agent-chat.ts'
import { handleStreamChat } from './handlers/stream.ts'
import { handleClassifyIntent, handleExecuteChatAction } from './handlers/actions.ts'
import { handleGenerateDailyQuestion } from './daily-question-handler.ts'

// TEMPORARY: module handlers still here until their Edge Function exists
import { handleAnalyzeMomentSentiment, handleGenerateWeeklySummary, /* ... */ } from './handlers/journey-temp.ts'
import { handleGenerateDossier, /* ... */ } from './handlers/studio-temp.ts'
// ... etc

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // ... auth, parse body ...

  switch (action) {
    case 'chat_aica':
    case 'finance_chat':
      data = await handleLegacyChat(/* ... */)
      break
    case 'chat_aica_stream':
      return handleStreamChat(/* ... */)
    case 'chat_with_agent':
      data = await handleChatWithAgent(/* ... */)
      break
    // ... etc
  }
})
```

---

## Phase 3-7 — Module Edge Functions (Future PRs)

Each follows identical pattern. Example for Phase 3 (Journey):

### Create `supabase/functions/gemini-journey/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { extractJSON } from '../_shared/model-router.ts'
import { getGenAI, getModel } from '../_shared/gemini-helpers.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import type { /* types */ } from '../_shared/gemini-types.ts'

// Local handlers
import { handleAnalyzeMomentSentiment } from './handlers/sentiment.ts'
import { handleGenerateWeeklySummary } from './handlers/weekly-summary.ts'
import { handleAnalyzeMoment } from './handlers/analyze-moment.ts'
import { handleEvaluateQuality } from './handlers/evaluate-quality.ts'
import { handleAnalyzeContentRealtime } from './handlers/realtime.ts'
import { handleGeneratePostCaptureInsight } from './handlers/post-capture.ts'
import { handleClusterMomentsByTheme } from './handlers/clusters.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Auth validation ...
  // Action routing ...
})
```

### Phase Schedule

| Phase | Edge Function | Handlers | Actions |
|-------|--------------|----------|---------|
| 3 | `gemini-journey` | 7 | analyze_moment_sentiment, generate_weekly_summary, analyze_moment, evaluate_quality, analyze_content_realtime, generate_post_capture_insight, cluster_moments_by_theme |
| 4 | `gemini-studio` | 5 | generate_dossier, generate_ice_breakers, generate_pauta_questions, generate_pauta_outline, research_guest |
| 5 | `gemini-grants` | 7 | generate_field_content, analyze_edital_structure, parse_form_fields, generate_auto_briefing, improve_briefing_field, extract_required_documents, extract_timeline_phases |
| 6 | `gemini-finance` | 2 | parse_statement, categorize_transactions |
| 7 | `gemini-atlas` | 3 | extract_task_from_voice, generate_tags, transcribe_audio |

### Per-Phase Checklist
- [ ] Create Edge Function directory + index.ts
- [ ] Import shared helpers
- [ ] Move handler files from gemini-chat/handlers/*-temp.ts
- [ ] Uncomment DEDICATED_EDGE_FUNCTIONS in frontend
- [ ] Remove handlers from gemini-chat
- [ ] Deploy new Edge Function
- [ ] Redeploy gemini-chat (now smaller)
- [ ] Verify no regression via manual test
- [ ] `npm run build && npm run typecheck`

---

## Phase 8 — react-agent Edge Function

### Goal
Implement ReACT loop (Thought → Action → Observation → Final Answer) inspired by MiroFish's `report_agent.py` pattern. First use case: Gemini Chat enrichment — before answering, the chat does 3-5 tool calls to fetch relevant user context.

### Architecture

```
Frontend → GeminiClient.call({action: 'react_chat'})
           │
           └→ react-agent Edge Function
              │
              ├─ Thought 1: "User asking about tasks → query work_items"
              │  └─ Action: tool_call('query_tasks', {status: 'pending'})
              │     └─ Observation: [{title: 'Fix bug', due: '2026-03-19'}, ...]
              │
              ├─ Thought 2: "Need emotional context → query recent moments"
              │  └─ Action: tool_call('query_moments', {limit: 5})
              │     └─ Observation: [{content: 'Feeling stressed...', emotion: 'anxious'}]
              │
              ├─ Thought 3: "Check patterns for personalization"
              │  └─ Action: tool_call('query_patterns', {min_confidence: 0.5})
              │     └─ Observation: [{type: 'productivity', desc: 'Most productive 9-11am'}]
              │
              └─ Final Answer (synthesis with gemini-2.5-pro if confidence < 0.6)
                 "Based on your 3 pending tasks and recent stress, I suggest..."
```

### Files to Create

#### `_shared/react-loop.ts` (~200 lines)
Generic ReACT loop engine, reusable by any Edge Function.

```typescript
export interface ReactTool {
  name: string
  description: string
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

export interface ReactConfig {
  tools: ReactTool[]
  minToolCalls: number  // default 3
  maxToolCalls: number  // default 5
  maxCharsPerObservation: number  // default 4000
  systemPrompt: string
  userMessage: string
  history?: Array<{ role: string; content: string }>
}

export interface ReactStep {
  thought: string
  action: { tool: string; params: Record<string, unknown> } | null
  observation: string | null
  timestamp: string
}

export interface ReactResult {
  finalAnswer: string
  steps: ReactStep[]
  model: string
  totalTokens: number
  confidence: number
  wasEscalated: boolean
}

export async function runReactLoop(
  config: ReactConfig,
  genAI: GoogleGenerativeAI,
  options?: { onStep?: (step: ReactStep) => void }
): Promise<ReactResult> {
  // 1. Build tool descriptions for system prompt
  // 2. Loop: ask Gemini for thought+action, execute tool, collect observation
  // 3. Truncate observations via context-manager
  // 4. After min calls, allow "final_answer" action
  // 5. If confidence < 0.6, escalate to Pro for synthesis
  // 6. Return result with full step trace
}
```

#### `_shared/context-manager.ts` (~60 lines)
Context window management helper.

```typescript
export function truncateReference(text: string, maxChars: number = 4000): string {
  if (text.length <= maxChars) return text
  // Smart truncation: keep start + end, indicate truncation
  const keepChars = Math.floor((maxChars - 50) / 2)
  return text.slice(0, keepChars) + '\n\n[... truncated ...]\n\n' + text.slice(-keepChars)
}

export function buildContextBudget(
  observations: string[],
  totalBudget: number = 16000
): string[] {
  // Distribute budget across observations
  // More recent observations get more budget
  const perObs = Math.floor(totalBudget / observations.length)
  return observations.map(obs => truncateReference(obs, perObs))
}
```

#### `supabase/functions/react-agent/index.ts` (~150 lines)
Edge Function that wires the ReACT loop with chat-specific tools.

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getGenAI } from '../_shared/gemini-helpers.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { runReactLoop, type ReactTool } from '../_shared/react-loop.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

function buildChatTools(supabase: any, userId: string): ReactTool[] {
  return [
    {
      name: 'query_tasks',
      description: 'Query user tasks from Atlas. Params: {status?, limit?}',
      execute: async (params) => {
        let query = supabase.from('work_items').select('title,status,priority,due_date,is_urgent,is_important')
          .eq('user_id', userId).eq('archived', false)
        if (params.status) query = query.eq('status', params.status)
        const { data } = await query.limit(params.limit || 10)
        return data || []
      },
    },
    {
      name: 'query_moments',
      description: 'Query recent moments from Journey. Params: {limit?, emotion?}',
      execute: async (params) => { /* ... */ },
    },
    {
      name: 'query_finances',
      description: 'Query financial summary. Params: {days?}',
      execute: async (params) => { /* ... */ },
    },
    {
      name: 'query_patterns',
      description: 'Query behavioral patterns. Params: {min_confidence?}',
      execute: async (params) => { /* ... */ },
    },
    {
      name: 'query_events',
      description: 'Query calendar events. Params: {days_ahead?}',
      execute: async (params) => { /* ... */ },
    },
    {
      name: 'query_council',
      description: 'Query latest Life Council insights. Params: {limit?}',
      execute: async (params) => { /* ... */ },
    },
  ]
}

serve(async (req) => { /* standard pattern */ })
```

#### Migration: `agent_runs` table

```sql
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Run metadata
  agent_type TEXT NOT NULL DEFAULT 'react',
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'timeout')),

  -- Input
  user_message TEXT NOT NULL,
  system_prompt TEXT,

  -- Steps (JSONB array of ReactStep)
  steps JSONB DEFAULT '[]'::jsonb,

  -- Output
  final_answer TEXT,
  confidence NUMERIC(3,2),
  was_escalated BOOLEAN DEFAULT false,

  -- Metrics
  total_tokens INTEGER DEFAULT 0,
  tool_calls_count INTEGER DEFAULT 0,
  latency_ms INTEGER,
  model_used TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Error tracking
  error_message TEXT,
  error_context JSONB
);

-- RLS
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own runs" ON agent_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage runs" ON agent_runs
  FOR ALL USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_agent_runs_user ON agent_runs(user_id, created_at DESC);
CREATE INDEX idx_agent_runs_status ON agent_runs(status) WHERE status = 'running';
```

### Health Tracking Integration

Each tool call in the ReACT loop reports to `ai_function_health`:

```typescript
// Inside runReactLoop()
const result = await withHealthTracking(
  { functionName: 'react-agent', actionName: `thought_${stepIndex}` },
  supabaseClient,
  async () => {
    const geminiResponse = await model.generateContent(thoughtPrompt)
    return extractJSON(geminiResponse.response.text())
  }
)
```

### Context Manager Integration with gemini-chat

Even before Phase 8, `context-manager.ts` can be used in the existing `buildUserContext()` to cap context size:

```typescript
// In _shared/context-builder.ts
import { truncateReference } from './context-manager.ts'

// Cap each module's context to prevent context explosion
if (module === 'coordinator') {
  // Each module section limited
  const cappedContext = truncateReference(contextParts.join('\n'), 4000)
  // ...
}
```

---

## Testing Strategy

### Unit Tests (Phase 1-2)
- `context-builder.test.ts` — mock Supabase, verify query filters and context assembly
- `action-suggester.test.ts` — keyword matching, action generation, edge cases
- `context-manager.test.ts` — truncation, budget distribution

### Unit Tests (Phase 8)
- `react-loop.test.ts` — mock tools, verify min/max calls, confidence escalation, step persistence
- `context-manager.test.ts` — truncation edge cases, budget distribution with varying observation sizes

### Integration Tests (Each Phase)
- Deploy Edge Function to staging
- Verify existing actions still work via gemini-chat
- Verify new Edge Function responds correctly
- `npm run build && npm run typecheck` passes

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Shared helper import fails in Deno | Test imports locally with `supabase functions serve` before deploying |
| Frontend routing breaks existing flow | DEDICATED_EDGE_FUNCTIONS only added when Edge Function is deployed + verified |
| extractJSON divergence | Delete inline copy in gemini-chat, single source of truth in model-router.ts |
| buildUserContext called from multiple functions | Extract to _shared/, import everywhere — same code, no drift |
| ReACT loop infinite | Hard cap at maxToolCalls (5), timeout at 30s per step, 150s total |
| Context explosion in ReACT | context-manager.ts caps each observation at 4000 chars |

---

## Out of Scope

- Progress callbacks via Supabase realtime (future sprint)
- Action logging JSONL format (future sprint)
- Google ADK integration (evaluate post-foundation)
- Streaming for react-agent (future — start with request/response)
- gemini-whatsapp Edge Function (whatsapp_sentiment is rarely used, stays in gemini-chat)
