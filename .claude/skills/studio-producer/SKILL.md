---
name: studio-producer
description: Produtor de Podcast - especialista no modulo Studio (producao de podcasts, pesquisa de convidados, dossie, pauta, teleprompter, gravacao). Use quando trabalhar com podcast shows, episodes, guest research, pauta generation, teleprompter, ou production workflow.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Studio Producer - Produtor de Podcast

Especialista no modulo de producao de podcasts do AICA Life OS. Gerencia shows, episodios, pesquisa de convidados, geracao de pautas (estilo NotebookLM), teleprompter e gravacao.

---

## Arquitetura do Modulo

```
src/modules/studio/
|-- components/
|   |-- workspace/
|   |   |-- SetupStage.tsx           # Estagio 1: Identificacao do convidado
|   |   |-- ResearchStage.tsx        # Estagio 2: Dossie + pesquisa
|   |   |-- PautaStage.tsx           # Estagio 3: Pauta + drag-and-drop
|   |   |-- ProductionStage.tsx      # Estagio 4: Gravacao
|   |   |-- PodcastWorkspace.tsx     # Container principal
|   |   |-- StageRenderer.tsx        # Lazy-load com Framer Motion
|   |   |-- StageStepper.tsx         # Navegacao entre estagios
|   |   |-- WorkspaceHeader.tsx      # Breadcrumb + save status
|   |   |-- PautaGeneratorPanel.tsx  # UI de geracao AI
|   |   |-- GuestTypeSelector.tsx    # public_figure | common_person
|   |   |-- GuestInfoForm.tsx        # Formulario de contato
|   |-- TeleprompterWindow.tsx       # Tela cheia para gravacao
|   |-- CreatePodcastDialog.tsx      # Dialog de criacao rapida
|-- context/
|   |-- PodcastWorkspaceContext.tsx   # Estado do workspace (40+ actions)
|   |-- StudioContext.tsx            # Estado do modulo (library/wizard/workspace)
|-- hooks/
|   |-- useWorkspaceState.ts         # Carregar do banco
|   |-- useAutoSave.ts              # Auto-save 2s debounce
|   |-- useWorkspaceAI.ts           # Todas ops AI (dossie, search, pauta)
|   |-- useStudioData.ts            # Shows + episodes listing
|   |-- useSavedPauta.ts            # Versoes de pautas salvas
|   |-- usePodcastFileSearch.ts     # File Search para docs
|   |-- usePodcastQuickSearch.ts    # Busca rapida
|-- services/
|   |-- podcastAIService.ts         # Dossie, search, suggestions
|   |-- pautaGeneratorService.ts    # Geracao estilo NotebookLM
|   |-- geminiLiveService.ts        # Chat real-time (WebSocket/SSE)
|   |-- pautaPersistenceService.ts  # Salvar pautas no banco
|   |-- workspaceDatabaseService.ts # CRUD do workspace
|-- types/
|   |-- studio.ts                   # StudioMode, ProjectType, StudioProject
|   |-- podcast.ts                  # PodcastShow
|   |-- podcast-workspace.ts        # PodcastStageId, SetupState, ResearchState, PautaState, ProductionState, Topic, Dossier, TechnicalSheet, SavedPauta
|-- views/
|   |-- StudioLibrary.tsx           # Listagem de shows/episodios
|   |-- StudioWizard.tsx            # Criacao de episodio
|   |-- StudioMainView.tsx          # Container principal
|   |-- StudioWorkspace.tsx         # Router de workspace
|   |-- PodcastShowPage.tsx         # Pagina de um show
```

---

## Workflow: 4 Estagios de Producao

### Estagio 1: Setup (Identificacao)

```
GuestTypeSelector → public_figure | common_person
    |
    v
GuestInfoForm
    |-- Nome do convidado
    |-- Referencia (URL/Wikipedia)
    |-- Telefone, email
    |-- Tema do episodio (manual ou AI suggest)
    |-- Season, location, data/hora
    |
    v [AI opcional]
useWorkspaceAI.searchGuestProfile(name, reference)
    → Retorna bio, redes sociais, relevancia
useWorkspaceAI.suggestTrendingTheme(guestName)
    → Sugere tema baseado no convidado
```

