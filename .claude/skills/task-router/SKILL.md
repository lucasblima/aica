---
name: task-router
description: Roteamento inteligente de tarefas para agentes especializados. Use /task-router para delegar automaticamente qualquer task ao agente correto.
---

# Task Router - Delegacao Inteligente

Analisa a tarefa solicitada e executa usando a estrategia mais eficiente do Claude Code, delegando para skills especializadas quando aplicavel.

---

## Como Funciona

Quando o usuario invoca `/task-router <descricao>`, siga este fluxo:

```
1. Classificar a tarefa (tipo + dominio)
2. Verificar se ha skill especializada para o dominio
3. Se sim: delegar via /skill-name com contexto
4. Se nao: escolher estrategia generica (Explore, Plan, Edit)
5. Executar com tools apropriadas
6. Reportar resultado
```

---

## Skills Disponiveis (Registro de Agentes)

| Skill | Comando | Dominio | Quando Delegar |
|-------|---------|---------|----------------|
| **Journey Guide** | `/journey-guide` | Autoconhecimento | Moments, CP, streaks, daily questions, weekly summaries, heatmap, emotions, unified timeline |
| **Grants Architect** | `/grants-architect` | Captacao | Editais, propostas, FAPERJ/FINEP/CNPq, organizacoes, patrocinadores, decks, PDF parsing, File Search |
| **Studio Producer** | `/studio-producer` | Podcast | Shows, episodes, guest research, dossie, pauta, teleprompter, recording, production workflow |
| **Atlas Strategist** | `/atlas-strategist` | Tarefas | Eisenhower Matrix, work_items, priority, subtasks, recurrence, efficiency metrics, daily reports |
| **Connections Network** | `/connections-network` | CRM/WhatsApp | Spaces, members, 4 arquetipos (habitat/ventures/academia/tribo), WhatsApp, split payments, health score |
| **Finance Analyst** | `/finance-analyst` | Financas | Transactions, statements, CSV/PDF upload, budget, AI agent chat, categorization |
| **Flux Trainer** | `/flux-trainer` | Treinos | Athletes, workout blocks, 12-week canvas, alerts, feedback, WhatsApp messages, 4 modalities |
| **Gamification Engine** | `/gamification-engine` | XP/Badges | XP, CP, 27 badges, streak trends, grace periods, recovery, levels, RECIPE framework |
| **Supabase Database** | `/supabase-database` | Banco de Dados | Migrations, queries, RLS, schema, Edge Functions, RPCs, tabelas |
| **Task Router** | `/task-router` | Meta (este) | Roteamento geral, tarefas ambiguas, multi-dominio |

### Skills Futuras (Roadmap)

| Skill Planejada | Dominio | Status |
|-----------------|---------|--------|
| `ceramic-designer` | Design System | Pendente |
| `security-guardian` | LGPD/Seguranca | Pendente |

---

## Classificacao de Tarefas

### Por Tipo de Trabalho

| Tipo | Sinais | Estrategia |
|------|--------|------------|
| **Pesquisa** | "onde fica", "como funciona", "encontre" | Explore agent ou Grep/Glob direto |
| **Planejamento** | "planeje", "arquitetura", "design", "como implementar" | EnterPlanMode |
| **Implementacao** | "crie", "implemente", "adicione", "corrija" | Skill especializada ou editar codigo |
| **Database** | "migration", "tabela", "RLS", "schema" | `/supabase-database` |
| **Debug** | "erro", "bug", "nao funciona", "500" | Explore agent + skill do dominio |
| **Review** | "revise", "analise", "melhore" | Read + analise + skill do dominio |
| **Deploy** | "deploy", "publicar" | Confirmar com usuario (NUNCA auto-deploy) |

### Por Dominio do Projeto

