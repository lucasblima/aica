# Telegram Golden Path — Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the audio→action pipeline so voice messages create tasks/events/expenses, add missing `create_event` tool, and update WaitingRoom text.

**Architecture:** Unify voice transcription + NLP into a single Gemini multimodal call (currently 2 separate calls that lose function calling context). Fix base64 encoding for large audio files. Add `create_event` function declaration. Change WaitingRoom UI text.

**Tech Stack:** Deno Edge Functions, Gemini 2.5 Flash (multimodal + function calling), React/TypeScript frontend

**Spec:** `docs/superpowers/specs/2026-03-20-telegram-golden-path-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `supabase/functions/_shared/telegram-ai-router.ts` | Modify | Unify audio pipeline, add create_event tool |
| `supabase/functions/telegram-webhook/index.ts` | Modify | Handle create_event action result + keyboard |
| `src/pages/WaitingRoomPage.tsx` | Modify | "Lista de espera" text change |

---

## Task 1: Add `create_event` Function Declaration

The `create_event` tool is missing from `FUNCTION_DECLARATIONS` (lines 67-276 of `telegram-ai-router.ts`). This is why events cannot be created via Telegram — the model has no tool to call.

**Files:**
- Modify: `supabase/functions/_shared/telegram-ai-router.ts:215` (after `estimate_expense`)
- Modify: `supabase/functions/_shared/telegram-ai-router.ts` (in `executeFunctionCall`)
- Modify: `supabase/functions/telegram-webhook/index.ts:1274` (keyboard routing)

- [ ] **Step 1: Add create_event function declaration**

In `supabase/functions/_shared/telegram-ai-router.ts`, after the `estimate_expense` declaration (around line 215), add:

```typescript
{
  name: 'create_event',
  description: 'Agendar um evento ou compromisso no calendario do usuario. Use quando o usuario mencionar reunioes, consultas, encontros, compromissos com data/hora.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Titulo do evento (ex: "Reuniao com Fernando")',
      },
      date: {
        type: 'string',
        description: 'Data do evento no formato YYYY-MM-DD. Se o usuario disser "amanha", calcule a data.',
      },
      time: {
        type: 'string',
        description: 'Horario no formato HH:MM (24h). Se nao especificado, use "09:00".',
      },
      duration_minutes: {
        type: 'number',
        description: 'Duracao em minutos. Default: 60.',
      },
      description: {
        type: 'string',
        description: 'Descricao ou notas adicionais do evento.',
      },
    },
    required: ['title', 'date'],
  },
},
```

- [ ] **Step 2: Add create_event handler in executeFunctionCall**

Find `executeFunctionCall` in the same file. Add a case for `create_event`:

```typescript
case 'create_event': {
  const { title, date, time, duration_minutes, description } = args
  const startTime = time || '09:00'
  const duration = duration_minutes || 60

  // Build ISO datetime
  const startDateTime = `${date}T${startTime}:00`
  const endDate = new Date(startDateTime)
  endDate.setMinutes(endDate.getMinutes() + duration)
  const endDateTime = endDate.toISOString()

  const { error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      title,
      description: description || null,
      start_time: startDateTime,
      end_time: endDateTime,
      source: 'telegram',
      event_type: 'event',
    })

  if (error) {
    return { success: false, action: 'create_event', message: `Erro ao criar evento: ${error.message}` }
  }

  return {
    success: true,
    action: 'create_event',
    message: `📅 Evento "${title}" agendado para ${date} às ${startTime}`,
  }
}
```

- [ ] **Step 3: Add create_event keyboard in webhook**

In `supabase/functions/telegram-webhook/index.ts`, around line 1274, in the voice result handling, the current code routes keyboards for `create_task` and `log_expense`. Add `create_event` (no special keyboard needed — just ensure it's handled):

```typescript
// After the existing create_task and log_expense keyboard handling:
// create_event doesn't need a follow-up keyboard — the event is already created
```

Also check the text message handler (around line 1205) to ensure `create_event` action results are handled the same way.

- [ ] **Step 4: Verify by testing with text message first**

Deploy the Edge Function locally:
```bash
npx supabase functions serve telegram-webhook
```

Send a test via curl or Telegram: "agendar reuniao com Fernando amanha as 14h"
Expected: Gemini calls `create_event` → row inserted in `calendar_events` → bot replies with confirmation.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/telegram-ai-router.ts supabase/functions/telegram-webhook/index.ts
git commit -m "feat(telegram): add create_event function calling tool for calendar events"
```

---

