# Agent Guidelines - Aica Life OS

## 1. Workflow Multiagente (Multi-Terminal + Multi-Branch)

### Contexto de Trabalho Paralelo
Este projeto usa estratégia de desenvolvimento multiagente:
- **Múltiplos terminais** com Claude Code em branches diferentes
- **Claude Opus** (Chrome) para planejamento arquitetural
- **Branches longas** com evolução incremental
- **Git como fonte de verdade** para sincronização

### Protocolo de Sincronização

#### Antes de Iniciar Trabalho
1. **SEMPRE** fazer `git pull origin main` na branch atual
2. **VERIFICAR** se há branches ativas relacionadas:
   ```bash
   git branch -a --sort=-committerdate | head -10
   ```
3. **LER** commits recentes para evitar duplicação:
   ```bash
   git log --all --oneline --since="1 day ago" | head -20
   ```

#### Durante o Trabalho
- **COMMITS FREQUENTES** (não esperar feature completa)
- **MENSAGENS DESCRITIVAS** seguindo Conventional Commits
- **CO-AUTORIA** sempre incluir:
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

#### Ao Trocar de Branch/Terminal
- **DOCUMENTAR** estado atual em commit WIP:
  ```bash
  git add .
  git commit -m "WIP: [descrição do estado atual]"
  ```
- **OU** usar stash com mensagem descritiva:
  ```bash
  git stash push -m "WIP: implementando feature X - falta testes"
  ```

---

## 2. Convenção de Branch Naming

### Padrão Estabelecido
```
feature/{descrição-kebab-case}-issue-{número}
fix/{descrição-kebab-case}
refactor/{descrição-kebab-case}
docs/{descrição-kebab-case}
```

### Exemplos Validados (Do Histórico Real)
✅ `feature/whatsapp-evolution-integration-issue-12`
✅ `feature/whatsapp-gamification-integration-issue-16`
✅ `feature/guest-identification-wizard-issue-15`
✅ `fix/e2e-auth-race-condition-and-approval-schema`
✅ `fix/csp-google-oauth`

❌ `feature/myFeature` (sem issue tracking)
❌ `lucas/test-branch` (nome pessoal)

---

## 3. Commit Message Standards

### Conventional Commits Format
```
<type>(<scope>): <description>

[optional body]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Types Validados (Do Histórico Real)
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `test`: Testes
- `refactor`: Refatoração
- `chore`: Tarefas de manutenção

### Scopes Identificados (Módulos)
- `podcast`, `auth`, `config`, `gamification`, `whatsapp`, `security`, `studio`, `onboarding`, `ui`

---

## 4. Pull Request Workflow

### Velocidade Atual (MANTER!)
- **Criação → Merge:** ~6 minutos (excelente!)
- **Self-merge:** Permitido (desenvolvedor único)
- **CI/CD:** Cloud Build automático em merge

### Checklist PR
Antes de criar PR:
- [ ] Build local passou: `npm run build`
- [ ] Testes passaram: `npm run test`
- [ ] Commit messages seguem Conventional Commits
- [ ] Co-autoria adicionada
- [ ] Branch atualizada com main (se necessário)

---

## 5. Gestão de Conhecimento Cross-Agente

### Documentar Decisões Arquiteturais
Quando Claude Opus (Chrome) gerar insights importantes:
1. **SEMPRE** criar arquivo de documentação no repo:
   ```
   docs/decisions/YYYY-MM-DD-{decisão}.md
   ```
2. **COMMIT** imediatamente para sincronizar com outros terminais
3. **REFERENCIAR** em commits futuros:
   ```
   feat(auth): Implement PKCE flow

   Architectural decision documented in docs/decisions/2026-01-02-pkce-migration.md
   ```

### Compartilhar Contexto entre Terminais
- **README.md** em cada módulo (`src/modules/{nome}/README.md`)
- **CHANGELOG.md** na raiz do módulo
- **Comentários** em código apenas quando lógica não é óbvia

---

## 6. Version Control Best Practices

### ❌ DO NOT Create Manual Backups

**NEVER create backup files** like:
- `file.backup_*`
- `file.bak`
- `file~`
- `file.old`

**Reason:** Git is the source of truth for version control.

**Instead, use Git commands:**
```bash
# View previous version
git show HEAD~1:path/to/file

# Compare changes
git diff HEAD~1 path/to/file

# Restore previous version
git checkout <commit> -- path/to/file

