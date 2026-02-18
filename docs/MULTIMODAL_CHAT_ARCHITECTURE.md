# Multi-Modal Chat Architecture

> Architecture specification for AICA's next-generation chat system with inline cards, rich responses, streaming, and voice input.

---

## 1. Current State Analysis

### What Exists Today

| Component | Location | Role |
|-----------|----------|------|
| `AicaChatFAB` | `src/components/features/AicaChatFAB/` | Floating action button + drawer chat UI |
| `useChatSession` | `src/hooks/useChatSession.ts` | Session lifecycle, message send/receive, intent classification |
| `useAgentChat` | `src/hooks/useAgentChat.ts` | **Orphaned** — per-module agent chat hook, never wired to UI |
| `chatService` | `src/services/chatService.ts` | CRUD for `chat_sessions` + `chat_messages` tables |
| `GeminiClient` | `src/lib/gemini/client.ts` | Singleton client, routes to Edge Functions, has `stream()` method |
| `gemini-chat` | `supabase/functions/gemini-chat/` | Monolithic Edge Function with **27 actions** |
| `agent-proxy` | `supabase/functions/agent-proxy/` | Proxy to ADK Cloud Run backend (deployed, unused by chat) |
| Intent Classifier | `src/lib/agents/intentClassifier.ts` | Client-side keyword matching for module routing |
| Agent Registry | `src/lib/agents/` | 9 agent configs (atlas, journey, studio, captacao, finance, connections, flux, agenda, coordinator) |
| Trust Level System | `src/lib/agents/trustLevel.ts` | Progressive autonomy: suggest_confirm -> execute_validate -> jarvis |

### gemini-chat Actions (Complete List)

**Chat**: `chat_aica`, `finance_chat`, `classify_intent`
**Journey**: `analyze_moment_sentiment`, `generate_weekly_summary`, `analyze_content_realtime`, `generate_post_capture_insight`, `cluster_moments_by_theme`, `generate_daily_question`, `generate_tags`, `analyze_moment`, `evaluate_quality`
**Studio**: `generate_dossier`, `generate_ice_breakers`, `generate_pauta_questions`, `generate_pauta_outline`, `research_guest`
**Grants**: `generate_field_content`, `analyze_edital_structure`, `parse_form_fields`, `generate_auto_briefing`, `improve_briefing_field`, `extract_required_documents`, `extract_timeline_phases`
**Finance**: `parse_statement`
**Atlas**: `extract_task_from_voice`
**WhatsApp**: `whatsapp_sentiment` / `sentiment_analysis`
**Reports**: `generate_daily_report`
**Audio**: `transcribe_audio`

### Key Architectural Gaps

1. **No rich responses** — all messages are plain text (with markdown rendering via `dangerouslySetInnerHTML`)
2. **No streaming** — `GeminiClient.stream()` exists but is never called; `useChatSession` uses `client.call()` (request/response)
3. **No context awareness** — chat doesn't know which page/module the user is viewing
4. **No inline actions** — user can't create tasks, view charts, or interact with cards from chat
5. **FAB is a drawer** — small 360x480px window, not suitable for rich content
6. **useAgentChat is orphaned** — never wired to the FAB; uses separate `chat_with_agent` action that isn't handled by gemini-chat

---

## 2. New Architecture

### 2.1 Design Principles

1. **Progressive disclosure** — FAB remains for quick questions; full chat page for rich interactions
2. **Backend-first rendering** — AI decides response format via structured JSON, frontend renders it
3. **Streaming with structure** — stream text chunks, then append structured cards after completion
4. **Module-aware context** — chat knows current route/module and injects relevant context
5. **Composable cards** — small, focused card components that can be embedded anywhere

### 2.2 Component Hierarchy

