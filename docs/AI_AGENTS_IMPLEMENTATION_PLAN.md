# AICA Life OS - AI Agents Implementation Plan

## Master Architecture & Build Order

**Date:** 2026-02-03
**Author:** Master Architect Agent
**Status:** Ready for Implementation

---

## 1. CURRENT STATE AUDIT

### What Already Exists (Working)

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| GeminiClient singleton | `src/lib/gemini/client.ts` | WORKING | Routes to Edge Functions, retry logic, streaming |
| Model config | `src/lib/gemini/models.ts` | NEEDS UPDATE | Uses `gemini-2.0-flash` (old), should be `gemini-2.5-flash` |
| gemini-chat Edge Function | `supabase/functions/gemini-chat/index.ts` | WORKING | 20+ actions, monolithic (~1400 lines) |
| file-search Edge Function | `supabase/functions/file-search/index.ts` | WORKING | REST API to Google File Search, category-based stores |
| file-search-corpus Edge Function | `supabase/functions/file-search-corpus/index.ts` | WORKING | Alternative corpus-based approach |
| deep-research Edge Function | `supabase/functions/deep-research/index.ts` | WORKING | Multi-step research for podcasts |
| gemini-live Edge Function | `supabase/functions/gemini-live/index.ts` | WORKING | SSE streaming for podcast prep chat |
| chat-with-aica Edge Function | `supabase/functions/chat-with-aica/index.ts` | OUTDATED | Uses gemini-1.5-pro/flash (old models) |
| process-whatsapp-ai Edge Function | `supabase/functions/process-whatsapp-ai/index.ts` | WORKING | WhatsApp sentiment analysis |
| fileSearchApiClient | `src/services/fileSearchApiClient.ts` | WORKING | Hybrid Python/Supabase direct, with caching |
| useFileSearch hook | `src/hooks/useFileSearch.ts` | WORKING | Full CRUD for corpora and documents |
| AI usage tracking | `src/services/aiUsageTrackingService.ts` | WORKING | Tracks all AI calls |
| AI cost analytics | `src/services/aiCostAnalyticsService.ts` | WORKING | Cost dashboards |

### What Does NOT Exist Yet

| Component | Priority | Impact |
|-----------|----------|--------|
| file-search-v2 Edge Function (native Google File Search API) | P0 | Eliminates custom RAG, reduces cost 68% |
| Grounded Search (Google Search tool) | P0 | Real-time info for Captacao and Studio |
| Unified AI Agent router | P1 | Single entry point for all module AI |
| Module-specific agent prompts | P1 | Specialized behavior per module |
| useGroundedSearch hook | P1 | Frontend integration for search grounding |
| ADK Python backend | P2 | Multi-agent orchestration |
| Tia Sabia voice (Gemini Live API) | P3 | Voice assistant via WhatsApp |

### Critical Gaps

1. **Model versions outdated**: `gemini-2.0-flash-exp` used everywhere, should upgrade to `gemini-2.5-flash`
2. **No Grounding**: Guest research and edital search rely purely on model knowledge (no real-time web data)
3. **Monolithic gemini-chat**: Single 1400-line Edge Function handles 20+ actions -- fragile, hard to maintain
4. **Two file search implementations**: `file-search` and `file-search-corpus` serve overlapping purposes
5. **chat-with-aica uses old models**: Still on `gemini-1.5-pro/flash`
6. **No cross-module AI context**: Each module's AI calls are isolated, no shared user context

---

## 2. PHASED BUILD ORDER

### PHASE 1: Foundation Upgrades (Week 1) -- HIGHEST IMPACT, LOWEST RISK

These changes improve everything that already exists without breaking anything.

#### 1.1 Upgrade Model Versions

**File:** `src/lib/gemini/models.ts`

```typescript
export const GEMINI_MODELS = {
  fast: 'gemini-2.5-flash',      // Was: gemini-2.0-flash
  smart: 'gemini-2.5-flash',     // Was: gemini-2.0-flash-exp
  pro: 'gemini-2.5-pro',         // NEW: For complex reasoning
  embedding: 'text-embedding-004',
} as const
```

**File:** `supabase/functions/gemini-chat/index.ts` -- update MODELS constant

```typescript
const MODELS = {
  fast: 'gemini-2.5-flash',
  smart: 'gemini-2.5-flash',
} as const
```

**Delegate to:** `gemini-integration-specialist`