## Task 2: Fix Audio Base64 Encoding

The current `btoa(String.fromCharCode(...audioBytes))` crashes on voice messages >100KB due to JavaScript call stack limits.

**Files:**
- Modify: `supabase/functions/_shared/telegram-ai-router.ts:1577-1580`

- [ ] **Step 1: Find the current encoding**

In `telegram-ai-router.ts`, line 1580:
```typescript
// CURRENT (broken for large files):
const base64Audio = btoa(String.fromCharCode(...audioBytes))
```

- [ ] **Step 2: Replace with Deno std encode**

Add import at the top of the file:
```typescript
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"
```

Replace line 1580:
```typescript
// FIXED: handles large audio files without stack overflow
const base64Audio = base64Encode(audioBytes)
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/telegram-ai-router.ts
git commit -m "fix(telegram): use Deno std base64 encode for large voice messages"
```

---

## Task 3: Unify Voice Transcription + NLP into Single Gemini Call

This is the core fix. Currently `processVoiceMessage` makes 2 Gemini calls:
1. Transcription call (audio → text, NO function calling tools)
2. NLP call via `processNaturalLanguage` (text → function calling)

The problem: the transcription produces clean text, but context and nuance from the audio may be lost. More importantly, 2 calls = 2x cost and latency. The fix: one multimodal call with audio input AND function calling tools.

**Files:**
- Modify: `supabase/functions/_shared/telegram-ai-router.ts:1552-1636` (processVoiceMessage)

- [ ] **Step 1: Understand the current two-call flow**

Read `processVoiceMessage` (line 1552) and note:
- Lines 1585-1612: First Gemini call — transcription only, no tools
- Line 1629: `processNaturalLanguage()` — second Gemini call with tools

The system prompt for transcription (line 1608) says: "Transcreva este audio em portugues (BR). Retorne APENAS o texto transcrito..."

This prompt explicitly tells Gemini to ONLY transcribe — no function calling possible.

- [ ] **Step 2: Rewrite processVoiceMessage to use single unified call**

Replace the body of `processVoiceMessage` (lines ~1559-1636) with:

```typescript
export async function processVoiceMessage(
  supabase: any,
  userId: string,
  chatId: number,
  voiceFileId: string,
  userName: string,
): Promise<{ reply: string; action?: string; data?: any }> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const apiKey = Deno.env.get('GEMINI_API_KEY')

  if (!botToken || !apiKey) {
    return { reply: 'Erro de configuracao interna. Tente novamente mais tarde.' }
  }

  try {
    // 1. Download voice file from Telegram
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${voiceFileId}`)
    const fileInfo = await fileInfoRes.json()

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      return { reply: 'Nao consegui acessar o audio. Tente enviar novamente.' }
    }

    const audioRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`)
    const audioBuffer = await audioRes.arrayBuffer()
    const audioBytes = new Uint8Array(audioBuffer)

    // 2. Base64 encode (Deno std — handles large files)
    const base64Audio = base64Encode(audioBytes)

    // 3. Build conversation context (same as processNaturalLanguage)
    const { data: convData } = await supabase
      .from('telegram_conversations')
      .select('context')
      .eq('user_id', userId)
      .eq('telegram_chat_id', chatId)
      .single()

    const contextMessages = (convData?.context || []).slice(-6)

    // 4. Single Gemini call: transcription + function calling
    const systemPrompt = `Voce e a AICA, assistente de vida pessoal. O usuario enviou um AUDIO.
Primeiro, entenda o que o usuario disse no audio.
Depois, decida: se ele quer realizar uma ACAO (criar tarefa, registrar gasto, agendar evento, registrar humor), use a funcao apropriada.
Se nao houver acao clara, responda de forma conversacional e empática em portugues do Brasil.
Responda SEMPRE em portugues do Brasil.
Seja concisa e direta. Use emojis com moderacao.
Nome do usuario: ${userName}`

    const contents = [
      // Conversation history
      ...contextMessages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })),
      // Current message: audio
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'audio/ogg',
              data: base64Audio,
            },
          },
        ],
      },
    ]

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
      },
    )

    const geminiData = await geminiRes.json()
    const candidate = geminiData.candidates?.[0]
    const parts = candidate?.content?.parts || []

    // 5. Check for function call
    const functionCallPart = parts.find((p: any) => p.functionCall)

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall
      const result = await executeFunctionCall(supabase, userId, name, args)

      // Update conversation context
      await updateConversationContext(supabase, userId, chatId, '[audio]', result.message)

      return {
        reply: `🎙️ ${result.message}`,
        action: result.action,
        data: result,
      }
    }

    // 6. No function call — return text response
    const textPart = parts.find((p: any) => p.text)
    const replyText = textPart?.text || 'Desculpe, nao entendi o audio. Pode repetir?'

    // Update conversation context
    await updateConversationContext(supabase, userId, chatId, '[audio]', replyText)

    return { reply: `🎙️ ${replyText}` }
  } catch (error) {
    console.error('[processVoiceMessage] Error:', error)
    return { reply: 'Erro ao processar audio. Tente novamente.' }
  }
}
```

