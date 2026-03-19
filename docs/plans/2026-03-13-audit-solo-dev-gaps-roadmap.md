# Audit: Solo Developer Blind Spots — AICA Life OS

**Data:** 2026-03-13
**Metodologia:** 4 agentes especializados em paralelo (Arquitetura, Seguranca, Qualidade, DBA)
**Escopo:** Codigo local + Supabase remoto

---

## Resumo Executivo

| Dimensao | CRITICAL | HIGH | MEDIUM | LOW | Total |
|----------|----------|------|--------|-----|-------|
| Seguranca | 0 | 1 | 2 | 3 | 6 |
| Arquitetura | 4 | 4 | 6 | 4 | 18 |
| Banco de Dados | 3 | 5 | 6 | 3 | 17 |
| Qualidade/Testes | 7 | 3 | 4 | 4 | 18 |
| **TOTAL** | **14** | **13** | **18** | **14** | **59** |

**Veredicto geral:** Fundamentos solidos de seguranca e arquitetura, mas gaps significativos em: (1) seguranca do banco remoto, (2) cobertura de testes, (3) CI/CD, e (4) disciplina de tipos.

---

## SEMANA 1 — URGENTE (CRITICAL findings)

### 1. [DB] Privilege Escalation: `is_admin()` le metadata editavel pelo usuario
- **Risco:** Qualquer usuario autenticado pode se tornar admin via `supabase.auth.updateUser({ data: { is_admin: true } })`
- **Impacto:** Acesso admin a `commission_ledger`, `evangelists`, `referral_conversions`, `tier_history`
- **Fix:** Aplicar migration `20260311130000_fix_is_admin_use_app_metadata.sql` (ja existe local)
- **Esforco:** 5 min (aplicar migration)

### 2. [DB] 4 tabelas com RLS aberto para role `{public}`
- **Tabelas:** `email_import_log`, `user_email_aliases`, `user_patterns`, `whatsapp_media_tracking`
- **Risco:** Qualquer pessoa com anon key pode INSERT/UPDATE/DELETE todos os registros
- **Fix:** Recriar policies com `TO service_role` em vez de `TO public`
- **Esforco:** 30 min

### 3. [DB] `waitlist_signups` tem RLS habilitado mas ZERO policies
- **Risco:** Feature de waitlist completamente quebrada (ninguem consegue ler ou escrever)
- **Fix:** Adicionar policies apropriadas (INSERT publico + SELECT autenticado)
- **Esforco:** 15 min

### 4. [SEC] SQL Injection em `search-contacts`
- **Arquivo:** `supabase/functions/search-contacts/index.ts:227`
- **Risco:** Phone numbers interpolados diretamente no filtro `.not()` do PostgREST
- **Fix:** Escapar aspas simples ou usar RPC server-side
- **Esforco:** 30 min

### 5. [DB] 7 cron jobs falhando continuamente (89% failure rate)
- **Impacto:** 39.778 registros de falha acumulados, `cron.job_run_details` inchando
- **Causa raiz:** `vault.decrypted_secrets` e `app.settings` vazios
- **Fix:** Configurar vault secrets OU desativar cron jobs nao funcionais
- **Esforco:** 1h (configurar) ou 15 min (desativar)

### 6. [SEC] `VITE_GEMINI_API_KEY` declarado em `vite-env.d.ts`
- **Arquivo:** `src/vite-env.d.ts:4-6`
- **Risco:** Nenhum dev novo deveria ver essa declaracao e pensar que e seguro usar no frontend
- **Fix:** Remover declaracoes de API keys do interface (manter apenas URLs e anon key)
- **Esforco:** 10 min

---

## SEMANA 2 — ALTA PRIORIDADE (HIGH findings)

### 7. [DB] 3 migrations locais nao aplicadas
- `20260311130000` — fix is_admin (CRITICAL, coberto no item 1)
- `20260311100001` — athlete_unlink_calendar_cleanup
- `20260312100000` — athlete_unlink_calendar_sync_fix
- **Fix:** `npx supabase db push`
- **Esforco:** 15 min

