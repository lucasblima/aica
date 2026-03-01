# Sprint R — Bug Fixes + Full Chat Redesign

**Date:** 2026-02-27
**Issues:** #502, #501, #503, #500, #194
**Session:** `sprint-r-bugs-chat-redesign`

---

## Grupo 1: Bug Fixes (3 issues)

### Bug #502 — Chat erro ao registrar momento

**Root Cause:** `gemini-chat/index.ts` line 962 sends `type: 'reflection'` in `create_moment` action params, but the `moments` table CHECK constraint only allows `'audio' | 'text' | 'both'` (migration `20251206000002_journey_redesign.sql`).

**Failure flow:**
1. User clicks "Registrar momento" quick action in AicaChatFAB
2. Intent classifier detects `momentKeywords` → creates action with `type: 'reflection'`
3. `executeChatAction()` calls Edge Function with invalid type
4. DB CHECK constraint rejects INSERT → error returned to user

**Fix (2 lines):**
- `supabase/functions/gemini-chat/index.ts` line 962: `type: 'reflection'` → `type: 'text'`
- `supabase/functions/gemini-chat/index.ts` line 2482: fallback `'reflection'` → `'text'`

**Files:** `supabase/functions/gemini-chat/index.ts`
**Risk:** None — surgical fix.

---

### Bug #501 — Erro ao gerar pauta (Studio)

**Pipeline:** PautaGeneratorPanel → pautaGeneratorService → 5 sequential steps:
1. Deep Research (10-30%) → `deep-research` Edge Function → `gemini-2.5-pro`
2. Outline (40-50%) → `gemini-chat` → `gemini-2.5-pro`
3. Questions (60-75%) → `gemini-chat` → `gemini-2.5-pro`
4. Ice Breakers (80-90%) → `gemini-chat` → `gemini-2.5-flash`
5. Compilation (95-100%) → local, no API call

**Probable causes (in priority order):**
1. Missing action handlers in `gemini-chat` for `generate_pauta_outline`, `generate_pauta_questions`, `generate_ice_breakers`
2. Gemini API key expired/quota exceeded
3. `deep-research` Edge Function returning 500

**Fix approach:**
- Check Edge Function logs for `deep-research` and `gemini-chat`
- Verify/add action handlers in gemini-chat for all 3 pauta actions
- Improve error reporting: show which step failed (not generic error)
- Ensure `maxOutputTokens: 4096` on all Gemini calls (thinking token issue)

**Files:**
- `supabase/functions/gemini-chat/index.ts` (add/verify handlers)
- `supabase/functions/deep-research/index.ts` (verify health)
- `src/modules/studio/services/pautaGeneratorService.ts` (better error messages)
- `src/modules/studio/components/workspace/PautaGeneratorPanel.tsx` (step-level error display)

---

### Bug #503 — Swipe mobile entre 4 views do Atlas

**Current state:** `AgendaView.tsx` uses `AgendaModeToggle` (click-only buttons) to switch between Agenda/Lista/Kanban/Matrix on mobile. No touch gesture support.

**Approach:** framer-motion `drag="x"` (already installed v12.23.25). Pattern proven in codebase (`SwipeableTaskCard.tsx`, `PdfPreviewDrawer.tsx`).

**Implementation:**
- Wrap mobile view container in `motion.div` with `drag="x"` + `onDragEnd`
- View cycle: Agenda ↔ Lista ↔ Kanban ↔ Matrix
- Threshold: 60px horizontal offset to trigger
- Visual feedback: translateX follows finger, opacity fade during drag
- Snap-back animation: `springSlide` from `ceramic-motion.ts`
- Desktop: no change (split layout preserved)
- Optional: dot indicators below tabs as swipe affordance

**Conflict prevention:** `dragDirectionLock` to avoid interfering with vertical scroll or task card swipes (`SwipeableTaskCard` uses `drag="x"` at card level).

**Files:**
- `src/views/AgendaView.tsx` (main change — add drag gesture)
- `src/components/domain/AgendaModeToggle.tsx` (optional: dot indicators)

---

## Grupo 2: Full Chat Redesign (#500 + #194)

### A. Progress Feedback System (#500)

**Problem:** Only PautaGeneratorPanel has real progress tracking. All other long-running operations (chat AI, moment analysis, PDF processing) use binary loading state (spinner, no sub-steps).

**Solution:** Shared `ProgressSteps` component + `useProgressTracker` hook.

**UI pattern:**
```
┌─────────────────────────────────────┐
│ ● Pesquisando convidado...     [30%]│
│ ○ Gerando estrutura                 │
│ ○ Criando perguntas                 │
│ ○ Compilando pauta                  │
└─────────────────────────────────────┘
```