- [ ] Update `src/lib/gemini/models.ts` -- change fast/smart to gemini-2.5-flash
- [ ] Update `supabase/functions/gemini-chat/index.ts` MODELS constant
- [ ] Update `supabase/functions/deep-research/index.ts` model string
- [ ] Update `supabase/functions/gemini-live/index.ts` model string
- [ ] Update `supabase/functions/chat-with-aica/index.ts` MODEL_CONFIG
- [ ] Update `supabase/functions/file-search/index.ts` model string in search handler
- [ ] Update `supabase/functions/process-whatsapp-ai/index.ts` model reference
- [ ] Verify all `generative-ai` npm imports use `@google/generative-ai@0.21.0` or newer consistently
- [ ] Run `npm run build && npm run typecheck` to verify no breakage

#### 1.2 Add Grounding Support to gemini-chat

Add a new `grounded_search` action to the existing gemini-chat Edge Function. This is the fastest way to get real-time web data into Studio and Captacao.

**File:** `supabase/functions/gemini-chat/index.ts` -- add new handler

```typescript
// NEW: Grounded Search Handler
async function handleGroundedSearch(genAI: GoogleGenerativeAI, payload: {
  query: string
  context?: string
  module?: string
}): Promise<any> {
  const { query, context, module } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    tools: [{ googleSearch: {} }]  // Enable Google Search grounding
  })

  const prompt = context
    ? `Contexto: ${context}\n\nPergunta: ${query}`
    : query

  const result = await model.generateContent(prompt)
  const metadata = result.response.candidates?.[0]?.groundingMetadata

  return {
    text: result.response.text(),
    sources: (metadata?.groundingChunks || []).map((chunk: any) => ({
      title: chunk.web?.title,
      url: chunk.web?.uri,
    })),
    searchQueries: metadata?.webSearchQueries || [],
    citations: (metadata?.groundingSupports || []).map((s: any) => ({
      text: s.segment?.text,
      confidence: s.confidenceScores?.[0],
    })),
    __usageMetadata: result.response.usageMetadata,
  }
}
```

Add case to switch:
```typescript
case 'grounded_search':
  result = await handleGroundedSearch(genAI, payload)
  break
```

**Delegate to:** `gemini-integration-specialist`

- [ ] Add `handleGroundedSearch` function to gemini-chat Edge Function
- [ ] Add `'grounded_search'` to the action switch
- [ ] Add `'grounded_search'` to `GeminiAction` type in `src/lib/gemini/types.ts`
- [ ] Add model mapping in `src/lib/gemini/models.ts`: `'grounded_search': 'smart'`
- [ ] Add `'grounded_search'` to `DEDICATED_EDGE_FUNCTIONS` if needed (or let it go through gemini-chat)
- [ ] Test with Studio guest research and Captacao edital search

#### 1.3 Create useGroundedSearch Hook

**File:** `src/hooks/useGroundedSearch.ts`

**Delegate to:** `general-purpose` (Frontend Core)

- [ ] Create `src/hooks/useGroundedSearch.ts` following the pattern from docs
- [ ] Wire to GeminiClient with action `'grounded_search'`
- [ ] Include source attribution rendering utilities
- [ ] Export from hooks barrel if one exists

---

### PHASE 2: File Search V2 Migration (Week 2) -- COST REDUCTION

Migrate from the current hybrid REST API approach to the native Google File Search API via the new `@google/genai` SDK.

#### 2.1 Create file-search-v2 Edge Function

**File:** `supabase/functions/file-search-v2/index.ts`

This is the highest-impact infrastructure change. The code template is already in `docs/GOOGLE_INTEGRATION_CODE_EXAMPLES.md`.

**Delegate to:** `gemini-integration-specialist`

- [ ] Create `supabase/functions/file-search-v2/index.ts` using the template from docs
- [ ] Support actions: `create_store`, `upload_document`, `query`, `delete_document`, `list_stores`
- [ ] Use `npm:@google/genai@^1.0.0` (new SDK, not `@google/generative-ai`)
- [ ] Implement JWT auth validation
- [ ] Add CORS with proper origin whitelist
- [ ] Add usage metadata tracking
- [ ] Test locally with `npx supabase functions serve file-search-v2`

#### 2.2 Update GeminiClient Routing

**File:** `src/lib/gemini/client.ts`

**Delegate to:** `gemini-integration-specialist`

- [ ] Add `file-search-v2` entries to `DEDICATED_EDGE_FUNCTIONS` map
- [ ] Add new actions: `'create_store_v2'`, `'upload_document_v2'`, `'query_v2'`, `'delete_document_v2'`, `'list_stores_v2'`
- [ ] Keep old file-search routes working (backward compatibility)

