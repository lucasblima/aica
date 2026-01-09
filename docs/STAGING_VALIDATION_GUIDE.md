# Staging Validation Guide - PR #79

## Overview

Este guia contém o passo a passo para validar o deploy do PR #79 em staging.

**Deploy Information:**
- **Date:** 2026-01-09 ~11:36 UTC
- **PR:** #79 - AI Cost Tracking, WhatsApp Integration, Database Security
- **Environment:** https://aica-staging-5p22u2w6jq-rj.a.run.app/
- **Database:** Supabase (https://gppebtrshbvuzatmebhr.supabase.co)

---

## Quick Start

### 1. Execute Quick Health Check

Abra o **Supabase SQL Editor** e execute:

```sql
-- QUICK HEALTH CHECK
SELECT
  '✅ AI Tracking' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASS - ' || COUNT(*) || ' records found'
    ELSE '❌ FAIL - No records'
  END as status
FROM ai_usage_analytics
UNION ALL
SELECT
  '✅ RLS Policies',
  CASE
    WHEN COUNT(*) >= 20 THEN '✅ PASS - ' || COUNT(*) || ' policies found'
    ELSE '⚠️ WARNING - Only ' || COUNT(*) || ' policies'
  END
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT
  '✅ WhatsApp Columns',
  CASE
    WHEN COUNT(*) >= 8 THEN '✅ PASS - ' || COUNT(*) || ' columns found'
    ELSE '❌ FAIL - Missing columns'
  END
FROM information_schema.columns
WHERE table_name = 'contact_network'
  AND column_name LIKE 'whatsapp%'
UNION ALL
SELECT
  '✅ Recent Migrations',
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASS - ' || COUNT(*) || ' recent migrations'
    ELSE '⚠️ WARNING - No recent migrations'
  END
FROM supabase_migrations.schema_migrations
WHERE version >= '20260109';
```

**Expected Result:**
```
✅ AI Tracking          | ✅ PASS - X records found
✅ RLS Policies         | ✅ PASS - X policies found
✅ WhatsApp Columns     | ✅ PASS - 8 columns found
✅ Recent Migrations    | ✅ PASS - X recent migrations
```

---

## Detailed Validation Sections

### Section 1: AI Cost Tracking ✅

**O que validar:**
- Tabela `ai_usage_analytics` existe e tem dados
- Tracking funcionando para 3 módulos (Journey, Finance, Grants)
- 19 operações diferentes trackadas no total

**Queries:** `STAGING_VALIDATION_QUERIES.sql` - Section 1 (Queries 1.1-1.6)

**Expected Results:**
- Query 1.2: Deve retornar 3 linhas (journey, finance, grants)
- Query 1.3: Deve retornar 7 use_cases do Grants module
- Query 1.4: Deve retornar 7 use_cases do Journey module
- Query 1.5: Deve retornar 5 use_cases do Finance module

---

### Section 2: RLS Policies ✅

**O que validar:**
- 5 tabelas com novas RLS policies (Phase 1)
- Cada tabela tem 4 policies (SELECT, INSERT, UPDATE, DELETE)
- SECURITY DEFINER functions criadas

**Queries:** `STAGING_VALIDATION_QUERIES.sql` - Section 2 (Queries 2.1-2.6)

**Expected Results:**
- Cada query 2.1-2.5 deve retornar 4 policies
- Query 2.6 deve listar pelo menos 5 tabelas

**Tabelas com RLS:**
1. `ai_usage_tracking_errors`
2. `daily_questions`
3. `whatsapp_sync_logs`
4. `data_deletion_requests`
5. `whatsapp_messages`

---

### Section 3: Performance Indexes ✅

**O que validar:**
- Índices criados para otimizar queries
- Índices compostos para queries frequentes

**Queries:** `STAGING_VALIDATION_QUERIES.sql` - Section 3 (Queries 3.1-3.4)

**Expected Results:**
- Query 3.1: Deve retornar índices em `user_id`, `module_type`, `created_at`
- Query 3.2: Deve retornar índices em `user_id`, `status`, `created_at`
- Query 3.3: Deve retornar índices em `user_id`, `created_at`

---

### Section 4: WhatsApp Integration ✅

**O que validar:**
- 8 novas colunas na tabela `contact_network`
- Tabela `whatsapp_sync_logs` existe
- SECURITY DEFINER functions criadas

**Queries:** `STAGING_VALIDATION_QUERIES.sql` - Section 4 (Queries 4.1-4.5)

**Expected Results:**
- Query 4.1: Deve retornar 8 colunas whatsapp_*
- Query 4.4-4.5: Deve retornar 2 funções

**Novas Colunas WhatsApp:**
1. `whatsapp_phone`
2. `whatsapp_id`
3. `whatsapp_name`
4. `whatsapp_profile_pic_url`
5. `whatsapp_status_message`
6. `last_whatsapp_message_at`
7. `whatsapp_sync_enabled`
8. `whatsapp_metadata`

---

### Section 5: Edge Functions Validation ✅

**O que validar:**
- Edge Functions retornando `usageMetadata` corretamente
- Tracking de operações do `gemini-chat` Edge Function

**Queries:** `STAGING_VALIDATION_QUERIES.sql` - Section 5 (Queries 5.1-5.2)

**Expected Results:**
- Query 5.1: Deve retornar modelo `gemini-2.0-flash-exp`
- Query 5.2: Deve listar operações dos 3 módulos

---

### Section 6: Data Quality Checks ✅

**O que validar:**
- Não há registros com tokens nulos
- Poucos ou nenhum erro de tracking
- Integridade de foreign keys

**Queries:** `STAGING_VALIDATION_QUERIES.sql` - Section 6 (Queries 6.1-6.3)

**Expected Results:**
- Query 6.1: Deve ser 0 (sem registros com tokens nulos)
- Query 6.2: Pode ter alguns erros, mas não crítico
- Query 6.3: Deve ser 0 (sem registros órfãos)

---

### Section 7: Migration Verification ✅

**O que validar:**
- Migrations do PR #79 foram aplicadas
- Versões 20260109 e 20260110 presentes

**Queries:** `STAGING_VALIDATION_QUERIES.sql` - Section 7 (Queries 7.1-7.2)

**Expected Results:**
- Query 7.2: Deve retornar migrations com prefixos:
  - `20260109_phase2_4_create_indexes`
  - `20260110_fix_rls_*` (5 migrations)
  - `20260110_phase1_apply_all`

---

## Frontend Validation (Manual Testing)

### 1. AI Cost Dashboard

**URL:** https://aica-staging-5p22u2w6jq-rj.a.run.app/ai-cost-dashboard

**Testes:**
1. Dashboard carrega sem erros
2. Gráficos aparecem com dados
3. Filtros funcionam (por módulo, período)
4. Tabela de operações lista tracking recente

**Expected:**
- Dashboard mostra dados dos 3 módulos
- Custos calculados corretamente
- Período selecionável (7d, 30d, 90d)

---

### 2. Grants Module AI Generation

**URL:** https://aica-staging-5p22u2w6jq-rj.a.run.app/grants

**Testes:**
1. Criar novo projeto de edital
2. Clicar em "Gerar com IA" em um campo
3. Verificar se conteúdo é gerado
4. Checar no SQL Editor se novo registro apareceu em `ai_usage_analytics`

**Expected:**
- Geração funciona normalmente
- Tracking registrado automaticamente
- `module_type = 'grants'`
- `use_case = 'generate_field_content'`

---

### 3. Journey Module AI Analysis

**URL:** https://aica-staging-5p22u2w6jq-rj.a.run.app/journey

**Testes:**
1. Criar um novo momento
2. Digitar conteúdo (análise em tempo real)
3. Salvar momento
4. Verificar se tracking apareceu no dashboard

**Expected:**
- Análise em tempo real funciona
- Tracking registrado para `analyze_content_realtime`
- Post-capture insight gerado
- Sentiment analysis aplicado

---

### 4. Finance Module Statement Parse

**URL:** https://aica-staging-5p22u2w6jq-rj.a.run.app/finance

**Testes:**
1. Fazer upload de extrato PDF
2. Verificar se parsing funciona
3. Checar tracking no dashboard

**Expected:**
- Parse funciona normalmente
- Tracking registrado para `parse_statement`
- `module_type = 'finance'`

---

## Troubleshooting

### Issue: No records in ai_usage_analytics

**Possible Causes:**
1. Nenhum usuário usou AI operations ainda
2. Edge Functions não estão retornando usageMetadata
3. trackAIUsage() falhando silenciosamente

**Solution:**
1. Execute Query 6.2 para checar erros de tracking
2. Teste manualmente uma operação AI (Grants, Journey, Finance)
3. Verifique logs do Edge Function

---

### Issue: RLS policies missing

**Possible Causes:**
1. Migrations não foram aplicadas
2. Rollback acidental

**Solution:**
1. Execute Query 7.2 para verificar migrations
2. Se necessário, aplicar manualmente migration `20260110_phase1_apply_all.sql`

---

### Issue: WhatsApp columns missing

**Possible Causes:**
1. Migration não foi aplicada
2. Migration falhou

**Solution:**
1. Execute Query 4.1 para verificar colunas
2. Se necessário, aplicar migration `20260109_whatsapp_contact_network.sql`

---

## Success Criteria

Deploy é considerado **bem-sucedido** se:

✅ **AI Tracking:**
- [ ] Quick Health Check retorna ✅ PASS para AI Tracking
- [ ] 3 módulos aparecem em Query 1.2 (journey, finance, grants)
- [ ] Dashboard carrega sem erros

✅ **RLS Policies:**
- [ ] Quick Health Check retorna ✅ PASS para RLS Policies
- [ ] 5 tabelas com 4 policies cada (20 total)

✅ **WhatsApp Integration:**
- [ ] Quick Health Check retorna ✅ PASS para WhatsApp Columns
- [ ] 8 colunas whatsapp_* existem

✅ **Migrations:**
- [ ] Quick Health Check retorna ✅ PASS para Recent Migrations
- [ ] Migrations 20260109 e 20260110 aplicadas

✅ **Frontend:**
- [ ] Dashboard acessível e funcional
- [ ] Geração de conteúdo com IA funciona
- [ ] Tracking aparece em tempo real

---

## Next Steps After Validation

1. ✅ Marcar validação como completa
2. 📋 Aplicar AI Cost Tracking ao Podcast module
3. 📊 Monitorar custos nas próximas 48 horas
4. 🔍 Identificar oportunidades de otimização

---

**Last Updated:** 2026-01-09
**Status:** Ready for Validation
**Maintained By:** Documentation Team