### 8. [DB] 3 migrations remotas sem arquivo local (drift)
- `20260313003254`, `20260313131119`, `20260313162646`
- **Fix:** Criar arquivos locais ou `supabase migration repair`
- **Esforco:** 30 min

### 9. [DB] 20 Edge Functions orfas deployadas (sem codigo local)
- Inclui legado do Evolution API (`webhook-evolution`, `configure-instance-webhook`, etc.)
- **Fix:** Auditar e remover as que nao sao mais usadas
- **Esforco:** 1h

### 10. [DB] 7 Edge Functions locais nao deployadas
- `eraforge-tts`, `external-brasil`, `external-turnstile-verify`, `generate-presentation-pdf`, `studio-newsletter-generate`, `studio-seo-analyze`, `studio-team-invite`
- **Fix:** Deploy ou remover se nao estao em uso
- **Esforco:** 30 min

### 11. [ARQ] 21 arquivos importando `@supabase/supabase-js` diretamente
- Devem usar `@/services/supabaseClient.ts` (exceto Telegram Mini App — intencional)
- **Fix:** Substituir imports por singleton
- **Esforco:** 1-2h

### 12. [ARQ] 6+ violacoes de bounded context entre modulos
- `flux` → `connections`, `liferpg` → `journey`, `connections` → `google-hub`, `agenda` → `flux`
- **Fix:** Criar camada compartilhada em `src/services/` ou `src/types/`
- **Esforco:** 2-3h

### 13. [ARQ] Hook duplicado: `useConsciousnessPoints` (2 versoes)
- `src/hooks/useConsciousnessPoints.ts` (252 linhas)
- `src/modules/journey/hooks/useConsciousnessPoints.ts`
- **Fix:** Manter uma versao canonica, re-exportar da outra
- **Esforco:** 1h

### 14. [QUA] Adicionar CI/CD no GitHub Actions
- `npm run typecheck` em cada PR
- `npm run test:unit` em cada push
- `npm run build` validation
- **Esforco:** 2h

### 15. [SEC] Rate limiting no telegram-webhook
- **Risco:** Sem throttling, atacante pode gerar custos com chamadas Gemini
- **Fix:** Implementar rate limit por usuario (20 msg/min)
- **Esforco:** 1-2h

---

## SEMANA 3-4 — MEDIA PRIORIDADE (tech debt + qualidade)

### 16. [QUA] Testes para servicos criticos (83% sem testes)
- **Prioridade 1:** `financeService.ts`, `billingService.ts` (pagamentos)
- **Prioridade 2:** `connectionSpaceService.ts`, `momentService.ts` (dados core)
- **Prioridade 3:** `googleCalendarService.ts`, `athleteService.ts` (integracoes)
- **Meta:** 80% cobertura nos servicos criticos
- **Esforco:** 3-5 sessoes

### 17. [QUA] Testes de autenticacao
- `useAuth.ts`, `useGoogleAuth.ts`, `useTelegramAuth.ts`
- OAuth state management, token refresh, session handling
- **Esforco:** 1-2 sessoes

### 18. [QUA] Testes de fluxo de pagamento
- Asaas webhook validation, Pix payment creation
- **Esforco:** 1 sessao

### 19. [QUA] Pre-commit hooks (Husky + lint-staged)
- Bloquear commits com erros de tipo
- Bloquear commits sem testes
- **Esforco:** 1h

### 20. [ARQ] Reduzir 478 usos de `any`
- **Meta Sprint:** Resolver 100+ dos mais criticos
- Habilitar `noImplicitAny` incrementalmente no tsconfig
- **Esforco:** 2-3 sessoes

### 21. [ARQ] Quebrar 6 componentes >900 linhas
- `AthleteDetailView.tsx` (1564 linhas)
- `CRMCommandCenterView.tsx` (1253 linhas)
- `FinanceDashboard.tsx` (1145 linhas)
- `ProposalGeneratorView.tsx` (1122 linhas)
- `EF_ParentDashboard.tsx` (1111 linhas)
- `EF_OnboardingScreen.tsx` (1035 linhas)
- **Esforco:** 1 sessao por componente

