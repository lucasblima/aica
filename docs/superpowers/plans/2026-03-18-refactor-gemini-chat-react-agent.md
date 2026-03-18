# Refactor gemini-chat + ReACT Agent Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose gemini-chat from a 3,248-line monolith into shared helpers + thin router, then build a ReACT agent Edge Function for context-enriched chat.

**Architecture:** Phase 1 extracts shared helpers to `_shared/`. Phase 2 reorganizes gemini-chat into handlers/ subdirectory with a thin router. Phase 8 builds the ReACT loop engine + react-agent Edge Function. Phases 3-7 (future PRs) extract module handlers into separate Edge Functions.

**Tech Stack:** Supabase Edge Functions (Deno), Gemini 2.5 Flash/Pro, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-03-18-refactor-gemini-chat-react-agent-design.md`

---

## File Structure

### New Files
```
supabase/functions/_shared/
├── gemini-types.ts        # All shared interfaces (~150 lines)
├── gemini-helpers.ts      # getGenAI(), getModel(), getDateContext() (~80 lines)
├── context-builder.ts     # buildUserContext(), generateSuggestedActions() (~350 lines)
├── agent-prompts.ts       # AGENT_SYSTEM_PROMPTS, INTERVIEWER_SYSTEM_PROMPT (~200 lines)
├── usage-tracker.ts       # logInteraction() fire-and-forget (~30 lines)
└── context-manager.ts     # truncateReference(), buildContextBudget() (~60 lines)

supabase/functions/gemini-chat/
├── index.ts               # Thin router (~250 lines, down from 3,248)
├── daily-question-handler.ts  # (already exists)
└── handlers/
    ├── chat.ts            # handleLegacyChat (~120 lines)
    ├── agent-chat.ts      # handleChatWithAgent (~100 lines)
    ├── stream.ts          # handleStreamChat (~220 lines)
    ├── actions.ts         # handleClassifyIntent, handleExecuteChatAction (~200 lines)
    ├── journey-temp.ts    # 8 Journey handlers (until Phase 3)
    ├── studio-temp.ts     # 5 Studio handlers (until Phase 4)
    ├── grants-temp.ts     # 7 Grants handlers (until Phase 5)
    ├── finance-temp.ts    # 2 Finance handlers (until Phase 6)
    └── atlas-temp.ts      # 3 Atlas+audio handlers (until Phase 7)

supabase/functions/react-agent/
└── index.ts               # ReACT Edge Function (~150 lines)

supabase/functions/_shared/react-loop.ts  # ReACT engine (~200 lines)

supabase/migrations/YYYYMMDD_create_agent_runs.sql

scripts/smoke-test-gemini-chat.sh
```

### Modified Files
```
supabase/functions/_shared/cors.ts         # Add Cloud Run origins
supabase/functions/_shared/model-router.ts # Fix extractJSON()
src/lib/gemini/client.ts                   # Expand DEDICATED_EDGE_FUNCTIONS
```

---

## Phase 1 — Shared Helpers Extraction (PR #1)

### Task 1: Fix extractJSON() in model-router.ts

**Files:**
- Modify: `supabase/functions/_shared/model-router.ts:282-320`

- [ ] **Step 1: Read current implementations**

Read `supabase/functions/_shared/model-router.ts` lines 282-320 and `supabase/functions/gemini-chat/index.ts` lines 373-407. Confirm gemini-chat's algorithm is more robust (strips fences first).

- [ ] **Step 2: Replace extractJSON in model-router.ts**

Replace the `extractJSON` function (lines 282-320) with gemini-chat's algorithm:

```typescript
export function extractJSON<T = unknown>(text: string): T {
  // 1. Strip code fences FIRST (more robust than regex extraction)
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').trim()

  // 2. Try direct parse
  try {
    return JSON.parse(cleaned)
  } catch {
    // continue to fallback strategies
  }

  // 3. Find first { or [ and match to last } or ]
  const objStart = cleaned.indexOf('{')
  const arrStart = cleaned.indexOf('[')
  let start = -1
  let end = -1

  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    start = objStart
    end = cleaned.lastIndexOf('}')
  } else if (arrStart >= 0) {
    start = arrStart
    end = cleaned.lastIndexOf(']')
  }

  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.substring(start, end + 1))
    } catch {
      // fall through
    }
  }

  throw new Error(`Failed to extract JSON from AI response: ${text.substring(0, 200)}...`)
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/model-router.ts
git commit -m "fix(shared): align extractJSON with gemini-chat's robust algorithm"
```

---

### Task 2: Update _shared/cors.ts with Cloud Run origins

**Files:**
- Modify: `supabase/functions/_shared/cors.ts:6-9`

- [ ] **Step 1: Add Cloud Run origins**

```typescript
const ALLOWED_ORIGINS = [
  'https://dev.aica.guru',
  'https://aica.guru',
  'https://aica-staging-5562559893.southamerica-east1.run.app',
  'https://aica-5562559893.southamerica-east1.run.app',
];
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/cors.ts
git commit -m "fix(cors): add Cloud Run origins to shared CORS config"
```

---

### Task 3: Create _shared/gemini-types.ts

**Files:**
- Create: `supabase/functions/_shared/gemini-types.ts`

- [ ] **Step 1: Extract all interfaces from gemini-chat**

Copy lines 44-340 from `supabase/functions/gemini-chat/index.ts`. These are all the `interface` declarations. Add `export` keyword to each. The file should contain ~25 exported interfaces.

Key types to extract:
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
- `ParseStatementPayload`, `ResearchGuestPayload`, `GuestProfile`
- `ChatAction`, `UserContextResult`
- `WhatsAppSentimentPayload`, `WhatsAppSentimentResult`
- `AnalyzeMomentPayload`, `AnalyzeMomentResult`, `EvaluateQualityPayload`, `EvaluateQualityResult`
- `ChatWithAgentPayload`, `CategorizeTransactionsPayload`

Also extract `VALID_EMOTION_VALUES` array (line 1532).

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/gemini-types.ts
git commit -m "refactor(shared): extract gemini-types from gemini-chat"
```

