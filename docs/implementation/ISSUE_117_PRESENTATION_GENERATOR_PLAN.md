# Issue #117 - Gerador de Apresentacoes HTML/PDF com RAG

## Plano de Implementacao Detalhado

**Epic:** #113 - File Processing Pipeline
**Data:** 2026-01-21
**Arquiteto:** Master Architect & Planner Agent

---

## 1. Resumo Executivo

A Issue #117 implementa um sistema completo de geracao de apresentacoes HTML que podem ser exportadas para PDF, utilizando o contexto RAG dos documentos da organizacao. O sistema permite:

1. **Criacao de slides interativos** em React (12 tipos diferentes)
2. **Templates visuais** CSS (professional, creative, institutional)
3. **Preview em tempo real** com edicao inline e drag-and-drop
4. **Geracao de conteudo via RAG + Gemini** (busca contexto nos documentos)
5. **Personalizacao por publico-alvo** (ESG, Tax, Brand, Impact)
6. **Export PDF de alta qualidade** via Puppeteer Edge Function

---

## 2. Contexto Existente (Assets Reutilizaveis)

### 2.1 Sistema de RAG Ja Implementado (Issue #116)

```
Arquivos:
- supabase/functions/search-documents/index.ts    # Busca semantica
- supabase/migrations/20260112000001_*.sql        # Schema document_embeddings
- src/modules/grants/services/documentProcessingService.ts  # Cliente RAG
```

**Funcoes disponiveis:**
- `searchDocuments(query, options)` - Busca semantica por embeddings
- `search_documents_by_embedding()` - RPC no Supabase

### 2.2 Gerador de Decks PPTX Existente (Issue #98)

```
Arquivos:
- src/modules/grants/types/sponsorDeck.ts         # 10 tipos de slides definidos
- src/modules/grants/components/SponsorDeckGenerator.tsx  # Wizard UI
- src/modules/grants/hooks/useSponsorDeck.ts      # Hook de geracao
- supabase/functions/generate-sponsor-deck/index.ts  # Edge Function PPTX
```

**Tipos de slides ja definidos:**
- cover, organization, project, previous-editions, impact
- incentive-law, tiers, deliverables, why-sponsor, contact

### 2.3 Templates Visuais Existentes

```typescript
// src/modules/grants/types/sponsorDeck.ts
TEMPLATE_PROFESSIONAL  // Azul escuro + laranja
TEMPLATE_CREATIVE      // Roxo + rosa + teal
TEMPLATE_INSTITUTIONAL // Azul + verde + amarelo
```

---

## 3. Arquitetura Proposta

### 3.1 Diagrama de Componentes

```
+--------------------------------------------------+
|                   Frontend (React)                |
+--------------------------------------------------+
|                                                   |
|  +-------------------------------------------+   |
|  |     PresentationBuilder (Orchestrator)    |   |
|  |   - Wizard steps                          |   |
|  |   - State management                      |   |
|  |   - Template selection                    |   |
|  +-------------------+-----------------------+   |
|                      |                           |
|  +-------------------v-----------------------+   |
|  |         SlideEditor (Canvas)              |   |
|  |   - Drag-and-drop (react-dnd)            |   |
|  |   - Inline editing (contentEditable)     |   |
|  |   - Zoom controls                         |   |
|  |   - 1920x1080 viewport                   |   |
|  +-------------------+-----------------------+   |
|                      |                           |
|  +--------+  +-------+--------+  +-----------+  |
|  | Slide  |  | Slide          |  | Slide     |  |
|  | Types  |  | Components     |  | Templates |  |
|  | (12)   |  | (Reusable)     |  | (CSS)     |  |
|  +--------+  +----------------+  +-----------+  |
|                                                   |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|                   Backend (Supabase)              |
+--------------------------------------------------+
|                                                   |
|  +-------------------------------------------+   |
|  |    Edge Function: generate-presentation    |   |
|  |   1. RAG search (search-documents)        |   |
|  |   2. Gemini content generation            |   |
|  |   3. HTML template rendering              |   |
|  |   4. Puppeteer PDF generation             |   |
|  +-------------------------------------------+   |
|                                                   |
|  +-------------------------------------------+   |
|  |    Database Tables                         |   |
|  |   - generated_decks (persistencia)        |   |
|  |   - deck_slides (slides individuais)      |   |
|  +-------------------------------------------+   |
|                                                   |
+--------------------------------------------------+
```