# View history
git log --follow path/to/file
```

### ✅ Proper Workflow for Risky Operations

**Before making significant changes:**
1. Create a feature branch: `git checkout -b feature/my-changes`
2. Make changes and commit frequently
3. If something goes wrong: `git reset --hard` or `git checkout main`

**For documentation updates:**
1. Read current file
2. Make edits directly
3. Commit with descriptive message
4. Git history preserves all versions

### 🎯 Philosophy

**"Git is the backup system"** - Every commit is a snapshot. Creating manual backups:
- Pollutes the repository
- Creates confusion about source of truth
- Wastes disk space
- Violates DRY (Don't Repeat Yourself)

---

## 7. Agentes Especializados (Quando Usar)

### Três Formas de Invocação

#### 1. Delegação Automática (Preferida - Claude Decide)

Claude Code **automaticamente** identifica e invoca agentes especializados baseado em:
- Palavras-chave na descrição da tarefa
- Tipo de arquivo sendo modificado
- Contexto atual da conversa

**Exemplo:**
```
user: "Precisamos criar uma migration para a tabela podcast_episodes com RLS policies"
[Claude automaticamente delega para backend-architect-supabase]
```

**Como funciona:** Cada agente tem triggers automáticos definidos (ver tabela abaixo).

#### 2. Invocação Explícita (Quando Necessário)

Use quando a delegação automática não ocorre ou você quer forçar um agente específico:

```
user: "Use o master-architect-planner agent para planejar a integração WhatsApp"
user: "Tenha o testing-qa-playwright agent escrever E2E tests para este fluxo"
```

**Quando usar:**
- Claude não delegou automaticamente (tarefa ambígua)
- Você quer review de agente específico
- Multi-agent workflow com ordem específica

#### 3. Subagent Chaining (Workflows Complexos)

Para features que exigem múltiplos agentes em sequência:

```
user: "Para implementar o sistema de badges:
1. Use master-architect-planner para criar plano geral
2. Use backend-architect-supabase para schema e RLS policies
3. Use gamification-engine para lógica de unlock
4. Use testing-qa-playwright para E2E tests
5. Use documentation-maintainer para atualizar PRD.md"
```

---

### Mapeamento de Agentes com Triggers Automáticos

| Agente | Quando Usar | Auto-Triggers (Keywords) | Exemplo de Task |
|--------|-------------|--------------------------|-----------------|
| `master-architect-planner` | Planejamento de features complexas | "plan", "architecture", "design", "roadmap" | "Planejar integração WhatsApp" |
| `backend-architect-supabase` | Migrations, RLS, database | "migration", "RLS", "database", "schema", "SQL" | "Criar tabela podcast_episodes" |
| `ux-design-guardian` | UI/UX, componentes visuais | "UI review", "UX", "design system", "component", "modal" | "Revisar landing page design" |
| `gamification-engine` | XP, badges, achievements | "XP", "badge", "achievement", "streak", "gamification" | "Implementar badge unlock modal" |
| `podcast-production-copilot` | Fluxo podcast, guest research | "podcast", "guest", "pauta", "episode", "recording" | "Wizard de identificação de convidados" |
| `testing-qa-playwright` | E2E tests, test coverage | "E2E test", "Playwright", "test coverage", "integration test" | "Criar testes para OAuth flow" |
| `security-privacy-auditor` | LGPD, OWASP, RLS policies | "LGPD", "GDPR", "security audit", "vulnerability", "compliance" | "Auditar compliance de dados" |
| `documentation-maintainer` | Sync docs com código | "update docs", "sync PRD", "architecture doc", "README" | "Atualizar PRD.md com features" |
| `calendar-executive` | Google Calendar integration | "Google Calendar", "OAuth", "calendar sync", "token refresh" | "Debug OAuth token refresh" |
| `atlas-task-manager` | Atlas module (Meu Dia) | "task", "Meu Dia", "priority", "Eisenhower", "deadline" | "Criar task com priority" |
| `gemini-integration-specialist` | Gemini API, prompts | "Gemini API", "prompt", "AI integration", "token usage", "embedding" | "Otimizar custos de API" |

---

### Protocolo de Invocação (Atualizado)

#### Passo 1: Identificar Tipo de Tarefa
- Feature nova? → `master-architect-planner` ou agente específico do módulo
- Database change? → `backend-architect-supabase`
- UI component? → `ux-design-guardian`
- Security concern? → `security-privacy-auditor`
- Testing? → `testing-qa-playwright`

#### Passo 2: Verificar se Delegação Automática Ocorreu
- Claude mencionou "Using {agent-name} agent"? → ✅ Delegou
- Claude começou trabalho direto sem mencionar agente? → Considere invocação explícita

#### Passo 3: Invocar Explicitamente (Se Necessário)
```
Use the {agent-name} agent to {specific task}
```

#### Passo 4: Documentar Output do Agente
Sempre incluir em commit message:
```
feat(podcast): Implement guest identification wizard

Designed by master-architect-planner agent.
Implemented with guidance from podcast-production-copilot agent.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Dicas de Uso Eficiente

#### ✅ DO: Use Auto-Delegation
```
"Create a migration to add approval_token column to podcast_episodes"
[Claude detecta "migration" → backend-architect-supabase]
```

#### ✅ DO: Chain Agents for Complex Features
```
"Implement badge system:
1. Plan architecture (master-architect-planner)
2. Create schema (backend-architect-supabase)
3. Implement unlock logic (gamification-engine)
4. Test (testing-qa-playwright)"
```

#### ❌ DON'T: Invoke Agent for Trivial Tasks
```
❌ "Use backend-architect-supabase to read a database table"
✅ "Read podcast_episodes table schema"
```

#### ❌ DON'T: Force Agent When Auto-Delegation Works
```
❌ "Use the gemini-integration-specialist agent to optimize this Gemini API call"
✅ "Optimize this Gemini API call to reduce token usage"
[Claude detecta "Gemini API" + "token usage" → auto-delega]
```

---

## 8. Aprendizado Ativo (Preenchimento de Lacunas)

### Quando Pedir Explicações
Claude Code deve **SEMPRE** explicar:
- ❓ **Por que** uma solução foi escolhida (não só "o que")
- ❓ **Trade-offs** de decisões arquiteturais
- ❓ **Alternativas** consideradas
- ❓ **Referências** para aprofundamento

### Formato de Explicações
```markdown
## Decisão: [Título]

### Contexto
[Por que precisamos decidir isso?]

### Opções Consideradas
1. **Opção A:** [Prós/Contras]
2. **Opção B:** [Prós/Contras]

### Decisão
Escolhemos **Opção X** porque:
- [Razão 1]
- [Razão 2]

### Para Aprender Mais
- [Link para documentação]
- [Referência de padrão]
```

---

## 9. Multi-Terminal Safety Net

### Evitar Conflitos de Merge
Antes de fazer merge de branch longa:
1. **ATUALIZAR** com main:
   ```bash
   git checkout feature/minha-branch
   git fetch origin
   git merge origin/main
   # Resolver conflitos se houver
   ```
2. **TESTAR** localmente após merge
3. **ENTÃO** criar PR

### Comunicação entre Terminais
- **Usar commits como mensagens:**
  ```
  WIP: Implementando auth guard - não mexer em App.tsx ainda
  ```
- **Tags Git** para milestones:
  ```bash
  git tag -a v1.0-podcast-wizard -m "Podcast wizard completo"
  ```

### Comandos Úteis para Sync
```bash
# Ver todas branches ativas
git branch -a --sort=-committerdate | head -10

# Ver commits de hoje em todas branches
git log --all --since="today" --oneline

# Ver stashes salvos
git stash list

# Aplicar stash específico
git stash apply stash@{0}

# Ver mudanças não commitadas em outra branch
git diff origin/main..feature/nome-da-branch
```