```
src/
  pages/
    ChatPage.tsx                    # Full-page chat experience (/chat)

  modules/
    chat/                           # NEW module
      components/
        ChatShell.tsx               # Layout wrapper (sidebar + main area)
        ChatSidebar.tsx             # Session list + new chat button
        ChatMessageList.tsx         # Scrollable message container
        ChatMessage.tsx             # Single message (user or assistant)
        ChatInput.tsx               # Multi-line input + attachments + voice
        ChatWelcome.tsx             # Empty state with suggested prompts
      cards/
        index.ts                    # Card registry + renderer
        TextCard.tsx                # Markdown text block
        ChartCard.tsx               # Inline chart (recharts)
        ActionCard.tsx              # Clickable action (create task, navigate, etc.)
        DashboardCard.tsx           # Mini-dashboard with KPIs
        FilePreviewCard.tsx         # File/email/document preview
        TaskCard.tsx                # Task display with status + quick actions
        InsightCard.tsx             # AI insight with source attribution
        ListCard.tsx                # Structured list (contacts, events, etc.)
        FormCard.tsx                # Inline form for data collection
        ConfirmCard.tsx             # Confirmation dialog for destructive actions
      hooks/
        useChatEngine.ts            # Core engine: send, stream, classify, render
        useChatContext.ts           # Module/page context provider
        useVoiceInput.ts            # Microphone capture + transcription
      types/
        index.ts                    # All chat type definitions
      services/
        chatMessageService.ts       # Extended CRUD for rich messages
        chatStreamService.ts        # SSE/streaming handler

  components/
    features/
      AicaChatFAB/                  # PRESERVED — delegates to /chat for rich responses
```

### 2.3 Message Format Specification

```typescript
// === RICH MESSAGE FORMAT ===

/**
 * A chat message that can contain multiple content blocks.
 * The AI returns an array of blocks; the frontend renders each one.
 */
interface RichMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  /** Raw text content (always present for persistence/search) */
  content: string
  /** Structured blocks for rich rendering (nullable for legacy messages) */
  blocks: ContentBlock[] | null
  /** Which agent handled this message */
  agent?: AgentModule | 'coordinator'
  /** Intent classification result */
  classification?: IntentResult
  /** Token usage for cost tracking */
  tokens?: { input: number; output: number }
  created_at: string
}

/**
 * Union type for all content block types.
 * Each block is a self-contained renderable unit.
 */
type ContentBlock =
  | TextBlock
  | ChartBlock
  | ActionBlock
  | DashboardBlock
  | FilePreviewBlock
  | TaskBlock
  | InsightBlock
  | ListBlock
  | FormBlock
  | ConfirmBlock

// --- Block Definitions ---

interface TextBlock {
  type: 'text'
  content: string  // Markdown
}

interface ChartBlock {
  type: 'chart'
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'radial'
  title: string
  data: Array<Record<string, string | number>>
  xKey: string
  yKeys: string[]
  colors?: string[]
}

interface ActionBlock {
  type: 'action'
  actions: Array<{
    id: string
    label: string
    icon?: string          // Lucide icon name
    variant: 'primary' | 'secondary' | 'ghost'
    /** Navigation route or module action */
    action:
      | { type: 'navigate'; route: string }
      | { type: 'module_action'; module: AgentModule; action: string; payload: Record<string, any> }
      | { type: 'chat_action'; message: string }  // Send a follow-up message
  }>
}

interface DashboardBlock {
  type: 'dashboard'
  title: string
  metrics: Array<{
    label: string
    value: string | number
    change?: number        // Percentage change
    trend?: 'up' | 'down' | 'stable'
    icon?: string
  }>
}

interface FilePreviewBlock {
  type: 'file_preview'
  fileName: string
  fileType: 'pdf' | 'image' | 'email' | 'document' | 'audio'
  previewUrl?: string
  metadata: Record<string, string>
  actions?: Array<{ label: string; action: string }>
}

interface TaskBlock {
  type: 'task'
  task: {
    id?: string            // Null if not yet created
    title: string
    priority: 'urgent' | 'high' | 'medium' | 'low'
    is_urgent: boolean
    is_important: boolean
    due_date?: string
    status?: 'pending' | 'in_progress' | 'done'
  }
  /** Whether to show create/edit actions */
  editable: boolean
}

interface InsightBlock {
  type: 'insight'
  title: string
  content: string          // Markdown
  severity: 'info' | 'success' | 'warning' | 'critical'
  source?: string          // e.g., "Life Council", "Pattern Synthesis"
  actions?: Array<{ label: string; action: string }>
}

interface ListBlock {
  type: 'list'
  title: string
  items: Array<{
    primary: string
    secondary?: string
    icon?: string
    badge?: { label: string; color: string }
    action?: { type: 'navigate'; route: string }
  }>
}

interface FormBlock {
  type: 'form'
  title: string
  description?: string
  fields: Array<{
    id: string
    label: string
    type: 'text' | 'number' | 'select' | 'date' | 'textarea'
    options?: string[]     // For select
    required: boolean
    placeholder?: string
    defaultValue?: string
  }>
  submitLabel: string
  /** Action to trigger on submit (sent as new user message with form data) */
  submitAction: string
}

interface ConfirmBlock {
  type: 'confirm'
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  severity: 'info' | 'warning' | 'danger'
  action: { type: 'module_action'; module: AgentModule; action: string; payload: Record<string, any> }
}
```