### 3.2 Fluxo de Dados

```
1. Usuario seleciona template e publico-alvo
2. Sistema busca documentos relevantes via RAG
3. Gemini gera conteudo personalizado
4. Usuario edita slides (drag-drop, inline edit)
5. Sistema salva deck no banco (auto-save)
6. Usuario exporta PDF (Puppeteer via Edge Function)
```

---

## 4. Delegacao de Agentes

### 4.1 Matriz de Delegacao

| Componente | Agente Responsavel | Skills Necessarias |
|------------|-------------------|-------------------|
| Schema `generated_decks` | `backend-architect-supabase` | Migrations, RLS policies |
| Edge Function PDF | `backend-architect-supabase` | Puppeteer, Deno, HTML/CSS |
| Slide Components (12 tipos) | `ux-design-guardian` | React, Tailwind, Design System |
| Preview Canvas + DnD | `ux-design-guardian` | react-dnd, contentEditable |
| Templates CSS | `ux-design-guardian` | CSS-in-JS, responsive design |
| RAG Search Integration | `gemini-integration-specialist` | RAG, embeddings, prompts |
| Gemini Content Gen | `gemini-integration-specialist` | Prompt engineering |
| Testes E2E | `testing-qa-playwright` | Playwright, visual testing |
| Coordenacao Geral | `master-architect-planner` | Architecture, integration |

### 4.2 Responsabilidades Detalhadas

#### Agent: `backend-architect-supabase`
```
Entrega 1: Migration `generated_decks`
Entrega 2: Migration `deck_slides`
Entrega 3: RLS policies
Entrega 4: Edge Function `generate-presentation-pdf`
Entrega 5: Storage bucket `presentation-assets`
```

#### Agent: `ux-design-guardian`
```
Entrega 1: SlideCanvas component (1920x1080)
Entrega 2: 12 slide type components
Entrega 3: Drag-and-drop system (react-dnd)
Entrega 4: Inline editing system
Entrega 5: 3 CSS templates
Entrega 6: PresentationBuilder wizard
Entrega 7: Template switcher UI
```

#### Agent: `gemini-integration-specialist`
```
Entrega 1: RAG context builder
Entrega 2: Content generation prompts (por publico-alvo)
Entrega 3: Slide content generator
Entrega 4: Integration com search-documents
```

#### Agent: `testing-qa-playwright`
```
Entrega 1: Testes E2E do fluxo completo
Entrega 2: Visual regression tests
Entrega 3: PDF validation tests
```

---

## 5. Task Breakdown (Checklist Executavel)

### Fase 1: Database Schema (backend-architect-supabase)

- [ ] **1.1** Criar migration `20260122000001_generated_decks.sql`
  - Tabela `generated_decks` (metadata do deck)
  - Tabela `deck_slides` (slides individuais com ordem)
  - Indexes otimizados
  - Foreign keys para `organizations`, `grant_projects`

- [ ] **1.2** Implementar RLS policies
  - Policy: usuarios veem apenas seus decks
  - Policy: membros da org veem decks compartilhados
  - Security definer functions

- [ ] **1.3** Criar storage bucket `presentation-assets`
  - Regras de acesso
  - Limite de tamanho
  - Tipos de arquivo permitidos (images, logos)

### Fase 2: Slide Components (ux-design-guardian)

