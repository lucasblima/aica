# Skills Issue Mapping

Mapeamento entre skills e dominios do projeto AICA Life OS.

**Ultima Atualizacao:** Marco 2026
**Skills Ativas:** 2 (supabase-database, task-router)
**Superpowers Integrados:** 11 (brainstorming, writing-plans, TDD, systematic-debugging, verification, code-review, git-worktrees, subagent-dev, parallel-agents, finishing-branch, receiving-review)

---

## Skills Ativas

### 1. supabase-database

| Campo | Valor |
|-------|-------|
| **Arquivo** | `.claude/skills/supabase-database/SKILL.md` |
| **Comando** | `/supabase-database` |
| **Cobertura** | Migrations, queries SQL, Edge Functions (46), RLS, CLI, troubleshooting |
| **Tabelas Mapeadas** | 158 (organizadas por modulo) |
| **RPCs Documentadas** | 283 (essenciais listadas) |

**Dominios cobertos:**
- Database schema e migrations
- Edge Functions deploy e debugging
- RLS policies e security patterns
- Queries de diagnostico

### 2. task-router

| Campo | Valor |
|-------|-------|
| **Arquivo** | `.claude/skills/task-router/SKILL.md` |
| **Comando** | `/task-router` |
| **Cobertura** | Classificacao de tarefas, roteamento por dominio, estrategias de execucao |

**Dominios cobertos:**
- Routing inteligente para 12 dominios do projeto
- 7 tipos de tarefa (pesquisa, planejamento, implementacao, database, debug, review, deploy)
- 5 estrategias de execucao (busca rapida, exploracao profunda, planejamento, implementacao direta, database ops)

---

## Cobertura por Dominio

| Dominio | Skill Primaria | Cobertura |
|---------|---------------|-----------|
| Journey | task-router (routing) | Paths e keywords mapeados |
| Atlas | task-router (routing) | Paths e keywords mapeados |
| Studio | task-router (routing) | Paths e keywords mapeados |
| Grants | task-router (routing) | Paths e keywords mapeados |
| Connections/WhatsApp | task-router + supabase-database | Pipeline completo documentado |
| Finance | task-router (routing) | Paths e keywords mapeados |
| Flux | task-router (routing) | Paths e keywords mapeados |
| Database/Supabase | supabase-database | Cobertura completa |
| Edge Functions | supabase-database | 46 funcoes documentadas |
| Auth/OAuth | task-router (routing) | Paths mapeados |
| Gamification | task-router (routing) | Paths e keywords mapeados |
| AI/Gemini | task-router (routing) | Paths e keywords mapeados |
| Deploy/Infra | task-router + hooks | Protecao via hooks |

---

## Hooks de Seguranca (settings.json)

| Hook | Tipo | Trigger | Acao |
|------|------|---------|------|
| Migration safety | PreToolUse (Bash) | `supabase.*migration` | Checklist RLS/security |
| Deploy guard | PreToolUse (Bash) | `gcloud builds submit` | Alerta para confirmar |
| Backup blocker | PreToolUse (Write) | `.backup/.bak/.old/~` | BLOQUEIA escrita |
| Env file guard | PreToolUse (Write) | `.env*` files | Alerta de seguranca |
| Branch switch | PostToolUse (Bash) | `git checkout` | Reminder de sync |

---

## Issues Relevantes (Status Fev 2026)

### Fechadas (Resolvidas)
- **#28** PKCE OAuth - Resolvido
- **#89, #90, #91, #93** WhatsApp epic - Pipeline completo
- **#176** Audio transcription - Implementado
- **#118** Docs for RAG - 85% completo

### Abertas
- **#194** Chat redesign (P2) - 4 fases planejadas
- **#211** Universal Input Funnel (P1) - Phase 0 done
- **#201** Journey audio - Phase 0 done, needs deploy

---

## Superpowers nas Regras

| Superpower | Regras que Referenciam |
|------------|----------------------|
| `superpowers:brainstorming` | CLAUDE.md, clarification-first, design-system, whatsapp, DDD |
| `superpowers:writing-plans` | CLAUDE.md, clarification-first, session-protocol, project-structure |
| `superpowers:test-driven-development` | CLAUDE.md, session-protocol, agent-teams, code-patterns, ai-integration, whatsapp |
| `superpowers:systematic-debugging` | CLAUDE.md, session-protocol, agent-teams, architecture, database, environments |
| `superpowers:verification-before-completion` | CLAUDE.md, session-protocol, code-patterns, security, database, deploy-pipeline, ai-integration, whatsapp |
| `superpowers:requesting-code-review` | CLAUDE.md, session-protocol, agent-teams, code-patterns |
| `superpowers:receiving-code-review` | CLAUDE.md, code-patterns |
| `superpowers:subagent-driven-development` | CLAUDE.md, agent-teams |
| `superpowers:dispatching-parallel-agents` | CLAUDE.md, agent-teams |
| `superpowers:finishing-a-development-branch` | CLAUDE.md, session-protocol |
| `superpowers:using-git-worktrees` | CLAUDE.md, session-protocol |

---

## Historico de Evolucao

### Jan 2026 (Criacao Inicial)
- 5 skills conceituais mapeadas (google-cloud-oauth, aica-development, cloud-run-deployment, documentation-standards, issue-management)
- 5 novas skills sugeridas
- 7 issues mapeadas

### Fev 2026 (Reescrita Completa)
- Consolidado para 2 skills ativas e funcionais
- supabase-database: expandido de 17 tabelas para 158, 46 Edge Functions documentadas
- task-router: reescrito para usar capacidades reais do Claude Code
- settings.json: hooks melhorados, co-author atualizado para Opus 4.6
- Removido: UserPromptSubmit hook (overhead sem beneficio real)
- Adicionado: deploy guard hook, env file guard hook

### Mar 2026 (Superpowers Integration)
- 11 superpowers integrados em 14 regras + CLAUDE.md
- Workflow expandido de 6 para 11 steps (Name->Clarify->Team->Brainstorm->Plan->Worktree->TDD->Verify->Review->Finish->PR)
- CLAUDE.md: tabela de Superpowers Integration, Critical Rules reorganizadas
- session-protocol.md: TDD obrigatorio, verification com evidencia, finishing-branch
- clarification-first.md: gate de brainstorming apos clarificacao
- agent-teams.md: execution strategies (subagent-driven, parallel, executing-plans), two-stage review
- code-patterns.md: TDD, code review, e verification patterns com exemplos
- 10 supporting rules: referencias targeted (3-8 linhas cada)