### Estagio 2: Research (Pesquisa)

```
useWorkspaceAI.generateDossier(guestName, theme, customSources)
    |
    v (gemini-2.5-pro, ~5-8s)
Dossier {
    guestName, episodeTheme
    biography          # Biografia completa
    technicalSheet     # Ficha tecnica estruturada
    controversies[]    # Polemicas e controversias
    suggestedTopics[]  # Topicos sugeridos
    iceBreakers[]      # Quebra-gelos
}
    |
    v
3 abas: Biografia | Ficha Tecnica | Noticias

Custom Sources:
    |-- Texto (colar conteudo)
    |-- URL (link para artigo)
    |-- Arquivo (upload PDF/doc)

Deep Research:
    |-- useWorkspaceAI.deepResearch(query)
    |-- Google Search grounding para info atualizada
    |-- File Search para docs indexados

Gemini Live Chat:
    |-- geminiLiveService.setContext(guest, bio, theme)
    |-- Chat real-time para preparar entrevista
    |-- WebSocket → Edge Function gemini-live
```

### Estagio 3: Pauta (Roteiro)

```
PautaGeneratorPanel
    |-- Configurar PautaStyle:
    |     tone: formal | casual | investigativo | humano
    |     depth: shallow | medium | deep
    |     focusAreas: string[]
    |
    v
pautaGeneratorService.generatePauta(request)
    |
    v (deep_research action, ~8-12s)
GeneratedPauta {
    outline: { title, introduction, mainSections[], conclusion }
    questions: PautaQuestion[]
    iceBreakers: string[]
    sources: SourceCitation[]
    researchSummary: string
    estimatedDuration: number
    confidenceScore: number
}
    |
    v
Preview + editar antes de salvar
    |
    v
Converte para Topic[] + TopicCategory[]
    |-- quebra-gelo (ice breakers)
    |-- geral (topicos principais)
    |-- patrocinador (sponsor reads)
    |-- polemicas (controversias)
    |-- aprofundamento (deep dives)
    |-- fechamento (encerramento)

Drag-and-drop reordenamento (@dnd-kit)
Versao salva em podcast_generated_pautas
```

### Estagio 4: Production (Gravacao)

```
ProductionStage
    |-- Start Recording → timer real-time
    |-- Topic Checklist com current topic tracking
    |-- Pause / Resume / Stop
    |
    v
TeleprompterWindow (tela cheia)
    |-- Texto grande para leitura a distancia
    |-- Auto-scroll para scripts de patrocinador
    |-- Navegacao: setas / space / escape
    |-- Velocidade ajustavel (0-5)
    |-- Indicador de categoria (icone + emoji)
    |
    v
Ao finalizar:
    recording_duration, recording_started_at, recording_finished_at
    Auto-save via useAutoSave
```

---

## Tabelas do Banco

| Tabela | Proposito |
|--------|-----------|
| `podcast_shows` | Shows de podcast (titulo, descricao, capa) |
| `podcast_episodes` | Episodios (guest, theme, schedule, recording) |
| `podcast_guest_research` | Dossie do convidado (bio, ficha tecnica, controversias) |
| `podcast_topics` | Perguntas/topicos do episodio (ordem, categoria, sponsor_script) |
| `podcast_topic_categories` | Categorias de topicos (quebra-gelo, geral, etc.) |
| `podcast_generated_pautas` | Pautas geradas (versionamento, is_active) |
| `podcast_pauta_outline_sections` | Secoes do outline (intro, main, conclusion) |
| `podcast_pauta_questions` | Perguntas da pauta (categoria, follow-ups, prioridade) |
| `podcast_pauta_sources` | Fontes citadas (URL, texto, arquivo, reliability) |
| `podcast_team_members` | Membros da equipe do show |

---

## Integracoes AI

