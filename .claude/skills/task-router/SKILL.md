---
name: task-router
description: Roteamento inteligente de tarefas para agentes especializados. Use /task-router para delegar automaticamente qualquer task ao agente correto.
---

# Task Router - Delegacao Automatica de Agentes

Esta skill analisa a tarefa solicitada e delega automaticamente ao agente especializado mais adequado.

---

## Matriz de Roteamento

### Por Palavras-Chave

| Keywords | Agente | Skill Associada |
|----------|--------|-----------------|
| `migration`, `RLS`, `schema`, `database`, `tabela`, `SQL` | `backend-architect-supabase` | `/supabase-database` |
| `test`, `e2e`, `playwright`, `spec.ts`, `coverage` | `testing-qa-playwright` | - |
| `XP`, `badge`, `achievement`, `streak`, `level`, `gamification` | `gamification-engine` | - |
| `podcast`, `episode`, `guest`, `pauta`, `gravacao` | `podcast-production-copilot` | - |
| `calendar`, `OAuth`, `Google Calendar`, `token`, `sync` | `calendar-executive` | `/google-cloud-oauth` |
| `Gemini`, `AI`, `prompt`, `embedding`, `LLM` | `gemini-integration-specialist` | `/ai-integration` |
| `LGPD`, `GDPR`, `security`, `audit`, `privacy`, `RLS policy` | `security-privacy-auditor` | - |
| `component`, `React`, `UI`, `design system`, `ceramic` | `ux-design-guardian` | `/component-patterns` |
| `task`, `todo`, `Eisenhower`, `Meu Dia`, `Atlas` | `atlas-task-manager` | - |
| `plan`, `architecture`, `epic`, `roadmap`, `multi-domain` | `master-architect-planner` | `/product-planning` |
| `parallel`, `orchestrate`, `decompose`, `workstreams` | `task-orchestrator` | - |
| `deploy`, `Cloud Run`, `build`, `CI/CD` | - | `/cloud-run-deployment` |
| `Supabase auth`, `PKCE`, `session`, `cookie` | - | `/supabase-auth` |
| `WhatsApp`, `Evolution API`, `pairing`, `instance` | - | `/api-integrations` |

---

## Instrucoes de Uso

Quando o usuario invocar `/task-router` seguido de uma descricao de tarefa:

1. **Analise a tarefa** identificando keywords e dominio
2. **Selecione o agente** mais adequado usando a matriz acima
3. **Invoque o agente** usando a Task tool com o subagent_type correto
4. **Aplique a skill** associada se existir

---

## Fluxo de Decisao

```
Tarefa Recebida
      |
      v
+------------------+
| Analisar Keywords |
+------------------+
      |
      v
+------------------+
| Multi-dominio?   |-----> SIM --> master-architect-planner
+------------------+              (orquestra sub-agentes)
      |
      NAO
      v
+------------------+
| Dominio unico?   |-----> SIM --> Agente especializado
+------------------+              (ver matriz acima)
      |
      NAO (ambiguo)
      v
+------------------+
| Perguntar usuario|
+------------------+
```

---

## Exemplos de Roteamento

### Exemplo 1: Database Migration
```
Usuario: "Criar tabela para armazenar sessoes WhatsApp"
Keywords: tabela, WhatsApp
Decisao: backend-architect-supabase + /supabase-database
Acao: Task tool -> subagent_type: "backend-architect-supabase"
```

### Exemplo 2: Feature Multi-Dominio
```
Usuario: "Implementar sistema de XP para tarefas completadas com sync no calendario"
Keywords: XP, tarefas, calendario
Dominios: gamification + atlas + calendar (3 dominios)
Decisao: master-architect-planner (orquestra)
Acao: Task tool -> subagent_type: "master-architect-planner"
```

### Exemplo 3: E2E Test
```
Usuario: "Escrever testes para o Organization Wizard"
Keywords: testes, Wizard
Decisao: testing-qa-playwright
Acao: Task tool -> subagent_type: "testing-qa-playwright"
```

### Exemplo 4: Security Audit
```
Usuario: "Revisar RLS policies da tabela organizations"
Keywords: RLS, policies
Decisao: security-privacy-auditor (RLS e seguranca)
Acao: Task tool -> subagent_type: "security-privacy-auditor"
```

---

## Agentes Disponiveis

| Agente | Especialidade | Modelo |
|--------|---------------|--------|
| `master-architect-planner` | Planejamento estrategico, orquestracao | opus |
| `task-orchestrator` | Decomposicao paralela de tarefas | sonnet |
| `backend-architect-supabase` | Database, migrations, RLS | sonnet |
| `testing-qa-playwright` | E2E tests, QA | sonnet |
| `gamification-engine` | XP, achievements, streaks | sonnet |
| `podcast-production-copilot` | Podcast workflow | sonnet |
| `calendar-executive` | Google Calendar, OAuth | sonnet |
| `gemini-integration-specialist` | AI/Gemini integration | sonnet |
| `security-privacy-auditor` | LGPD, GDPR, security | sonnet |
| `ux-design-guardian` | UI/UX, components | sonnet |
| `atlas-task-manager` | Task management | sonnet |
| `documentation-maintainer` | PRD, docs updates | sonnet |

---

## Skills Disponiveis

| Skill | Comando | Uso |
|-------|---------|-----|
| AI Integration | `/ai-integration` | Gemini, ElevenLabs |
| AICA Development | `/aica-development` | Padroes de codigo |
| API Integrations | `/api-integrations` | Supabase, n8n, Evolution |
| Cloud Run Deploy | `/cloud-run-deployment` | Deploy producao |
| Component Patterns | `/component-patterns` | React patterns |
| Documentation | `/documentation-standards` | Padroes de docs |
| Google OAuth | `/google-cloud-oauth` | OAuth Google |
| Issue Management | `/issue-management` | GitHub issues |
| Product Planning | `/product-planning` | Roadmap, features |
| Supabase Auth | `/supabase-auth` | Autenticacao |
| Supabase Database | `/supabase-database` | Migrations, queries |

---

## Comportamento Automatico

Quando esta skill e ativada, o Claude DEVE:

1. **Nunca executar diretamente** tarefas que pertencem a um agente especializado
2. **Sempre delegar** usando a Task tool com o subagent_type apropriado
3. **Combinar agente + skill** quando ambos sao relevantes
4. **Usar master-architect-planner** para tarefas que envolvem 2+ dominios
5. **Perguntar ao usuario** apenas quando o roteamento e ambiguo

---

## Integracao com CLAUDE.md

Adicione ao CLAUDE.md para ativar auto-delegacao:

```markdown
## Auto-Delegacao de Agentes

REGRA: Antes de executar qualquer tarefa complexa, verifique se existe um agente especializado.

Use `/task-router` implicitamente para:
- Migrations e schema changes -> backend-architect-supabase
- Testes E2E -> testing-qa-playwright
- Gamification features -> gamification-engine
- Multi-domain features -> master-architect-planner
```