- [ ] **2.1** Criar estrutura base `src/modules/grants/components/presentation/`
  ```
  presentation/
  ├── types.ts                    # Tipos TypeScript
  ├── templates/                  # CSS templates
  │   ├── professional.css
  │   ├── creative.css
  │   └── institutional.css
  ├── slides/                     # 12 slide types
  │   ├── CoverSlide.tsx
  │   ├── OrganizationSlide.tsx
  │   ├── ProjectSlide.tsx
  │   ├── ImpactMetricsSlide.tsx
  │   ├── TimelineSlide.tsx
  │   ├── TeamSlide.tsx
  │   ├── IncentiveLawSlide.tsx
  │   ├── TiersSlide.tsx
  │   ├── TestimonialsSlide.tsx
  │   ├── MediaSlide.tsx
  │   ├── ComparisonSlide.tsx
  │   └── ContactSlide.tsx
  ├── canvas/
  │   ├── SlideCanvas.tsx         # Container 1920x1080
  │   ├── SlideToolbar.tsx        # Ferramentas de edicao
  │   ├── DraggableSlide.tsx      # Wrapper DnD
  │   └── InlineEditor.tsx        # Edicao de texto
  └── index.ts                    # Barrel export
  ```

- [ ] **2.2** Implementar SlideCanvas (container principal)
  - Viewport fixo 1920x1080
  - Zoom controls (fit, 50%, 100%, 150%)
  - Grid system opcional
  - Background color/gradient suporte

- [ ] **2.3** Implementar 12 tipos de slides
  - Props tipadas para cada slide
  - Placeholders para campos editaveis
  - Suporte a imagens/logos
  - Animacoes CSS opcionais

- [ ] **2.4** Implementar sistema Drag-and-Drop
  - `react-dnd` ou `dnd-kit`
  - Reordenacao de slides
  - Preview durante drag
  - Persist ordem no state

- [ ] **2.5** Implementar edicao inline
  - `contentEditable` nos textos
  - Auto-save on blur
  - Suporte a formatacao basica (bold, italic)
  - Undo/Redo stack

- [ ] **2.6** Implementar 3 templates CSS
  - Professional: corporate, clean
  - Creative: bold colors, modern
  - Institutional: formal, government-style
  - Hot-swap em tempo real

### Fase 3: RAG + Gemini Integration (gemini-integration-specialist)

- [ ] **3.1** Criar service `presentationRAGService.ts`
  ```typescript
  // Funcoes principais
  - fetchOrganizationContext(orgId)
  - fetchProjectContext(projectId)
  - generateSlideContent(slideType, context, audience)
  ```

- [ ] **3.2** Implementar context builder
  - Query RAG por organizacao
  - Query RAG por projeto
  - Agregacao de contexto relevante
  - Ranking por relevancia

- [ ] **3.3** Criar prompts por publico-alvo
  ```
  Audiences:
  - ESG: foco em impacto social/ambiental
  - Tax: beneficios fiscais, compliance
  - Brand: visibilidade, associacao de marca
  - Impact: metricas, alcance, transformacao
  ```

- [ ] **3.4** Implementar content generator
  - Prompt templates por slide type
  - JSON schema para output estruturado
  - Fallback content se Gemini falhar
  - Token usage tracking

### Fase 4: Edge Function PDF Export (backend-architect-supabase)

- [ ] **4.1** Criar Edge Function `generate-presentation-pdf`
  ```typescript
  // Fluxo:
  1. Receber deck_id e options
  2. Carregar slides do banco
  3. Renderizar HTML completo
  4. Gerar PDF via Puppeteer
  5. Upload para storage
  6. Retornar URL ou base64
  ```

- [ ] **4.2** Implementar HTML template renderer
  - Injetar CSS do template selecionado
  - Substituir placeholders
  - Inline all assets (base64)
  - Page breaks entre slides

- [ ] **4.3** Configurar Puppeteer
  - Formato 1920x1080 (landscape)
  - Alta resolucao (300 DPI)
  - Print background colors
  - Timeout configuravel

### Fase 5: Wizard UI (ux-design-guardian)

