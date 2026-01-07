# Agent Guidelines - AICA Life OS (Otimizado)

## 1. Workflow Multiagente

### Protocolo de Sincronização
```bash
# Antes de iniciar
git pull origin main
git branch -a --sort=-committerdate | head -10
git log --all --oneline --since="1 day ago" | head -20

# Durante trabalho
git commit -m "feat(scope): descrição" # Commits frequentes
# Sempre incluir: Co-Authored-By: Claude <noreply@anthropic.com>

# Ao pausar
git stash push -m "WIP: descrição do estado"
```

---

## 2. Convenções de Nomenclatura

### Branches
```
feature/{descrição-kebab-case}-issue-{número}
fix/{descrição-kebab-case}
refactor/{descrição-kebab-case}
```

### Commit Messages (Conventional Commits)
```
<type>(<scope>): <description>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:** feat, fix, docs, test, refactor, chore
**Scopes:** podcast, auth, gamification, whatsapp, security, studio, onboarding, ui

---

## 3. Pull Request Workflow

**Checklist antes do PR:**
- [ ] `npm run build` passou
- [ ] `npm run test` passou
- [ ] Commits seguem Conventional Commits
- [ ] Co-autoria incluída
- [ ] Branch atualizada com main

---

## 4. Version Control - Git é o Backup

### ❌ NUNCA criar backups manuais
- `file.backup_*`, `file.bak`, `file~`, `file.old`

### ✅ Use Git
```bash
git show HEAD~1:path/to/file      # Ver versão anterior
git diff HEAD~1 path/to/file       # Comparar mudanças
git checkout <commit> -- path/file # Restaurar versão
git log --follow path/to/file      # Ver histórico
```

---

## 5. Agentes Especializados

### Mapeamento de Auto-Triggers

| Agente | Auto-Triggers (Keywords) |
|--------|--------------------------|
| `master-architect-planner` | "plan", "architecture", "design", "roadmap" |
| `backend-architect-supabase` | "migration", "RLS", "database", "schema", "SQL" |
| `ux-design-guardian` | "UI review", "UX", "design system", "component" |
| `gamification-engine` | "XP", "badge", "achievement", "streak" |
| `podcast-production-copilot` | "podcast", "guest", "pauta", "episode" |
| `testing-qa-playwright` | "E2E test", "Playwright", "test coverage" |
| `security-privacy-auditor` | "LGPD", "GDPR", "security audit", "vulnerability" |
| `documentation-maintainer` | "update docs", "sync PRD", "README" |
| `calendar-executive` | "Google Calendar", "OAuth", "calendar sync" |
| `gemini-integration-specialist` | "Gemini API", "prompt", "AI integration" |

### Invocação
- **Automática:** Claude detecta keywords e delega
- **Explícita:** `"Use o {agent-name} agent para {task}"`
- **Chaining:** Liste agentes em sequência para features complexas

---

## 6. Session Management

### Convenção de Nomes
**Pattern:** `{area}-{feature}-{type}`

```bash
# Exemplos
backend-auth-refactor
frontend-ui-gamification
e2e-tests-oauth
fix-token-refresh
```

### Comandos
```bash
claude --session nome-da-sessao    # Criar/retomar
claude --resume                     # Listar sessões
claude --continue                   # Retomar mais recente
/rename novo-nome                   # Renomear durante sessão
```

### Sincronizar com WORK_QUEUE.md
```markdown
### Branch: `feature/nome-issue-XX`
**Status:** 🟢 ATIVA
**Session Name:** `backend-feature-name`
**Última Atualização:** YYYY-MM-DD
```

---

## 7. Plan Mode (Code Reviews)

### Ativação
```bash
claude --permission-mode plan
/mode plan    # Durante sessão
/mode normal  # Voltar ao normal
```

### Use Cases
- Review de PR sem modificar código
- Análise de código em produção
- Second opinion antes de criar PR

### Comparação de Modos

| Mode | Editar? | Bash? | Commits? | Use Case |
|------|---------|-------|----------|----------|
| normal | ✅ | ✅ | ✅ | Development |
| plan | ❌ | ⚠️ read-only | ❌ | Reviews, análise |
| auto | ✅ auto | ✅ auto | ✅ | Trusted workflows |

---

## 8. Hooks Recomendados

### Conventional Commits Reminder
```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "",
      "hooks": [{
        "type": "prompt",
        "prompt": "📋 Commits: <type>(<scope>): <desc>\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
      }]
    }]
  }
}
```

### Migration Safety Check
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "echo '$TOOL_INPUT' | grep -q 'supabase.*migration' && echo '⚠️ MIGRATION: RLS policies? Tested locally? Rollback ready?' || true"
      }]
    }]
  }
}
```

### Prevent Backup Files
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write",
      "hooks": [{
        "type": "command", 
        "command": "echo '$FILE_PATH' | grep -qE '\\.(backup|bak|old)$' && echo '❌ Use Git, not backup files' && exit 1 || true"
      }]
    }]
  }
}
```

**Instalar em:** `.claude/settings.json`

---

## 9. Git Worktrees (Multi-Branch Paralelo)

### Quando Usar
- 3+ branches ativas simultaneamente
- Build/test paralelo necessário
- IDE multi-window por branch

### Comandos Essenciais
```bash
# Criar worktree
git worktree add ../aica-backend feature/backend-api

# Listar worktrees
git worktree list

# Remover worktree
git worktree remove ../aica-backend

# Limpar órfãos
git worktree prune
```

### Workflow
```bash
# 1. Criar worktree
git worktree add ../aica-feature feature/minha-feature

# 2. Trabalhar no worktree
cd ../aica-feature
claude --session feature-implementation

# 3. Após merge, remover
git worktree remove ../aica-feature
```

### ✅ Boas Práticas
- Main worktree sempre em `main` branch
- Naming: `{repo}-{área}` (aica-backend, aica-frontend)
- Prune semanalmente

### ❌ Evitar
- Commit direto no main worktree
- Worktrees aninhados
- Esquecer de sincronizar (`git pull` em cada worktree)

---

## 10. Troubleshooting Rápido

### "Branch já checked out"
```bash
git worktree remove /path/to/existing
git worktree add ../novo-path feature/branch
```

### Worktree órfão
```bash
git worktree prune
```

### Sincronizar worktrees
```bash
cd ~/repos/aica-backend && git pull --rebase
cd ~/repos/aica-frontend && git pull --rebase
```

---

## 11. Aliases Git Recomendados

```gitconfig
[alias]
    wt = worktree
    wtl = worktree list
    wta = worktree add
    wtr = worktree remove
    wtp = worktree prune
```

---

## Última Atualização
- **Data:** 2026-01-05
- **Status:** Otimizado para <40k chars (Claude Code compatibility)
- **Original:** 48k chars → **Atual:** ~8k chars