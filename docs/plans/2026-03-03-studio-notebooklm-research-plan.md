# Studio NotebookLM-Style Research UX — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite Studio ResearchStage with NotebookLM-inspired UX: gap-based suggestion cards, progressive dossier building, and Split View 60/40 chat.

**Architecture:** Full rewrite of ResearchStage.tsx (1191 lines) into 7 focused components (<300 lines each). 3 new Edge Functions with Grounding + File Search. New context actions and hooks for card management and chat context.

**Tech Stack:** React 18 + TypeScript, Framer Motion, Tailwind/Ceramic, Supabase Edge Functions, Gemini 2.5 Flash/Pro + Google Grounding + File Search API.

**Design Doc:** `docs/plans/2026-03-03-studio-notebooklm-research-design.md`

---

## Dependency Graph

```
Layer 1 (parallel):  Types | Edge Functions (gap-analysis, enrich-card, file-search)
Layer 2 (parallel):  Context updates | Service functions
Layer 3 (parallel):  useSuggestionCards | useResearchChat
Layer 4 (leaf→root): SuggestionCard → SuggestionCarousel → DossierInsertPreview → DossierEditor → ResearchToolbar → ResearchChatSheet → ResearchCanvas
Layer 5:             Wire ResearchCanvas into StageRenderer + rename "Ao Vivo"
```

---

## Task 1: Research Types & Interfaces

**Files:**
- Create: `src/modules/studio/types/research.ts`

**Step 1: Create research types file**

```typescript
// src/modules/studio/types/research.ts
import type { Dossier, WorkspaceCustomSource } from './podcast-workspace';

// === Suggestion Card Types ===

export type SuggestionCardType =
  | 'formacao'
  | 'carreira'
  | 'controversia'
  | 'publicacao'
  | 'rede_social'
  | 'opiniao'
  | 'atualidade'
  | 'custom';

export type SuggestionCardStatus = 'pending' | 'expanded' | 'inserted' | 'discarded';

export interface SuggestionCard {
  id: string;
  type: SuggestionCardType;
  title: string;
  previewText: string;
  fullText: string;
  targetSection: 'bio' | 'ficha' | 'noticias';
  relevanceScore: number; // 0-100
  sources?: Array<{ title: string; url: string }>;
  status: SuggestionCardStatus;
}

export interface GapAnalysisRequest {
  dossier: Dossier;
  guestName: string;
  theme: string;
  customSources?: WorkspaceCustomSource[];
}

export interface GapAnalysisResponse {
  success: boolean;
  data?: {
    suggestions: SuggestionCard[];
    analysisTimestamp: string;
  };
  error?: string;
}

// === Enrich Card Types ===

export interface EnrichCardRequest {
  cardType: SuggestionCardType;
  cardTitle: string;
  guestName: string;
  theme: string;
  existingDossier: string; // biography text
  fileSearchStoreId?: string;
}

export interface EnrichCardResponse {
  success: boolean;
  data?: {
    enrichedText: string;
    sources: Array<{ title: string; url: string }>;
  };
  error?: string;
}

// === File Search Types ===

export interface FileSearchRequest {
  sources: Array<{
    content: string;
    type: 'text' | 'url';
    label: string;
  }>;
}

export interface FileSearchResponse {
  success: boolean;
  data?: {
    storeId: string;
    indexedCount: number;
  };
  error?: string;
}

// === Research Chat Types ===

export interface ResearchChatContext {
  guestName: string;
  episodeTheme: string;
  dossierBiography: string;
  dossierControversies: string[];
  customSourcesSummary: string;
  approvedCards: string[];
  discardedCards: string[];
}

// === Card Icon/Color Config ===

export const CARD_TYPE_CONFIG: Record<SuggestionCardType, {
  icon: string; // Lucide icon name
  label: string;
  color: string; // Tailwind class
}> = {
  formacao: { icon: 'GraduationCap', label: 'Formacao Academica', color: 'text-blue-600' },
  carreira: { icon: 'Briefcase', label: 'Carreira', color: 'text-amber-600' },
  controversia: { icon: 'Zap', label: 'Controversia', color: 'text-red-500' },
  publicacao: { icon: 'BookOpen', label: 'Publicacao', color: 'text-purple-600' },
  rede_social: { icon: 'Globe', label: 'Presenca Digital', color: 'text-green-600' },
  opiniao: { icon: 'MessageCircle', label: 'Opiniao Publica', color: 'text-cyan-600' },
  atualidade: { icon: 'Newspaper', label: 'Noticias Recentes', color: 'text-orange-500' },
  custom: { icon: 'Search', label: 'Pesquisa Personalizada', color: 'text-ceramic-text-secondary' },
};
```

