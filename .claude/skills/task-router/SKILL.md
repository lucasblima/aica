---
name: task-router
description: Roteamento inteligente de tarefas para agentes especializados. Use /task-router para delegar automaticamente qualquer task ao agente correto.
---

# Task Router - Delegacao Inteligente

Analisa a tarefa solicitada e executa usando a estrategia mais eficiente do Claude Code.

---

## Como Funciona

Quando o usuario invoca `/task-router <descricao>`, siga este fluxo:

```
1. Classificar a tarefa (tipo + dominio)
2. Escolher estrategia de execucao
3. Executar com tools apropriadas
4. Reportar resultado
```

---

## Classificacao de Tarefas

### Por Tipo de Trabalho

| Tipo | Sinais | Estrategia |
|------|--------|------------|
| **Pesquisa** | "onde fica", "como funciona", "encontre" | Explore agent ou Grep/Glob direto |
| **Planejamento** | "planeje", "arquitetura", "design", "como implementar" | EnterPlanMode |
| **Implementacao** | "crie", "implemente", "adicione", "corrija" | Editar codigo diretamente |
| **Database** | "migration", "tabela", "RLS", "schema" | /supabase-database skill + migrations |
| **Debug** | "erro", "bug", "nao funciona", "500" | Explore agent + Read logs |
| **Review** | "revise", "analise", "melhore" | Read + analise |
| **Deploy** | "deploy", "publicar" | Confirmar com usuario (NUNCA auto-deploy) |

### Por Dominio do Projeto

| Dominio | Keywords | Paths Principais |
|---------|----------|-----------------|
| **Journey** | moment, streak, consciousness, heatmap | `src/modules/journey/` |
| **Atlas** | task, work_item, Eisenhower, prioridade | `src/modules/atlas/` |
| **Studio** | podcast, episode, guest, pauta | `src/modules/studio/` |
| **Grants** | edital, FAPERJ, captacao, grant | `src/modules/grants/` |
| **Connections** | WhatsApp, contato, pairing, CRM | `src/modules/connections/` |
| **Finance** | transacao, extrato, orcamento | `src/modules/finance/` |
| **Flux** | treino, atleta, workout | `src/modules/flux/` |
| **Chat/AI** | Gemini, chat, prompt, embedding | `src/lib/gemini/`, `supabase/functions/gemini-chat/` |
| **Auth** | login, OAuth, PKCE, sessao | `src/hooks/useAuth.ts`, `src/services/supabaseClient.ts` |
| **Gamification** | XP, badge, achievement, streak, level | `src/components/features/Gamification*` |
| **Design** | UI, componente, Ceramic, layout | `src/components/`, `tailwind.config.ts` |
| **Infra** | Edge Function, deploy, Cloud Run | `supabase/functions/`, `cloudbuild.yaml` |

---

## Estrategias de Execucao

### 1. Busca Rapida (< 3 queries)

Para perguntas simples sobre o codebase, usar Glob/Grep diretamente:

```
"Onde fica o hook de autenticacao?" -> Glob: src/**/useAuth*
"Qual tabela guarda momentos?" -> Grep: "moments" em migrations/
"Quais Edge Functions existem?" -> Glob: supabase/functions/*/index.ts
```

### 2. Exploracao Profunda

Para investigacoes que precisam de contexto amplo, usar Task tool com Explore agent:

```
"Como funciona o pipeline WhatsApp?" -> Explore: webhook-evolution + extract-intent + contact_network
"Qual o fluxo de autenticacao completo?" -> Explore: useAuth + supabaseClient + AuthGuard
"Como os creditos funcionam?" -> Explore: claim-daily-credits + user_credits + spend_credits
```

### 3. Planejamento Arquitetural

Para features complexas ou multi-dominio, usar EnterPlanMode:

```
"Implementar notificacoes push" -> EnterPlanMode (afeta backend + frontend + infra)
"Migrar para File Search V2" -> EnterPlanMode (afeta Edge Functions + hooks + tipos)
"Adicionar modulo Academia" -> EnterPlanMode (novo modulo completo)
```

### 4. Implementacao Direta

Para tarefas claras e delimitadas, editar codigo:

```
"Corrigir typo no header" -> Read + Edit
"Adicionar campo na tabela" -> Criar migration SQL
"Atualizar modelo Gemini" -> Edit nos arquivos relevantes
```

### 5. Database Operations

Para qualquer coisa envolvendo banco, ativar /supabase-database:

```
"Criar tabela de notificacoes" -> /supabase-database patterns + nova migration
"Verificar RLS policies" -> Queries de diagnostico da skill
"Deploy Edge Function" -> Comando de deploy da skill
```

---

## Regras de Roteamento

### SEMPRE fazer:

1. **Classificar ANTES de agir** - Identificar tipo + dominio
2. **Ler antes de editar** - Nunca propor mudancas em codigo nao lido
3. **Usar TaskCreate para tarefas complexas** - 3+ etapas = criar task list
4. **Confirmar antes de acoes destrutivas** - Deploy, delete, reset
5. **Verificar CLAUDE.md** - Seguir convencoes do projeto

### NUNCA fazer:

1. **Auto-deploy** - Deploy e exclusivo do usuario
2. **Expor API keys** - Sempre via Edge Functions
3. **Criar backups manuais** - Git e o backup
4. **Pular RLS** - Toda tabela nova precisa de policies
5. **Adivinhar schema** - Verificar migrations antes

---

## Exemplos de Roteamento

### Exemplo 1: Database Migration
```
Input:  "Criar tabela para armazenar preferencias de notificacao"
Tipo:   Database
Dominio: Notifications
Acao:   1. Ativar /supabase-database skill
        2. Criar migration com tabela + RLS
        3. Verificar com `npx supabase db diff`
```

### Exemplo 2: Feature Multi-Dominio
```
Input:  "Implementar audio transcription no Journey"
Tipo:   Implementacao (multi-dominio)
Dominio: Journey + AI
Acao:   1. EnterPlanMode
        2. Explorar gemini-chat (transcribe_audio action)
        3. Explorar momentPersistenceService
        4. Planejar frontend + backend changes
        5. Implementar apos aprovacao
```

### Exemplo 3: Bug Fix
```
Input:  "Heatmap do Journey nao carrega"
Tipo:   Debug
Dominio: Journey
Acao:   1. Explore: get_journey_activity_heatmap RPC
        2. Read: usePatterns hook / heatmap component
        3. Identificar causa raiz
        4. Fix + verificar build
```

### Exemplo 4: Pesquisa
```
Input:  "Quais modulos usam Gemini?"
Tipo:   Pesquisa
Dominio: AI (transversal)
Acao:   1. Grep: "GeminiClient\|gemini-chat\|supabase.functions.invoke"
        2. Listar resultados por modulo
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
             --substitutions=_SERVICE_NAME=aica-staging
```

---

## Skills Disponiveis

| Skill | Comando | Quando Usar |
|-------|---------|-------------|
| **Supabase Database** | `/supabase-database` | Migrations, queries, Edge Functions, RLS |
| **Task Router** | `/task-router` | Delegar qualquer tarefa (esta skill) |

---

## Checklist Pre-Execucao

Antes de executar qualquer tarefa complexa:

- [ ] Tipo de tarefa identificado (pesquisa/plan/impl/debug/db/deploy)
- [ ] Dominio do projeto identificado
- [ ] Arquivos relevantes lidos
- [ ] Estrategia de execucao escolhida
- [ ] Convencoes do CLAUDE.md respeitadas
- [ ] Se multi-step: TaskCreate usado para tracking
