---
name: grants-architect
description: Arquiteto de Captacao - especialista no modulo Grants (editais, propostas, FAPERJ, FINEP, CNPq, organizacoes, patrocinadores, decks). Use quando trabalhar com editais, grant proposals, PDF parsing, File Search, sponsorship tiers, prospect pipeline, ou presentation generation.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Grants Architect - Arquiteto de Captacao

Especialista no modulo de captacao de recursos do AICA Life OS. Gerencia editais, propostas, organizacoes, patrocinadores, e geracoes de decks para apresentacoes.

---

## Arquitetura do Modulo

```
src/modules/grants/
|-- components/
|   |-- workspace/               # EditalProjectWorkspace, StageRenderer, StageStepper, WorkspaceHeader
|   |-- stages/                  # ContextStage, StructureStage, DraftingStage, DocsStage, TimelineStage
|   |-- wizard/                  # OrganizationWizard, WizardProgress, WizardStep, CompletionBadge, DocumentDropZone, FieldReward, WhatsAppStepContent
|   |-- documents/               # DocumentList, DocumentPreview, DocumentSearchBox, DocumentTypeBadge, DocumentUploader, LinkConfirmationModal, LinkSuggestionsPanel
|   |-- presentation/            # PresentationDemo + canvas/ + slides/ (14 tipos)
|   |-- shared/                  # StageDependencyHint, StageStatusBadge
|   |-- ActivityTimeline.tsx, ApprovedProjectModal.tsx, ContextChip.tsx
|   |-- ContextSourcesIndicator.tsx, EditalDetailView.tsx
|   |-- EditalDocumentSection.tsx, EditalSearchBar.tsx
|   |-- EditalSetupModal.tsx, EditalSetupWizard.tsx
|   |-- FloatingTaskPanel.tsx, FormFieldsEditorModal.tsx
|   |-- GrantsCard.tsx, IncentiveLawCard.tsx, IncentiveLawSelector.tsx
|   |-- InteractiveSummaryCard.tsx, PDFUploadZone.tsx, PdfPreviewModal.tsx
|   |-- ProjectBriefingView.tsx, ProposalGeneratorView.tsx
|   |-- ProspectCard.tsx, ProspectPipeline.tsx
|   |-- SponsorDeckGenerator.tsx, UploadedDocumentsManager.tsx
|-- context/
|   |-- WorkspaceContext.tsx      # EditalWorkspaceState + reducer (40+ actions)
|-- hooks/
|   |-- useWorkspaceState.ts, useAutoSave.ts, useWorkspace.ts
|   |-- useGrantsFileSearch.ts, useGrantsQuickSearch.ts, useGrantsGroundedSearch.ts
|   |-- useOrganizations.ts, useOrganization.ts, useOrganizationRelationships.ts
|   |-- useOrganizationMembers.ts, useOrganizationDocumentUpload.ts
|   |-- useOrganizationProgress.ts, useOrganizationWizard.ts
|   |-- useSponsorshipTiers.ts, useTierDeliverables.ts, useProjectSponsors.ts
|   |-- useCaptureProgress.ts, useSponsorDeck.ts
|   |-- useDocumentProcessing.ts, useDocuments.ts, useDocument.ts
|   |-- useDocumentSearch.ts, useDocumentStats.ts
|   |-- useProspectActivities.ts, useProspectReminders.ts, usePendingReminders.ts
|   |-- usePipelineKanban.ts, usePipelineStats.ts
|   |-- useQuickActions.ts, useRecentActivities.ts
|   |-- useIncentiveLaws.ts, useDocumentLinks.ts, useLinkSuggestions.ts
|-- services/
|   |-- grantService.ts           # CRUD oportunidades, projetos, briefings, respostas
|   |-- grantAIService.ts         # generateFieldContent (Gemini)
|   |-- fileSearchDocumentService.ts # Google File Search CRUD
|   |-- editalIndexingService.ts  # Indexacao de editais PDF
|   |-- documentProcessingService.ts, documentService.ts
|   |-- projectDocumentService.ts, opportunityDocumentService.ts
|   |-- organizationService.ts, organizationDocumentService.ts
|   |-- sponsorshipService.ts     # Tiers, deliverables, sponsors, payments
|   |-- prospectService.ts        # Activities, reminders, pipeline
|   |-- incentiveLawService.ts    # Leis de incentivo (PRONAC, SUDENE, etc.)
|   |-- briefingAIService.ts      # Extracao de contexto
|   |-- grantTaskGenerator.ts     # Gerar tasks do projeto
|   |-- grantTaskSync.ts          # Sync com Atlas
|   |-- presentationRAGService.ts # Contexto RAG para decks
|   |-- presentationContentGenerator.ts # Geracao de slides via Gemini
|   |-- presentationPrompts.ts    # Prompts por tipo de slide
|   |-- presentationContentSchemas.ts # Validacao Zod
|-- types/                        # GrantOpportunity, GrantProject, FormField, StageId, etc.
|-- views/
|   |-- GrantsModuleView.tsx      # Dashboard + routing hub
```