---

## 10. Session Naming e Gestão (Multi-Terminal)

### Por Que Nomear Sessões?

Em workflow multi-terminal, cada terminal trabalha em contextos diferentes:
- **Terminal 1:** Backend authentication refactor
- **Terminal 2:** E2E test development
- **Terminal 3:** Podcast feature implementation

Nomear sessões permite **retomar exatamente onde parou** sem perder contexto.

---

### Convenção de Nomes de Sessão

**Pattern:** `{area}-{feature}-{type}`

#### Exemplos Validados
```bash
# Backend work
backend-auth-refactor
backend-podcast-schema
backend-rls-policies

# Frontend work
frontend-ui-gamification
frontend-oauth-flow
frontend-dashboard-redesign

# Testing
e2e-tests-podcast
e2e-tests-oauth
unit-tests-validation

# Documentation
docs-architecture-update
docs-prd-sync
docs-decision-logs

# Bug fixes
fix-oauth-redirect
fix-e2e-race-condition
fix-token-refresh
```

#### Componentes do Nome

| Componente | Opções | Descrição |
|------------|--------|-----------|
| `{area}` | backend, frontend, e2e, docs, fix, refactor | Área técnica do trabalho |
| `{feature}` | auth, podcast, gamification, oauth, ui | Feature ou módulo sendo trabalhado |
| `{type}` | refactor, tests, implementation, update, fix | Tipo de atividade |

---

### Workflow de Session Management

#### 1. Criar Nova Sessão Nomeada

```bash
# Opção A: Nomear ao criar
claude --session backend-auth-refactor

# Opção B: Renomear durante sessão
claude
> /rename backend-auth-refactor
```

#### 2. Listar Sessões Ativas

```bash
# Listar todas as sessões do projeto
claude --resume

# Saída esperada:
# 1. backend-auth-refactor (última: 2h atrás)
# 2. e2e-tests-oauth (última: 5h atrás)
# 3. docs-architecture-update (última: 1d atrás)
```

#### 3. Retomar Sessão Específica

```bash
# Retomar por nome
claude --resume backend-auth-refactor

# Retomar mais recente
claude --continue

# Retomar com preview
# (use session picker com 'P' para preview)
```

#### 4. Session Picker Shortcuts

Durante o picker de sessão:
- **B:** Filtrar por branch atual
- **P:** Preview da sessão antes de retomar
- **R:** Renomear sessão
- **/:** Buscar por nome ou palavras-chave
- **Ctrl+C:** Cancelar

---

### Sincronizar Sessões com WORK_QUEUE.md

Cada sessão deve ter entrada correspondente no WORK_QUEUE.md:

```markdown
### Branch: `feature/whatsapp-evolution-integration-issue-12`
**Status:** 🟢 ATIVA
**Issue:** #12
**Session Name:** `backend-whatsapp-integration`
**Última Atualização:** 2026-01-02

#### Tarefas Pendentes
- [ ] Implementar Evolution API client
- [ ] Adicionar error handling
- [ ] Testar em produção
```

**Protocolo:**
1. Ao nomear sessão → Adicionar ao WORK_QUEUE.md
2. Ao retomar sessão → Verificar tasks pendentes no WORK_QUEUE.md
3. Ao pausar sessão → Atualizar status no WORK_QUEUE.md

---

### Boas Práticas de Sessões

#### ✅ DO: Use Sessões Nomeadas para Trabalho Longo

```bash
# Feature complexa (>2 horas de trabalho)
claude --session backend-podcast-production

# Bug fix rápido (<30 min)
claude  # Sessão anônima OK para trabalhos curtos
```

#### ✅ DO: Renomeie Durante a Sessão se Mudou de Foco

```bash
# Começou com OAuth, mudou para podcast
claude
> /rename backend-podcast-api  # Renomear reflete trabalho real
```

#### ✅ DO: Archive Sessões Completadas

```bash
# Após merge do PR
# Deixe a sessão expirar naturalmente ou delete manualmente
# WORK_QUEUE.md move branch para "Histórico de Merges"
```

#### ❌ DON'T: Use Nomes Genéricos

```bash
❌ claude --session work
❌ claude --session temp
❌ claude --session test

✅ claude --session backend-auth-migration
✅ claude --session e2e-oauth-flow
```

#### ❌ DON'T: Reuse Session Names para Trabalhos Diferentes

```bash
❌ # Sessão "backend-work" usada para auth, depois podcast, depois gamification
   # Contexto fica confuso

✅ # Sessão específica para cada feature
   backend-auth-refactor
   backend-podcast-schema
   backend-gamification-xp
```

---

### Exemplos de Workflows Multi-Sessão

#### Scenario 1: Feature Branch Longa

```bash
# Dia 1: Iniciar feature
git checkout -b feature/podcast-wizard-issue-15
claude --session frontend-podcast-wizard

# Dia 2: Retomar
claude --resume frontend-podcast-wizard
# Contexto completo preservado

# Dia 5: Merge PR, sessão pode expirar
```

#### Scenario 2: Múltiplas Branches Paralelas

```bash
# Terminal 1: Backend work
cd ~/aica_frontend
git checkout feature/backend-api
claude --session backend-api-refactor

# Terminal 2: Frontend work (mesma máquina, diferente branch)
cd ~/aica_frontend  # (ou usar git worktree)
git checkout feature/frontend-ui
claude --session frontend-ui-redesign

# Terminal 3: Bug fix urgente
git checkout -b fix/oauth-redirect
claude --session fix-oauth-redirect

# Cada terminal mantém contexto independente
```

#### Scenario 3: Code Review Cross-Branch

```bash
# Terminal principal: Seu trabalho
claude --session backend-auth-refactor

# Terminal secundário: Review de PR colega
claude --session review-pr-26 --permission-mode plan
# Plan mode = apenas análise, sem commits acidentais
```

---

### Session Lifecycle Management

#### Estados de Sessão

| Estado | Descrição | Ação Recomendada |
|--------|-----------|------------------|
| **Active** | Última atividade <2h | Continue trabalhando |
| **Stale** | Última atividade 2h-24h | Review tasks, retomar ou archive |
| **Expired** | Última atividade >24h | Archive ou delete se trabalho completo |