**Apply to:**
- Chat AI responses (typing indicator + step: "Analisando contexto...", "Gerando resposta...")
- Pauta generation (upgrade existing progress to ProgressSteps UI)
- Moment analysis / CP scoring
- PDF processing (Grants)

**Files:**
- `src/components/ui/ProgressSteps.tsx` (new — shared component)
- `src/hooks/useProgressTracker.ts` (new — shared hook)
- Integration in each module's long-running flows

### B. Streaming Chat Responses

**Current:** All Gemini responses arrive as single batch after full generation. User sees spinner for 3-10s.

**Target:** Server-Sent Events (SSE) streaming from Edge Function → incremental text display.

**Implementation:**
- `gemini-chat` Edge Function: `ReadableStream` with `text/event-stream` content type
- `useChatSession`: `EventSource` or `fetch` with `ReadableStream` reader
- Frontend: progressive text rendering with cursor animation
- Fallback: batch response if streaming fails or for action-type responses

**Files:**
- `supabase/functions/gemini-chat/index.ts` (streaming response path)
- `src/hooks/useChatSession.ts` (stream reader)
- `src/lib/gemini/client.ts` (new `callStream()` method)
- `src/components/features/AicaChatFAB/AicaChatFAB.tsx` (streaming message display)

### C. Module-Level Chat UIs

**Current:** Only Finance has `AgentChat.tsx`. Other 6 modules have no dedicated chat interface.

**Target:** Replicate Finance pattern for Atlas, Studio, Journey, Grants, Connections, Flux.

**Pattern per module:**
- `src/modules/{module}/components/ModuleChat.tsx` — Chat panel with module context
- Uses `useModuleChatSession(moduleName)` hook (already exists)
- Injected as sidebar or tab in module workspace
- Module-specific quick actions and context

**Priority modules:** Atlas (task planning), Studio (production), Journey (reflection), Grants (edital analysis)

### D. Chat History Browser

**Current:** AicaChatFAB has session sidebar, but limited browsing capability.

**Target:** Full chat history view (integrated in expanded AicaChatFAB or standalone route).

**Features:**
- Session list grouped by date (today, this week, older)
- Text search across messages
- Filter by module/agent
- Auto-generated session summaries
- Click to resume any past session

**Files:**
- `src/components/features/AicaChatFAB/ChatHistoryPanel.tsx` (new)
- `src/services/chatService.ts` (add search, summary endpoints)
- `supabase/functions/gemini-chat/index.ts` (add `summarize_session` action)

### E. ADK Full Integration

**Current state:**
- `agent-proxy` Edge Function deployed (forwards to `aica-agents` Cloud Run)
- `useChatSession` already calls `agent_chat` action
- `aica-agents` Cloud Run service status unknown

**Tasks:**
- Verify `aica-agents` service health
- Ensure graceful fallback to `gemini-chat` when ADK is down
- Wire module-specific agents through agent-proxy
- Add agent selection UI in chat (manual override)

**Files:**
- `supabase/functions/agent-proxy/index.ts`
- `src/hooks/useChatSession.ts` (fallback logic)
- `src/lib/gemini/client.ts` (routing)

---

## Team Composition

### Grupo 1 (Bug Fixes) — 3 parallel teammates
- **Lead:** Coordinator (triagem, merge, PR)
- **Teammate 1:** #502 fix (gemini-chat type field) + redeploy
- **Teammate 2:** #501 investigation + fix (Studio pauta pipeline)
- **Teammate 3:** #503 swipe implementation (AgendaView + framer-motion)

### Grupo 2 (Chat Redesign) — 4 parallel teammates
- **Lead:** Coordinator
- **Teammate 1 (Frontend):** ProgressSteps component, streaming UI, chat history panel
- **Teammate 2 (Backend):** SSE streaming in gemini-chat, summarize_session action
- **Teammate 3 (Modules):** Module-level chat UIs (Atlas, Studio, Journey, Grants)
- **Teammate 4 (Integration):** ADK verification, fallback logic, agent routing

---

## Acceptance Criteria

### Grupo 1
- [ ] #502: "Registrar momento" via chat creates moment successfully
- [ ] #501: Pauta generation completes (or shows specific step error)
- [ ] #503: Mobile swipe navigates all 4 views, desktop unaffected

### Grupo 2
- [ ] #500: Long-running operations show step-by-step progress
- [ ] #194: Chat responses stream incrementally
- [ ] #194: 4+ modules have dedicated chat UI
- [ ] #194: Chat history searchable and browsable
- [ ] #194: ADK fallback works gracefully