#### 2.3 Create useFileSearchV2 Hook

**File:** `src/hooks/useFileSearchV2.ts`

**Delegate to:** `general-purpose` (Frontend Core)

- [ ] Create hook following the template from `docs/GOOGLE_AI_SERVICES_INTEGRATION_GUIDE.md`
- [ ] Include all CRUD operations plus query
- [ ] Add loading/error states
- [ ] Integrate with AI usage tracking service

#### 2.4 Migrate Module-Specific File Search Integrations

**Delegate to:** Module-specific agents

- [ ] **Captacao**: Migrate edital PDF indexing to V2 stores (`podcast-production-copilot` or `general-purpose`)
- [ ] **Studio**: Migrate transcript indexing to V2 stores
- [ ] **Journey**: Migrate moment/reflection indexing to V2 stores
- [ ] Deprecate `src/services/fileSearchApiClient.ts` (add deprecation notice, keep working)
- [ ] Update `useModuleFileSearch` to optionally use V2

---

### PHASE 3: Module AI Agent Prompts (Week 3) -- USER JOURNEY ENHANCEMENT

Create specialized AI behaviors for each module. This is where the "AI agents" become real for users.

#### 3.1 AI Agent Architecture

Create a unified agent prompt system that gives each module a specialized AI personality and capability set.

**File:** `src/lib/agents/index.ts` (NEW)

```
src/lib/agents/
  index.ts           # Agent registry and factory
  types.ts           # Shared agent types
  prompts/
    atlas.ts         # Task management agent prompts
    captacao.ts      # Grant writing agent prompts
    studio.ts        # Podcast production agent prompts
    journey.ts       # Self-knowledge agent prompts
    finance.ts       # Financial analysis agent prompts
    connections.ts   # Relationship management agent prompts
    coordinator.ts   # Cross-module coordinator prompt
```

**Delegate to:** `general-purpose` (Backend Architect)

- [ ] Create `src/lib/agents/types.ts` with AgentConfig, AgentContext, AgentResponse types
- [ ] Create `src/lib/agents/index.ts` with agent registry
- [ ] Create coordinator prompt in `src/lib/agents/prompts/coordinator.ts`

#### 3.2 Module Agent Prompts

Each module gets a specialized system prompt that defines:
- Domain expertise
- Available tools (File Search, Grounding, Function Calling)
- Response format expectations
- Portuguese language requirements

**Atlas Agent** -- `src/lib/agents/prompts/atlas.ts`
- Capabilities: Task categorization, priority suggestion, Eisenhower matrix placement
- Tools: None (pure LLM reasoning)
- Model: `fast` (gemini-2.5-flash)

**Captacao Agent** -- `src/lib/agents/prompts/captacao.ts`
- Capabilities: Edital analysis, proposal writing, requirement matching, deadline tracking
- Tools: File Search (indexed editals), Grounded Search (find new editals)
- Model: `smart` (gemini-2.5-flash) for analysis, `fast` for field generation

**Studio Agent** -- `src/lib/agents/prompts/studio.ts`
- Capabilities: Guest research, dossier generation, pauta creation, question generation
- Tools: Grounded Search (real-time guest info), File Search (past episodes)
- Model: `smart` for research, `fast` for question generation

**Journey Agent** -- `src/lib/agents/prompts/journey.ts`
- Capabilities: Sentiment analysis, pattern detection, weekly summaries, daily questions
- Tools: File Search (past reflections for pattern analysis)
- Model: `fast` for real-time analysis, `smart` for weekly summaries

**Finance Agent** -- `src/lib/agents/prompts/finance.ts`
- Capabilities: Statement parsing, spending analysis, savings suggestions, anomaly detection
- Tools: None (pure LLM reasoning on structured data)
- Model: `fast` for parsing, `smart` for analysis

**Connections Agent** -- `src/lib/agents/prompts/connections.ts`
- Capabilities: Contact analysis, conversation insights, relationship health
- Tools: File Search (conversation history, if indexed)
- Model: `fast` for sentiment, `smart` for relationship analysis

**Delegate to:** Each module's specialist agent

- [ ] Atlas prompts (`atlas-task-agent`)
- [ ] Captacao prompts (`general-purpose` as Backend Architect)
- [ ] Studio prompts (`podcast-production-copilot`)
- [ ] Journey prompts (`general-purpose`)
- [ ] Finance prompts (`general-purpose`)
- [ ] Connections prompts (`general-purpose`)