#### Limpeza de Sessões

```bash
# Revisar sessões antigas
claude --resume
# Identificar sessões expiradas (>24h sem uso)

# Se PR foi mergeado e trabalho completo:
# Deixar sessão expirar naturalmente (Claude limpa automaticamente)

# Se trabalho ainda pendente:
# Retomar sessão e atualizar WORK_QUEUE.md
```

---

### Integrando com Git Worktrees (Avançado)

Para super-heavy parallel work, combine sessions + worktrees:

```bash
# Criar worktrees para branches diferentes
git worktree add ../aica-backend feature/backend-api
git worktree add ../aica-frontend feature/frontend-ui
git worktree add ../aica-tests feature/e2e-tests

# Sessão para cada worktree
cd ../aica-backend && claude --session backend-api-refactor
cd ../aica-frontend && claude --session frontend-ui-redesign
cd ../aica-tests && claude --session e2e-tests-implementation

# Cada worktree = diretório separado = sem conflitos de checkout
```

Ver Seção 12 para detalhes completos sobre Git Worktrees.

---

## 11. Plan Mode para Code Reviews Seguros

### O Que é Plan Mode?

Plan Mode é um permission mode do Claude Code onde:
- **Análise sem modificações:** Claude lê código mas não faz commits/edits
- **Sugestões documentadas:** Output em formato de plano de ação
- **Zero risk de mudanças acidentais:** Perfeito para code reviews

**Use cases:**
- Revisar PR de outra branch sem modificar
- Analisar código em produção sem tocar
- Explorar codebase novo sem commits acidentais
- Second-opinion em branch de colega

---

### Ativando Plan Mode

#### Opção 1: Flag na Linha de Comando

```bash
# Iniciar sessão em plan mode
claude --permission-mode plan

# Com prompt específico
claude --permission-mode plan -p "Review authentication implementation in @src/lib/supabase"

# Com sessão nomeada
claude --session review-pr-26 --permission-mode plan
```

#### Opção 2: Durante a Sessão

```bash
# Iniciar sessão normal
claude

# Mudar para plan mode
> /mode plan

# Voltar para normal mode
> /mode normal
```

---

### Workflows de Code Review com Plan Mode

#### Scenario 1: Review de PR Cross-Branch

```bash
# Terminal 1: Seu trabalho (normal mode)
git checkout feature/your-feature
claude --session your-feature-work

# Terminal 2: Review de PR colega (plan mode)
git checkout feature/colleague-pr
claude --session review-pr-123 --permission-mode plan

# Prompt no Terminal 2:
> "Review this authentication implementation for:
> 1. Security vulnerabilities (OWASP Top 10)
> 2. RLS policy completeness
> 3. Error handling gaps
> 4. Performance bottlenecks
>
> Provide actionable recommendations."
```

**Output esperado:** Relatório detalhado sem nenhuma modificação no código.

---

#### Scenario 2: Análise de Código em Produção

```bash
# Checkout do código em produção (tag de release)
git checkout v1.2.0

# Plan mode para análise segura
claude --permission-mode plan -p "Analyze OAuth flow for potential race conditions"

# Claude analisa mas não modifica código de produção
```

---

#### Scenario 3: Second Opinion em Código Próprio

```bash
# Você implementou feature complexa
# Quer second opinion antes de criar PR

# Iniciar plan mode
claude --permission-mode plan

# Prompt:
> "Review my podcast wizard implementation in @src/modules/podcast/components/GuestWizard.tsx
> Focus on:
> - React best practices
> - State management patterns
> - Accessibility (WCAG 2.1)
> - Performance optimizations"
```

---

### Comandos Úteis em Plan Mode

```bash
# Analisar arquivo específico
> Review @src/lib/supabase/client.ts for security issues

# Comparar duas implementações
> Compare authentication approaches in @src/lib/supabase vs @src/lib/legacy-auth

# Explorar módulo completo
> Analyze the podcast module architecture in @src/modules/podcast

# Identify code smells
> Find potential bugs and code smells in @src/modules/gamification

# Arquitetura review
> Evaluate the scalability of the current database schema design
```

---

### Plan Mode Output Format

Claude gera planos estruturados:

```markdown
# Code Review: Authentication Implementation

## Summary
Reviewed OAuth flow in src/lib/supabase/auth.ts.
Overall: Good implementation with 3 security concerns.

## Security Issues (High Priority)
1. **Token Storage in localStorage (CRITICAL)**
   - Location: src/lib/supabase/auth.ts:45
   - Issue: Vulnerable to XSS attacks
   - Recommendation: Use httpOnly cookies instead
   - References: OWASP A03:2021 - Injection

2. **Missing CSRF Protection**
   - Location: src/lib/supabase/auth.ts:78
   - Issue: State parameter not validated
   - Recommendation: Implement PKCE flow with state validation

## Performance Optimizations (Medium Priority)
1. **Unnecessary Re-renders**
   - Location: src/components/AuthProvider.tsx:23
   - Issue: Context updates on every auth check
   - Recommendation: Memoize auth state

## Next Steps
1. Fix CRITICAL security issues (items 1-2)
2. Add unit tests for auth flow
3. Update documentation with security considerations
```

---

### Boas Práticas de Plan Mode

#### ✅ DO: Use Plan Mode para Cross-Branch Reviews

```bash
# Seu terminal
git checkout feature/your-work
claude --session your-work

# Terminal de review (diferente branch)
git checkout feature/colleague-pr
claude --session review-colleague --permission-mode plan
```

**Benefício:** Zero risk de commits na branch errada.

---

#### ✅ DO: Especifique Critérios de Review

```bash
# ❌ Vago
> "Review this code"

# ✅ Específico
> "Review @src/modules/podcast for:
> 1. LGPD compliance (PII handling)
> 2. Error handling completeness
> 3. Test coverage gaps
> 4. Performance bottlenecks"
```

---

#### ✅ DO: Save Plan Output para Referência