- [ ] **Step 3: Verify updateConversationContext exists**

Check if `updateConversationContext` is already a function in the file. If not, extract it from `processNaturalLanguage` where it updates the `telegram_conversations.context` array. It should:

```typescript
async function updateConversationContext(
  supabase: any,
  userId: string,
  chatId: number,
  userMessage: string,
  botReply: string,
) {
  const { data } = await supabase
    .from('telegram_conversations')
    .select('context')
    .eq('user_id', userId)
    .eq('telegram_chat_id', chatId)
    .single()

  const context = data?.context || []
  context.push(
    { role: 'user', text: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant', text: botReply, timestamp: new Date().toISOString() },
  )

  // Keep last 10 messages (sliding window)
  const trimmed = context.slice(-10)

  await supabase
    .from('telegram_conversations')
    .upsert({
      user_id: userId,
      telegram_chat_id: chatId,
      context: trimmed,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,telegram_chat_id' })
}
```

- [ ] **Step 4: Test voice message locally**

```bash
npx supabase functions serve telegram-webhook
```

Send a voice message to the bot saying "criar tarefa comprar leite".
Expected: Bot replies with "🎙️ ✅ Tarefa 'Comprar leite' criada" (single Gemini call, no separate transcription).

Send a voice message saying "agendar reuniao com Fernando amanha as 14h".
Expected: Bot replies with "🎙️ 📅 Evento 'Reuniao com Fernando' agendado para [date] as 14:00".

Send a voice message with an emotional statement.
Expected: Bot replies with empathetic response + registers moment (no function call).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/telegram-ai-router.ts
git commit -m "feat(telegram): unify voice transcription + NLP into single Gemini call

Merges the 2-step pipeline (transcribe → NLP) into 1 multimodal call
with function calling tools. Voice messages can now create tasks,
events, expenses, and moods directly from audio."
```

---

## Task 4: Update WaitingRoom Text

Simple UI text change.

**Files:**
- Modify: `src/pages/WaitingRoomPage.tsx:321`

- [ ] **Step 1: Change button text**

In `src/pages/WaitingRoomPage.tsx`, line 321, change:
```
Pedir convite a um amigo
```
to:
```
Entrar na lista de espera
```

- [ ] **Step 2: Update the share handler**

The `handleAskInvite()` function (lines 69-88) currently uses `navigator.share()` with text "Me convida pro AICA!". This should change to a simpler action — add user to waitlist (or for now, just change the share text).

Change the share text to:
```typescript
const shareText = 'Conhece a AICA? Um assistente de vida pessoal incrível. aica.guru'
```

And rename the function to `handleWaitlist` for clarity. Update the button's onClick to match.

- [ ] **Step 3: Build and verify**

```bash
npm run build && npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/WaitingRoomPage.tsx
git commit -m "fix(auth): change 'Pedir convite a um amigo' to 'Entrar na lista de espera'"
```

---

## Verification Checklist

After all tasks complete:

- [ ] `npm run build && npm run typecheck` — 0 errors
- [ ] Voice message "criar tarefa X" → task created in Atlas
- [ ] Voice message "agendar reuniao Y amanha" → event created in calendar_events
- [ ] Voice message "gastei 50 reais no mercado" → expense logged in Finance
- [ ] Voice message emotional/casual → empathetic response, moment registered
- [ ] Text message "criar tarefa X" → still works (no regression)
- [ ] WaitingRoomPage shows "Entrar na lista de espera" instead of "Pedir convite a um amigo"
- [ ] Large audio files (>100KB) don't crash the base64 encoding

---

## Notes for Phase 2

Phase 2 (Golden Path state machine) depends on this phase. Key prerequisites delivered here:
- Audio → function calling works reliably
- `create_event` tool available for the "Assistente Pratico" onboarding mode
- Base64 encoding handles real-world audio sizes

Phase 2 plan will be written after Phase 1 is verified in production.