#### 3.3 Enhance gemini-chat with Agent System

Update the gemini-chat Edge Function to accept an `agent` parameter that selects the appropriate system prompt.

**File:** `supabase/functions/gemini-chat/index.ts`

```typescript
// Add to request type
interface BaseRequest {
  action?: string
  payload?: Record<string, any>
  model?: 'fast' | 'smart' | 'pro'
  agent?: 'atlas' | 'captacao' | 'studio' | 'journey' | 'finance' | 'connections' | 'coordinator'
}
```

**Delegate to:** `gemini-integration-specialist`

- [ ] Add agent prompt injection to gemini-chat handlers
- [ ] Create agent prompt registry on the Edge Function side
- [ ] Ensure grounding tools are enabled for agents that need them (captacao, studio)
- [ ] Update GeminiChatRequest type to include `agent` field

---

### PHASE 4: User Journey Flows (Week 4) -- CONNECTING THE DOTS

This phase creates the actual user-facing AI experiences by wiring agents into module UIs.

#### 4.1 Captacao AI Flow (Highest Value)

User journey: Upload edital PDF -> AI extracts structure -> AI suggests matching projects -> AI helps write proposal fields

**Components to build/enhance:**

- [ ] Edital upload with auto-indexing to File Search V2 (`captacao` store)
- [ ] `EditalQueryCard` component (template in docs, adapt to existing UI patterns)
- [ ] "Find similar editals" button using Grounded Search
- [ ] Auto-briefing with source document RAG
- [ ] Field generation with edital context from File Search

**Delegate to:** `general-purpose` (Frontend Core) + `gemini-integration-specialist`

#### 4.2 Studio AI Flow (Guest Research Enhancement)

User journey: Add guest name -> AI researches with Google Search -> AI generates dossier -> AI creates pauta -> AI generates questions

**Enhancements:**

- [ ] Upgrade `research_guest` action to use Grounded Search (real-time data instead of model knowledge)
- [ ] Upgrade `generate_dossier` to cite sources from Google Search
- [ ] Add "Fact Check" button that re-verifies key claims with Grounded Search
- [ ] Index past episode transcripts in File Search V2 for cross-reference

**Delegate to:** `podcast-production-copilot`

#### 4.3 Journey AI Flow (Pattern Detection)

User journey: Write moment -> AI analyzes sentiment in real-time -> Weekly summary finds patterns -> Daily questions guided by patterns

**Enhancements:**

- [ ] Index moments in File Search V2 for longitudinal pattern analysis
- [ ] Enhance weekly summary with File Search RAG across all past moments
- [ ] Daily question generation informed by recent emotional patterns

**Delegate to:** `general-purpose`

#### 4.4 Finance AI Flow (Statement Intelligence)

User journey: Upload bank statement -> AI parses transactions -> AI categorizes spending -> AI suggests savings -> AI detects anomalies

**Status:** Most handlers already exist in gemini-chat. Main enhancement:

- [ ] Upgrade parse_statement to use structured output mode (JSON mode) for reliability
- [ ] Add spending trend analysis with historical data from Supabase
- [ ] Add anomaly detection comparing current month to past patterns

**Delegate to:** `general-purpose`

---

### PHASE 5: Unified Chat & Coordinator (Week 5-6)

#### 5.1 Upgrade chat-with-aica to Coordinator Agent

Transform the existing `chat-with-aica` Edge Function into a smart coordinator that can delegate to module-specific agents.

**File:** `supabase/functions/chat-with-aica/index.ts` (rewrite)

The coordinator should:
1. Analyze user message intent
2. Route to the appropriate module agent
3. Provide module context (current task count, recent moments, etc.)
4. Use Grounded Search when the user asks about real-world info
5. Use File Search when the user asks about their own data

**Delegate to:** `gemini-integration-specialist` + `general-purpose`

- [ ] Rewrite `chat-with-aica` with coordinator logic
- [ ] Upgrade models from 1.5 to 2.5
- [ ] Add agent routing based on intent classification
- [ ] Add tool selection (grounding, file search) based on query type
- [ ] Integrate user context from all modules
- [ ] Implement conversation memory (store in Supabase)

#### 5.2 Cross-Module AI Context

Create a service that aggregates user context across modules for richer AI responses.

**File:** `src/services/userAIContextService.ts` (NEW)