```bash
# Durante plan mode review
> "Review authentication and save recommendations to docs/reviews/auth-review-2026-01-02.md"

# Claude gera plano e oferece salvar
# Útil para track de melhorias ao longo do tempo
```

---

#### ❌ DON'T: Use Plan Mode para Implementação

```bash
# ❌ Errado - plan mode não implementa
claude --permission-mode plan
> "Implement new authentication feature"

# ✅ Correto - normal mode para implementação
claude
> "Implement new authentication feature"
```

---

#### ❌ DON'T: Forget to Switch Back to Normal Mode

```bash
# Você estava em plan mode para review
# Agora quer implementar

# ❌ Esqueceu de trocar - nenhuma implementação acontece
> "Add validation to user input"

# ✅ Trocar para normal mode primeiro
> /mode normal
> "Add validation to user input"
```

---

### Permission Modes - Comparação Completa

| Mode | Pode Ler Arquivos? | Pode Editar/Write? | Pode Executar Bash? | Pode Fazer Commits? | Use Case |
|------|-------------------|-------------------|---------------------|---------------------|----------|
| **normal** | ✅ | ✅ | ✅ | ✅ | Development normal |
| **plan** | ✅ | ❌ | ⚠️ (read-only) | ❌ | Code reviews, análise |
| **auto** | ✅ | ✅ (auto-accept) | ✅ (auto-accept) | ✅ | Trusted workflows |

---

### Advanced: Plan Mode + Subagents

Combine plan mode com agentes especializados:

```bash
# Security audit sem modificações
claude --permission-mode plan
> "Use the security-privacy-auditor agent to audit LGPD compliance"

# Output: Relatório detalhado de compliance SEM fazer mudanças

# UX review sem tocar em código
> "Use the ux-design-guardian agent to review modal design patterns"

# Output: Sugestões de UX SEM implementar
```

---

### Template de Code Review (Plan Mode)

Copie este template para reviews consistentes:

```bash
claude --permission-mode plan

> "Code Review Request
>
> **PR/Branch:** feature/nome-da-branch
> **Author:** Nome do Desenvolvedor
> **Reviewers:** Claude Sonnet 4.5
>
> **Scope:**
> [Descrever o que foi implementado]
>
> **Review Criteria:**
> 1. Security (OWASP Top 10, LGPD compliance)
> 2. Performance (N+1 queries, unnecessary renders)
> 3. Code Quality (DRY, SOLID principles)
> 4. Testing (coverage, edge cases)
> 5. Documentation (comments, README updates)
>
> **Files to Review:**
> @src/modules/[module]/**/*.ts
> @src/components/[component]/**/*.tsx
>
> **Output Format:**
> - Summary (1-2 paragraphs)
> - Issues by priority (Critical/High/Medium/Low)
> - Recommendations with code location references
> - Approve/Request Changes decision"
```

---

### Exemplo Real de Review Output

**Input:**
```bash
claude --permission-mode plan
> "Review @src/modules/podcast/components/GuestWizard.tsx for React best practices"
```

**Output:**
```markdown
# React Best Practices Review: GuestWizard.tsx

## Summary
The GuestWizard component is well-structured with proper state management.
Found 2 medium-priority improvements and 1 low-priority suggestion.

## Issues Found

### Medium Priority

1. **Unnecessary useEffect Dependency (Line 45)**
   ```typescript
   useEffect(() => {
     validateStep(currentStep);
   }, [currentStep, formData]); // formData causes extra re-runs
   ```
   **Recommendation:** Remove formData from deps, validate on form change instead.

2. **Missing Error Boundary (Component Level)**
   - Component doesn't handle Gemini API failures gracefully
   - **Recommendation:** Wrap in ErrorBoundary or add try/catch to API calls

### Low Priority

3. **Magic Numbers in Step Validation (Line 78)**
   ```typescript
   if (step === 2 && formData.name.length < 3) // Magic number 3
   ```
   **Recommendation:** Extract to named constant MIN_NAME_LENGTH

## Positive Observations
- ✅ Proper TypeScript typing throughout
- ✅ Accessible form labels and ARIA attributes
- ✅ Loading states handled correctly

## Recommendation
**APPROVE with suggestions** - Implement medium-priority fixes before merge.
```

---

## 12. Hooks para Automação Multi-Terminal

### O Que São Hooks?

Hooks são comandos ou prompts que executam automaticamente em eventos do Claude Code lifecycle:
- **PreToolUse:** Antes de executar uma ferramenta
- **PostToolUse:** Depois de executar uma ferramenta
- **UserPromptSubmit:** Quando usuário envia mensagem
- **SessionStart:** Ao iniciar nova sessão

### Por Que Usar Hooks no Workflow Multi-Terminal?

- **Enforce padrões** automaticamente (Conventional Commits, RLS policies)
- **Sincronizar WORK_QUEUE.md** sem esforço manual
- **Prevenir erros** comuns (migrations sem RLS, commits fora do padrão)
- **Compartilhar contexto** entre terminais automaticamente

---

### Hook 1: Auto-Update WORK_QUEUE.md

**Problema:** Esquecer de atualizar WORK_QUEUE.md ao trocar branches.

**Solução:** Hook que auto-commita mudanças no WORK_QUEUE.md após edições.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'BRANCH=$(git rev-parse --abbrev-ref HEAD); if [[ \"$BRANCH\" != \"main\" && -f .claude/WORK_QUEUE.md ]]; then git add .claude/WORK_QUEUE.md && git commit -m \"docs: Update WORK_QUEUE for $BRANCH\" --allow-empty || true; fi'"
          }
        ]
      }
    ]
  }
}
```

**Como funciona:**
1. Após cada Edit/Write operation
2. Verifica se não está em main
3. Auto-commita WORK_QUEUE.md se foi modificado
4. Outros terminais veem status atualizado após `git pull`

---

### Hook 2: Enforce Conventional Commits

**Problema:** Commits sem formato Conventional Commits ou sem co-autoria.

**Solução:** Reminder automático ao iniciar sessão.

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "📋 REMINDER: All commits must follow Conventional Commits:\n\n<type>(<scope>): <description>\n\nExamples:\n- feat(podcast): Add guest wizard\n- fix(auth): Resolve OAuth redirect\n- docs(readme): Update setup instructions\n\nALWAYS include co-authorship:\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
          }
        ]
      }
    ]
  }
}
```

