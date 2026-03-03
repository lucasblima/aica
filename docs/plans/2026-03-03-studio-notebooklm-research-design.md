# Studio NotebookLM-Style Research UX — Design Document

**Date**: 2026-03-03
**Issues**: #664, #667
**Session**: feat-studio-notebooklm-research
**Status**: Approved

## Summary

Redesign the Studio ResearchStage with a NotebookLM-inspired UX: base dossier generated automatically, then AI analyzes gaps and presents suggestion cards in a carousel. Users hover/expand cards to preview content, then insert approved text progressively into the dossier. Chat "Converse com Aica" available as a Split View 60/40 companion with full research context.

## Approach

**Full Rewrite** of ResearchStage.tsx (1190 lines) into focused components (<300 lines each).

## Component Architecture

```
ResearchCanvas (wrapper principal ~150 lines)
├── SuggestionCarousel (~200 lines)
│   ├── SuggestionCard (card individual com hover/expand)
│   └── SuggestionCardSkeleton (loading state)
├── DossierEditor (~250 lines)
│   ├── DossierSection (bio, ficha, noticias — tabbed)
│   ├── DossierInsertPreview (preview before inserting)
│   └── SourcesList (custom sources)
├── ResearchChatSheet (~300 lines)
│   ├── ChatMessages (history with context)
│   ├── ChatInput (text + voice)
│   └── ChatSuggestionBubble (when chat suggests a card)
└── ResearchToolbar (~100 lines)
    ├── GenerateDossierButton
    ├── DeepResearchButton
    └── AddSourceButton
```

## Layout

### Normal Mode (default)
- ResearchToolbar: top bar with actions
- SuggestionCarousel: horizontal scroll below toolbar (~25% height)
- DossierEditor: main content area (~75% height) with tabs (Bio, Ficha, Noticias)
- Sources list at bottom of DossierEditor

### Chat Active Mode (Split View)
- ResearchToolbar: top bar (chat button shows active state)
- Left 60%: DossierEditor (carousel collapses)
- Right 40%: ResearchChatSheet with full context
- Animated transition between modes

## SuggestionCard UX

### Card States

**COLLAPSED** (default in carousel):
- Icon + short title
- Relevance score bar
- Compact size for horizontal scroll

**EXPANDED** (hover/click):
- Full preview text that would be inserted
- Target section (Bio, Ficha, Noticias)
- Actions: [Insert] [Edit] [Discard]

**INSERTED** (already added to dossier):
- Green checkmark
- "Inserted" label
- Non-interactive

### Card Types (gap-based)

| Type | Icon | Trigger |
|------|------|---------|
| Formacao | graduation cap | No academic info |
| Carreira | briefcase | Incomplete career |
| Controversia | lightning | Few controversies |
| Publicacao | books | No publications |
| Rede Social | globe | No digital presence |
| Opiniao | speech | No public positions |
| Atualidade | newspaper | No recent news |
| Custom | search | Based on user sources |

## Data Flow

### Gap Analysis
1. Dossier generated → saved in context
2. ResearchCanvas calls `studio-gap-analysis` Edge Function
3. Edge Function: Gemini + Google Grounding analyzes gaps
4. Returns SuggestionCard[] (5-8 cards)
5. Frontend renders in carousel

### Card → Dossier Insert
1. User hover/clicks card → expand with full preview
2. Preview shows text + target section
3. [Insert]: Text added to correct dossier section with typing animation
4. [Edit]: Inline edit before insert
5. [Discard]: Card removed from carousel
6. Context dispatch: UPDATE_DOSSIER_SECTION
7. Auto-save persists to DB

### Chat Context
1. Chat opened → system instruction includes:
   - Full dossier (bio + ficha + controversies)
   - Custom sources summary
   - Approved/discarded cards
   - Guest name, theme, episode context
2. When chat suggests deepening → ChatSuggestionBubble appears
3. User clicks bubble → same InsertPreview flow

## New Edge Functions

### `studio-gap-analysis`
- **Input**: { dossier, guestName, theme, customSources }
- **Output**: SuggestionCard[] with title, type, preview text, relevance score
- **API**: Gemini 2.5 Flash + Grounding with Google Search
- **System prompt**: Analyze dossier gaps, suggest 5-8 research areas

### `studio-file-search`
- **Input**: { customSources (files/text) }
- **Output**: { storeId } (File Search store ID for RAG)
- **API**: File Search API
- **Purpose**: Index user's custom sources for enriched card generation

### `studio-enrich-card`
- **Input**: { cardType, guestName, theme, existingDossier, fileSearchStoreId? }
- **Output**: { enrichedText, sources[] }
- **API**: Gemini + Grounding + optional File Search
- **Purpose**: Generate full text for a specific gap card

## Renaming

- "Ao Vivo" → "Converse com Aica" (throughout Studio)
- Label in toolbar, tab headers, and accessibility labels

## Ceramic Design System

- Cards: `bg-ceramic-base rounded-xl shadow-ceramic-emboss`
- Expanded card: `border-2 border-amber-400`
- Inserted card: `bg-ceramic-success/10 border-ceramic-success`
- InsertPreview: `bg-ceramic-info/10 border-l-4 border-ceramic-info`
- Chat sheet: `bg-ceramic-base border-l border-ceramic-border`
- Loading states: `AIThinkingState` component

## Files to Create/Modify

### New Files
- `src/modules/studio/components/research/ResearchCanvas.tsx`
- `src/modules/studio/components/research/SuggestionCarousel.tsx`
- `src/modules/studio/components/research/SuggestionCard.tsx`
- `src/modules/studio/components/research/DossierEditor.tsx`
- `src/modules/studio/components/research/DossierInsertPreview.tsx`
- `src/modules/studio/components/research/ResearchChatSheet.tsx`
- `src/modules/studio/components/research/ResearchToolbar.tsx`
- `src/modules/studio/hooks/useSuggestionCards.ts`
- `src/modules/studio/hooks/useResearchChat.ts`
- `src/modules/studio/types/research.ts`
- `supabase/functions/studio-gap-analysis/index.ts`
- `supabase/functions/studio-file-search/index.ts`
- `supabase/functions/studio-enrich-card/index.ts`

### Modified Files
- `src/modules/studio/components/workspace/ResearchStage.tsx` → replaced by ResearchCanvas
- `src/modules/studio/context/PodcastWorkspaceContext.tsx` → new actions for cards/chat
- `src/modules/studio/services/podcastAIService.ts` → new service functions

### Removed
- Old ResearchStage.tsx sidebar layout (replaced entirely)

## Risk Mitigation

- Keep old ResearchStage.tsx as `ResearchStage.legacy.tsx` during development
- Feature flag: `useNewResearchUX` context flag for safe rollback
- Test with existing episodes to ensure backward compatibility
- Verify auto-save works with new state shape