```typescript
export interface UserAIContext {
  userName: string
  todaysTasks: { total: number, completed: number }
  recentMoments: string[]
  activeGrants: number
  upcomingEpisodes: number
  financialSummary?: { income: number, expenses: number }
  recentConnections: string[]
}
```

**Delegate to:** `general-purpose`

- [ ] Create context aggregation service
- [ ] Wire into chat-with-aica Edge Function
- [ ] Cache context with 5-minute TTL to avoid repeated DB queries

---

### PHASE 6: ADK Multi-Agent System (Week 7-8) -- ADVANCED

Deploy a Python-based ADK backend that enables true multi-agent orchestration.

**This phase is optional for MVP.** The Edge Function approach from Phases 1-5 provides 80% of the value. ADK adds orchestration sophistication but requires Python infrastructure.

**Delegate to:** `general-purpose` (Backend Architect)

- [ ] Create `backend/agents/` directory structure
- [ ] Implement coordinator agent with ADK
- [ ] Implement captacao agent with File Search + Google Search tools
- [ ] Implement studio agent with Google Search tools
- [ ] Create Dockerfile for Cloud Run deployment
- [ ] Create Edge Function proxy to route from frontend to ADK backend
- [ ] Integration testing

---

### PHASE 7: Tia Sabia Voice (Week 9+) -- FUTURE

Implement the Gemini Live API for voice-based interaction via WhatsApp.

**Delegate to:** `gemini-integration-specialist`

- [ ] Create `supabase/functions/tia-sabia-voice/index.ts` with WebSocket support
- [ ] Integrate with Evolution API for WhatsApp audio messages
- [ ] Configure Tia Sabia persona (voice, language, personality)
- [ ] Add File Search and Google Search tools to voice session
- [ ] Latency testing and optimization
- [ ] LGPD compliance review for voice data

---

## 3. GOOGLE SERVICES MAP PER MODULE

| Module | File Search | Grounded Search | Gemini Chat | Live API | Model |
|--------|:-----------:|:---------------:|:-----------:|:--------:|-------|
| Atlas | - | - | categorize, prioritize | - | fast |
| Captacao | editals, proposals | find editals, deadlines | field gen, analysis | - | smart |
| Studio | transcripts, episodes | guest research, fact check | dossier, pauta, questions | future | smart |
| Journey | moments, reflections | - | sentiment, summaries, daily Q | - | fast/smart |
| Finance | statements (future) | - | parse, analyze, suggest | - | fast/smart |
| Connections | conversations (future) | - | sentiment, insights | future | fast |
| Coordinator | all stores | general queries | intent routing | future | smart |

---

## 4. COST OPTIMIZATION STRATEGY

### Model Selection Rules

| Latency Need | Complexity | Model | Cost/1M tokens |
|-------------|-----------|-------|----------------|
| <3s | Low | gemini-2.5-flash | $0.15 input |
| <10s | Medium | gemini-2.5-flash | $0.15 input |
| <30s | High | gemini-2.5-pro | $1.25 input |
| Real-time | Streaming | gemini-2.5-flash | $0.15 input |

### Caching Strategy