**Como funciona:**
1. Ao enviar primeiro prompt da sessão
2. Mostra reminder sobre Conventional Commits
3. Claude inclui formato correto em todos commits

---

### Hook 3: Validate Migration Safety

**Problema:** Criar migrations sem RLS policies ou testes.

**Solução:** Warning ao detectar comandos Supabase migration.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command // empty' | grep -q 'supabase.*migration\\|npx supabase migration' && echo '⚠️  MIGRATION DETECTED!\n\nBefore applying:\n✅ RLS policies defined?\n✅ SECURITY DEFINER functions reviewed?\n✅ Migration tested locally?\n✅ Rollback plan ready?\n' || true"
          }
        ]
      }
    ]
  }
}
```

**Como funciona:**
1. Antes de executar comando Bash
2. Detecta `supabase migration` no comando
3. Mostra checklist de segurança
4. Claude confirma itens antes de prosseguir

---

### Hook 4: Sync Branch Status on Checkout

**Problema:** Esquecer qual branch estava trabalhando ao trocar terminais.

**Solução:** Auto-update WORK_QUEUE.md ao fazer checkout.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command // empty' | grep -q '^git checkout' && echo '📍 Branch switched. Update WORK_QUEUE.md status to 🟢 ATIVA?' || true"
          }
        ]
      }
    ]
  }
}
```

---

### Hook 5: Prevent Backup Files

**Problema:** Criar arquivos .backup ou .bak (viola princípio "Git is backup").

**Solução:** Bloquear Write operations em arquivos .backup.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path // empty' | grep -qE '\\.(backup|bak|old)$' && echo '❌ BLOCKED: Manual backup files violate Git-as-backup principle.\n\nInstead, use:\n- git checkout <commit> -- <file>\n- git show HEAD~1:<file>\n- Create feature branch for experiments' && exit 1 || true"
          }
        ]
      }
    ]
  }
}
```

---

### Instalando Hooks

#### Opção 1: Project-Level (Recomendado)

Criar `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [...],
    "PreToolUse": [...],
    "UserPromptSubmit": [...]
  }
}
```

**Vantagens:**
- Compartilhado via Git com todos terminais
- Versionado (mudanças trackadas)
- Consistente para todos desenvolvedores

#### Opção 2: User-Level (Global)

Editar `~/.claude/settings.json`:

**Vantagens:**
- Aplica a todos projetos
- Preferências pessoais

**Desvantagens:**
- Não compartilhado via Git

---

### Testando Hooks

```bash
# 1. Criar .claude/settings.json com hook
# 2. Testar hook específico

# Testar hook de migration
echo '{"tool_input": {"command": "npx supabase migration new test"}}' | \
  jq -r '.tool_input.command' | \
  grep -q 'supabase.*migration' && echo "✅ Hook detectou migration"

# Testar hook de backup files
echo '{"tool_input": {"file_path": "test.backup"}}' | \
  jq -r '.tool_input.file_path' | \
  grep -qE '\.(backup|bak)$' && echo "✅ Hook detectou backup file"
```

---

### Debugging Hooks

Se hook não funcionar:

```bash
# 1. Verificar sintaxe JSON
cat .claude/settings.json | jq .

# 2. Verificar logs do Claude Code
# (hooks executam comandos shell, erros aparecem no output)

# 3. Testar comando isoladamente
bash -c 'echo "test command from hook"'

# 4. Usar echo para debug
{
  "type": "command",
  "command": "echo 'Hook executou!' && your-actual-command"
}
```

---

### Boas Práticas de Hooks

#### ✅ DO: Use Hooks para Enforce Standards
- Conventional Commits format
- RLS policy checklist
- Test coverage requirements

#### ✅ DO: Keep Hooks Idempotent
```bash
# Hook deve funcionar mesmo se executado múltiplas vezes
git add .claude/WORK_QUEUE.md && git commit -m "docs: Update" --allow-empty || true
#                                                                            ^^^^^^^^
#                                                                            Não falha se já commitado
```

#### ❌ DON'T: Use Hooks para Heavy Operations
```bash
# ❌ Hook que roda build inteiro (muito lento)
"command": "npm run build && npm test"

# ✅ Hook que apenas lembra de testar
"prompt": "Reminder: Run tests before committing (npm test)"
```

#### ❌ DON'T: Block User with Overly Strict Hooks
```bash
# ❌ Hook que bloqueia qualquer commit
"command": "exit 1"  # Nunca fazer isso

# ✅ Hook que sugere melhorias
"prompt": "Consider adding tests for this feature"
```

---

### Exemplos de Hooks Avançados

#### Hook: Auto-format Commit Messages

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command // empty' | grep -q '^git commit' && echo '\n✅ Commit will include:\n- Conventional Commits format\n- Co-Authored-By: Claude Sonnet 4.5\n- 🤖 Generated with Claude Code tag\n' || true"
          }
        ]
      }
    ]
  }
}
```

#### Hook: Prevent Direct Push to Main

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command // empty' | grep -qE '^git push.*origin.*(main|master)' && BRANCH=$(git rev-parse --abbrev-ref HEAD) && [[ \"$BRANCH\" == \"main\" || \"$BRANCH\" == \"master\" ]] && echo '❌ BLOCKED: Direct push to main.\n\nUse PR workflow:\n1. Create feature branch\n2. Push to feature branch\n3. Create PR\n4. Merge after review' && exit 1 || true"
          }
        ]
      }
    ]
  }
}
```

#### Hook: Remind About WORK_QUEUE.md Updates

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Session started on branch: $(git rev-parse --abbrev-ref HEAD)\n\nReminder:\n1. Update WORK_QUEUE.md status to 🟢 ATIVA\n2. List immediate tasks (next 1-2 hours)\n3. Check for conflicts: git pull origin main"
          }
        ]
      }
    ]
  }
}
```

---

