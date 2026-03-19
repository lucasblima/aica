# NotebookLM Integration — Design Document

**Session:** `research-notebooklm-integration`
**Date:** 2026-03-13
**Status:** Design (awaiting approval)
**Library:** [notebooklm-py](https://github.com/teng-lin/notebooklm-py) v0.3.4 (unofficial Python SDK)

---

## Executive Summary

Integrar Google NotebookLM no AICA via `notebooklm-py` SDK para adicionar **geração de audio/video, research agents, quizzes, mind maps, slide decks, infográficos e relatórios** a todos os 8 módulos. Foram identificadas **31 oportunidades** de integração, priorizadas em 4 fases.

**Impacto estratégico:** Audio é o diferencial competitivo — transforma AICA de app de produtividade em **plataforma de coaching por voz**.

**Risco principal:** API não-oficial do Google. Mitigação: arquitetura loosely-coupled (fácil de remover/substituir).

---

## Architecture Decision: Python Microservice (Option A)

### Por que Option A?

| Opção | Viabilidade | Esforço | Recomendação |
|-------|------------|---------|--------------|
| **A: Python Cloud Run Microservice** | 5/5 | 3-4 semanas | **RECOMENDADA** |
| B: Edge Function → Python subprocess | 1/5 | N/A | Inviável (Deno não suporta) |
| C: Cloud Tasks → Python Worker | 3/5 | 4-5 semanas | Overengineered |
| D: Reverse-engineer HTTP em TypeScript | 2/5 | 5-6 semanas | Muito arriscado |
| E: Python Worker + Supabase Realtime | 3/5 | 3-4 semanas | Não escala |

### Architecture Diagram

```
AICA Frontend (React)
  │
  ├─ supabase.functions.invoke('notebooklm-proxy')
  │     │
  │     └─ Supabase Edge Function (validates JWT, forwards request)
  │           │
  │           └─ HTTP POST → aica-notebooklm (Cloud Run, port 8082)
  │                 │
  │                 ├─ FastAPI endpoints
  │                 ├─ notebooklm-py async client
  │                 ├─ Per-user auth (encrypted cookies in Supabase)
  │                 └─ Job queue (async artifact generation)
  │
  └─ Supabase Realtime subscription (notebooklm_job_status)
        └─ Poll artifact generation progress
```

### Razões

1. **Padrão existente** — Espelha `aica-agents` (FastAPI + Cloud Run, já em produção)
2. **Isolamento** — Falhas no NotebookLM não afetam o resto do AICA
3. **Async nativo** — FastAPI + notebooklm-py ambos async/await
4. **Scale to zero** — Cloud Run cobra apenas quando usado
5. **Multi-user** — Cookies criptografados por usuário no Supabase

---

## Opportunity Map: 31 Integrações em 8 Módulos

### Legenda

- **Impacto**: HIGH / MEDIUM / LOW
- **Esforço**: LOW (2-3d) / MEDIUM (3-5d) / HIGH (5-7d)
- **Fase**: 1 (quick wins) / 2 (reporting) / 3 (advanced) / 4 (cross-module)

### Studio (Podcast Production)

| # | Oportunidade | Impacto | Esforço | Fase | NotebookLM Feature |
|---|-------------|---------|---------|------|-------------------|
| S1 | **Audio Overview para intro/outro de episódios** | HIGH | LOW | 1 | Audio (brief, pt-BR) |
| S2 | **Research Agent para pesquisa de convidados** | HIGH | MEDIUM | 2 | Research (web+Drive, deep) |
| S3 | **Slide Deck de transcript para LinkedIn/YouTube** | MEDIUM | MEDIUM | 3 | Slides (brief, PPTX) |
| S4 | **Pauta alternativa (comparison view)** | MEDIUM | HIGH | 3 | Slides (presenter notes) |

**S1 destaque:** Gera narração de 2-3 min em português a partir de transcript + show notes. Salva 30-45 min de gravação manual por episódio. Integra na fase de pós-produção existente.

### Journey (Consciência)

| # | Oportunidade | Impacto | Esforço | Fase | NotebookLM Feature |
|---|-------------|---------|---------|------|-------------------|
| J1 | **Weekly Audio Summary (podcast pessoal)** | HIGH | LOW | 1 | Audio (brief, pt-BR) |
| J2 | **Emotion Pattern Mind Maps** | MEDIUM | MEDIUM | 3 | Mind Map (JSON → D3) |
| J3 | **Weekly Emotion Data Tables (CSV export)** | MEDIUM | LOW | 2 | Data Table (CSV) |
| J4 | **Monthly Consciousness Growth Report** | MEDIUM | MEDIUM | 2 | Report (study_guide) |
| J5 | **Insight Flashcards** | LOW | LOW | 3 | Flashcards (JSON) |

**J1 destaque:** Converte resumo semanal (já gerado por Gemini) em áudio de 5-10 min com tom reflexivo. **Maior fator "user delight"** de todos os módulos. MP3 para ouvir no commute.

### Finance (Gestão Financeira)

| # | Oportunidade | Impacto | Esforço | Fase | NotebookLM Feature |
|---|-------------|---------|---------|------|-------------------|
| F1 | **Monthly Audio Briefing** | HIGH | LOW | 1 | Audio (brief, pt-BR) |
| F2 | **Custom Data Tables (CSV export)** | MEDIUM | MEDIUM | 2 | Data Table (CSV) |
| F3 | **Quarterly Financial Report** | MEDIUM | MEDIUM | 2 | Report (briefing_doc) |
| F4 | **Spending Pattern Infographics** | MEDIUM | MEDIUM | 3 | Infographic (professional) |
| F5 | **Financial Goal Mind Maps** | LOW | MEDIUM | 3 | Mind Map (JSON) |

**F1 destaque:** Briefing financeiro mensal de 3-5 min. Receita vs. despesas, top categorias, oportunidades de economia, nota de saúde. Tom encorajador de coach.

### Grants (Captação)

| # | Oportunidade | Impacto | Esforço | Fase | NotebookLM Feature |
|---|-------------|---------|---------|------|-------------------|
| G1 | **Import Edital PDF + Study Guide** | MEDIUM | LOW | 1 | Sources (PDF) + Report (study_guide) |
| G2 | **Research Agent para oportunidades** | MEDIUM | MEDIUM | 3 | Research (web, deep) |
| G3 | **Project Mind Maps** | LOW | LOW | 3 | Mind Map (JSON) |
| G4 | **Pipeline + Status Reports** | MEDIUM | MEDIUM | 2 | Report (briefing_doc) |
| G5 | **Impact Infographics para Sponsor Deck** | MEDIUM | MEDIUM | 3 | Infographic (professional) |

**G1 destaque:** Upload do edital → import como source no NotebookLM → gera study guide com critérios de avaliação + quiz de preparação.

### Connections (CRM/WhatsApp)

| # | Oportunidade | Impacto | Esforço | Fase | NotebookLM Feature |
|---|-------------|---------|---------|------|-------------------|
| C1 | **Dossier Audio Summary** | HIGH | LOW | 1 | Audio (brief, pt-BR) |
| C2 | **Conversation Thread Audio Recap** | MEDIUM | MEDIUM | 2 | Audio (brief, pt-BR) |
| C3 | **Research Agent para enrichment** | MEDIUM | MEDIUM | 3 | Research (web, fast) |

**C1 destaque:** Resumo de 2-3 min do dossier do contato para ouvir antes de ligar/reunir. Hands-free, melhora qualidade das conversas.

### Flux (Treinamento)

| # | Oportunidade | Impacto | Esforço | Fase | NotebookLM Feature |
|---|-------------|---------|---------|------|-------------------|
| X1 | **Weekly Training Audio Brief** | HIGH | LOW | 1 | Audio (brief, pt-BR) |
| X2 | **Athlete Onboarding Slide Deck** | MEDIUM | MEDIUM | 3 | Slides (explainer) |
| X3 | **Recovery Audio Guides** | MEDIUM | MEDIUM | 3 | Audio (brief, pt-BR) |

**X1 destaque:** Plano semanal de treino narrado em 3-5 min com tom motivacional. Enviado via WhatsApp junto com o plano texto. Melhora aderência dos atletas.

### Atlas (Tasks)

| # | Oportunidade | Impacto | Esforço | Fase | NotebookLM Feature |
|---|-------------|---------|---------|------|-------------------|
| A1 | **Project Mind Maps** | MEDIUM | LOW | 2 | Mind Map (JSON → D3) |
| A2 | **Task Research Agents** | MEDIUM | MEDIUM | 3 | Research (web, fast) |
| A3 | **Sprint/Productivity Reports** | MEDIUM | MEDIUM | 2 | Report (briefing_doc) |
| A4 | **Task Distribution Infographics** | MEDIUM | MEDIUM | 3 | Infographic (professional) |

### Agenda (Calendar)

| # | Oportunidade | Impacto | Esforço | Fase | NotebookLM Feature |
|---|-------------|---------|---------|------|-------------------|
| AG1 | **Daily Briefing Audio** | MEDIUM | MEDIUM | 2 | Audio (brief, pt-BR) |
| AG2 | **Meeting Prep Brief (audio + slides)** | MEDIUM | MEDIUM | 3 | Audio + Slides |

### Cross-Module

| # | Oportunidade | Impacto | Esforço | Fase | NotebookLM Feature |
|---|-------------|---------|---------|------|-------------------|
| XM1 | **Integrated Life Plan Notebook** | HIGH | HIGH | 4 | All features |
| XM2 | **Weekly Life Council Audio Briefing** | HIGH | MEDIUM | 4 | Audio (deep-dive) |

**XM2 destaque:** Briefing unificado de 10 min combinando finanças, emoções, tarefas, treino, agenda. O "Jarvis pessoal" do AICA em forma de podcast.

---

## Priority Matrix

### Phase 1: Quick Wins (Weeks 1-3) — Audio First

| # | Módulo | Oportunidade | Dias |
|---|--------|-------------|------|
| S1 | Studio | Audio intro/outro de episódios | 2-3 |
| J1 | Journey | Weekly audio summary (podcast pessoal) | 2-3 |
| F1 | Finance | Monthly audio briefing | 2-3 |
| C1 | Connections | Dossier audio summary | 2-3 |
| X1 | Flux | Weekly training audio brief | 2-3 |
| G1 | Grants | Edital PDF import + study guide | 2-3 |

**Total Phase 1:** ~15 dias dev | **6 integrações** | **Investimento:** infra + audio features
**Tese:** Audio é o maior diferencial. Validar engagement antes de expandir.

### Phase 2: Reporting & Analytics (Weeks 4-6)

| # | Módulo | Oportunidade | Dias |
|---|--------|-------------|------|
| J3 | Journey | Emotion data tables (CSV) | 2-3 |
| J4 | Journey | Monthly consciousness report | 3-4 |
| F2 | Finance | Custom data tables | 3-4 |
| F3 | Finance | Quarterly financial report | 3-4 |
| G4 | Grants | Pipeline status reports | 3-4 |
| A1 | Atlas | Project mind maps | 2-3 |
| A3 | Atlas | Sprint/productivity reports | 3-4 |
| C2 | Connections | Thread audio recaps | 3-4 |
| AG1 | Agenda | Daily briefing audio | 3-4 |

**Total Phase 2:** ~25 dias dev | **9 integrações**

### Phase 3: Advanced Features (Weeks 7-10)

| # | Módulo | Oportunidade | Dias |
|---|--------|-------------|------|
| S2 | Studio | Research agent (guest research) | 4-5 |
| S3 | Studio | Slide deck de transcript | 3-4 |
| S4 | Studio | Pauta comparison view | 5-6 |
| J2 | Journey | Emotion mind maps | 3-4 |
| J5 | Journey | Insight flashcards | 2-3 |
| F4 | Finance | Spending infographics | 3-4 |
| F5 | Finance | Financial goal mind maps | 3-4 |
| G2 | Grants | Research agent (oportunidades) | 4-5 |
| G3 | Grants | Project mind maps | 2-3 |
| G5 | Grants | Impact infographics | 3-4 |
| C3 | Connections | Research agent (enrichment) | 4-5 |
| X2 | Flux | Athlete onboarding slides | 4-5 |
| X3 | Flux | Recovery audio guides | 3-4 |
| A2 | Atlas | Task research agents | 3-4 |
| A4 | Atlas | Task infographics | 3-4 |
| AG2 | Agenda | Meeting prep brief | 3-4 |

**Total Phase 3:** ~55 dias dev | **16 integrações**

### Phase 4: Cross-Module (Weeks 11+)

| # | Oportunidade | Dias |
|---|-------------|------|
| XM1 | Integrated Life Plan Notebook | 7-10 |
| XM2 | Weekly Life Council Audio Briefing | 5-7 |

---

## Infrastructure Plan

### New Database Tables

```sql
-- NotebookLM auth per user
CREATE TABLE notebooklm_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  encrypted_cookies TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Async job tracking
CREATE TABLE notebooklm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  job_type TEXT NOT NULL, -- 'audio', 'video', 'slides', 'report', etc.
  module TEXT NOT NULL,   -- 'studio', 'journey', 'finance', etc.
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  input_data JSONB,
  result_url TEXT,
  result_metadata JSONB,
  error_message TEXT,
  notebook_id TEXT,       -- NotebookLM notebook ID
  artifact_id TEXT,       -- NotebookLM artifact ID
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS: users see only their own data
ALTER TABLE notebooklm_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooklm_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_auth" ON notebooklm_auth_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_jobs" ON notebooklm_jobs
  FOR ALL USING (auth.uid() = user_id);
```

### New Columns on Existing Tables

```sql
-- Studio: podcast_episodes
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS intro_audio_url TEXT;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS slide_deck_url TEXT;

-- Journey: weekly summaries (stored in daily_reports or new table)
-- Finance: finance_transactions (monthly digest already exists)
-- Connections: contact dossier
-- These will use notebooklm_jobs.result_url for artifact URLs
```

### Python Microservice Structure

```
backend/notebooklm/
├── Dockerfile
├── requirements.txt          # notebooklm-py, fastapi, uvicorn, supabase-py
├── main.py                   # FastAPI app
├── routers/
│   ├── auth.py               # POST /auth/initiate, /auth/callback
│   ├── notebooks.py          # CRUD notebooks + sources
│   ├── artifacts.py          # POST /generate/{type}, GET /status/{job_id}
│   ├── chat.py               # POST /chat (Q&A on sources)
│   └── research.py           # POST /research (web/drive agents)
├── services/
│   ├── nlm_client.py         # NotebookLMClient wrapper (per-user sessions)
│   ├── auth_service.py       # Cookie encryption/decryption, token refresh
│   ├── job_service.py        # Async job management
│   └── storage_service.py    # Supabase Storage for generated files
├── models/
│   ├── requests.py           # Pydantic request models
│   └── responses.py          # Pydantic response models
└── cloudbuild-notebooklm.yaml
```

### Frontend Service Layer

```typescript
// src/services/notebookLmService.ts
export const notebookLmService = {
  // Auth
  initiateLogin: () => supabase.functions.invoke('notebooklm-proxy', {
    body: { action: 'initiate_login' }
  }),

  // Audio generation (async)
  generateAudio: (params: {
    module: string;
    content: string;
    format?: 'deep-dive' | 'brief' | 'critique' | 'debate';
    length?: 'short' | 'default' | 'long';
    language?: string;
  }) => supabase.functions.invoke('notebooklm-proxy', {
    body: { action: 'generate_audio', ...params }
  }),

  // Reports
  generateReport: (params: {
    module: string;
    content: string;
    format?: 'briefing_doc' | 'study_guide' | 'blog_post';
  }) => supabase.functions.invoke('notebooklm-proxy', {
    body: { action: 'generate_report', ...params }
  }),

  // Mind Maps
  generateMindMap: (params: { content: string }) =>
    supabase.functions.invoke('notebooklm-proxy', {
      body: { action: 'generate_mind_map', ...params }
    }),

  // Job status polling
  getJobStatus: (jobId: string) =>
    supabase.from('notebooklm_jobs').select('*').eq('id', jobId).single(),

  // Subscribe to job updates
  subscribeToJob: (jobId: string, onUpdate: (job: any) => void) =>
    supabase.channel(`job:${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notebooklm_jobs',
        filter: `id=eq.${jobId}`
      }, payload => onUpdate(payload.new))
      .subscribe(),
};
```

### Shared UI Components

```
src/components/features/notebooklm/
├── AudioPlayer.tsx           # Reusable audio player (all modules)
├── GenerateButton.tsx        # "Generate with NotebookLM" trigger
├── JobStatusIndicator.tsx    # Progress bar for async generation
├── MindMapViewer.tsx         # D3/Cytoscape mind map renderer
└── NotebookLMAuthGate.tsx    # Auth check + login prompt
```

---

## Authentication Flow

### First-Time Setup (per user)

```
1. User clicks "Connect NotebookLM" in Settings
2. Frontend → POST /auth/initiate → returns auth_url
3. User opens auth_url in browser → Google OAuth
4. Google redirects to callback → cookies captured
5. Backend encrypts cookies → stores in notebooklm_auth_sessions
6. User is now authenticated for ~2 weeks
```

### Subsequent Requests

```
1. Frontend → Edge Function → Python microservice
2. Microservice loads encrypted cookies from Supabase
3. Initializes NotebookLMClient with user's cookies
4. Auto-refreshes if token expiry < 60s
5. If refresh fails → notify user to re-authenticate
```

### Security

- Cookies encrypted at rest (AES-256 with per-user key derived from Supabase auth)
- HTTPS only
- Never log raw cookies
- Audit trail in `notebooklm_jobs` table
- RLS ensures users only access own auth/jobs

---

## Cost Estimates

### Per-User Monthly (estimated)

| Tier | Usage | Cost |
|------|-------|------|
| Light (free) | 5 audio + 2 reports | ~$0.50 |
| Active | 20 audio + 10 reports + 5 research | ~$3.00 |
| Power | 50 audio + 20 reports + 15 research + mind maps | ~$8.00 |

### Infrastructure

| Component | Monthly Cost |
|-----------|-------------|
| Cloud Run (aica-notebooklm) | ~$5-15 (scale to zero) |
| Supabase Storage (audio files) | ~$5-10 (per GB) |
| Total fixed | ~$10-25/month |

### Break-even

- 1,000 active users × $3 avg = $3,000 API cost
- Consider gating research agents + video behind paid tier

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Google changes API | HIGH | HIGH | Pin library version, monitor GitHub, fallback to Gemini for reports |
| Rate limiting | MEDIUM | MEDIUM | Per-user daily limits, job queue with backoff |
| Cookie expiry | HIGH | LOW | Background refresh job, graceful re-auth prompt |
| Audio quality inconsistent | LOW | MEDIUM | Allow regeneration, user feedback loop |
| Multi-user cookie isolation | LOW | HIGH | Encryption per user, RLS policies, audit log |

### Graceful Degradation

Se NotebookLM ficar indisponível:
- **Audio**: Fallback para Gemini TTS (menor qualidade, mas funcional)
- **Reports**: Fallback para Gemini direct generation (já existe no Journey/Finance)
- **Mind Maps**: Fallback para geração local com D3 (sem AI)
- **Research**: Fallback para Google Grounding (já existe no Studio)

---

## Success Metrics

| Metric | Target (Phase 1) | Target (Phase 2+) |
|--------|------------------|-------------------|
| Audio listen rate | >40% of generated | >60% |
| Report download rate | >30% | >50% |
| Weekly active users (NotebookLM features) | >20% of total | >40% |
| Re-auth rate (cookie expiry) | <2x/month | <1x/month |
| Generation failure rate | <10% | <5% |
| User satisfaction (NPS for audio) | >30 | >50 |

---

## Top 6 Quick Wins (Phase 1)

Estas são as 6 integrações com melhor relação impacto/esforço:

1. **J1 — Journey Weekly Audio** — Podcast pessoal semanal de autoconhecimento
2. **F1 — Finance Monthly Audio** — Briefing financeiro mensal narrado
3. **C1 — Connections Dossier Audio** — Resumo de contato para ouvir antes de reunião
4. **X1 — Flux Training Audio** — Plano de treino semanal narrado
5. **S1 — Studio Episode Audio** — Intro/outro automática de episódios de podcast
6. **G1 — Grants Edital Import** — PDF do edital → study guide + quiz

**Tema unificador Phase 1:** AICA ganha **voz**. Cada módulo tem um "podcast" que o usuário pode ouvir.

---

## Next Steps

1. **Aprovação deste design** pelo usuário
2. **Implementation plan** detalhado (superpowers:writing-plans)
3. **Worktree** para infra (Python microservice + DB migrations)
4. **TDD** por feature (RED: test audio generation → GREEN: implement → REFACTOR)
5. **Prototype** de J1 (Journey Weekly Audio) como proof-of-concept

---

*Generated by Agent Team: 4 parallel research agents (API Explorer, Studio+Media Mapper, Knowledge Mapper, Architecture Bridge)*

*Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>*
