---
name: task-router
description: Roteamento inteligente de tarefas para agentes especializados. Use /task-router para delegar automaticamente qualquer task ao agente correto.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, Agent
---

# Task Router - Delegacao Inteligente

Analisa a tarefa solicitada e roteia para a skill especializada correta, respeitando o Session Protocol do AICA.

---

## Fluxo Principal

O task-router opera DENTRO do Session Protocol — nunca o substitui.

```
SESSAO INICIADA
    |
    v
[0] NAME — Sugerir nome de sessao, aguardar aprovacao
    |
    v
[1] CLARIFY — Perguntar 2-4 duvidas sobre a tarefa (se nao trivial)
    |
    v
[2] ROUTE — Classificar tarefa (este skill)
    |   |
    |   |-- Estimar complexidade (trivial/baixa/media/alta)
    |   |-- Identificar dominio (keywords + paths)
    |   |-- Escolher skill ou estrategia
    |   |-- Se confianca < 70%: confirmar dominio com usuario
    |   |
    v
[3] TEAM — Decidir execucao baseado na complexidade:
    |   |
    |   |-- Trivial/Baixa: executar solo (sem perguntar)
    |   |-- Media/Alta: perguntar "Ativar Agent Team?" + sugerir composicao
    |   |
    v
[4] EXECUTE — Delegar para skill ou executar direto
    |
    v
[5] VERIFY — Verificar resultado (build/typecheck/diff)
    |
    v
[6] PR — Feature branch + Pull Request (se houve mudancas)
```

**REGRA**: Steps 0-1 sao do Session Protocol. O router entra no Step 2.
Se invocado via `/task-router <tarefa>`, assume que Steps 0-1 ja ocorreram.

---

## Skills Disponiveis

| Skill | Comando | Dominio | Keywords |
|-------|---------|---------|----------|
| **Atlas Strategist** | `/atlas-strategist` | Tarefas | work_item, Eisenhower, prioridade, subtask, recurrence, project |
| **Journey Guide** | `/journey-guide` | Autoconhecimento | moment, streak, CP, consciousness, heatmap, emotion, daily question |
| **Studio Producer** | `/studio-producer` | Podcast | episode, guest, pauta, dossie, teleprompter, show, recording |
| **Grants Architect** | `/grants-architect` | Captacao | edital, FAPERJ, grant, proposal, sponsor, deck, PDF |
| **Connections Network** | `/connections-network` | CRM/WhatsApp | WhatsApp, contato, space, habitat, ventures, academia, tribo |
| **Finance Analyst** | `/finance-analyst` | Financas | transacao, extrato, budget, CSV, statement, bank |
| **Flux Trainer** | `/flux-trainer` | Treinos | atleta, workout, block, coach, modality, swimming, running |
| **Gamification Engine** | `/gamification-engine` | XP/Badges | XP, badge, achievement, level, grace period, recovery |
| **Agenda Planner** | `/agenda-planner` | Calendario | calendar, evento, reuniao, agendamento, sync, Google Calendar |
| **Supabase Database** | `/supabase-database` | Banco de Dados | migration, tabela, RLS, schema, Edge Function, RPC |
| **Task Router** | `/task-router` | Meta (este) | roteamento, delegar, qual skill |

### Skills Futuras

| Skill | Dominio | Criterio para criar |
|-------|---------|---------------------|
| `ceramic-designer` | Design System | Quando acumular 3+ tarefas de UI/design roteadas para fallback generico |
| `security-guardian` | LGPD/Seguranca | Quando acumular 3+ tarefas de seguranca roteadas para fallback generico |

---

## Scoring de Complexidade

Antes de rotear, estimar complexidade para decidir autonomia:

| Complexidade | Sinais | Autonomia | Team? |
|---|---|---|---|
| **Trivial** | 1 arquivo, <10 linhas, sem decisao | Executar direto | Nao perguntar |
| **Baixa** | 1-2 arquivos, escopo claro, padrao existente | Executar direto | Nao perguntar |
| **Media** | 3-5 arquivos, alguma decisao, novo componente | Sugerir + perguntar | Perguntar usuario |
| **Alta** | 6+ arquivos, multi-dominio, nova arquitetura | EnterPlanMode | Perguntar usuario |

### Como estimar

```
Complexidade = max(arquivos_afetados, decisoes_necessarias, dominios_envolvidos)

1 arquivo, 0 decisoes, 1 dominio    → Trivial
2 arquivos, 0-1 decisoes, 1 dominio → Baixa
3-5 arquivos, 1-2 decisoes, 1-2 dom → Media
6+ arquivos OU 3+ decisoes OU 3+ dom → Alta
```