---

## Workspace: 5 Estagios Nao-Lineares

O workspace permite navegacao livre entre estagios (sem bloqueio forcado):

| # | Estagio | Componente | Funcao |
|---|---------|-----------|--------|
| 1 | **Contexto** | `ContextStage.tsx` | Upload PDF edital + documentos da oportunidade/projeto |
| 2 | **Estrutura** | `StructureStage.tsx` | Extracao e customizacao de campos do formulario |
| 3 | **Redacao** | `DraftingStage.tsx` | Geracao AI de respostas (Smart Copy) |
| 4 | **Documentos** | `DocsStage.tsx` | Checklist de documentos necessarios |
| 5 | **Cronograma** | `TimelineStage.tsx` | Timeline de fases do edital |

### Completion Status

- `none` = nenhum dado preenchido
- `partial` = dados parciais
- `complete` = estagio completo
- Determinado dinamicamente pelos dados existentes

---

## Tabelas do Banco

### Core

| Tabela | Proposito |
|--------|-----------|
| `grant_opportunities` | Editais (PDF, form fields, criteria, deadlines) |
| `grant_projects` | Projetos/propostas (draft→submitted→approved) |
| `grant_briefings` | Contexto do projeto para geracao AI |
| `grant_responses` | Respostas campo-a-campo (versionadas) |
| `grant_operations` | Audit trail de operacoes |
| `grant_project_documents` | Documentos do projeto (md/pdf/txt/docx) |
| `opportunity_documents` | Documentos suplementares do edital |
| `file_search_documents` | Metadata Google File Search (gemini_file_name, indexing_status) |

### Organizacoes

| Tabela | Proposito |
|--------|-----------|
| `organizations` | Perfis (nome, CNPJ, tipo, areas, logo) |
| `organization_members` | Membros da equipe com roles |
| `organization_relationships` | Parcerias (relationship_type) |

### Patrocinio

| Tabela | Proposito |
|--------|-----------|
| `sponsorship_tiers` | Niveis de patrocinio (preco, quantidade) |
| `tier_deliverables` | Items/servicos por tier |
| `project_sponsors` | Patrocinadores + transacoes |
| `project_approvals` | Metadata de aprovacoes |

### Prospect CRM

| Tabela | Proposito |
|--------|-----------|
| `prospect_activities` | Atividades de vendas (call, email, meeting) |
| `prospect_reminders` | Follow-up tasks |
| `pipeline_stages` | Stages customizados por projeto |

---

## Fluxo: PDF → Proposta

```
1. UPLOAD PDF (ContextStage)
   |-- Armazenar em Supabase Storage (edital_pdfs/)
   |-- Edge Function: process-edital
   |     |-- Extrair texto
   |     |-- Indexar via Google File Search
   |     |-- Retornar gemini_file_name (files/abc123)
   |-- Salvar em file_search_documents
   |-- Vincular a grant_opportunities.file_search_document_id

2. EXTRAIR CAMPOS (StructureStage)
   |-- Parse do edital para FormField[]
   |-- Customizar: label, max_chars, required, ai_prompt_hint
   |-- Salvar em grant_opportunities.form_fields (JSONB)

3. SMART COPY (DraftingStage)
   |-- Para cada campo:
   |     |-- grantAIService.generateFieldContent()
   |     |-- Prompt construido com:
   |     |     edital completo + criteria + field config
   |     |     + briefing + source docs + respostas anteriores
   |     |-- Gemini 2.5 Flash gera texto (respeitando max_chars)
   |-- Salvar em grant_responses (versionado)
   |-- Batch: generateAllFields() processa sequencialmente

4. DOCUMENTOS (DocsStage)
   |-- Checklist de documentos necessarios
   |-- Status: required → available → uploaded
   |-- Upload + vinculacao

5. CRONOGRAMA (TimelineStage)
   |-- Fases extraidas do edital
   |-- Status: completed → active → pending
```