### 2.4 Database Changes

The existing `chat_messages` table stores `content` as text. We add a JSONB column for structured blocks:

```sql
-- Migration: add_rich_message_support
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS blocks jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS agent text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS classification jsonb DEFAULT NULL;

-- Index for searching by agent
CREATE INDEX IF NOT EXISTS idx_chat_messages_agent
  ON chat_messages(agent) WHERE agent IS NOT NULL;

COMMENT ON COLUMN chat_messages.blocks IS
  'Structured content blocks for rich rendering. Null for plain text messages.';
```

Legacy messages (blocks=null) render as plain text via markdown. New messages have both `content` (for search/fallback) and `blocks` (for rendering).

### 2.5 Streaming Architecture

**Current state**: `GeminiClient.stream()` exists with `onChunk/onComplete/onError` but is unused.

**New approach**: Two-phase response

1. **Phase 1 — Text streaming**: Stream text tokens as they arrive (SSE from Edge Function). Display in real-time as a `TextBlock`.
2. **Phase 2 — Structured blocks**: After text generation completes, if the response includes structured data (charts, tasks, cards), send a second request or parse the streamed JSON into blocks.

**Edge Function SSE pattern** (for `gemini-chat`):

```typescript
// New action: chat_aica_stream
// Returns Server-Sent Events

const encoder = new TextEncoder()
const stream = new ReadableStream({
  async start(controller) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { maxOutputTokens: 4096 } })
    const result = await model.generateContentStream(prompt)

    for await (const chunk of result.stream) {
      const text = chunk.text()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`))
    }

    // After text streaming, emit structured blocks if applicable
    const fullResponse = await result.response
    const blocks = parseResponseIntoBlocks(fullResponse.text())
    if (blocks.length > 0) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'blocks', blocks })}\n\n`))
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', usage: fullResponse.usageMetadata })}\n\n`))
    controller.close()
  }
})

return new Response(stream, {
  headers: {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
})
```

**Frontend streaming consumer** (`chatStreamService.ts`):

```typescript
export async function streamChat(
  payload: ChatPayload,
  callbacks: {
    onTextChunk: (text: string) => void
    onBlocks: (blocks: ContentBlock[]) => void
    onComplete: (usage: { input: number; output: number }) => void
    onError: (error: Error) => void
  }
): Promise<void> {
  const token = await getAuthToken()
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...payload, stream: true }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = JSON.parse(line.slice(6))

      switch (data.type) {
        case 'text': callbacks.onTextChunk(data.content); break
        case 'blocks': callbacks.onBlocks(data.blocks); break
        case 'done': callbacks.onComplete(data.usage); break
      }
    }
  }
}
```

### 2.6 Context Awareness

The chat needs to know what the user is currently viewing to provide relevant responses.

```typescript
// useChatContext.ts