---

## Resolucao de Overlap

**Regra unica: o modulo que CONSOME o dado lidera; o que PRODUZ o dado apoia.**

Exemplos:
- "Calcular CP de um momento" → `/journey-guide` lidera (Journey consome moments para gerar CP)
- "Badge de streak do Journey" → `/gamification-engine` lidera (Gamification consome streak data para gerar badge)
- "Dossier de convidado WhatsApp" → `/studio-producer` lidera (Studio consome contato para gerar dossier)
- "Sync tarefa Atlas no Google Calendar" → `/agenda-planner` lidera (Agenda consome work_item para gerar evento)

Na duvida: rotear para o dominio mais proximo do **objetivo final** do usuario.

---

## Arvore de Decisao

```
TAREFA RECEBIDA
    |
    v
[1] Estimar COMPLEXIDADE (trivial/baixa/media/alta)
    |
    v
[2] Identificar DOMINIO (keywords + paths afetados)
    |
    |-- Match unico?  → Delegar para skill
    |-- Match duplo?   → Aplicar regra de overlap (consumidor lidera)
    |-- Multi-dominio? → Se media+: EnterPlanMode. Se baixa: skill principal + apoio
    |-- Nenhum match?  → Continuar para [3]
    |
    v
[3] Identificar TIPO (sem skill dedicada)
    |
    |-- Pesquisa simples (<3 queries)  → Glob/Grep direto
    |-- Pesquisa profunda              → Task tool com Explore agent
    |-- Planejamento                   → EnterPlanMode
    |-- Implementacao clara            → Read + Edit direto
    |-- Debug                          → Explore agent + ler logs
    |-- Deploy                         → Sub-classificar (ver abaixo) + confirmar
    |
    v
[4] Executar
    |
    v
[5] Verificar resultado (ver pos-execucao)
```

---

## Confianca no Roteamento

Nem sempre o dominio e obvio. Usar nivel de confianca:

| Confianca | Quando | Acao |
|---|---|---|
| **Alta (>80%)** | Keywords claros, path explicito, modulo unico | Delegar direto |
| **Media (50-80%)** | Keywords ambiguos, 2 dominios possiveis | Informar: "Identifiquei como [dominio]. Correto?" |
| **Baixa (<50%)** | Sem keywords claros, tarefa generica | AskUserQuestion com opcoes de dominio |

Exemplos de confianca baixa:
- "Melhora o desempenho" → Qual modulo? Qual tipo de desempenho?
- "Corrige o bug" → Bug em qual parte? Frontend? Backend? AI?
- "Adiciona validacao" → Em qual formulario? Qual campo?

---

## Sub-Classificacao de Deploy

Deploy nao e uma coisa so. Classificar pelo artefato alterado:

| Artefato Alterado | Tipo de Deploy | Comando |
|---|---|---|
| `src/**` (frontend) | Cloud Run | `gcloud builds submit --config=cloudbuild.yaml ...` |
| `supabase/functions/**` | Edge Functions | `npx supabase functions deploy <name> --no-verify-jwt` |
| `supabase/migrations/**` | Database | `npx supabase db push` |
| Multiplos | Combinado | Listar todos os deploys necessarios em ordem |

**Ordem de deploy quando combinado**: Database → Edge Functions → Frontend

**NUNCA** executar deploy automaticamente. Sempre:
1. Listar quais deploys sao necessarios
2. Confirmar com usuario
3. Executar um por um, validando cada etapa

---

## Verificacao Pos-Execucao

Apos qualquer execucao que modifique codigo, verificar:

| Tipo de Mudanca | Verificacao | Comando |
|---|---|---|
| Codigo TypeScript | Build + typecheck | `npm run build && npm run typecheck` |
| Migration SQL | Diff preview | `npx supabase db diff` |
| Edge Function | CORS + extractJSON | Ler arquivo e validar padrao |
| Componente React | Ceramic compliance | Verificar tokens semanticos |

Se a verificacao falhar:
1. Tentar corrigir automaticamente (1 tentativa)
2. Se falhar novamente: reportar erro ao usuario com diagnostico
3. **NUNCA** ignorar falha de build/typecheck

---

## Fallback e Escalacao

Quando algo da errado no roteamento:

```
Skill delegada falhou?
    |
    |-- Erro de dominio (skill errada)
    |   → Re-rotear para skill correta
    |   → Registrar correcao em memory (routing-corrections.md)
    |
    |-- Erro de execucao (skill correta, mas falhou)
    |   → Explore agent para investigar
    |   → Se resolvido: continuar
    |   → Se nao: AskUserQuestion com diagnostico
    |
    |-- Tarefa mais complexa que estimado
    |   → Upgrade complexidade (ex: baixa → media)
    |   → Se virou media+: perguntar sobre Agent Team
    |
    NUNCA silenciar erro. SEMPRE reportar.
```