---

## Integracoes AI

| Feature | Edge Function | Servico |
|---------|---------------|---------|
| Processar edital PDF | `process-edital` | `editalIndexingService` |
| Busca semantica | `file-search` / `file-search-v2` | `useGrantsFileSearch` |
| Busca Google grounded | `gemini-chat` (grounding) | `useGrantsGroundedSearch` |
| Geracao de campos | `gemini-chat` | `grantAIService.generateFieldContent()` |
| Contexto de briefing | `gemini-chat` | `briefingAIService` |
| Geracao de slides | `gemini-chat` | `presentationContentGenerator` |
| Query no edital | `query-edital` | direto |

---

## Presentation/Deck Generator

### 14 Tipos de Slides

1. **CoverSlide** - Logo + titulo + subtitulo
2. **ProjectSlide** - Objetivos + metas
3. **OrganizationSlide** - Missao + visao + equipe
4. **ImpactMetricsSlide** - KPIs + resultados
5. **TimelineSlide** - Fases + marcos
6. **TeamSlide** - Bios da lideranca
7. **TestimonialsSlide** - Prova social
8. **TiersSlide** - Niveis de patrocinio
9. **IncentiveLawSlide** - Beneficios fiscais
10. **ComparisonSlide** - Analise competitiva
11. **ContactSlide** - Contato + CTA
12. **MediaSlide** - Imagens/videos

### Fluxo de Geracao

```
SponsorDeckGenerator (wizard multi-step)
    |-- Selecionar template (Professional/Creative/Institutional)
    |-- Configurar opcoes (idioma, cores, tier destaque)
    |-- presentationRAGService: extrair contexto org/projeto
    |-- presentationContentGenerator: gerar conteudo por slide
    |-- presentationPrompts: prompts especificos por tipo
    |-- Zod validation (presentationContentSchemas)
    |-- Exportar PPTX (base64 → download)
```

---

## Sponsorship Tiers & Prospect CRM

### Pipeline Kanban

```
Prospect → Engaged → Proposed → Committed → Paid
```

- `ProspectPipeline.tsx` - Kanban view
- `ProspectCard.tsx` - Card por prospect
- Atividades: calls, emails, meetings, WhatsApp
- Reminders: follow-up tasks com alertas
- Metricas: conversao, receita capturada, pipeline value

### Tier Management

```typescript
SponsorshipTier {
  name, description, amount, quantity, quantity_sold, display_order
  deliverables: TierDeliverable[]
}
```

---

## Status Lifecycle

### Oportunidade

```
draft → open → closed → archived
```

### Projeto

```
draft → briefing → generating → review → submitted → approved → rejected
```

### Resposta

```
draft → editing → generated → approved
```

- Auto-submit trigger: quando TODAS as respostas estao `approved`, projeto muda para `submitted`

---

## Padroes Criticos

### SEMPRE:
- Processar PDF via Edge Function `process-edital` (nunca client-side)
- File Search indexing gera `gemini_file_name` no formato `files/abc123`
- Auto-save com debounce 2s via `useAutoSave`
- Versionar respostas em `grant_responses`
- RLS em todas as tabelas (filtro por user_id)
- Token tracking via `aiUsageTrackingService`

### NUNCA:
- Upload de PDF direto no frontend sem Edge Function
- Chamar Gemini sem contexto do edital (always include edital text + criteria)
- Gerar campo sem verificar max_chars do FormField
- Skip do versionamento de respostas

---

## Agencias de Fomento Suportadas

| Agencia | Tipo |
|---------|------|
| FAPERJ | Estadual (RJ) |
| FAPESP | Estadual (SP) |
| FINEP | Federal |
| CNPq | Federal |
| CAPES | Federal |
| PRONAC (Lei Rouanet) | Lei de Incentivo |
| SUDENE | Regional (Nordeste) |
| SUDAM | Regional (Norte) |

### Leis de Incentivo

`incentiveLawService.ts` fornece lookup de beneficios fiscais por lei. Usado em `IncentiveLawCard.tsx` e `IncentiveLawSlide` (deck).