### Hooks Recommended para Aica Life OS

Copiar para `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "📋 Conventional Commits: <type>(<scope>): <description>\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command // empty' | grep -q 'supabase.*migration' && echo '⚠️  Migration detected. Ensure RLS policies are in place!' || true"
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path // empty' | grep -qE '\\.(backup|bak|old)$' && echo '❌ Use Git for backups, not .backup files' && exit 1 || true"
          }
        ]
      }
    ]
  }
}
```

---

## 13. Git Worktrees para Parallel Development Extremo

### O Que São Git Worktrees?

Git worktrees permitem **múltiplos checkouts simultâneos** do mesmo repositório:
- Cada worktree = diretório separado com branch própria
- **Zero conflitos** de checkout entre terminais
- Compartilham mesmo `.git/` (economiza espaço)
- Ideal para super-heavy parallel work (3+ branches ativas)

**Problema que resolve:**
```bash
# SEM worktrees - conflito de checkout
Terminal 1: git checkout feature/backend
Terminal 2: git checkout feature/frontend  # ❌ Falha - já em feature/backend

# COM worktrees - sem conflito
Terminal 1: cd ~/aica-backend && git checkout feature/backend  # ✅
Terminal 2: cd ~/aica-frontend && git checkout feature/frontend  # ✅
```

---

### Quando Usar Worktrees?

| Scenario | Use Worktree? | Alternativa |
|----------|---------------|-------------|
| 1-2 branches ativas | ❌ Não necessário | `git checkout` normal |
| 3+ branches ativas simultaneamente | ✅ Sim | Worktrees evitam checkout conflicts |
| Precisa comparar código entre branches | ✅ Sim | Worktrees = side-by-side no IDE |
| Build longo (>5 min) | ✅ Sim | Build em um worktree não bloqueia outro |
| Hotfix urgente durante feature work | ✅ Sim | Worktree separado para hotfix |

---

### Setup de Worktrees para Aica Life OS

#### Estrutura Recomendada

```bash
~/repos/
├── Aica_frontend/          # Main worktree (sempre main branch)
├── aica-backend/           # Worktree para backend work
├── aica-frontend/          # Worktree para frontend work
├── aica-tests/             # Worktree para E2E tests
└── aica-hotfix/            # Worktree para hotfixes urgentes
```

---

### Criando Worktrees

#### 1. Setup Inicial

```bash
# Navegar para repo principal
cd ~/repos/Aica_frontend

# Criar worktree para backend work
git worktree add ../aica-backend feature/backend-api-refactor

# Criar worktree para frontend work
git worktree add ../aica-frontend feature/frontend-ui-redesign

# Criar worktree para tests
git worktree add ../aica-tests feature/e2e-tests-implementation
```

**Output:**
```
Preparing worktree (new branch 'feature/backend-api-refactor')
HEAD is now at a684081 docs(e2e): Add comprehensive E2E testing progress report
```

---

#### 2. Listar Worktrees Ativos

```bash
git worktree list

# Output:
# /c/Users/lucas/repos/Aica_frontend          a684081 [main]
# /c/Users/lucas/repos/aica-backend           3d3a931 [feature/backend-api-refactor]
# /c/Users/lucas/repos/aica-frontend          61df9da [feature/frontend-ui-redesign]
# /c/Users/lucas/repos/aica-tests             1ac1135 [feature/e2e-tests-implementation]
```

---

#### 3. Trabalhar em Worktree Específico

```bash
# Terminal 1: Backend development
cd ~/repos/aica-backend
claude --session backend-api-refactor
# Trabalha em feature/backend-api-refactor

# Terminal 2: Frontend development (simultâneo)
cd ~/repos/aica-frontend
claude --session frontend-ui-redesign
# Trabalha em feature/frontend-ui-redesign

# Terminal 3: E2E tests (simultâneo)
cd ~/repos/aica-tests
claude --session e2e-tests-implementation
# Trabalha em feature/e2e-tests-implementation

# Todos compartilham mesmo .git/ mas diretórios separados
```

---

### Workflows com Worktrees

#### Scenario 1: Feature Development + Hotfix Urgente

```bash
# Você está desenvolvendo feature longa
cd ~/repos/aica-frontend
claude --session frontend-ui-redesign

# BUG CRÍTICO em produção reportado!
# Sem worktree: precisaria stash + checkout + fix + checkout + stash pop

# COM worktree: zero interrupção
cd ~/repos/Aica_frontend  # Main worktree sempre em main
git worktree add ../aica-hotfix fix/critical-oauth-bug
cd ../aica-hotfix
claude --session fix-oauth-bug

# Fix, commit, push PR
# Enquanto frontend-ui-redesign continua intocado
```

---

#### Scenario 2: Build Paralelo

```bash
# Backend build demora 5 minutos
cd ~/repos/aica-backend
npm run build  # Terminal ocupado por 5 min

# Frontend work não espera - trabalha em paralelo
cd ~/repos/aica-frontend
npm run dev  # Trabalha enquanto backend compila
```

---

#### Scenario 3: Side-by-Side Code Comparison

```bash
# Comparar implementações em VS Code
code ~/repos/aica-backend  # Janela 1: Backend code
code ~/repos/aica-frontend  # Janela 2: Frontend code

# Ambas abertas simultaneamente no IDE
# Perfeito para refactoring cross-cutting
```

---

### Removendo Worktrees

#### Quando Remover

- ✅ PR foi mergeado e branch deletada
- ✅ Feature foi abandonada
- ✅ Hotfix completo e em produção

#### Como Remover

```bash
# Opção 1: Remove worktree e deleta branch local
cd ~/repos/Aica_frontend
git worktree remove ../aica-backend --force

# Opção 2: Remove worktree mas mantém branch
git worktree remove ../aica-backend

# Listar worktrees órfãos (branch deletada mas worktree existe)
git worktree prune
```

---

### Integrando Worktrees com WORK_QUEUE.md

Adicione campo **Worktree Path** ao WORK_QUEUE.md:

```markdown
### Branch: `feature/backend-api-refactor`
**Status:** 🟢 ATIVA
**Issue:** #25
**Session Name:** `backend-api-refactor`
**Worktree Path:** `~/repos/aica-backend`
**Última Atualização:** 2026-01-02

#### Tarefas Pendentes
- [ ] Implementar REST endpoints
- [ ] Adicionar RLS policies
- [ ] Escrever integration tests
```

**Benefício:** Qualquer terminal sabe onde encontrar o código.

---

### Boas Práticas de Worktrees

#### ✅ DO: Use Naming Consistente

```bash
# Branch: feature/backend-api-refactor
# Worktree: ~/repos/aica-backend

# Padrão: {repo}-{área}
git worktree add ../aica-backend feature/backend-api-refactor
git worktree add ../aica-frontend feature/frontend-ui-redesign
git worktree add ../aica-tests feature/e2e-tests
```

---

#### ✅ DO: Keep Main Worktree Clean

```bash
# Main worktree sempre em main branch
cd ~/repos/Aica_frontend
git branch  # Deve mostrar: * main

# Nunca fazer feature work no main worktree
# Criar worktree separado para features
```

---

#### ✅ DO: Prune Regularmente

```bash
# Semanalmente, limpar worktrees órfãos
git worktree prune

# Listar worktrees ativos
git worktree list

# Remover worktrees de PRs mergeados
git worktree remove ../aica-feature-antiga
```

---

#### ❌ DON'T: Commit Diretamente em Main Worktree

```bash
# ❌ Errado - commit em main worktree
cd ~/repos/Aica_frontend
git checkout feature/my-feature  # Altera todos terminais!

# ✅ Correto - criar worktree para feature
git worktree add ../aica-my-feature feature/my-feature
cd ../aica-my-feature
# Commits aqui não afetam main worktree
```

---

#### ❌ DON'T: Nest Worktrees

```bash
# ❌ Errado - worktree dentro de outro worktree
cd ~/repos/Aica_frontend
git worktree add ./nested-worktree feature/nested  # ❌

# ✅ Correto - worktrees side-by-side
git worktree add ../aica-feature feature/my-feature  # ✅
```

---

### Troubleshooting Worktrees

#### Problema: "fatal: 'path' is already checked out"

```bash
# Erro ao criar worktree
git worktree add ../aica-backend feature/backend
# fatal: 'feature/backend' is already checked out at '/path/to/existing/worktree'

# Solução: Remover worktree existente primeiro
git worktree remove /path/to/existing/worktree
git worktree add ../aica-backend feature/backend
```

---

#### Problema: Worktree Órfão (Branch Deletada)

```bash
# Branch foi deletada mas worktree ainda existe
git worktree list
# /path/to/worktree  abc123 [feature/deleted-branch] (detached)

# Solução: Prune automático
git worktree prune

# Ou remover manualmente
git worktree remove /path/to/worktree
```

---

#### Problema: Sincronizar Worktrees

```bash
# Mudanças em outro worktree não aparecem
cd ~/repos/aica-backend
git status  # Não vê commits de aica-frontend worktree

# Solução: Fetch/pull em cada worktree
cd ~/repos/aica-backend && git pull origin feature/backend
cd ~/repos/aica-frontend && git pull origin feature/frontend

# Ou criar script de sync
cat > ~/sync-worktrees.sh << 'EOF'
#!/bin/bash
for dir in ~/repos/aica-*; do
  cd "$dir"
  echo "Syncing $(basename $dir)..."
  git pull --rebase
done
EOF
chmod +x ~/sync-worktrees.sh
```

---

### Worktrees + Sessions + Hooks = Ultimate Workflow

Combine todas as técnicas:

```bash
# 1. Criar worktree com branch
git worktree add ../aica-backend feature/backend-api

# 2. Iniciar sessão nomeada
cd ../aica-backend
claude --session backend-api-refactor

# 3. Hooks automáticos garantem:
#    - Conventional Commits ✅
#    - WORK_QUEUE.md atualizado ✅
#    - Migration safety checks ✅

# 4. Plan mode para review cross-worktree
cd ~/repos/aica-frontend
claude --session review-backend --permission-mode plan
> "Review ../aica-backend/src/api for security issues"

# 5. Cleanup após merge
git worktree remove ../aica-backend
# Sessão expira naturalmente
# WORK_QUEUE.md move para histórico (via hook)
```

---

### Comparação: Worktrees vs. Checkout Normal

| Aspecto | Git Checkout | Git Worktrees |
|---------|-------------|---------------|
| **Branches simultâneas** | 1 por vez | Ilimitadas |
| **Conflitos de checkout** | Sim (entre terminais) | Não (diretórios separados) |
| **Espaço em disco** | Menor (1 working dir) | Maior (N working dirs) |
| **Complexidade** | Simples | Moderada |
| **IDE multi-window** | Difícil | Fácil (cada worktree = janela) |
| **Build paralelo** | Impossível | Possível |
| **Melhor para** | 1-2 branches ativas | 3+ branches ativas |

---

### Recursos Adicionais

#### Comandos Úteis

```bash
# Mover worktree para novo path
git worktree move ../aica-backend ../new-location/aica-backend

# Reparar worktree corrompido
git worktree repair

# Verificar integridade
git worktree list --porcelain

# Criar worktree com commit específico
git worktree add ../aica-hotfix abc123

# Criar worktree detached (sem branch)
git worktree add --detach ../aica-exploration HEAD~5
```

#### Aliases Recomendados

```bash
# Adicionar a ~/.gitconfig
[alias]
    wt = worktree
    wtl = worktree list
    wta = worktree add
    wtr = worktree remove
    wtp = worktree prune
```

Uso:
```bash
git wta ../aica-backend feature/backend-api
git wtl
git wtp
```

---

## Última Atualização
- **Data:** 2026-01-02
- **Status:** Guidelines completas com Session Management + Plan Mode + Worktrees
- **Revisão:** A cada 2 semanas ou após mudanças arquiteturais significativas
- **Histórico Analisado:** 87 commits, 29 PRs, 9 branches
- **Novos Recursos:** Sections 10-13 (Session Naming, Plan Mode, Hooks, Worktrees)