- [ ] **5.1** Criar PresentationBuilder component
  ```typescript
  Steps:
  1. Selecionar template
  2. Escolher publico-alvo
  3. Selecionar organizacao/projeto
  4. Gerar slides automaticamente (RAG + Gemini)
  5. Editar slides
  6. Preview final
  7. Exportar PDF
  ```

- [ ] **5.2** Implementar step navigation
  - Progress indicator
  - Validation por step
  - Back/Next navigation
  - Keyboard shortcuts

- [ ] **5.3** Implementar auto-save
  - Debounced save (2s)
  - Conflict resolution
  - Offline support (localStorage)
  - Sync indicator

### Fase 6: Hooks e Services (frontend)

- [ ] **6.1** Criar hook `usePresentationBuilder`
  ```typescript
  interface UsePresentationBuilder {
    deck: GeneratedDeck | null;
    slides: DeckSlide[];
    isLoading: boolean;
    isSaving: boolean;

    // Actions
    generateContent: () => Promise<void>;
    updateSlide: (slideId: string, content: Partial<SlideContent>) => void;
    reorderSlides: (sourceIndex: number, destIndex: number) => void;
    addSlide: (slideType: SlideType) => void;
    removeSlide: (slideId: string) => void;
    setTemplate: (templateId: string) => void;
    exportPDF: () => Promise<Blob>;

    // State
    selectedTemplate: string;
    targetAudience: AudienceType;
    progress: number;
  }
  ```

- [ ] **6.2** Criar service `presentationService.ts`
  - CRUD operations para decks
  - PDF generation call
  - Auto-save logic
  - Cache management

### Fase 7: Testes (testing-qa-playwright)

- [ ] **7.1** Testes unitarios
  - Slide components render correctly
  - Template switching works
  - Content generation produces valid JSON

- [ ] **7.2** Testes E2E
  - Fluxo completo de criacao
  - Drag-and-drop reordering
  - Inline editing
  - PDF export

- [ ] **7.3** Visual regression tests
  - Snapshot de cada slide type
  - Snapshot de cada template
  - Mobile responsiveness

---

## 6. Schema do Banco de Dados

### 6.1 Tabela `generated_decks`

```sql
CREATE TABLE public.generated_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.grant_projects(id),

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  template_id TEXT NOT NULL DEFAULT 'professional',
  target_audience TEXT DEFAULT 'general'
    CHECK (target_audience IN ('esg', 'tax', 'brand', 'impact', 'general')),

  -- Status
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'generating', 'ready', 'exported')),

  -- Versioning
  version INTEGER DEFAULT 1,

  -- Export tracking
  last_exported_at TIMESTAMPTZ,
  export_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_decks_user ON generated_decks(user_id);
CREATE INDEX idx_generated_decks_org ON generated_decks(organization_id);
CREATE INDEX idx_generated_decks_project ON generated_decks(project_id);
```

### 6.2 Tabela `deck_slides`

```sql
CREATE TABLE public.deck_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.generated_decks(id) ON DELETE CASCADE,

  -- Slide metadata
  slide_type TEXT NOT NULL,
  slide_order INTEGER NOT NULL,

  -- Content (JSON structure varies by slide type)
  content JSONB NOT NULL DEFAULT '{}',

  -- Customization
  custom_css TEXT,
  is_visible BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_deck_slide_order UNIQUE (deck_id, slide_order)
);

CREATE INDEX idx_deck_slides_deck ON deck_slides(deck_id);
CREATE INDEX idx_deck_slides_order ON deck_slides(deck_id, slide_order);
```

### 6.3 RLS Policies

```sql
ALTER TABLE generated_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_slides ENABLE ROW LEVEL SECURITY;

-- generated_decks policies
CREATE POLICY "Users can view own decks"
  ON generated_decks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decks"
  ON generated_decks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decks"
  ON generated_decks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decks"
  ON generated_decks FOR DELETE
  USING (auth.uid() = user_id);

-- deck_slides policies (via deck ownership)
CREATE POLICY "Users can manage slides of own decks"
  ON deck_slides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM generated_decks
      WHERE id = deck_slides.deck_id
        AND user_id = auth.uid()
    )
  );
```