### 22. [ARQ] 3 modulos sem barrel exports
- `atlas/`, `liferpg/`, `podcast/` — adicionar `index.ts`
- **Esforco:** 30 min

### 23. [ARQ] Error handling ausente em queries Supabase
- Muitos hooks fazem `await supabase.auth.getUser()` sem try/catch
- **Esforco:** 2h

### 24. [ARQ] 269 console.log diretos (usar `createNamespacedLogger`)
- **Meta:** Migrar modulos criticos para logger estruturado
- **Esforco:** 2-3h

### 25. [DB] CLAUDE.md referencia `workout_blocks` mas tabela correta e `workout_slots`
- **Esforco:** 5 min

---

## BACKLOG — BAIXA PRIORIDADE

### 26. [DB] `brazilian_holidays` e `weather_cache` sem RLS
- Tabelas read-only, risco baixo
- **Esforco:** 15 min

### 27. [DB] Index redundante em `finance_transactions`
- `idx_finance_transactions_hash` duplica `finance_transactions_hash_id_key`
- **Esforco:** 5 min

### 28. [DB] 120+ tabelas sem trigger `updated_at`
- Habilitar `moddatetime` extension + adicionar triggers
- **Esforco:** 1h

### 29. [DB] 92/207 tabelas vazias (44%)
- Features pre-construidas nao usadas (academia, habitat, ventures, tribo, eraforge)
- Avaliar se devem ser removidas
- **Esforco:** 1h de auditoria

### 30. [SEC] Cookie `sameSite: 'lax'` (poderia ser `'strict'`)
- Risco baixo (PKCE protege)
- **Esforco:** 5 min + teste

### 31. [ARQ] 19+ TODO/FIXME no codigo
- Migrar para issue tracker
- **Esforco:** 30 min

### 32. [ARQ] Hardcoded values (Turnstile key, PDF URL, bot username)
- Mover para config/env vars
- **Esforco:** 30 min

### 33. [QUA] Habilitar TypeScript strict mode
- `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`
- **Esforco:** Incremental, 5+ sessoes

### 34. [QUA] Testes E2E para fluxos criticos faltantes
- Payment flow, calendar sync, WhatsApp import
- **Esforco:** 2-3 sessoes

### 35. [QUA] `npm audit` automatizado no CI
- **Esforco:** 15 min

---

## Pontos Fortes Identificados

O audit tambem identificou praticas solidas que devem ser mantidas:

| Area | Pratica |
|------|---------|
| **API Keys** | GeminiClient roteia TUDO via Edge Functions, zero keys no frontend |
| **Auth** | Token refresh condicional, circuit breaker, PKCE implementado |
| **RLS** | Maioria das tabelas com policies corretas (SELECT/INSERT/UPDATE/DELETE) |
| **CORS** | Whitelist correta (dev.aica.guru + aica.guru), sem wildcard |
| **DOMPurify** | HTML sanitizado com allowlist restrita |
| **LGPD** | Raw text nunca armazenado, apenas `intent_summary` (100 chars) |
| **Webhooks** | Telegram e Asaas validam tokens |
| **Modulos testados** | Atlas (100%), Studio (67%) — bons exemplos a seguir |

---

## Metricas de Acompanhamento

| Metrica | Atual | Meta Sprint | Meta Q2 |
|---------|-------|-------------|---------|
| Cobertura servicos | 17% | 50% | 80% |
| Usos de `any` | 478 | 350 | 100 |
| CRITICALs abertos | 14 | 0 | 0 |
| Cron failures/dia | ~1400 | 0 | 0 |
| Edge Functions orfas | 20 | 10 | 0 |
| CI checks em PR | 0 | 3 | 5 |

---

*Gerado por Agent Team: Arquiteto + Seguranca + Qualidade + DBA*
*Consolidado por Claude Opus 4.6*
