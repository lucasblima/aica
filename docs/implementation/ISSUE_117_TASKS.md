# Issue #117 - Task List

## Fase 1: Database Schema

**Agente:** `backend-architect-supabase`

- [ ] 1.1 Criar migration `20260122000001_generated_decks.sql`
- [ ] 1.2 Implementar RLS policies para `generated_decks` e `deck_slides`
- [ ] 1.3 Criar storage bucket `presentation-assets`

---

## Fase 2: Slide Components

**Agente:** `ux-design-guardian`

- [ ] 2.1 Criar estrutura `src/modules/grants/components/presentation/`
- [ ] 2.2 Implementar SlideCanvas (viewport 1920x1080 + zoom)
- [ ] 2.3 Implementar 12 tipos de slides:
  - [ ] CoverSlide.tsx
  - [ ] OrganizationSlide.tsx
  - [ ] ProjectSlide.tsx
  - [ ] ImpactMetricsSlide.tsx
  - [ ] TimelineSlide.tsx
  - [ ] TeamSlide.tsx
  - [ ] IncentiveLawSlide.tsx
  - [ ] TiersSlide.tsx
  - [ ] TestimonialsSlide.tsx
  - [ ] MediaSlide.tsx
  - [ ] ComparisonSlide.tsx
  - [ ] ContactSlide.tsx
- [ ] 2.4 Implementar sistema Drag-and-Drop (dnd-kit)
- [ ] 2.5 Implementar edicao inline (contentEditable)
- [ ] 2.6 Implementar 3 templates CSS:
  - [ ] professional.css
  - [ ] creative.css
  - [ ] institutional.css

---

## Fase 3: RAG + Gemini Integration

**Agente:** `gemini-integration-specialist`

- [ ] 3.1 Criar service `presentationRAGService.ts`
- [ ] 3.2 Implementar context builder (org + project)
- [ ] 3.3 Criar prompts por publico-alvo (ESG, Tax, Brand, Impact)
- [ ] 3.4 Implementar content generator com JSON schema

---

## Fase 4: Edge Function PDF Export

**Agente:** `backend-architect-supabase`

- [ ] 4.1 Criar Edge Function `generate-presentation-pdf`
- [ ] 4.2 Implementar HTML template renderer
- [ ] 4.3 Configurar Puppeteer (1920x1080, 300 DPI)

---

## Fase 5: Wizard UI

**Agente:** `ux-design-guardian`

- [ ] 5.1 Criar PresentationBuilder component (7 steps)
- [ ] 5.2 Implementar step navigation
- [ ] 5.3 Implementar auto-save com debounce

---

## Fase 6: Hooks e Services

**Agente:** `ux-design-guardian`

- [ ] 6.1 Criar hook `usePresentationBuilder`
- [ ] 6.2 Criar service `presentationService.ts`

---

## Fase 7: Testes

**Agente:** `testing-qa-playwright`

- [ ] 7.1 Testes unitarios (slides, templates)
- [ ] 7.2 Testes E2E (fluxo completo)
- [ ] 7.3 Visual regression tests

---

## Dependencias

```
Fase 1 -> Fase 2, Fase 3, Fase 4 (paralelo)
Fase 2 + Fase 3 -> Fase 5
Fase 5 -> Fase 6
Fase 6 -> Fase 7
```

---

## Comandos de Inicio

```bash
# Backend
npx supabase migration new generated_decks

# Frontend
npm install @dnd-kit/core @dnd-kit/sortable
```