| Feature | Edge Function | Modelo | Tempo |
|---------|---------------|--------|-------|
| Buscar perfil | `gemini-chat` | smart (2.5-pro) | 3-5s |
| Gerar dossie | `gemini-chat` | smart (2.5-pro) | 5-8s |
| Sugerir tema | `gemini-chat` | smart (2.5-pro) | 2-4s |
| Sugerir convidado | `gemini-chat` | smart (2.5-pro) | 2-4s |
| Deep research | `gemini-chat` | smart (2.5-pro) | 8-12s |
| Gerar pauta | `gemini-chat` | smart (2.5-pro) | 8-12s |
| Mais ice breakers | `gemini-chat` | smart (2.5-pro) | 3-5s |
| Chat real-time | `gemini-live` | flash (2.5-flash) | streaming |
| File Search | `file-search` | RAG | 2-4s |

### GeminiClient Actions

```typescript
const client = GeminiClient.getInstance()

// Dossie
client.call({ action: 'generate_dossier', payload: { guestName, theme, customSources }, model: 'smart' })

// Busca de perfil
client.call({ action: 'search_guest_profile', payload: { name, reference }, model: 'smart' })

// Sugestao de tema
client.call({ action: 'suggest_theme', payload: { guestName }, model: 'smart' })

// Deep research
client.call({ action: 'deep_research', payload: { query, options }, model: 'smart' })
```

---

## Dossier Structure

```typescript
interface Dossier {
  guestName: string
  episodeTheme: string
  biography: string              // Texto livre, ~500-1000 palavras
  technicalSheet: TechnicalSheet // Ficha estruturada
  controversies: Controversy[]   // Polemicas com fontes
  suggestedTopics: string[]      // 10-15 topicos sugeridos
  iceBreakers: string[]          // 5-8 quebra-gelos
}

interface TechnicalSheet {
  fullName, nicknames, birthInfo, familyInfo
  residenceHistory, education, careerHighlights
  preferences, socialMedia, keyFacts
}
```

---

## Auto-Save Sanitization

O `useAutoSave` faz sanitizacao critica antes de salvar:

- Strings vazias → `null` para campos DATE/TIME/INTEGER (evita constraint violations)
- UUIDs invalidos (ex: "topic_1766361842098") → removidos (DB gera novos)
- Debounce de 2 segundos
- `isDirty` flag controla quando salvar

---

## Stage Completion Logic

Determinado dinamicamente (nao armazenado):

| Estagio | Complete quando |
|---------|----------------|
| Setup | tem `guest_name` |
| Research | tem `biography` |
| Pauta | tem `topics` (length > 0) |
| Production | tem `recording_started_at` |

---

## Padroes Criticos

### SEMPRE:
- AI calls via `useWorkspaceAI` (que usa GeminiClient → Edge Functions)
- Dossie em `podcast_guest_research` (NAO em `podcast_episodes`)
- Pauta versionada: so uma `is_active` por episodio
- Sanitizar payload antes de save (empty strings → null)
- Validar UUIDs antes de upsert em topics/categories

### NUNCA:
- Chamar Gemini direto no frontend (API keys em backend)
- Salvar string vazia em campo DATE/TIME/INTEGER
- Gerar dossie sem nome do convidado
- Gerar pauta sem contexto (dossie ou pelo menos guest name + theme)
- Pular auto-save debounce (pode causar race conditions)

---

## Teleprompter Shortcuts

| Tecla | Acao |
|-------|------|
| `→` / `↓` | Proximo topico |
| `←` / `↑` | Topico anterior |
| `Space` | Toggle auto-scroll |
| `Escape` | Fechar teleprompter |
| `+` / `-` | Ajustar velocidade |

---

## Topic Categories (Default)

| Categoria | Cor | Uso |
|-----------|-----|-----|
| `quebra-gelo` | blue | Perguntas leves para aquecer |
| `geral` | green | Topicos principais |
| `patrocinador` | yellow | Leitura de patrocinador (com sponsor_script) |
| `polemicas` | red | Controversias e temas delicados |
| `aprofundamento` | purple | Deep dives em temas especificos |
| `fechamento` | gray | Perguntas de encerramento |