1. **File Search stores** are persistent (no re-indexing cost)
2. **Grounded Search results** should be cached 1 hour (stale data acceptable for most use cases)
3. **Sentiment analysis** results are cached in DB (never re-analyze same content)
4. **Guest research** results are cached in DB with 24h TTL
5. **Edital analysis** results are cached in DB (editals don't change)

### Token Budget per User/Day (Estimated)

| Activity | Tokens | Cost |
|----------|--------|------|
| 5 task categorizations | ~2,500 | $0.0004 |
| 1 edital analysis | ~15,000 | $0.002 |
| 1 guest research (grounded) | ~10,000 | $0.0015 |
| 3 moment sentiments | ~1,500 | $0.0002 |
| 1 daily report | ~3,000 | $0.0005 |
| 5 chat messages | ~5,000 | $0.0008 |
| **Daily total per user** | **~37,000** | **~$0.006** |

At $0.006/user/day = $0.18/user/month -- well within sustainable range.

---

## 5. DEPENDENCY GRAPH

```
Phase 1 (Foundation)
  |-- 1.1 Model Upgrade (no dependencies)
  |-- 1.2 Grounded Search in gemini-chat (needs 1.1)
  |-- 1.3 useGroundedSearch hook (needs 1.2)

Phase 2 (File Search V2)
  |-- 2.1 file-search-v2 Edge Function (needs 1.1)
  |-- 2.2 GeminiClient routing (needs 2.1)
  |-- 2.3 useFileSearchV2 hook (needs 2.2)
  |-- 2.4 Module migrations (needs 2.3)

Phase 3 (Agent Prompts) -- can run in parallel with Phase 2
  |-- 3.1 Agent architecture (no dependencies)
  |-- 3.2 Module prompts (needs 3.1)
  |-- 3.3 gemini-chat agent support (needs 3.2)

Phase 4 (User Journeys) -- depends on Phase 2 + 3
  |-- 4.1 Captacao flow (needs 2.3, 3.2, 1.3)
  |-- 4.2 Studio flow (needs 1.3, 3.2)
  |-- 4.3 Journey flow (needs 2.3, 3.2)
  |-- 4.4 Finance flow (needs 3.2)

Phase 5 (Coordinator) -- depends on Phase 3 + 4
  |-- 5.1 chat-with-aica rewrite (needs 3.3)
  |-- 5.2 Cross-module context (needs 5.1)

Phase 6 (ADK) -- independent, can start after Phase 3
Phase 7 (Voice) -- independent, can start after Phase 5
```

---

## 6. IMMEDIATE NEXT STEPS (START BUILDING)

The first three tasks below can be implemented in a single session and will yield immediate improvement across all modules.

### Task 1: Model Upgrade (30 minutes)
Update all model references from `gemini-2.0-flash-exp` to `gemini-2.5-flash`. This is a find-and-replace operation across 6 files. Zero risk, immediate quality improvement.

### Task 2: Add Grounded Search (2 hours)
Add the `handleGroundedSearch` handler to gemini-chat and create the frontend hook. This unlocks real-time web data for Studio guest research and Captacao edital search.

### Task 3: Upgrade chat-with-aica Models (30 minutes)
Update the chat-with-aica Edge Function from gemini-1.5 to gemini-2.5. Immediate quality improvement for the main chat interface.

### Task 4: Create file-search-v2 Edge Function (3 hours)
The code template is ready in docs. This is the foundation for all RAG features across modules.

---

## 7. FILES TO CREATE/MODIFY SUMMARY

### New Files
```
supabase/functions/file-search-v2/index.ts          # Phase 2.1
src/hooks/useGroundedSearch.ts                       # Phase 1.3
src/hooks/useFileSearchV2.ts                         # Phase 2.3
src/lib/agents/index.ts                              # Phase 3.1
src/lib/agents/types.ts                              # Phase 3.1
src/lib/agents/prompts/atlas.ts                      # Phase 3.2
src/lib/agents/prompts/captacao.ts                   # Phase 3.2
src/lib/agents/prompts/studio.ts                     # Phase 3.2
src/lib/agents/prompts/journey.ts                    # Phase 3.2
src/lib/agents/prompts/finance.ts                    # Phase 3.2
src/lib/agents/prompts/connections.ts                # Phase 3.2
src/lib/agents/prompts/coordinator.ts                # Phase 3.2
src/services/userAIContextService.ts                 # Phase 5.2
src/modules/captacao/components/EditalQueryCard.tsx   # Phase 4.1
```

### Modified Files
```
src/lib/gemini/models.ts                             # Phase 1.1 (model versions)
src/lib/gemini/types.ts                              # Phase 1.2, 3.3 (new actions, agent field)
src/lib/gemini/client.ts                             # Phase 2.2 (routing)
supabase/functions/gemini-chat/index.ts              # Phase 1.1, 1.2, 3.3
supabase/functions/deep-research/index.ts            # Phase 1.1
supabase/functions/gemini-live/index.ts              # Phase 1.1
supabase/functions/chat-with-aica/index.ts           # Phase 1.1, 5.1
supabase/functions/file-search/index.ts              # Phase 1.1
supabase/functions/process-whatsapp-ai/index.ts      # Phase 1.1
```

---

## 8. SECURITY CHECKLIST

- [ ] No API keys in frontend code (all via Edge Functions)
- [ ] JWT validation on all Edge Functions
- [ ] CORS origin whitelist on all Edge Functions
- [ ] RLS policies on any new database tables
- [ ] Rate limiting on AI endpoints
- [ ] Input validation and sanitization on all prompts
- [ ] Token budget enforcement per user
- [ ] LGPD compliance: no raw personal data in prompts (use derived insights only)
- [ ] File Search stores scoped per user (no cross-user data leakage)

---

*This plan is designed to be executed incrementally. Each phase delivers standalone value. The user can start using improved AI features after Phase 1 alone.*

*Plan created by Master Architect Agent -- 2026-02-03*