**Step 2: Export from barrel**

Add to `src/modules/studio/types/index.ts`:
```typescript
export * from './research';
```

**Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/modules/studio/types/research.ts src/modules/studio/types/index.ts
git commit -m "feat(studio): add research types for NotebookLM UX (#664)"
```

---

## Task 2: Edge Function — studio-gap-analysis

**Files:**
- Create: `supabase/functions/studio-gap-analysis/index.ts`
- Reference: `supabase/functions/studio-deep-research/index.ts` (pattern)
- Reference: `supabase/functions/_shared/cors.ts`

**Step 1: Create Edge Function**

```typescript
// supabase/functions/studio-gap-analysis/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@0.7.0';

const ALLOWED_ORIGINS = [
  'https://aica.guru',
  'https://dev.aica.guru',
  'http://localhost:5173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { dossier, guestName, theme, customSources } = await req.json();

    if (!dossier || !guestName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: dossier, guestName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build context from dossier
    const dossierSummary = [
      dossier.biography ? `Biografia: ${dossier.biography.substring(0, 1000)}` : 'Biografia: NAO DISPONIVEL',
      dossier.technicalSheet ? `Ficha Tecnica: ${JSON.stringify(dossier.technicalSheet).substring(0, 500)}` : 'Ficha Tecnica: NAO DISPONIVEL',
      dossier.controversies?.length ? `Controversias: ${dossier.controversies.join('; ')}` : 'Controversias: NENHUMA IDENTIFICADA',
      dossier.suggestedTopics?.length ? `Topicos: ${dossier.suggestedTopics.join(', ')}` : '',
      customSources?.length ? `Fontes do usuario: ${customSources.map((s: any) => s.label || s.content?.substring(0, 100)).join(', ')}` : '',
    ].filter(Boolean).join('\n\n');

    const systemPrompt = `Voce e um analista de pesquisa para podcasts. Analise o dossie abaixo sobre "${guestName}" (tema: "${theme || 'geral'}") e identifique LACUNAS — informacoes importantes que estao FALTANDO.

Para cada lacuna, gere um card de sugestao com:
- type: um de [formacao, carreira, controversia, publicacao, rede_social, opiniao, atualidade, custom]
- title: titulo curto (3-5 palavras)
- previewText: descricao da lacuna (1-2 frases)
- fullText: paragrafo completo que PREENCHERIA essa lacuna (3-5 frases, baseado em pesquisa)
- targetSection: onde inserir no dossie (bio, ficha, noticias)
- relevanceScore: 0-100 (quao importante e preencher essa lacuna)

Gere 5-8 cards, priorizando por relevancia. Use pesquisa do Google para complementar.

DOSSIE ATUAL:
${dossierSummary}

Responda APENAS com JSON valido no formato:
{
  "suggestions": [
    {
      "type": "formacao",
      "title": "Formacao Academica",
      "previewText": "O dossie nao menciona...",
      "fullText": "Paragrafo completo...",
      "targetSection": "bio",
      "relevanceScore": 85
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
      tools: [{ googleSearch: {} }],
    });

    const text = response.text || '';

    // Extract JSON from response
    let parsed;
    try {
      const jsonMatch = text.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '');
      const startIdx = jsonMatch.indexOf('{');
      const endIdx = jsonMatch.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) throw new Error('No JSON found');
      parsed = JSON.parse(jsonMatch.substring(startIdx, endIdx + 1));
    } catch (parseErr) {
      console.error('[studio-gap-analysis] JSON parse error:', parseErr, 'Raw:', text.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add IDs and validate
    const suggestions = (parsed.suggestions || []).map((s: any, i: number) => ({
      id: `gap_${Date.now()}_${i}`,
      type: s.type || 'custom',
      title: s.title || 'Sugestao',
      previewText: s.previewText || '',
      fullText: s.fullText || s.previewText || '',
      targetSection: s.targetSection || 'bio',
      relevanceScore: Math.min(100, Math.max(0, s.relevanceScore || 50)),
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
        title: c.web?.title || 'Fonte',
        url: c.web?.uri || '',
      })) || [],
      status: 'pending',
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          suggestions,
          analysisTimestamp: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[studio-gap-analysis] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/studio-gap-analysis/index.ts
git commit -m "feat(studio): add studio-gap-analysis Edge Function with Grounding (#664)"
```

---

## Task 3: Edge Function — studio-enrich-card

**Files:**
- Create: `supabase/functions/studio-enrich-card/index.ts`

**Step 1: Create Edge Function**

Same CORS pattern as Task 2. Takes `{ cardType, cardTitle, guestName, theme, existingDossier, fileSearchStoreId? }`. Uses Gemini 2.5 Flash + Grounding to generate a detailed paragraph for the specific gap. Returns `{ enrichedText, sources[] }`.

Key differences from gap-analysis:
- Focused on ONE card type (not scanning all gaps)
- Generates longer, more detailed text (5-8 sentences)
- Optionally uses File Search if `fileSearchStoreId` provided
- System prompt asks to write a SPECIFIC section, not analyze gaps

**Step 2: Commit**

```bash
git add supabase/functions/studio-enrich-card/index.ts
git commit -m "feat(studio): add studio-enrich-card Edge Function (#664)"
```

---

## Task 4: Edge Function — studio-file-search

**Files:**
- Create: `supabase/functions/studio-file-search/index.ts`

**Step 1: Create Edge Function**

Takes custom sources (text/URL content), creates a File Search store, indexes the content. Returns `{ storeId, indexedCount }`. Uses Gemini File Search API with `max_tokens_per_chunk: 400` (optimized for Portuguese per ai-integration.md).

**Step 2: Commit**

```bash
git add supabase/functions/studio-file-search/index.ts
git commit -m "feat(studio): add studio-file-search Edge Function for RAG (#664)"
```

---

## Task 5: Context Updates — PodcastWorkspaceContext

**Files:**
- Modify: `src/modules/studio/context/PodcastWorkspaceContext.tsx`

**Step 1: Add suggestion card state to ResearchState**

Add to the `ResearchState` interface:
```typescript
interface ResearchState {
  // ... existing fields ...
  suggestionCards: SuggestionCard[];
  isAnalyzingGaps: boolean;
  fileSearchStoreId: string | null;
  chatOpen: boolean;
}
```

**Step 2: Add new reducer actions**

```typescript
// New actions:
'SET_SUGGESTION_CARDS'      // payload: SuggestionCard[]
'UPDATE_CARD_STATUS'        // payload: { cardId: string, status: SuggestionCardStatus }
'START_GAP_ANALYSIS'        // no payload
'FINISH_GAP_ANALYSIS'       // payload: SuggestionCard[]
'SET_FILE_SEARCH_STORE'     // payload: storeId (string)
'TOGGLE_CHAT'               // no payload
'INSERT_CARD_TO_DOSSIER'    // payload: { cardId: string, editedText?: string }
```

**Step 3: Add INSERT_CARD_TO_DOSSIER reducer logic**

This is the key action — when a card is inserted:
1. Find the card by ID
2. Get the text (editedText or card.fullText)
3. Append to the correct dossier section based on `card.targetSection`
4. Mark card as 'inserted'
5. Mark state as dirty (triggers auto-save)

**Step 4: Add action methods**

```typescript
// New workspace action methods:
analyzeGaps: async () => { /* calls studio-gap-analysis Edge Function */ }
enrichCard: async (cardId: string) => { /* calls studio-enrich-card */ }
indexCustomSources: async () => { /* calls studio-file-search */ }
insertCardToDossier: (cardId: string, editedText?: string) => { /* dispatch INSERT_CARD_TO_DOSSIER */ }
discardCard: (cardId: string) => { /* dispatch UPDATE_CARD_STATUS with 'discarded' */ }
toggleChat: () => { /* dispatch TOGGLE_CHAT */ }
```

**Step 5: Initialize new state defaults**

In initial state:
```typescript
research: {
  // ... existing ...
  suggestionCards: [],
  isAnalyzingGaps: false,
  fileSearchStoreId: null,
  chatOpen: false,
}
```

**Step 6: Verify build**

Run: `npm run build 2>&1 | tail -5`

**Step 7: Commit**

```bash
git add src/modules/studio/context/PodcastWorkspaceContext.tsx
git commit -m "feat(studio): add suggestion cards and chat toggle to workspace context (#664)"
```

---

## Task 6: Service Functions — podcastAIService

**Files:**
- Modify: `src/modules/studio/services/podcastAIService.ts`

**Step 1: Add gap analysis service function**

```typescript
export async function analyzeGaps(
  dossier: Dossier,
  guestName: string,
  theme: string,
  customSources?: WorkspaceCustomSource[]
): Promise<GapAnalysisResponse> {
  const { session } = await getCachedSession();
  const { data, error } = await supabase.functions.invoke('studio-gap-analysis', {
    body: { dossier, guestName, theme, customSources },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw new Error(error.message);
  return data;
}
```

**Step 2: Add enrich card service function**

```typescript
export async function enrichCard(request: EnrichCardRequest): Promise<EnrichCardResponse> {
  // Similar pattern — calls studio-enrich-card Edge Function
}
```

**Step 3: Add file search service function**

```typescript
export async function indexSources(request: FileSearchRequest): Promise<FileSearchResponse> {
  // Similar pattern — calls studio-file-search Edge Function
}
```

**Step 4: Verify build + Commit**

```bash
git add src/modules/studio/services/podcastAIService.ts
git commit -m "feat(studio): add gap analysis and enrichment service functions (#664)"
```

---

## Task 7: Hook — useSuggestionCards

**Files:**
- Create: `src/modules/studio/hooks/useSuggestionCards.ts`

**Step 1: Create hook**

Manages card lifecycle: loading, expanding, inserting, discarding. Uses workspace context actions. Provides:
```typescript
export function useSuggestionCards() {
  const { state, actions } = usePodcastWorkspace();
  const { research } = state;

  // Auto-trigger gap analysis when dossier is first generated
  useEffect(() => {
    if (research.dossier && !research.suggestionCards.length && !research.isAnalyzingGaps) {
      actions.analyzeGaps();
    }
  }, [research.dossier]);

  return {
    cards: research.suggestionCards.filter(c => c.status !== 'discarded'),
    isLoading: research.isAnalyzingGaps,
    insertCard: actions.insertCardToDossier,
    discardCard: actions.discardCard,
    refreshCards: actions.analyzeGaps,
    insertedCount: research.suggestionCards.filter(c => c.status === 'inserted').length,
    totalCount: research.suggestionCards.length,
  };
}
```

**Step 2: Commit**

```bash
git add src/modules/studio/hooks/useSuggestionCards.ts
git commit -m "feat(studio): add useSuggestionCards hook (#664)"
```

---

## Task 8: Hook — useResearchChat

**Files:**
- Create: `src/modules/studio/hooks/useResearchChat.ts`

**Step 1: Create hook**

Wraps `useGeminiLive()` with enriched context from dossier + suggestion cards. Builds `ResearchChatContext` from workspace state. Detects when AI suggests a card and emits `ChatSuggestionBubble` data.

```typescript
export function useResearchChat() {
  const { state } = usePodcastWorkspace();
  const { setup, research } = state;

  // Build enriched context for chat
  const chatContext = useMemo<GeminiLiveContext>(() => ({
    guest_name: setup.guestName,
    guest_bio: research.dossier?.biography?.substring(0, 2000),
    episode_theme: setup.episodeTheme,
    dossier_summary: buildDossierSummary(research),
  }), [setup, research.dossier, research.suggestionCards]);

  const gemini = useGeminiLive({ autoConnect: false });

  // Update context when it changes
  useEffect(() => {
    gemini.setContext(chatContext);
  }, [chatContext]);

  return {
    ...gemini,
    chatContext,
    isOpen: research.chatOpen,
  };
}
```

**Step 2: Commit**

```bash
git add src/modules/studio/hooks/useResearchChat.ts
git commit -m "feat(studio): add useResearchChat hook with enriched context (#664)"
```

---

## Task 9: Component — SuggestionCard

**Files:**
- Create: `src/modules/studio/components/research/SuggestionCard.tsx`

**Step 1: Create component**

Three states: collapsed (carousel item), expanded (preview), inserted (checkmark).

- **Collapsed**: icon + title + relevance bar. `bg-ceramic-base rounded-xl shadow-ceramic-emboss` with hover `border-2 border-amber-400`.
- **Expanded**: AnimatePresence overlay/dropdown with fullText preview + targetSection badge + [Inserir] [Editar] [Descartar] buttons.
- **Inserted**: green bg, checkmark, non-interactive.

Props:
```typescript
interface SuggestionCardProps {
  card: SuggestionCard;
  isExpanded: boolean;
  onExpand: (cardId: string) => void;
  onInsert: (cardId: string, editedText?: string) => void;
  onDiscard: (cardId: string) => void;
}
```

Use Lucide icons dynamically based on `CARD_TYPE_CONFIG[card.type].icon`.

**Step 2: Commit**

```bash
git add src/modules/studio/components/research/SuggestionCard.tsx
git commit -m "feat(studio): add SuggestionCard component with 3 states (#664)"
```

---

## Task 10: Component — SuggestionCarousel

**Files:**
- Create: `src/modules/studio/components/research/SuggestionCarousel.tsx`

**Step 1: Create component**

Horizontal scroll container of SuggestionCards. Features:
- Scroll with left/right arrows (ChevronLeft/ChevronRight)
- Progress indicator: "X/Y inseridos"
- Loading skeleton when `isLoading`
- "Analisar lacunas" button when no cards
- Framer Motion `layoutId` for smooth card transitions
- `overflow-x-auto scrollbar-hide` for horizontal scroll
- Gap `gap-4` between cards, `p-4` padding

Props:
```typescript
interface SuggestionCarouselProps {
  cards: SuggestionCard[];
  isLoading: boolean;
  onInsert: (cardId: string, editedText?: string) => void;
  onDiscard: (cardId: string) => void;
  onRefresh: () => void;
}
```

**Step 2: Commit**

```bash
git add src/modules/studio/components/research/SuggestionCarousel.tsx
git commit -m "feat(studio): add SuggestionCarousel with horizontal scroll (#664)"
```

---

## Task 11: Component — DossierInsertPreview

**Files:**
- Create: `src/modules/studio/components/research/DossierInsertPreview.tsx`

**Step 1: Create component**

Inline preview shown in the DossierEditor when user is about to insert card text. Styled as `bg-ceramic-info/10 border-l-4 border-ceramic-info rounded-r-lg p-4`. Features:
- Text preview (italic, typing animation optional)
- Target section badge
- Source links (if card has sources)
- Three actions: Inserir (green), Editar (amber, opens inline textarea), Descartar (gray)
- AnimatePresence for smooth show/hide
- When editing: inline `<textarea>` replaces preview text

Props:
```typescript
interface DossierInsertPreviewProps {
  card: SuggestionCard;
  onConfirmInsert: (cardId: string, editedText?: string) => void;
  onDiscard: (cardId: string) => void;
  onCancel: () => void;
}
```

**Step 2: Commit**

```bash
git add src/modules/studio/components/research/DossierInsertPreview.tsx
git commit -m "feat(studio): add DossierInsertPreview with edit + confirm (#664)"
```

---

## Task 12: Component — DossierEditor

**Files:**
- Create: `src/modules/studio/components/research/DossierEditor.tsx`

**Step 1: Create component**

Extracts the tabbed dossier display from old ResearchStage. Tabs: Bio | Ficha Tecnica | Noticias. Shows `DossierInsertPreview` inline when a card is being previewed. Shows sources list at bottom.

Key logic extracted from ResearchStage.tsx lines 600-900:
- Tab state management (`activeTab`)
- Biography display (`whitespace-pre-wrap`)
- Technical sheet structured display (education, career, key facts)
- Controversies + ice breakers cards
- Deep research sources banner
- Empty state when no dossier
- Loading state (`DossierGeneratingState` — reuse from existing)

NEW: When `pendingInsertCard` is set, show `DossierInsertPreview` at the bottom of the active tab section, visually indicating where text will be appended.

Props:
```typescript
interface DossierEditorProps {
  dossier: Dossier | null;
  deepResearch: DeepResearchResult | null;
  isGenerating: boolean;
  guestName: string;
  customSources: WorkspaceCustomSource[];
  pendingInsertCard: SuggestionCard | null;
  onConfirmInsert: (cardId: string, editedText?: string) => void;
  onDiscardInsert: (cardId: string) => void;
  onCancelInsert: () => void;
  onRemoveSource: (sourceId: string) => void;
}
```

**Step 2: Commit**

```bash
git add src/modules/studio/components/research/DossierEditor.tsx
git commit -m "feat(studio): add DossierEditor with tabbed display + insert preview (#664)"
```

---

## Task 13: Component — ResearchToolbar

**Files:**
- Create: `src/modules/studio/components/research/ResearchToolbar.tsx`

**Step 1: Create component**

Top bar with action buttons. Extracted from ResearchStage sidebar buttons.

Layout: `flex items-center gap-3 p-4 border-b border-ceramic-border`

Buttons:
- "Gerar Dossier" (amber, primary) OR "Regenerar" (outline) — based on dossier existence
- "Aprofundar Pesquisa" (indigo, outline) — only if dossier exists
- "+ Fonte" (gray, outline) — opens source modal
- "Converse com Aica" (right-aligned, toggle) — active state when chat is open

Props:
```typescript
interface ResearchToolbarProps {
  hasDossier: boolean;
  isGenerating: boolean;
  isChatOpen: boolean;
  onGenerateDossier: () => void;
  onDeepResearch: () => void;
  onAddSource: () => void;
  onToggleChat: () => void;
}
```

**Step 2: Commit**

```bash
git add src/modules/studio/components/research/ResearchToolbar.tsx
git commit -m "feat(studio): add ResearchToolbar with action buttons (#664)"
```

---

## Task 14: Component — ResearchChatSheet

**Files:**
- Create: `src/modules/studio/components/research/ResearchChatSheet.tsx`

**Step 1: Create component**

Split View 40% right panel for "Converse com Aica". Extracts chat logic from ResearchStage.tsx lines 700-1080.

Features:
- Header: "Converse com Aica" + close button
- Message history (scrollable, role-based styling)
- Streaming response display
- Text input + voice input toggle
- Audio mode (Ao Vivo) with waveform + controls
- ChatSuggestionBubble: when AI response contains a deepening suggestion, render as a clickable card-like bubble
- AnimatePresence for slide-in from right
- `w-[40%]` width, `border-l border-ceramic-border`

Props:
```typescript
interface ResearchChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSuggestion: (text: string, targetSection: string) => void;
  geminiLive: UseGeminiLiveReturn;
  geminiLiveAudio: any; // useGeminiLiveAudio return
  guestName: string;
  episodeTheme: string;
}
```

**Step 2: Commit**

```bash
git add src/modules/studio/components/research/ResearchChatSheet.tsx
git commit -m "feat(studio): add ResearchChatSheet with Split View 40% (#664)"
```

---

## Task 15: Component — ResearchCanvas (main wrapper)

**Files:**
- Create: `src/modules/studio/components/research/ResearchCanvas.tsx`

**Step 1: Create component**

Main orchestrator. Replaces ResearchStage. Manages:
- Which card is expanded/pending insert
- Split View transition (normal ↔ chat)
- Source modal (reuse from old ResearchStage)
- Coordinates all child components

```typescript
export function ResearchCanvas() {
  const { state, actions } = usePodcastWorkspace();
  const { cards, isLoading, insertCard, discardCard, refreshCards } = useSuggestionCards();
  const researchChat = useResearchChat();

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [pendingInsertCard, setPendingInsertCard] = useState<SuggestionCard | null>(null);
  const [showSourcesModal, setShowSourcesModal] = useState(false);

  // Layout: flex-col, toolbar on top, then conditional split
  return (
    <div className="flex flex-col h-full">
      <ResearchToolbar ... />

      <div className={`flex flex-1 overflow-hidden transition-all duration-300 ${
        state.research.chatOpen ? '' : 'flex-col'
      }`}>
        <div className={state.research.chatOpen ? 'w-[60%]' : 'w-full'}>
          {!state.research.chatOpen && (
            <SuggestionCarousel ... />
          )}
          <DossierEditor ... />
        </div>

        <AnimatePresence>
          {state.research.chatOpen && (
            <ResearchChatSheet ... />
          )}
        </AnimatePresence>
      </div>

      {/* Source modal (reused) */}
      {showSourcesModal && <SourcesModal ... />}
    </div>
  );
}
```

**Step 2: Create barrel export**

```typescript
// src/modules/studio/components/research/index.ts
export { ResearchCanvas } from './ResearchCanvas';
```

**Step 3: Commit**

```bash
git add src/modules/studio/components/research/
git commit -m "feat(studio): add ResearchCanvas orchestrator component (#664)"
```

---

## Task 16: Wire ResearchCanvas into Stage Renderer

**Files:**
- Modify: `src/modules/studio/components/workspace/ResearchStage.tsx`

**Step 1: Replace ResearchStage with ResearchCanvas**

Rename old file to `ResearchStage.legacy.tsx` (kept during development for reference).

Create new `ResearchStage.tsx` that simply re-exports `ResearchCanvas`:

```typescript
// src/modules/studio/components/workspace/ResearchStage.tsx
export { ResearchCanvas as default } from '../research/ResearchCanvas';
```

This preserves the lazy-load import in StageRenderer without changing any other files.

**Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/modules/studio/components/workspace/ResearchStage.tsx src/modules/studio/components/workspace/ResearchStage.legacy.tsx
git commit -m "feat(studio): wire ResearchCanvas as new ResearchStage (#664)"
```

---

## Task 17: Rename "Ao Vivo" → "Converse com Aica"

**Files:**
- Search and replace across Studio module

**Step 1: Find all occurrences**

Search for "Ao Vivo", "ao vivo", "AO_VIVO" in `src/modules/studio/`.

**Step 2: Replace labels**

- UI text: "Ao Vivo" → "Converse com Aica"
- aria-labels: update accordingly
- Variable names: `chatMode: 'audio'` stays (internal), only UI labels change

**Step 3: Commit**

```bash
git commit -m "fix(studio): rename 'Ao Vivo' to 'Converse com Aica' (#664)"
```

---

## Task 18: Integration Verification

**Step 1: Full build**

```bash
npm run build 2>&1 | tail -10
```

**Step 2: TypeScript check**

```bash
npm run typecheck 2>&1 | grep -E "^src/modules/studio" | head -20
```
Expected: No new errors in studio module

**Step 3: Manual test checklist**

- [ ] Studio workspace loads without errors
- [ ] "Gerar Dossier" works (existing flow preserved)
- [ ] After dossier generated, suggestion cards appear in carousel
- [ ] Hovering/clicking a card expands it with preview
- [ ] "Inserir" adds text to correct dossier section
- [ ] "Descartar" removes card from carousel
- [ ] "Converse com Aica" opens Split View chat
- [ ] Chat has context of dossier + cards
- [ ] Closing chat returns to full-width layout
- [ ] Auto-save persists all changes
- [ ] Mobile layout works (stacked, not split)

**Step 4: Final commit + push**

```bash
git add -A
git commit -m "feat(studio): complete NotebookLM research UX rewrite (#664, #667)"
git push origin feature/fix-batch-studio-journey-660-667
```

---

## Agent Team Composition (Recommended)

For parallel execution:

| Agent | Tasks | Type |
|-------|-------|------|
| **Lead** | Coordinate + Tasks 5, 15, 16, 18 | Coordinator |
| **Backend** | Tasks 2, 3, 4 (Edge Functions) | general-purpose |
| **Journey/Hooks** | Tasks 1, 6, 7, 8 (Types + Services + Hooks) | general-purpose |
| **Frontend** | Tasks 9, 10, 11, 12, 13, 14, 17 (Components) | general-purpose |

**Dependency Order:**
- Tasks 1-4: Layer 1 (parallel)
- Tasks 5-6: Layer 2 (after Task 1)
- Tasks 7-8: Layer 3 (after Tasks 5-6)
- Tasks 9-14: Layer 4 (after Tasks 7-8, but leaf components can start with types only)
- Tasks 15-18: Layer 5 (after all above)
