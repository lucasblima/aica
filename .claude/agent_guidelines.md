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

## 10. Hooks para Automação Multi-Terminal

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

## Última Atualização
- **Data:** 2026-01-02
- **Status:** Guidelines otimizadas para workflow multiagente + Hooks automation
- **Revisão:** A cada 2 semanas ou após mudanças arquiteturais significativas
- **Histórico Analisado:** 87 commits, 29 PRs, 9 branches
