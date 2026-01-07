# Fila de Trabalho - Multi-Branch Tracking

## 📋 Tarefas Recentes (2026-01-07)

### ✅ CONCLUÍDO: Planejamento de Redistribuição Agent 1 & 2
**Status:** 🟢 PLANEJAMENTO COMPLETO
**Data:** 2026-01-07
**Artefatos:**
- `.claude/plans/steady-plotting-cherny.md` - Plano detalhado de redistribuição
- `.claude/IMPLEMENTATION_GUIDE.md` - Guia step-by-step para execução manual

**Distribuição Planejada:**
- **Agent 1**: 5 P1/P2 issues backend (#41-45) | Q1 2026
- **Agent 2**: 5 frontend/UX + 4 backlog + 3 EPICs | Q1/Q2/Long-term

**Motivo do Guia Manual:** Token GitHub sem `read:project` scope requer UI manual
**Próximo Passo:** Usuário executa 6 fases da implementação via GitHub UI (~30-45 min)

---

## 📊 Dashboard de Branches Ativas

### Branch: `main`
**Status:** 🟢 ATIVA
**Issue:** #47 - Staging Environment Setup
**Última Atualização:** 2026-01-07

---

## 🚀 Ambiente Ativo: STAGING

### URLs Atuais
| Ambiente | URL | Status |
|----------|-----|--------|
| **Staging (ATIVO)** | https://aica-staging-5562559893.southamerica-east1.run.app | ✅ Login funcionando |
| **Supabase Staging** | https://uzywajqzbdbrfammshdg.supabase.co | ✅ Database OK |
| ~~Produção antiga~~ | ~~https://aica-5562559893.southamerica-east1.run.app~~ | ❌ DELETADO (2026-01-07) |

### Trabalho Concluído (Issue #47)
- ✅ Projeto Supabase staging criado (`uzywajqzbdbrfammshdg`)
- ✅ OAuth Google configurado com redirect URI staging
- ✅ `cloudbuild-staging.yaml` criado com credenciais staging
- ✅ Build e deploy Cloud Run staging (service: `aica-staging`)
- ✅ Login OAuth testado e funcionando
- ✅ Database bootstrap completo (14 tabelas + RLS + helper functions)
- ✅ Servidor de produção antigo deletado (login quebrado)

### Tabelas no Staging Database
`association_members`, `associations`, `daily_reports`, `grant_briefings`, `grant_opportunities`, `grant_projects`, `grant_responses`, `life_events`, `podcast_episodes`, `podcast_shows`, `profiles`, `user_achievements`, `user_stats`, `users`

### Deploy Commands
```bash
# Deploy para staging (automático via GitHub push ou manual)
gcloud builds submit --config=cloudbuild-staging.yaml --project=gen-lang-client-0948335762
```

### Próximos Passos para Beta
- [ ] Testar funcionalidades no staging
- [ ] Criar novo servidor de produção quando pronto para beta
- [ ] Fechar Issue #47

---

## 🎯 Prioridades Globais (GitHub Issues)

### ✅ RESOLVIDO (2026-01-07)
- **#68** - Could not find table 'public.onboarding_context_captures' in schema cache ✅ **RESOLVIDO**
  - Migração aplicada com sucesso via supabase db push --include-all
  - Commit: ab27d86

### 🔴 CRÍTICA (P1 - Blocking Production)
1. **#42** - Query Supabase com Filtro Duplicado em `memories` (database)
2. **#41** - Query Supabase com Filtro Duplicado em `work_items` (database)

### 🟠 ALTA (P2 - High Impact Bugs)
3. **#43** - Edge Function gemini-chat Retornando 500 (backend)
4. **#44** - Múltiplas Re-inicializações do useAuth (Performance)
5. **#37** - TypeError: chunkedCookie.startsWith is not a function (onboarding)
6. **#38** - Beco sem saída no onboarding - Usuário fica preso (UX/UI)
7. **#27** - Checklist OAuth Google Cloud - Critérios de Aprovação (docs, priority:high)

### 🟡 MÉDIA (P3 - Medium Priority)
8. **#52** - [STAGING] Fase 7: Testar o Ambiente de Staging (devops, priority:medium)
9. **#50** - [STAGING] Fase 5: Configurar Google OAuth para URL de Staging (backend)
10. **#49** - [STAGING] Fase 4: Configurar Supabase para Aceitar URL de Staging (database)
11. **#48** - [STAGING] Fase 3: Atualizar Configurações com URL Real do Staging (devops)
12. **#45** - Falha na Geração de Daily Reports
13. **#44** - Múltiplas Re-inicializações do useAuth (Performance)

### 💡 FEATURES & MELHORIAS
14. **#36** - 🔍 UX Audit - Análise Completa da Experiência do Usuário (documentation)
15. **#39** - [REFACTOR] Reorganizar estrutura de pastas (refactor)
16. **#21** - Melhorar sistema de sugestões geradas por IA para Aica Studio
17. **#24** - Roadmap de monetização - Planos e métricas de sucesso
18. **#22** - Integração WhatsApp via Evolution API
19. **#20** - Criar VacationTimeline para planejamento de férias em família

### 📋 STAGING PIPELINE (Issues #48-53) - ✅ TODAS CONCLUÍDAS
- **#53** - Fase 8: Pausar/Limpar Produção Antiga ✅ **CONCLUÍDO**
- **#52** - Fase 7: Testar o Ambiente de Staging ✅ **CONCLUÍDO** (Login OK, agent resolvendo bugs onboarding)
- **#51** - Fase 6: Criar GitHub Actions para Deploy Automático ✅ **CONCLUÍDO**
- **#50** - Fase 5: Configurar Google OAuth ✅ **CONCLUÍDO**
- **#49** - Fase 4: Configurar Supabase ✅ **CONCLUÍDO**
- **#48** - Fase 3: Atualizar Configurações ✅ **CONCLUÍDO**

---

## 🧹 Limpeza Realizada Hoje (2026-01-02)

### Branches Remotas Deletadas ✅
- `origin/claude/fix-oauth-pkce-error-nYEFW` (PR #31 merged)
- `origin/claude/oauth-maturity-analysis-KDXC1` (PRs #29,30,33 merged)
- `origin/claude/review-changes-mjx50y0164bypd85-RQ64f` (PR #32 merged)

### Branches Locais Deletadas ✅
- `feature/guest-identification-wizard-issue-15` (PR #19 merged)
- `feature/whatsapp-gamification-integration-issue-16` (PR #18 merged)
- `fix/e2e-auth-race-condition-and-approval-schema` (0 commits pendentes)

### Stashes Limpos ✅
- **Antes:** 7 stashes (maioria obsoletos de branches mergeadas)
- **Depois:** 1 stash ativo (`stash@{0}: On main: Stash local Claude settings before merge`)
- **Dropados:** 6 stashes de trabalho já integrado

---

## 📋 Protocolo de Atualização

### Ao Iniciar Trabalho em Branch
1. **ATUALIZAR** este arquivo com status atual:
   ```markdown
   **Status:** 🟢 ATIVA
   **Última Atualização:** [data de hoje]
   ```

2. **LISTAR** tarefas imediatas (próximas 1-2 horas)

3. **COMMIT** atualização do WORK_QUEUE.md:
   ```bash
   git add .claude/WORK_QUEUE.md
   git commit -m "docs: Update work queue for [branch-name]

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

### Ao Pausar/Trocar Branch
1. **MARCAR** status como 🟡 PAUSED ou 🔴 STASHED

2. **DOCUMENTAR** próximo passo:
   ```markdown
   #### Próximo Passo ao Retomar
   Terminar implementação de [componente X] e então [ação Y]
   ```

3. **STASH** com mensagem:
   ```bash
   git stash push -m "WIP: [descrição do estado atual]"
   ```

### Ao Mergear Branch
1. **MOVER** seção da branch para "Histórico de Merges"

2. **ATUALIZAR** prioridades globais

3. **CELEBRAR** 🎉 no commit message:
   ```
   docs: Archive completed work for [branch-name] 🎉
   ```

---

## 📚 Histórico de Merges (Últimas 2 Semanas)

### ✅ Hotfix: OAuth PKCE Cookie Adapter (2026-01-02) - EM ANDAMENTO
**Commit:** 71d6b58 (cherry-picked para main)
**Impacto:** Corrige build quebrado que impedia deploy do fix OAuth
**Lessons Learned:**
- PRs podem mergear mas se build falha, mudanças não chegam em produção
- TypeScript compilation errors bloqueiam todo pipeline
- Orphaned comments/undefined references quebram silenciosamente no CI

### ✅ PR #29: OAuth Maturity Analysis (2026-01-02)
**Branch:** `claude/oauth-maturity-analysis-KDXC1`
**Impacto:** Documentação para aprovação Google OAuth
**Lessons Learned:** Compliance é crítico para production

### ✅ PR #26: Frontend URL + OAuth Client ID Fix (2026-01-02)
**Branch:** `feature/whatsapp-evolution-integration-issue-12`
**Impacto:** Corrigiu redirect mismatch + token refresh
**Lessons Learned:**
- Client ID deve match Supabase Dashboard
- Cloud Run pode gerar múltiplas URLs (antiga/nova)
- Tokens emitidos por um Client ID não podem ser renovados por outro

### ✅ PR #19: Podcast Guest Identification Wizard (2025-12-31)
**Branch:** `feature/guest-identification-wizard-issue-15`
**Impacto:** Wizard completo com Gemini API integration
**Lessons Learned:**
- Multi-step wizards exigem state machine clara
- Validation utilities com 63 tests garantem robustez
- Gemini API fallback evita breaking changes

### ✅ PR #18: WhatsApp Gamification UI/UX (2025-12-31)
**Branch:** `feature/whatsapp-gamification-integration-issue-16`
**Impacto:** XP popups + badge unlock modals
**Lessons Learned:**
- E2E tests antes de merge evitam bugs
- Gamification UI precisa de animations suaves
- Milestone tracking cards aumentam engagement

### ✅ PR #17: PKCE OAuth Migration (2025-12-31)
**Branch:** `feature/whatsapp-evolution-integration-issue-12`
**Impacto:** Migração @supabase/ssr para Cloud Run
**Lessons Learned:**
- Containers stateless exigem cookie storage
- PKCE flow resolve 401 errors em Cloud Run
- @supabase/ssr é obrigatório para SSR/containers

---

## 🔄 Sincronização Multi-Terminal

### Comandos Úteis para Sync
```bash
# Ver todas branches ativas (ordenadas por atividade recente)
git branch -a --sort=-committerdate | head -10

# Ver commits de hoje em todas branches
git log --all --since="today" --oneline

# Ver commits da última semana em todas branches
git log --all --since="1 week ago" --oneline | head -30

# Ver stashes salvos
git stash list

# Aplicar stash específico
git stash apply stash@{0}

# Ver mudanças não commitadas em outra branch
git diff origin/main..feature/nome-da-branch

# Ver branches que ainda não foram mergeadas
git branch --no-merged main
```

### Verificar Estado Atual
```bash
# Status atual
git status

# Branch atual
git branch --show-current

# Último commit
git log -1 --oneline

# Branches com trabalho não mergeado
git log main..HEAD --oneline
```

---

## 📝 Notas de Desenvolvimento

### Aprendizados Esta Semana (2026-01-02)
- **OAuth Client ID Mismatch:** Tokens emitidos por um Client ID não podem ser renovados por outro
- **Cloud Run URLs:** Serviço pode ter múltiplas URLs (nova e legacy) - usar URL nova
- **Build Failures Silenciosos:** PRs podem mergear mas se build quebra, código não vai para produção
- **TypeScript Órfãos:** Referências undefined e JSDoc blocks quebrados impedem compilation
- **Branch Cleanup:** Manter repo limpo facilita navegação (deletadas 6 branches + 6 stashes hoje)

### Próximas Investigações
- [ ] Configurar Cloud Build trigger automático para main branch
- [ ] Implementar pre-commit hook para validar TypeScript antes de push
- [ ] CI/CD optimization (build time ~3-4min pode melhorar?)
- [ ] Backup strategy para banco Supabase
- [ ] Custom domain para Cloud Run (evitar mudanças de URL futuras)

---

## 🎯 Metas de Qualidade

### Code Coverage
- Unit Tests: >80% (atual: ~90% em validation.ts)
- E2E Tests: Critical paths cobertos
- Integration Tests: Em desenvolvimento

### Performance
- Build Time: ~3-4 min (target: <3 min)
- Cloud Run Cold Start: <2s
- Lighthouse Score: >90

### Compliance
- LGPD/GDPR: RLS policies em todas tabelas
- OWASP Top 10: Nenhuma vulnerabilidade conhecida
- Accessibility: WCAG 2.1 AA

---

**Última Atualização:** 2026-01-02 23:15
**Maintainers:** Lucas Boscacci Lima + Claude Sonnet 4.5