---

### Task 4: Create _shared/gemini-helpers.ts

**Files:**
- Create: `supabase/functions/_shared/gemini-helpers.ts`

- [ ] **Step 1: Create shared Gemini initialization helpers**

```typescript
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'

export const MODELS = {
  fast: 'gemini-2.5-flash',
  smart: 'gemini-2.5-pro',
} as const

export type ModelKey = keyof typeof MODELS

export function getGenAI(): GoogleGenerativeAI {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  return new GoogleGenerativeAI(apiKey)
}

export function getModel(
  genAI: GoogleGenerativeAI,
  model: ModelKey,
  config?: { temperature?: number; topP?: number; topK?: number; maxOutputTokens?: number }
) {
  return genAI.getGenerativeModel({
    model: MODELS[model],
    generationConfig: {
      temperature: config?.temperature ?? 0.3,
      topP: config?.topP ?? 0.9,
      topK: config?.topK ?? 40,
      maxOutputTokens: config?.maxOutputTokens ?? 4096,
    },
  })
}

export function getDateContext(): {
  today: string
  dayOfWeek: string
  tomorrow: string
  timeStr: string
} {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const dayOfWeek = ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado'][now.getDay()]
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  return { today, dayOfWeek, tomorrow, timeStr }
}

/** Create authenticated Supabase admin client for Edge Functions */
export function getSupabaseAdmin() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm')
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Extract user_id from JWT (best-effort, non-blocking) */
export function extractUserId(req: Request): string | null {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return null
    const token = authHeader.replace('Bearer ', '')
    const payloadB64 = token.split('.')[1]
    if (!payloadB64) return null
    const decoded = JSON.parse(atob(payloadB64))
    return decoded.sub || null
  } catch {
    return null
  }
}

/** SMART_MODEL_ACTIONS — actions that use gemini-2.5-pro */
export const SMART_MODEL_ACTIONS = [
  'generate_weekly_summary',
  'generate_dossier',
  'deep_research',
  'generate_ice_breakers',
  'generate_pauta_questions',
  'generate_pauta_outline',
  'analyze_edital_structure',
  'generate_auto_briefing',
  'research_guest',
] as const
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/gemini-helpers.ts
git commit -m "refactor(shared): extract gemini-helpers (models, init, date context)"
```

---

### Task 5: Create _shared/context-builder.ts

**Files:**
- Create: `supabase/functions/_shared/context-builder.ts`

- [ ] **Step 1: Extract buildUserContext and generateSuggestedActions**

Copy `buildUserContext()` (lines 613-924) and `generateSuggestedActions()` (lines 930-1053) from gemini-chat/index.ts.

Add imports at the top:
```typescript
import type { UserContextResult, ChatAction } from './gemini-types.ts'
```