---

## Estrategias de Execucao

### 1. Delegacao para Skill

```
Input:  "Criar nova categoria de pergunta diaria: criatividade"
Complexidade: Baixa (2 arquivos, 1 dominio)
Dominio: Journey (keyword: pergunta diaria)
Confianca: Alta
Skill:  /journey-guide
Team:   Nao (baixa complexidade)
```

### 2. Busca Rapida

```
Input:  "Onde fica o hook de autenticacao?"
Complexidade: Trivial
Tipo:   Pesquisa
Acao:   Glob: src/**/useAuth*
```

### 3. Exploracao Profunda

```
Input:  "Como funciona o pipeline WhatsApp?"
Complexidade: Trivial (pesquisa, nao muda codigo)
Tipo:   Pesquisa profunda
Acao:   Task tool com Explore agent
```

### 4. Multi-Dominio

```
Input:  "Criar tabela de metas de consciencia com sistema de XP"
Complexidade: Alta (DB + Journey + Gamification)
Dominios: 3 (database, journey, gamification)
Confianca: Alta
Acao:   EnterPlanMode → planejar → perguntar Team → executar
Skills: /supabase-database (migration) + /journey-guide (integracao) + /gamification-engine (XP)
```

### 5. Deploy

```
Input:  "Fazer deploy do staging"
Complexidade: Trivial (comando unico)
Tipo:   Deploy
Acao:   1. Verificar quais artefatos mudaram (git diff)
        2. Listar deploys necessarios
        3. Confirmar com usuario
        4. npm run build && npm run typecheck
        5. Fornecer comando(s)
```

---

## Dominio por Path

Quando keywords sao ambiguos, usar o path dos arquivos afetados:

| Path | Dominio | Skill |
|------|---------|-------|
| `src/modules/journey/` | Journey | `/journey-guide` |
| `src/modules/grants/` | Grants | `/grants-architect` |
| `src/modules/studio/` | Studio | `/studio-producer` |
| `src/modules/connections/` | Connections | `/connections-network` |
| `src/modules/finance/` | Finance | `/finance-analyst` |
| `src/modules/flux/` | Flux | `/flux-trainer` |
| `src/modules/google-hub/` | Agenda | `/agenda-planner` |
| `src/services/calendar*` | Agenda | `/agenda-planner` |
| `src/components/domain/` | Atlas | `/atlas-strategist` |
| `src/services/gamification*` | Gamification | `/gamification-engine` |
| `src/lib/gemini/` | Chat/AI | Explore + `/supabase-database` |
| `src/hooks/useAuth*` | Auth | Explore |
| `supabase/migrations/` | Database | `/supabase-database` |
| `supabase/functions/` | Infra | `/supabase-database` |

---

## Feedback Loop

Quando o usuario corrigir um roteamento (ex: "nao, isso e do modulo X, nao Y"):

1. Aceitar a correcao imediatamente
2. Re-rotear para o dominio correto
3. Registrar em `~/.claude/projects/.../memory/routing-corrections.md`:
   - Tarefa original
   - Dominio estimado (errado)
   - Dominio correto
   - Keywords que causaram confusao

Consultar `routing-corrections.md` no inicio de cada roteamento para evitar erros repetidos.

---

## Regras

### SEMPRE:
1. Respeitar Session Protocol (Name → Clarify → Route)
2. Estimar complexidade ANTES de rotear
3. Delegar para skill quando existir para o dominio
4. Verificar build/typecheck apos mudancas de codigo
5. Confirmar com usuario antes de deploy
6. Registrar correcoes de roteamento em memory

### NUNCA:
1. Pular Session Protocol (Name → Clarify → Ask Team)
2. Auto-criar Agent Team sem perguntar (media+ complexidade)
3. Auto-deploy (sempre confirmar)
4. Silenciar erros de skill ou build
5. Ignorar skill disponivel para o dominio
6. Adivinhar dominio com confianca baixa (perguntar)

---

## Checklist Pre-Execucao

- [ ] Complexidade estimada (trivial/baixa/media/alta)
- [ ] Dominio identificado (keywords + paths)
- [ ] Confianca avaliada (alta/media/baixa)
- [ ] Se confianca < 70%: dominio confirmado com usuario
- [ ] Skill selecionada (ou estrategia generica)
- [ ] Se media+: usuario decidiu sobre Agent Team
- [ ] routing-corrections.md consultado