| Dominio | Keywords | Skill | Paths Principais |
|---------|----------|-------|-----------------|
| **Journey** | moment, streak, consciousness, heatmap, emotion, CP, daily question, weekly summary | `/journey-guide` | `src/modules/journey/` |
| **Grants** | edital, FAPERJ, captacao, grant, proposal, organization, sponsor, deck, PDF | `/grants-architect` | `src/modules/grants/` |
| **Studio** | podcast, episode, guest, pauta, dossie, teleprompter, recording, show | `/studio-producer` | `src/modules/studio/` |
| **Atlas** | task, work_item, Eisenhower, prioridade, project, priority matrix | `/atlas-strategist` | `src/components/domain/` |
| **Connections** | WhatsApp, contato, pairing, CRM, contact_network, habitat, ventures, academia, tribo, space | `/connections-network` | `src/modules/connections/` |
| **Finance** | transacao, extrato, orcamento, budget, CSV, statement, bank | `/finance-analyst` | `src/modules/finance/` |
| **Flux** | treino, atleta, workout, block, coach, modality, swimming, running | `/flux-trainer` | `src/modules/flux/` |
| **Gamification** | XP, badge, achievement, level, streak, grace period, recovery, CP | `/gamification-engine` | `src/services/gamificationService.ts`, `src/types/badges.ts` |
| **Chat/AI** | Gemini, chat, prompt, embedding | Explore + `/supabase-database` | `src/lib/gemini/`, `supabase/functions/gemini-chat/` |
| **Auth** | login, OAuth, PKCE, sessao | Explore | `src/hooks/useAuth.ts` |
| **Design** | UI, componente, Ceramic, layout | *(futuro)* | `src/components/`, `tailwind.config.js` |
| **Infra** | Edge Function, deploy, Cloud Run | `/supabase-database` | `supabase/functions/`, `cloudbuild.yaml` |

---

## Arvore de Decisao

```
TAREFA RECEBIDA
    |
    v
[1] Identificar DOMINIO (keywords acima)
    |
    |-- Journey? -------> Carregar /journey-guide → executar com contexto
    |-- Grants? --------> Carregar /grants-architect → executar com contexto
    |-- Studio? --------> Carregar /studio-producer → executar com contexto
    |-- Atlas? ---------> Carregar /atlas-strategist → executar com contexto
    |-- Connections? ---> Carregar /connections-network → executar com contexto
    |-- Finance? -------> Carregar /finance-analyst → executar com contexto
    |-- Flux? ----------> Carregar /flux-trainer → executar com contexto
    |-- Gamification? --> Carregar /gamification-engine → executar com contexto
    |-- Database? ------> Carregar /supabase-database → executar com contexto
    |-- Multi-dominio? → EnterPlanMode (planejar antes)
    |-- Nenhum match? → Continuar para [2]
    |
    v
[2] Identificar TIPO (pesquisa/plan/impl/debug/deploy)
    |
    |-- Pesquisa simples (<3 queries)? → Glob/Grep direto
    |-- Pesquisa profunda? → Task tool com Explore agent
    |-- Planejamento? → EnterPlanMode
    |-- Implementacao clara? → Read + Edit direto
    |-- Debug? → Explore agent + ler logs
    |-- Deploy? → Confirmar com usuario + fornecer comando
    |
    v
[3] Executar e reportar resultado
```

---

## Estrategias de Execucao

### 1. Delegacao para Skill Especializada

Quando o dominio tem skill dedicada, delegar com contexto:

```
Input:  "Adicionar nova emocao no EmotionPicker"
Dominio: Journey → /journey-guide
Contexto: EmotionPicker.tsx em src/modules/journey/components/capture/
           AVAILABLE_EMOTIONS em types/moment.ts
Acao:   Ler componente + types → adicionar emocao → verificar build
```

```
Input:  "Gerar deck para projeto FAPERJ"
Dominio: Grants → /grants-architect
Contexto: SponsorDeckGenerator, presentationRAGService, slides/
Acao:   Verificar projeto existente → configurar template → gerar
```

```
Input:  "Melhorar o dossie de convidados"
Dominio: Studio → /studio-producer
Contexto: podcastAIService.generateDossier(), Dossier interface
Acao:   Ler prompt atual → melhorar → testar com GeminiClient
```

### 2. Busca Rapida (< 3 queries)

Para perguntas simples sobre o codebase, usar Glob/Grep diretamente:

```
"Onde fica o hook de autenticacao?" → Glob: src/**/useAuth*
"Qual tabela guarda momentos?" → Grep: "moments" em migrations/
"Quais Edge Functions existem?" → Glob: supabase/functions/*/index.ts
```

### 3. Exploracao Profunda

Para investigacoes que precisam de contexto amplo, usar Task tool com Explore agent:

```
"Como funciona o pipeline WhatsApp?" → Explore: webhook-evolution + extract-intent + contact_network
"Qual o fluxo de autenticacao completo?" → Explore: useAuth + supabaseClient + AuthGuard
```

### 4. Planejamento Arquitetural

Para features complexas ou multi-dominio, usar EnterPlanMode:

```
"Implementar notificacoes push" → EnterPlanMode (afeta backend + frontend + infra)
"Migrar para File Search V2" → EnterPlanMode (afeta Edge Functions + hooks + tipos)
"Adicionar modulo Academia" → EnterPlanMode (novo modulo completo)
```