Export both functions. No logic changes — pure extraction.

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/context-builder.ts
git commit -m "refactor(shared): extract context-builder from gemini-chat"
```

---

### Task 6: Create _shared/agent-prompts.ts

**Files:**
- Create: `supabase/functions/_shared/agent-prompts.ts`

- [ ] **Step 1: Extract AGENT_SYSTEM_PROMPTS and INTERVIEWER_SYSTEM_PROMPT**

Copy `AGENT_SYSTEM_PROMPTS` record (lines 1227-1273) and `INTERVIEWER_SYSTEM_PROMPT()` function (lines 1141-1220) from gemini-chat/index.ts.

```typescript
export const AGENT_SYSTEM_PROMPTS: Record<string, {
  prompt: string
  temperature: number
  maxOutputTokens: number
}> = {
  atlas: { /* ... */ },
  captacao: { /* ... */ },
  studio: { /* ... */ },
  journey: { /* ... */ },
  finance: { /* ... */ },
  connections: { /* ... */ },
  flux: { /* ... */ },
  agenda: { /* ... */ },
  coordinator: { /* ... */ },
}

export const VALID_AGENTS = Object.keys(AGENT_SYSTEM_PROMPTS)

export function INTERVIEWER_SYSTEM_PROMPT(intent: string): string {
  // ... exact copy from gemini-chat lines 1141-1220
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/agent-prompts.ts
git commit -m "refactor(shared): extract agent-prompts from gemini-chat"
```

---

### Task 7: Create _shared/usage-tracker.ts

**Files:**
- Create: `supabase/functions/_shared/usage-tracker.ts`

- [ ] **Step 1: Create fire-and-forget usage tracker**

```typescript
/**
 * Fire-and-forget usage logging for all Edge Functions.
 * Never blocks the main flow — errors are silently caught.
 */
export async function logInteraction(
  supabaseClient: any,
  action: string,
  module: string,
  model: string,
  tokensIn?: number,
  tokensOut?: number
): Promise<void> {
  try {
    await supabaseClient.rpc('log_interaction', {
      p_action: action,
      p_module: module,
      p_model: model,
      p_tokens_in: tokensIn || 0,
      p_tokens_out: tokensOut || 0,
    })
  } catch {
    // Fire-and-forget: tracking errors never break main flow
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/usage-tracker.ts
git commit -m "refactor(shared): extract usage-tracker from gemini-chat"
```

---

### Task 8: Wire shared imports in gemini-chat

**Files:**
- Modify: `supabase/functions/gemini-chat/index.ts`

This is the most critical task in Phase 1. Replace all inline duplications with imports from `_shared/`.

- [ ] **Step 1: Replace imports and delete duplicated code**

At the top of gemini-chat/index.ts, replace the first ~460 lines (CORS, types, MODELS, extractJSON, PROMPTS) with:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import { getCorsHeaders } from '../_shared/cors.ts'
import { extractJSON } from '../_shared/model-router.ts'
import { getGenAI, MODELS, SMART_MODEL_ACTIONS, getDateContext, extractUserId } from '../_shared/gemini-helpers.ts'
import { buildUserContext, generateSuggestedActions } from '../_shared/context-builder.ts'
import { AGENT_SYSTEM_PROMPTS, VALID_AGENTS, INTERVIEWER_SYSTEM_PROMPT } from '../_shared/agent-prompts.ts'
import { logInteraction } from '../_shared/usage-tracker.ts'
import type {
  BaseRequest, ChatRequest, SentimentAnalysisPayload, SentimentAnalysisResult,
  WeeklySummaryPayload, WeeklySummaryResult, MomentData, KeyMoment,
  GenerateDossierPayload, DossierResult, TechnicalSheet,
  IceBreakerPayload, IceBreakerResult,
  PautaQuestionsPayload, PautaQuestionsResult,
  PautaOutlinePayload, PautaOutlineResult, OutlineSection,
  DailyReportPayload, DailyReportResult,
  GenerateFieldContentPayload, AnalyzeEditalStructurePayload,
  ParseFormFieldsPayload, ParsedFormField,
  GenerateAutoBriefingPayload, ImproveBriefingFieldPayload,
  ExtractRequiredDocumentsPayload, ExtractTimelinePhasesPayload,
  ParseStatementPayload, ResearchGuestPayload, GuestProfile,
  ChatAction, UserContextResult,
  WhatsAppSentimentPayload, WhatsAppSentimentResult,
  AnalyzeMomentPayload, AnalyzeMomentResult,
  EvaluateQualityPayload, EvaluateQualityResult,
  ChatWithAgentPayload, CategorizeTransactionsPayload,
} from '../_shared/gemini-types.ts'
import { handleGenerateDailyQuestion, type GenerateDailyQuestionPayload } from "./daily-question-handler.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
```

Delete:
- Lines 6-34: inline CORS (replaced by `_shared/cors.ts`)
- Lines 44-340: all interface declarations (replaced by `_shared/gemini-types.ts`)
- Lines 345-348: MODELS constant (replaced by `_shared/gemini-helpers.ts`)
- Lines 350-360: SMART_MODEL_ACTIONS (replaced by `_shared/gemini-helpers.ts`)
- Lines 373-407: extractJSON (replaced by `_shared/model-router.ts`)
- Lines 613-924: buildUserContext (replaced by `_shared/context-builder.ts`)
- Lines 930-1053: generateSuggestedActions (replaced by `_shared/context-builder.ts`)
- Lines 1141-1220: INTERVIEWER_SYSTEM_PROMPT (replaced by `_shared/agent-prompts.ts`)
- Lines 1227-1273: AGENT_SYSTEM_PROMPTS + VALID_AGENTS (replaced by `_shared/agent-prompts.ts`)

Also replace the 3 duplicated date context builders (lines 1096-1101, 1326-1331, 1409-1410) with calls to `getDateContext()`.

Replace inline `createClient` calls in serve() with import at top.

- [ ] **Step 2: Verify the file compiles**

```bash
cd supabase/functions && deno check gemini-chat/index.ts 2>&1 | head -20
```

If import errors, fix paths. Common issues: missing `.ts` extension, wrong relative path depth.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/gemini-chat/index.ts
git commit -m "refactor(chat): replace inline code with _shared/ imports"
```

---

### Task 9: Tests for shared helpers

**Files:**
- Create: `supabase/functions/_shared/__tests__/context-builder.test.ts`
- Create: `supabase/functions/_shared/__tests__/gemini-helpers.test.ts`

- [ ] **Step 1: Write context-builder tests**

```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock the module for Node.js test environment
// buildUserContext uses Supabase client — mock the query chain
describe('generateSuggestedActions', () => {
  // Import the pure function (no Supabase dependency)
  // Note: For Deno Edge Function code tested in Vitest,
  // copy the function logic or create a Node-compatible wrapper

  it('returns complete_task action when message contains "concluir"', () => {
    // Test keyword matching logic
  })

  it('returns empty array when no keywords match and no overdue tasks', () => {
    // Test fallback behavior
  })

  it('limits actions to 3', () => {
    // Test max actions cap
  })
})
```

Note: Deno Edge Function code cannot be directly imported in Vitest (Node.js). For Phase 1, focus on testing the pure functions (generateSuggestedActions, getDateContext) by copying their logic into a test-compatible wrapper, or skip and verify via smoke test in Task 10.

- [ ] **Step 2: Write gemini-helpers tests**

```typescript
import { describe, it, expect } from 'vitest'

describe('getDateContext', () => {
  it('returns today in YYYY-MM-DD format', () => {
    // Verify format
  })

  it('returns correct day of week in Portuguese', () => {
    // Verify dayOfWeek is one of the valid Portuguese day names
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npm run test -- --run supabase/functions/_shared/__tests__/
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/_shared/__tests__/
git commit -m "test(shared): add tests for context-builder and gemini-helpers"
```

---

### Task 10: Verify Phase 1 — build + local test

**Files:** None (verification only)

- [ ] **Step 1: Run build and typecheck**

```bash
npm run build && npm run typecheck
```

Expected: both pass (gemini-chat frontend code unchanged).

- [ ] **Step 2: Tag pre-Phase-1 state**

```bash
git tag gemini-chat-pre-phase-1
```

- [ ] **Step 3: Test locally with Supabase CLI**

```bash
npx supabase functions serve gemini-chat --no-verify-jwt
```

In another terminal, test a simple action:
```bash
curl -s -X POST http://localhost:54321/functions/v1/gemini-chat \
  -H "Content-Type: application/json" \
  -d '{"action": "analyze_moment_sentiment", "payload": {"content": "Estou feliz hoje"}}' | jq '.success'
```

Expected: `true`

- [ ] **Step 4: Commit Phase 1 complete marker**

```bash
git commit --allow-empty -m "chore: Phase 1 complete — shared helpers extracted"
```

---

## Phase 2 — gemini-chat Slim (PR #2)

### Task 11: Split handlers into local files

**Files:**
- Create: `supabase/functions/gemini-chat/handlers/chat.ts`
- Create: `supabase/functions/gemini-chat/handlers/agent-chat.ts`
- Create: `supabase/functions/gemini-chat/handlers/stream.ts`
- Create: `supabase/functions/gemini-chat/handlers/actions.ts`
- Create: `supabase/functions/gemini-chat/handlers/journey-temp.ts`
- Create: `supabase/functions/gemini-chat/handlers/studio-temp.ts`
- Create: `supabase/functions/gemini-chat/handlers/grants-temp.ts`
- Create: `supabase/functions/gemini-chat/handlers/finance-temp.ts`
- Create: `supabase/functions/gemini-chat/handlers/atlas-temp.ts`

- [ ] **Step 1: Create handlers/ directory and move chat handlers**

For each handler file, move the function(s) from index.ts and add proper imports from `_shared/`.

**handlers/chat.ts** — move `handleLegacyChat()` (index.ts lines 1055-1130)
**handlers/agent-chat.ts** — move `handleChatWithAgent()` (lines 1284-1366)
**handlers/stream.ts** — move the `chat_aica_stream` inline handler (lines ~2905-3070 in the switch block)
**handlers/actions.ts** — move `handleClassifyIntent()` (lines 2582-2692) and `handleExecuteChatAction()` (lines 2693-2828)

Each file pattern:
```typescript
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { extractJSON } from '../../_shared/model-router.ts'
import { MODELS, getModel, getDateContext } from '../../_shared/gemini-helpers.ts'
import { buildUserContext, generateSuggestedActions } from '../../_shared/context-builder.ts'
import type { /* needed types */ } from '../../_shared/gemini-types.ts'

export async function handleLegacyChat(/* same signature */) {
  // ... exact same code, no logic changes
}
```

- [ ] **Step 2: Move temporary module handlers**

**handlers/journey-temp.ts** — move: `handleAnalyzeMomentSentiment`, `handleGenerateWeeklySummary`, `handleAnalyzeMoment`, `handleEvaluateQuality`, `handleAnalyzeContentRealtime`, `handleGeneratePostCaptureInsight`, `handleClusterMomentsByTheme`, `handleGenerateDailyReport`

**handlers/studio-temp.ts** — move: `handleGenerateDossier`, `handleGenerateIceBreakers`, `handleGeneratePautaQuestions`, `handleGeneratePautaOutline`, `handleResearchGuest`

**handlers/grants-temp.ts** — move: `handleGenerateFieldContent`, `handleAnalyzeEditalStructure`, `handleParseFormFields`, `handleGenerateAutoBriefing`, `handleImproveBriefingField`, `handleExtractRequiredDocuments`, `handleExtractTimelinePhases`

**handlers/finance-temp.ts** — move: `handleParseStatement`, `handleCategorizeTransactions`

**handlers/atlas-temp.ts** — move: `handleExtractTaskFromVoice`, `handleTranscribeAudio`, `handleGenerateTags`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/gemini-chat/handlers/
git commit -m "refactor(chat): split 26 handlers into domain-specific files"
```

---

### Task 12: Slim index.ts to thin router

**Files:**
- Modify: `supabase/functions/gemini-chat/index.ts`

- [ ] **Step 1: Rewrite index.ts as thin router**

Delete all handler function bodies from index.ts. Replace with imports:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"
import { getCorsHeaders } from '../_shared/cors.ts'
import { MODELS, SMART_MODEL_ACTIONS, extractUserId } from '../_shared/gemini-helpers.ts'
import { logInteraction } from '../_shared/usage-tracker.ts'
import type { BaseRequest } from '../_shared/gemini-types.ts'

// Chat handlers (permanent)
import { handleLegacyChat } from './handlers/chat.ts'
import { handleChatWithAgent } from './handlers/agent-chat.ts'
import { handleStreamChat } from './handlers/stream.ts'
import { handleClassifyIntent, handleExecuteChatAction } from './handlers/actions.ts'
import { handleGenerateDailyQuestion } from './daily-question-handler.ts'

// Temporary module handlers (removed when their Edge Function is created)
import { handleAnalyzeMomentSentiment, handleGenerateWeeklySummary, handleAnalyzeMoment, handleEvaluateQuality, handleAnalyzeContentRealtime, handleGeneratePostCaptureInsight, handleClusterMomentsByTheme, handleGenerateDailyReport } from './handlers/journey-temp.ts'
import { handleGenerateDossier, handleGenerateIceBreakers, handleGeneratePautaQuestions, handleGeneratePautaOutline, handleResearchGuest } from './handlers/studio-temp.ts'
import { handleGenerateFieldContent, handleAnalyzeEditalStructure, handleParseFormFields, handleGenerateAutoBriefing, handleImproveBriefingField, handleExtractRequiredDocuments, handleExtractTimelinePhases } from './handlers/grants-temp.ts'
import { handleParseStatement, handleCategorizeTransactions } from './handlers/finance-temp.ts'
import { handleExtractTaskFromVoice, handleTranscribeAudio, handleGenerateTags } from './handlers/atlas-temp.ts'
import { handleWhatsAppSentiment } from './handlers/chat.ts'  // stays in chat

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // ... same serve() body, just the switch/case router
  // All handler bodies are now in separate files
})
```

The index.ts should be ~250 lines (just the serve() function with the switch statement).

- [ ] **Step 2: Verify file compiles**

```bash
cd supabase/functions && deno check gemini-chat/index.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/gemini-chat/index.ts
git commit -m "refactor(chat): slim index.ts to thin router (~250 lines)"
```

---

### Task 13: Prepare frontend routing

**Files:**
- Modify: `src/lib/gemini/client.ts`

- [ ] **Step 1: Add commented-out routes for future Edge Functions**

Find the `DEDICATED_EDGE_FUNCTIONS` object in `src/lib/gemini/client.ts` and add commented-out entries:

```typescript
const DEDICATED_EDGE_FUNCTIONS: Record<string, string> = {
  // ... existing entries ...

  // Phase 3: Journey (uncomment when gemini-journey is deployed)
  // 'analyze_moment_sentiment': 'gemini-journey',
  // 'generate_weekly_summary': 'gemini-journey',
  // 'analyze_moment': 'gemini-journey',
  // 'evaluate_quality': 'gemini-journey',
  // 'analyze_content_realtime': 'gemini-journey',
  // 'generate_post_capture_insight': 'gemini-journey',
  // 'cluster_moments_by_theme': 'gemini-journey',
  // 'generate_daily_report': 'gemini-journey',

  // Phase 4: Studio
  // 'generate_dossier': 'gemini-studio',
  // 'generate_ice_breakers': 'gemini-studio',
  // 'generate_pauta_questions': 'gemini-studio',
  // 'generate_pauta_outline': 'gemini-studio',
  // 'research_guest': 'gemini-studio',

  // Phase 5: Grants
  // 'generate_field_content': 'gemini-grants',
  // 'analyze_edital_structure': 'gemini-grants',
  // 'parse_form_fields': 'gemini-grants',
  // 'generate_auto_briefing': 'gemini-grants',
  // 'improve_briefing_field': 'gemini-grants',
  // 'extract_required_documents': 'gemini-grants',
  // 'extract_timeline_phases': 'gemini-grants',

  // Phase 6: Finance
  // 'parse_statement': 'gemini-finance',
  // 'categorize_transactions': 'gemini-finance',

  // Phase 7: Atlas
  // 'extract_task_from_voice': 'gemini-atlas',
  // 'generate_tags': 'gemini-atlas',
  // 'transcribe_audio': 'gemini-atlas',

  // Phase 8: ReACT Agent
  // 'react_chat': 'react-agent',
}
```

- [ ] **Step 2: Run build**

```bash
npm run build && npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/gemini/client.ts
git commit -m "chore(gemini): add commented routing for future Edge Function split"
```

---

### Task 14: Create smoke test script

**Files:**
- Create: `scripts/smoke-test-gemini-chat.sh`

- [ ] **Step 1: Write smoke test**

```bash
#!/bin/bash
# Smoke test for gemini-chat Edge Function after refactoring
# Usage: TOKEN=your-jwt-token ./scripts/smoke-test-gemini-chat.sh

BASE_URL="${SUPABASE_URL:-https://uzywajqzbdbrfammshdg.supabase.co}/functions/v1/gemini-chat"
PASS=0
FAIL=0

test_action() {
  local action="$1"
  local payload="$2"
  local result
  result=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"$action\", \"payload\": $payload}")

  local http_code=$(echo "$result" | tail -1)
  local body=$(echo "$result" | sed '$d')

  if [ "$http_code" = "200" ]; then
    echo "  PASS: $action (HTTP $http_code)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $action (HTTP $http_code)"
    FAIL=$((FAIL + 1))
  fi
}

echo "Smoke testing gemini-chat..."
test_action "analyze_moment_sentiment" '{"content": "Estou feliz hoje"}'
test_action "analyze_moment" '{"content": "Dia produtivo"}'
test_action "generate_tags" '{"prompt": "Gere 3 tags para: dia produtivo", "temperature": 0.7, "maxOutputTokens": 200}'
# Add more actions as needed

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
```

- [ ] **Step 2: Make executable and commit**

```bash
chmod +x scripts/smoke-test-gemini-chat.sh
git add scripts/smoke-test-gemini-chat.sh
git commit -m "test(chat): add smoke test script for gemini-chat refactoring"
```

---

### Task 15: Verify Phase 2 — build + deploy

**Files:** None (verification only)

- [ ] **Step 1: Run build**

```bash
npm run build && npm run typecheck
```

- [ ] **Step 2: Tag pre-Phase-2 state**

```bash
git tag gemini-chat-pre-phase-2
```

- [ ] **Step 3: Test locally**

```bash
npx supabase functions serve gemini-chat --no-verify-jwt
```

Test key actions: `chat_aica`, `analyze_moment_sentiment`, `generate_dossier`, `parse_statement`.

- [ ] **Step 4: Commit Phase 2 complete marker**

```bash
git commit --allow-empty -m "chore: Phase 2 complete — gemini-chat slim router"
```

---

## Phase 8 — ReACT Agent (PR #3)

### Task 16: Create _shared/context-manager.ts (TDD)

**Files:**
- Create: `supabase/functions/_shared/context-manager.ts`
- Create: `supabase/functions/_shared/__tests__/context-manager.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { truncateReference, buildContextBudget } from '../context-manager'

describe('truncateReference', () => {
  it('returns text unchanged if under limit', () => {
    expect(truncateReference('short text', 100)).toBe('short text')
  })

  it('truncates long text with indicator', () => {
    const long = 'a'.repeat(5000)
    const result = truncateReference(long, 100)
    expect(result.length).toBeLessThanOrEqual(100)
    expect(result).toContain('[... truncated ...]')
  })

  it('keeps start and end of text', () => {
    const text = 'START' + 'x'.repeat(5000) + 'END'
    const result = truncateReference(text, 200)
    expect(result.startsWith('START')).toBe(true)
    expect(result.endsWith('END')).toBe(true)
  })

  it('uses default maxChars of 4000', () => {
    const text = 'a'.repeat(5000)
    const result = truncateReference(text)
    expect(result.length).toBeLessThanOrEqual(4000)
  })
})

describe('buildContextBudget', () => {
  it('distributes budget across observations', () => {
    const obs = ['a'.repeat(5000), 'b'.repeat(5000), 'c'.repeat(5000)]
    const result = buildContextBudget(obs, 9000)
    result.forEach(r => expect(r.length).toBeLessThanOrEqual(3000))
  })

  it('returns unchanged if all under budget', () => {
    const obs = ['short', 'text']
    const result = buildContextBudget(obs, 10000)
    expect(result).toEqual(['short', 'text'])
  })
})
```

- [ ] **Step 2: Run tests — should fail**

```bash
npm run test -- --run supabase/functions/_shared/__tests__/context-manager.test.ts
```

- [ ] **Step 3: Implement context-manager.ts**

```typescript
/**
 * Context window management for ReACT loop and long-context chat.
 * Prevents context explosion by capping reference sizes.
 */

export function truncateReference(text: string, maxChars: number = 4000): string {
  if (text.length <= maxChars) return text
  const indicator = '\n\n[... truncated ...]\n\n'
  const keepChars = Math.floor((maxChars - indicator.length) / 2)
  return text.slice(0, keepChars) + indicator + text.slice(-keepChars)
}

export function buildContextBudget(
  observations: string[],
  totalBudget: number = 16000
): string[] {
  if (observations.length === 0) return []
  const perObs = Math.floor(totalBudget / observations.length)
  return observations.map(obs => truncateReference(obs, perObs))
}
```

- [ ] **Step 4: Run tests — should pass**

```bash
npm run test -- --run supabase/functions/_shared/__tests__/context-manager.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/context-manager.ts supabase/functions/_shared/__tests__/context-manager.test.ts
git commit -m "feat(shared): add context-manager with TDD (truncation + budget)"
```

---

### Task 17: Create _shared/react-loop.ts (TDD)

**Files:**
- Create: `supabase/functions/_shared/react-loop.ts`
- Create: `supabase/functions/_shared/__tests__/react-loop.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi } from 'vitest'

// We'll test the pure logic — mock Gemini and tools
describe('runReactLoop', () => {
  it('executes at least minToolCalls before allowing final answer', () => {
    // Setup mock tools, verify call count
  })

  it('stops at maxToolCalls even if model wants more', () => {
    // Mock model that always wants another tool call
  })

  it('truncates observations via context-manager', () => {
    // Tool returns 10000 char string, verify it gets truncated
  })

  it('records steps with thought, action, observation', () => {
    // Verify ReactStep structure in result
  })

  it('returns tokens breakdown (input + output)', () => {
    // Verify token tracking
  })
})
```

- [ ] **Step 2: Implement react-loop.ts**

Core logic:
1. Build system prompt with tool descriptions
2. Loop: ask Gemini for JSON `{thought, action: {tool, params}}` or `{thought, final_answer}`
3. Execute tool, truncate observation
4. After minToolCalls, accept `final_answer`
5. Assess confidence via model-router's `assessConfidence()`
6. If low confidence, re-synthesize with Pro

- [ ] **Step 3: Run tests and iterate until green**

```bash
npm run test -- --run supabase/functions/_shared/__tests__/react-loop.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/_shared/react-loop.ts supabase/functions/_shared/__tests__/react-loop.test.ts
git commit -m "feat(agents): add ReACT loop engine with TDD"
```

---

### Task 18: Create agent_runs migration

**Files:**
- Create: `supabase/migrations/YYYYMMDD_create_agent_runs.sql`

- [ ] **Step 1: Write migration**

```sql
-- Agent runs table for ReACT loop persistence
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  agent_type TEXT NOT NULL DEFAULT 'react',
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'timeout')),
  user_message TEXT NOT NULL,
  system_prompt TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  final_answer TEXT,
  confidence NUMERIC(3,2),
  was_escalated BOOLEAN DEFAULT false,
  total_tokens INTEGER DEFAULT 0,
  tool_calls_count INTEGER DEFAULT 0,
  latency_ms INTEGER,
  model_used TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  error_context JSONB
);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own runs" ON agent_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_agent_runs_user ON agent_runs(user_id, created_at DESC);
CREATE INDEX idx_agent_runs_status ON agent_runs(status) WHERE status = 'running';
```

- [ ] **Step 2: Preview and apply locally**

```bash
npx supabase db diff
npx supabase db push
```

- [ ] **Step 3: Verify table exists**

```bash
npx supabase db reset --local && npx supabase db push
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add agent_runs table for ReACT loop persistence"
```

---

### Task 19: Create react-agent Edge Function

**Files:**
- Create: `supabase/functions/react-agent/index.ts`

- [ ] **Step 1: Create the Edge Function**

Implement following the spec's architecture. The function:
1. Validates auth (JWT)
2. Builds chat tools for the user (query_tasks, query_moments, etc.)
3. Runs the ReACT loop
4. Persists the run to agent_runs
5. Returns the final answer

See spec section "Phase 8 — react-agent Edge Function" for the full buildChatTools implementation.

- [ ] **Step 2: Test locally**

```bash
npx supabase functions serve react-agent --no-verify-jwt
```

```bash
curl -s -X POST http://localhost:54321/functions/v1/react-agent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "react_chat", "payload": {"message": "Como estao minhas tarefas?"}}' | jq '.'
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/react-agent/
git commit -m "feat(agents): create react-agent Edge Function with ReACT loop"
```

---

### Task 20: Frontend integration

**Files:**
- Modify: `src/lib/gemini/client.ts`

- [ ] **Step 1: Uncomment react_chat route**

In `DEDICATED_EDGE_FUNCTIONS`, uncomment:
```typescript
'react_chat': 'react-agent',
```

- [ ] **Step 2: Run build**

```bash
npm run build && npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/gemini/client.ts
git commit -m "feat(gemini): route react_chat to react-agent Edge Function"
```

---

### Task 21: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run full build + test suite**

```bash
npm run build && npm run typecheck && npm run test
```

- [ ] **Step 2: Deploy react-agent to staging**

```bash
npx supabase functions deploy react-agent --no-verify-jwt
```

- [ ] **Step 3: Test on staging**

Test via dev.aica.guru chat or direct curl to staging.

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: Phase 8 complete — ReACT agent foundation"
```
