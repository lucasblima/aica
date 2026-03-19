# Fix Chat Double-Response: Unified Message Source

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the double-response bug where streaming and fallback responses both appear simultaneously, by unifying all assistant responses into a single render path through `messages[]`.

**Architecture:** Hybrid approach — streaming placeholder lives in `messages[]` (single render path, position-locked), while `streamedText` state drives the live content for that placeholder (performance-optimized, no per-token array mutations). On completion or fallback, the placeholder is **replaced in-place** — never a second message appended.

**Tech Stack:** React 18, TypeScript, existing useChatSession hook + AicaChatFAB component.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/hooks/useChatSession.ts` | Add `isStreaming` to DisplayMessage, add `streamingMsgIdRef`, insert streaming placeholder into `messages[]`, replace on completion/fallback |
| Modify | `src/components/features/AicaChatFAB/AicaChatFAB.tsx` | Remove separate streaming bubble, render streaming messages inline using `streamedText` for content |
| Modify | `src/components/features/AicaChatFAB/AicaChatFAB.css` | Add `.typing-cursor` animation |

No new files. No backend changes. No Edge Function changes.

**Key design decision:** `streamedText` state still updates on every token (cheap string update). The streaming message in `messages[]` does NOT update its `content` per-token — instead, the render reads `streamedText` for messages with `isStreaming: true`. This avoids per-token array mutations and scroll jank.

---

### Task 1: Add `isStreaming` to DisplayMessage + add ref

**Files:**
- Modify: `src/hooks/useChatSession.ts:19-27, 77`

- [ ] **Step 1: Add optional `isStreaming` field to `DisplayMessage`**

At line 26 (before the closing `}`), add `isStreaming`:

```typescript
export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  agent?: string
  actions?: ChatAction[]
  sources?: Array<{ title: string; url: string }>
  isStreaming?: boolean
}
```

- [ ] **Step 2: Add `streamingMsgIdRef`**

After `streamedTextRef` (line 77), add:

```typescript
const streamingMsgIdRef = useRef<string | null>(null)
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useChatSession.ts
git commit -m "refactor(chat): add isStreaming flag to DisplayMessage + streamingMsgIdRef"
```

---

### Task 2: Insert streaming placeholder into `messages[]` before `tryStreaming`

**Files:**
- Modify: `src/hooks/useChatSession.ts:291-299`

- [ ] **Step 1: Insert streaming placeholder before `tryStreaming` call**

Replace lines 291-292:

```typescript
// OLD:
// Strategy: try streaming first, fallback to non-streaming gemini-chat
try {
```

With:

```typescript
// Insert streaming placeholder — single render path, no separate bubble
const streamingId = `streaming-${Date.now()}`
streamingMsgIdRef.current = streamingId
setMessages(prev => [...prev, {
  id: streamingId,
  role: 'assistant' as const,
  content: '',
  created_at: new Date().toISOString(),
  isStreaming: true,
}])

try {
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useChatSession.ts
git commit -m "refactor(chat): insert streaming placeholder into messages[] before tryStreaming"
```

---

### Task 3: Replace streaming placeholder with final message on success/fallback

**Files:**
- Modify: `src/hooks/useChatSession.ts:367-382`

- [ ] **Step 1: Replace the optimistic append with an in-place update**

Replace lines 367-382:

```typescript
// OLD:
// Success — append message OPTIMISTICALLY before DB save (prevents flash of empty content)
const tempAssistantId = `temp-assistant-${Date.now()}`
const tempAssistantMsg: DisplayMessage = {
  id: tempAssistantId,
  role: 'assistant',
  content: finalText,
  created_at: new Date().toISOString(),
  agent: respondingAgent,
  actions: responseActions,
}
setMessages(prev => [...prev, tempAssistantMsg])
setActiveAgent(respondingAgent)

// NOW clear streaming state — the optimistic message is already visible
setIsStreaming(false)
setStreamedText('')
```

With:

```typescript
// Replace streaming placeholder with final message (in-place, never append)
const tempAssistantId = `temp-assistant-${Date.now()}`
const streamingId = streamingMsgIdRef.current
setMessages(prev => prev.map(m =>
  m.id === streamingId
    ? {
        id: tempAssistantId,
        role: 'assistant' as const,
        content: finalText,
        created_at: m.created_at,
        agent: respondingAgent,
        actions: responseActions,
        isStreaming: false,
      }
    : m
))
streamingMsgIdRef.current = null
setActiveAgent(respondingAgent)

// Clear streaming state
setIsStreaming(false)
setStreamedText('')
streamedTextRef.current = ''
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useChatSession.ts
git commit -m "refactor(chat): replace streaming placeholder in-place instead of appending"
```

---

### Task 4: Clean up streaming placeholder on total failure

**Files:**
- Modify: `src/hooks/useChatSession.ts:434-454`

- [ ] **Step 1: Remove streaming placeholder in outer catch block**

In the outer catch block (after line 436 `const message = ...`), add before the Sentry breadcrumb:

```typescript
// Remove streaming placeholder on total failure
if (streamingMsgIdRef.current) {
  const failedId = streamingMsgIdRef.current
  setMessages(prev => prev.filter(m => m.id !== failedId))
  streamingMsgIdRef.current = null
}
```

- [ ] **Step 2: Add ref cleanup to finally block**

In the finally block (line 449), add after `streamedTextRef.current = ''`:

```typescript
streamingMsgIdRef.current = null
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useChatSession.ts
git commit -m "fix(chat): clean up streaming placeholder on error/finally"
```

---

### Task 5: Remove separate streaming bubble from AicaChatFAB + fix scroll

**Files:**
- Modify: `src/components/features/AicaChatFAB/AicaChatFAB.tsx:180-182, 481-488, 508-519`
- Modify: `src/components/features/AicaChatFAB/AicaChatFAB.css`

- [ ] **Step 1: Fix auto-scroll dependency to prevent jank**

Replace line 182:

```tsx
// OLD:
}, [messages, isLoading])
```

With:

```tsx
}, [messages.length, isLoading, streamedText])
```

This ensures scroll happens when messages are added (`.length` changes) and during streaming (`streamedText` changes), but NOT when message content is replaced in-place (`.length` stays same).

- [ ] **Step 2: Update assistant message rendering for streaming**

In the messages.map() block, replace lines 481-488:

```tsx
// OLD:
{msg.role === 'assistant' ? (
  <div
    className="aica-fab-message__content"
    dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(msg.content) }}
  />
) : (
  <p>{msg.content}</p>
)}
```

With:

```tsx
{msg.role === 'assistant' ? (
  msg.isStreaming ? (
    streamedText ? (
      <div className="aica-fab-message__content">
        <span dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(streamedText) }} />
        <span className="typing-cursor" aria-hidden="true">▍</span>
      </div>
    ) : (
      <div className="aica-fab-thinking">
        <span className="aica-fab-thinking__label">Pensando...</span>
        <span className="typing-dots" aria-hidden="true">
          <span /><span /><span />
        </span>
      </div>
    )
  ) : (
    <div
      className="aica-fab-message__content"
      dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(msg.content) }}
    />
  )
) : (
  <p>{msg.content}</p>
)}
```

This handles 3 states:
- `isStreaming && streamedText` → show streaming content with blinking cursor
- `isStreaming && !streamedText` → show thinking indicator (reuses existing CSS)
- `!isStreaming` → normal message render (reads `msg.content`)

Key: streaming messages read from `streamedText` (hook state), NOT from `msg.content`. This avoids per-token array mutations.

- [ ] **Step 3: Remove the separate streaming bubble block**

Replace lines 508-519:

```tsx
// OLD:
{isLoading && (
  streamedText ? (
    <div className="aica-fab-message aica-fab-message--assistant">
      <div
        className="aica-fab-message__content"
        dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(streamedText) }}
      />
    </div>
  ) : (
    <AicaThinkingIndicator />
  )
)}
```

With:

```tsx
{/* Thinking indicator only when loading and no streaming placeholder exists yet */}
{isLoading && !messages.some(m => m.isStreaming) && (
  <AicaThinkingIndicator />
)}
```

- [ ] **Step 4: Add typing cursor CSS**

In `src/components/features/AicaChatFAB/AicaChatFAB.css`, add at the end:

```css
.typing-cursor {
  display: inline;
  animation: blink-cursor 0.8s step-end infinite;
  color: var(--ceramic-text-secondary, #a0937d);
  font-weight: 100;
  margin-left: 1px;
}

@keyframes blink-cursor {
  50% { opacity: 0; }
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/AicaChatFAB/AicaChatFAB.tsx src/components/features/AicaChatFAB/AicaChatFAB.css
git commit -m "fix(chat): unified message source — eliminate double-response bug

Replace dual render path (streamedText bubble + messages list) with single
messages[]-based rendering. Streaming placeholder in messages[] uses
streamedText for live content. Completion/fallback replaces in-place.

Fixes: scroll jank (dependency on messages.length not messages ref),
double-response (single message slot, never two appends)."
```

---

### Task 6: Verify & Deploy

- [ ] **Step 1: Full verification**

```bash
npm run build && npm run typecheck
```

Expected: Build succeeds. Typecheck shows only pre-existing errors (none in useChatSession.ts or AicaChatFAB.tsx).

- [ ] **Step 2: Deploy to staging**

```bash
gcloud builds submit --config=cloudbuild.yaml --region=southamerica-east1 --project=gen-lang-client-0948335762 \
  --substitutions=_SERVICE_NAME=aica-dev,_DEPLOY_REGION=us-central1,_VITE_FRONTEND_URL=https://dev.aica.guru
```

- [ ] **Step 3: Manual test on dev.aica.guru**

1. Open chat, send a message → verify single response appears (no double)
2. Check console → no "Streaming failed, falling back" during normal flow
3. DevTools → Network → Slow 3G → verify streaming works with cursor animation
4. DevTools → Network → toggle Offline mid-stream → verify partial content stays, no double response
5. Verify auto-scroll follows streaming content smoothly (no jank)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| `streamedText` still set per-token but not read by non-streaming messages | Only the `isStreaming` message reads `streamedText`. Non-streaming messages read `msg.content` — no wasted renders for them. `formatMarkdownToHTML` only runs once per non-streaming message per render. |
| `streamingMsgIdRef` null when catch block runs | Defensive check `if (streamingMsgIdRef.current)` before every ref access. |
| `AicaThinkingIndicator` never shows | Guard `isLoading && !messages.some(m => m.isStreaming)` ensures it shows during pre-streaming loading (billing check, session creation, context fetch). |
| DB save `.then()` can't find temp ID | Task 3 changes the streaming message ID to `tempAssistantId` before the DB save. The `.then()` closure captures `tempAssistantId`. |
| Scroll jank from per-token updates | Auto-scroll dependency changed to `[messages.length, isLoading, streamedText]`. `messages.length` only changes when messages are added/removed. `streamedText` handles scroll-follow during streaming. |
| `messages.some(m => m.isStreaming)` performance | Linear scan of <100 items on every render — negligible. |