interface ChatContext {
  /** Current route path */
  currentRoute: string
  /** Detected module from route */
  currentModule: AgentModule | null
  /** Page-specific data (e.g., selected task, open contact, etc.) */
  moduleData: Record<string, any>
}

export function useChatContext(): ChatContext {
  const location = useLocation()

  const currentModule = useMemo(() => {
    const routeToModule: Record<string, AgentModule> = {
      '/atlas': 'atlas',
      '/journey': 'journey',
      '/studio': 'studio',
      '/grants': 'captacao',
      '/finance': 'finance',
      '/connections': 'connections',
      '/flux': 'flux',
      '/agenda': 'agenda',
    }
    const base = '/' + location.pathname.split('/')[1]
    return routeToModule[base] || null
  }, [location.pathname])

  return {
    currentRoute: location.pathname,
    currentModule,
    moduleData: {},  // Populated by module-specific context providers
  }
}
```

When sending a message, inject context:

```typescript
// In useChatEngine.ts
const context = useChatContext()

// Prepend context to system prompt
const contextSuffix = context.currentModule
  ? `\n\nO usuario esta atualmente na pagina ${context.currentRoute} (modulo ${context.currentModule}).`
  : ''
const systemPrompt = getSystemPromptForAgent(classification.module, trustLevel) + contextSuffix
```

### 2.7 Voice Input

Integration point with Gemini Native Audio:

```typescript
// useVoiceInput.ts

interface UseVoiceInputReturn {
  isRecording: boolean
  isTranscribing: boolean
  startRecording: () => void
  stopRecording: () => Promise<string>  // Returns transcription
  cancelRecording: () => void
}

export function useVoiceInput(): UseVoiceInputReturn {
  // Uses MediaRecorder API to capture audio
  // Sends base64 audio to gemini-chat action 'transcribe_audio'
  // Returns transcription text to be sent as chat message

  // Future: integrate with Gemini Live API (gemini-2.5-flash-native-audio)
  // for real-time voice conversation mode
}
```

The `transcribe_audio` action already exists in gemini-chat. For the future Gemini Live integration, a separate WebSocket-based connection would be needed.

### 2.8 Full Chat Page vs FAB

| Aspect | AicaChatFAB (Preserved) | ChatPage (New) |
|--------|------------------------|----------------|
| Route | Overlay, no route | `/chat` |
| Size | 360x480px drawer | Full viewport |
| Rich cards | No — text only | Yes — all card types |
| Streaming | No | Yes |
| Voice | No | Yes |
| Sidebar | Minimal session list | Full session list + search |
| Context | None | Module-aware |

**FAB behavior change**: When the AI response contains blocks (charts, dashboards, etc.), the FAB shows a "Ver resposta completa" link that navigates to `/chat` with the session open.

### 2.9 Backend Response Format Evolution

**Current** (gemini-chat `chat_aica` action):
```json
{
  "result": { "response": "Texto em markdown..." },
  "success": true
}
```

**New** (gemini-chat `chat_aica_rich` action):
```json
{
  "result": {
    "text": "Aqui esta seu resumo semanal...",
    "blocks": [
      { "type": "text", "content": "Aqui esta seu resumo semanal..." },
      {
        "type": "dashboard",
        "title": "Produtividade da Semana",
        "metrics": [
          { "label": "Tarefas concluidas", "value": 12, "change": 20, "trend": "up" },
          { "label": "Score medio", "value": "7.5", "trend": "stable" }
        ]
      },
      {
        "type": "chart",
        "chartType": "line",
        "title": "Sentimento ao longo da semana",
        "data": [
          { "day": "Seg", "score": 0.6 },
          { "day": "Ter", "score": 0.3 }
        ],
        "xKey": "day",
        "yKeys": ["score"]
      },
      {
        "type": "action",
        "actions": [
          { "id": "view_details", "label": "Ver detalhes", "variant": "primary", "action": { "type": "navigate", "route": "/journey" } },
          { "id": "new_moment", "label": "Registrar momento", "variant": "secondary", "action": { "type": "navigate", "route": "/journey/new" } }
        ]
      }
    ]
  },
  "success": true
}
```

The AI determines which blocks to include based on:
1. The user's question and detected intent
2. Available data from the module
3. Trust level (higher trust = more autonomous actions)

### 2.10 Card Rendering Pipeline

```typescript
// cards/index.ts — Card Registry