---

## 7. Tipos TypeScript

### 7.1 Core Types

```typescript
// src/modules/grants/components/presentation/types.ts

export type SlideType =
  | 'cover'
  | 'organization'
  | 'project'
  | 'impact-metrics'
  | 'timeline'
  | 'team'
  | 'incentive-law'
  | 'tiers'
  | 'testimonials'
  | 'media'
  | 'comparison'
  | 'contact';

export type TemplateId = 'professional' | 'creative' | 'institutional';

export type AudienceType = 'esg' | 'tax' | 'brand' | 'impact' | 'general';

export interface GeneratedDeck {
  id: string;
  userId: string;
  organizationId: string | null;
  projectId: string | null;
  title: string;
  description: string | null;
  templateId: TemplateId;
  targetAudience: AudienceType;
  status: 'draft' | 'generating' | 'ready' | 'exported';
  version: number;
  lastExportedAt: string | null;
  exportCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeckSlide {
  id: string;
  deckId: string;
  slideType: SlideType;
  slideOrder: number;
  content: SlideContent;
  customCss: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

// Union type for all slide contents
export type SlideContent =
  | CoverSlideContent
  | OrganizationSlideContent
  | ProjectSlideContent
  | ImpactMetricsSlideContent
  | TimelineSlideContent
  | TeamSlideContent
  | IncentiveLawSlideContent
  | TiersSlideContent
  | TestimonialsSlideContent
  | MediaSlideContent
  | ComparisonSlideContent
  | ContactSlideContent;
```

### 7.2 Slide Content Types

```typescript
export interface CoverSlideContent {
  type: 'cover';
  title: string;
  subtitle: string;
  tagline?: string;
  logoUrl?: string;
  backgroundUrl?: string;
  approvalNumber?: string;
}

export interface OrganizationSlideContent {
  type: 'organization';
  name: string;
  description: string;
  mission?: string;
  vision?: string;
  achievements: string[];
  logoUrl?: string;
  foundedYear?: number;
}

export interface ImpactMetricsSlideContent {
  type: 'impact-metrics';
  title: string;
  metrics: Array<{
    label: string;
    value: string | number;
    unit?: string;
    icon?: string;
    description?: string;
  }>;
  impactStatement?: string;
}

export interface TimelineSlideContent {
  type: 'timeline';
  title: string;
  events: Array<{
    date: string;
    title: string;
    description?: string;
    isHighlighted?: boolean;
  }>;
}

export interface TeamSlideContent {
  type: 'team';
  title: string;
  members: Array<{
    name: string;
    role: string;
    bio?: string;
    photoUrl?: string;
    linkedIn?: string;
  }>;
}

// ... demais tipos seguem o mesmo padrao
```

---

## 8. Riscos Tecnicos e Mitigacoes

### 8.1 Risco: Performance do Puppeteer no Edge Function

**Problema:** Puppeteer pode ser pesado para Edge Functions com timeout limitado.

**Mitigacao:**
1. Usar `@cloudflare/puppeteer` ou solucao serverless-friendly
2. Pre-render HTML e enviar para API dedicada
3. Implementar queue com webhook callback
4. Fallback: gerar PNG dos slides e montar PDF client-side

### 8.2 Risco: RAG Retornando Contexto Irrelevante

**Problema:** Busca semantica pode trazer chunks nao relacionados.

**Mitigacao:**
1. Implementar threshold de similaridade configuravel
2. Filtrar por organization_id e project_id
3. Ranking com re-scoring baseado em keywords
4. Permitir usuario refinar contexto manualmente

### 8.3 Risco: Gemini Gerando Conteudo Inconsistente

**Problema:** Output JSON pode variar entre chamadas.

**Mitigacao:**
1. JSON schema validation no output
2. Retry logic com backoff
3. Fallback content templates
4. Few-shot examples no prompt

### 8.4 Risco: Drag-and-Drop Performance com Muitos Slides

**Problema:** DnD pode ficar lento com 20+ slides.