### 5. Implementacao Direta

Para tarefas claras e delimitadas, editar codigo:

```
"Corrigir typo no header" → Read + Edit
"Adicionar campo na tabela" → /supabase-database + nova migration
"Atualizar modelo Gemini" → Edit nos arquivos relevantes
```

---

## Exemplos de Roteamento Avancado

### Exemplo 1: Feature no Journey
```
Input:  "Criar nova categoria de pergunta diaria: 'criatividade'"
Tipo:   Implementacao
Dominio: Journey
Skill:  /journey-guide
Acao:   1. Consultar tipos em types/dailyQuestion.ts (QuestionCategory)
        2. Adicionar 'creativity' ao union type
        3. Adicionar cor e icone em QUESTION_CATEGORY_COLORS/ICONS
        4. Atualizar DailyQuestionCard para exibir
        5. Verificar generate-questions Edge Function
```

### Exemplo 2: Workspace de Grants
```
Input:  "Smart Copy nao gera texto para campo 'Justificativa'"
Tipo:   Debug
Dominio: Grants
Skill:  /grants-architect
Acao:   1. Verificar DraftingStage → generateField(fieldId)
        2. Verificar grantAIService.generateFieldContent()
        3. Checar se FormField tem ai_prompt_hint
        4. Testar prompt com contexto do edital
        5. Fix no servico ou no prompt
```

### Exemplo 3: Producao de Podcast
```
Input:  "Teleprompter nao mostra script do patrocinador"
Tipo:   Debug
Dominio: Studio
Skill:  /studio-producer
Acao:   1. Verificar TeleprompterWindow.tsx (sponsor_script prop)
        2. Verificar Topic.sponsorScript no workspace state
        3. Verificar se auto-save persiste sponsor_script
        4. Fix no componente ou no save
```

### Exemplo 4: Database + Journey (Multi-Dominio)
```
Input:  "Criar tabela de metas de consciencia com sistema de XP"
Tipo:   Database + Implementacao
Dominio: Journey + Database
Skills: /supabase-database (migration) + /journey-guide (integracao)
Acao:   1. /supabase-database: Criar migration com tabela + RLS
        2. /journey-guide: Integrar com consciousnessPointsService
        3. Criar hook useConsciousnessGoals
        4. Adicionar UI no JourneyFullScreen
```

### Exemplo 5: Deploy Request
```
Input:  "Fazer deploy do staging"
Tipo:   Deploy
Acao:   1. Confirmar com usuario
        2. Verificar: npm run build && npm run typecheck
        3. Fornecer comando (NAO executar automaticamente):
           gcloud builds submit --config=cloudbuild.yaml \
             --region=southamerica-east1 \
             --project=gen-lang-client-0948335762 \
             --substitutions=_SERVICE_NAME=aica-dev,_DEPLOY_REGION=us-central1,_VITE_FRONTEND_URL=https://dev.aica.guru
```

---

## Regras de Roteamento

### SEMPRE fazer:

1. **Classificar ANTES de agir** - Identificar tipo + dominio
2. **Delegar para skill quando existir** - Skills tem conhecimento profundo do dominio
3. **Ler antes de editar** - Nunca propor mudancas em codigo nao lido
4. **Usar TaskCreate para tarefas complexas** - 3+ etapas = criar task list
5. **Confirmar antes de acoes destrutivas** - Deploy, delete, reset
6. **Verificar CLAUDE.md** - Seguir convencoes do projeto

### NUNCA fazer:

1. **Auto-deploy** - Deploy e exclusivo do usuario
2. **Expor API keys** - Sempre via Edge Functions
3. **Criar backups manuais** - Git e o backup
4. **Pular RLS** - Toda tabela nova precisa de policies
5. **Adivinhar schema** - Verificar migrations antes
6. **Ignorar skill disponivel** - Se existe skill para o dominio, usar

---

## Checklist Pre-Execucao

Antes de executar qualquer tarefa complexa:

- [ ] Tipo de tarefa identificado (pesquisa/plan/impl/debug/db/deploy)
- [ ] Dominio do projeto identificado
- [ ] Skill especializada verificada (journey-guide, grants-architect, studio-producer, supabase-database)
- [ ] Se skill existe: conhecimento do dominio carregado
- [ ] Arquivos relevantes lidos
- [ ] Estrategia de execucao escolhida
- [ ] Convencoes do CLAUDE.md respeitadas
- [ ] Se multi-step: TaskCreate usado para tracking