import { TextCard } from './TextCard'
import { ChartCard } from './ChartCard'
import { ActionCard } from './ActionCard'
import { DashboardCard } from './DashboardCard'
// ... etc

const CARD_REGISTRY: Record<ContentBlock['type'], React.ComponentType<{ block: any }>> = {
  text: TextCard,
  chart: ChartCard,
  action: ActionCard,
  dashboard: DashboardCard,
  file_preview: FilePreviewCard,
  task: TaskCard,
  insight: InsightCard,
  list: ListCard,
  form: FormCard,
  confirm: ConfirmCard,
}

export function renderBlock(block: ContentBlock): React.ReactNode {
  const Component = CARD_REGISTRY[block.type]
  if (!Component) {
    console.warn(`Unknown block type: ${block.type}`)
    return null
  }
  return <Component block={block} />
}

// Usage in ChatMessage.tsx:
function ChatMessage({ message }: { message: RichMessage }) {
  if (message.blocks && message.blocks.length > 0) {
    return (
      <div className="chat-message chat-message--assistant">
        {message.blocks.map((block, i) => (
          <div key={i} className="chat-block">
            {renderBlock(block)}
          </div>
        ))}
      </div>
    )
  }

  // Fallback: render plain text/markdown
  return (
    <div className="chat-message chat-message--assistant">
      <div dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(message.content) }} />
    </div>
  )
}
```

---

## 3. Migration Strategy

### Phase 1: Foundation (Week 1)
- Create `src/modules/chat/` directory structure
- Define TypeScript types for `RichMessage` and all `ContentBlock` variants
- Implement `ChatPage` with `ChatShell` + `ChatSidebar` + `ChatMessageList` + `ChatInput`
- Wire to existing `useChatSession` — same backend, new UI
- Add route `/chat` to AppRouter

### Phase 2: Rich Blocks (Week 2)
- Implement card components: `TextCard`, `ChartCard`, `DashboardCard`, `ActionCard`, `InsightCard`
- Apply migration to add `blocks` column to `chat_messages`
- Update `chatService` to save/load blocks
- Create `chat_aica_rich` action in gemini-chat that returns structured blocks

### Phase 3: Streaming (Week 3)
- Implement SSE endpoint in gemini-chat
- Create `chatStreamService.ts` for frontend consumption
- Update `useChatEngine` to use streaming for text, then append blocks
- Show typing indicator during stream

### Phase 4: Context & Voice (Week 4)
- Implement `useChatContext` for module awareness
- Implement `useVoiceInput` with existing `transcribe_audio` action
- Add microphone button to `ChatInput`
- Update FAB to link to `/chat` for rich responses

---

## 4. Key Architectural Decisions

### Decision 1: Keep FAB + Add Full Page
**Rationale**: The FAB serves quick questions well (e.g., "what's my next task?"). Rich responses need more space. Users get both.

### Decision 2: Structured blocks over custom rendering
**Rationale**: The AI returns a typed JSON array of blocks. The frontend has a registry of card components. This is extensible (add new block types without changing the AI prompt), testable (each card is a pure component), and debuggable (blocks are inspectable JSON).

### Decision 3: SSE streaming (not WebSocket)
**Rationale**: Supabase Edge Functions support streaming responses via ReadableStream. SSE is simpler than WebSocket, works through proxies, and matches the request-response pattern of chat. WebSocket would be needed only for Gemini Live (real-time voice), which is a future phase.

### Decision 4: Two-phase response (text stream + blocks)
**Rationale**: Users want to see text appearing immediately (low latency feel). Structured cards (charts, dashboards) require the full response to be parsed. Streaming text first, then appending cards, gives the best UX.

### Decision 5: Context injection via system prompt (not separate API call)
**Rationale**: Adding module context to the system prompt is zero-latency and uses the existing Gemini chat pipeline. A separate context API call would add latency and complexity. The intent classifier already routes to the right agent; context just adds specificity.

### Decision 6: Preserve useAgentChat for module-embedded chat
**Rationale**: `useAgentChat` is orphaned from the FAB but has a valid use case: module-specific inline chat widgets (e.g., a chat panel inside the Finance module). It should be reconnected, not deleted.

### Decision 7: No new database table for chat
**Rationale**: The existing `chat_sessions` + `chat_messages` tables are sufficient. We add a `blocks` JSONB column to `chat_messages` for structured content. This avoids migration complexity and keeps the schema simple.

---

## 5. Dependencies & Integration Points

| System | Integration |
|--------|------------|
| **gemini-chat Edge Function** | Add `chat_aica_rich` action + SSE streaming support |
| **GeminiClient** | `stream()` method already exists, needs minor adaptation for SSE parsing |
| **chatService** | Extend `SaveMessageInput` to include `blocks` + `agent` |
| **AppRouter** | Add `/chat` route pointing to `ChatPage` |
| **AicaChatFAB** | Add "open in full view" link for rich responses |
| **Billing** | `checkInteractionLimit` already called in `useChatSession`; reuse in `useChatEngine` |
| **Intent Classifier** | Reuse existing `classifyIntent` + server-side `classify_intent` action |
| **Trust Level** | Reuse existing `calculateTrustLevel` to modulate response autonomy |
| **recharts** | Already in dependencies for chart rendering |

---

## 6. File Inventory

New files to create:

```
src/modules/chat/
  types/index.ts                  # RichMessage, ContentBlock, all block types
  components/
    ChatShell.tsx                  # Layout: sidebar + main
    ChatSidebar.tsx                # Session list
    ChatMessageList.tsx            # Scrollable message area
    ChatMessage.tsx                # Renders single message (plain or rich)
    ChatInput.tsx                  # Multi-line input, voice, attachments
    ChatWelcome.tsx                # Empty state
  cards/
    index.ts                      # Registry + renderBlock()
    TextCard.tsx
    ChartCard.tsx
    ActionCard.tsx
    DashboardCard.tsx
    InsightCard.tsx
    TaskCard.tsx
    ListCard.tsx
    FormCard.tsx
    ConfirmCard.tsx
    FilePreviewCard.tsx
  hooks/
    useChatEngine.ts              # Core: send, stream, classify, render
    useChatContext.ts              # Module/page awareness
    useVoiceInput.ts              # Mic capture + transcription
  services/
    chatStreamService.ts          # SSE consumer

src/pages/ChatPage.tsx            # Route handler

supabase/migrations/
  YYYYMMDD_add_rich_message_support.sql
```

Files to modify:

```
src/services/chatService.ts       # Add blocks column support
src/components/features/AicaChatFAB/AicaChatFAB.tsx  # Add "open full chat" link
src/pages/AppRouter.tsx           # Add /chat route
supabase/functions/gemini-chat/index.ts  # Add chat_aica_rich + SSE streaming
```

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini returns malformed block JSON | Broken cards in UI | `extractJSON()` + per-block type validation + fallback to TextBlock |
| SSE streaming through Supabase proxy | May buffer or timeout | Test with `Transfer-Encoding: chunked`; fallback to non-streaming `chat_aica_rich` |
| Large block payloads in JSONB column | Storage bloat | Max 10 blocks per message; compress chart data |
| Card interactions (create task, navigate) | Security surface | Validate all actions client-side; trust level gates destructive actions |
| Voice input browser compatibility | Safari/Firefox issues | Feature-detect MediaRecorder; graceful degradation to text-only |