**Mitigacao:**
1. Virtualizacao da lista de slides (react-window)
2. Debounce nos updates
3. Otimistic UI updates
4. Lazy loading de thumbnails

### 8.5 Risco: Edicao Inline Perdendo Dados

**Problema:** Usuario pode perder alteracoes se fechar aba.

**Mitigacao:**
1. Auto-save com debounce (2 segundos)
2. LocalStorage backup
3. Confirmation dialog ao sair com mudancas
4. Versioning com undo history

---

## 9. Dependencias Entre Tasks

```
Fase 1 (Database)
    |
    +---> Fase 2.1-2.3 (Slide Components) [paralelo]
    |
    +---> Fase 3.1-3.2 (RAG Service) [paralelo]
    |
    v
Fase 2.4-2.6 (DnD + Edit + Templates)
    |
    +---> Fase 3.3-3.4 (Prompts + Generator) [depende de 3.2]
    |
    v
Fase 4 (Edge Function PDF)
    |
    v
Fase 5 (Wizard UI)
    |
    v
Fase 6 (Hooks + Services)
    |
    v
Fase 7 (Testes)
```

---

## 10. Criterios de Aceite (Definition of Done)

### 10.1 Funcionalidade

- [ ] Usuario pode criar apresentacao selecionando template
- [ ] Usuario pode escolher publico-alvo (ESG/Tax/Brand/Impact)
- [ ] Sistema gera conteudo automatico via RAG + Gemini
- [ ] Usuario pode editar textos inline
- [ ] Usuario pode reordenar slides via drag-and-drop
- [ ] Usuario pode trocar template em tempo real
- [ ] Usuario pode exportar PDF de alta qualidade
- [ ] Apresentacao persiste no banco (auto-save)

### 10.2 Qualidade

- [ ] Todos os 12 tipos de slides renderizam corretamente
- [ ] 3 templates CSS funcionam e sao visualmente distintos
- [ ] PDF exportado tem resolucao 1920x1080 por pagina
- [ ] Tempo de geracao de conteudo < 15 segundos
- [ ] Tempo de export PDF < 30 segundos

### 10.3 Testes

- [ ] Cobertura de testes unitarios > 80%
- [ ] Testes E2E do fluxo completo passando
- [ ] Visual regression tests para cada slide type
- [ ] Teste de performance com 20 slides

---

## 11. Estimativa de Esforco

| Fase | Agente | Estimativa |
|------|--------|------------|
| 1. Database Schema | backend-architect-supabase | 4h |
| 2. Slide Components | ux-design-guardian | 16h |
| 3. RAG + Gemini | gemini-integration-specialist | 8h |
| 4. Edge Function PDF | backend-architect-supabase | 8h |
| 5. Wizard UI | ux-design-guardian | 6h |
| 6. Hooks + Services | ux-design-guardian | 4h |
| 7. Testes | testing-qa-playwright | 8h |

**Total Estimado:** 54 horas (aproximadamente 7 dias de trabalho)

---

## 12. Proximos Passos

1. **Imediato:** Iniciar Fase 1 com `backend-architect-supabase`
2. **Paralelo:** `ux-design-guardian` iniciar componentes base (Fase 2.1-2.3)
3. **Paralelo:** `gemini-integration-specialist` iniciar RAG service (Fase 3.1-3.2)
4. **Sincronizacao:** Review apos Fase 1-3 antes de prosseguir

---

## Apendice A: Comandos para Iniciar

```bash
# Criar branch de feature
git checkout -b feature/issue-117-presentation-generator

# Criar estrutura de pastas
mkdir -p src/modules/grants/components/presentation/{slides,canvas,templates}

# Instalar dependencias necessarias
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Gerar migration (apos criar arquivo SQL)
npx supabase db diff -f 20260122000001_generated_decks
```

---

**Documento criado por:** Master Architect & Planner Agent
**Revisao necessaria:** Lucas Boscacci Lima
**Data de criacao:** 2026-01-21
