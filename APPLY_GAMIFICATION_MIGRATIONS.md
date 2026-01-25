# Aplicar Migrations Gamification 2.0 + WhatsApp Documents

**Data:** 2026-01-25
**Projeto:** aica-staging (uzywajqzbdbrfammshdg)
**Método:** SQL Editor Manual (Supabase CLI não disponível em Windows Git Bash)

---

## ⚠️ IMPORTANTE

As migrations do Gamification 2.0 **NÃO foram aplicadas automaticamente** via deploy. Precisam ser aplicadas manualmente via **Supabase SQL Editor**.

---

## 📋 Migrations Pendentes (5 no total)

| # | Migration | Sistema | Tamanho | Linhas |
|---|-----------|---------|---------|--------|
| 1 | `20260122000003_whatsapp_document_tracking.sql` | WhatsApp | 16KB | 467 |
| 2 | `20260123_streak_trends.sql` | Gamification 2.0 | 5.6KB | 190 |
| 3 | `20260124_consciousness_points.sql` | Gamification 2.0 | 7.9KB | 265 |
| 4 | `20260125_recipe_badges.sql` | Gamification 2.0 | 8.8KB | 298 |
| 5 | `20260126_unified_efficiency.sql` | Gamification 2.0 | 8.3KB | 280 |

**Total:** ~47KB de SQL (1.500 linhas)

---

## 🚀 Passo a Passo

### 1. Acessar SQL Editor

URL: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new

### 2. Aplicar Migration 1: WhatsApp Document Tracking

```bash
# Copiar conteúdo
cat supabase/migrations/20260122000003_whatsapp_document_tracking.sql
```

**No SQL Editor:**
1. Cole todo o conteúdo da migration
2. Clique em **Run** (ou Ctrl+Enter)
3. Aguarde ~10 segundos para completar
4. Verifique: Deve retornar "Success. No rows returned"

**O que cria:**
- ✅ Storage bucket `whatsapp-documents` (25MB limit, 6 MIME types)
- ✅ Tabela `whatsapp_media_tracking` (14 colunas)
- ✅ RLS policies (5 policies)
- ✅ Funções helper: `generate_whatsapp_document_path()`, `get_pending_whatsapp_media()`
- ✅ Constraint atualizada em `whatsapp_pending_actions`

### 3. Aplicar Migration 2: Streak Trends

```bash
# Copiar conteúdo
cat supabase/migrations/20260123_streak_trends.sql
```

**No SQL Editor:**
1. Cole todo o conteúdo
2. Run (Ctrl+Enter)
3. Aguarde ~5 segundos

**O que cria:**
- ✅ Coluna `user_stats.streak_trend` (JSONB)
- ✅ Coluna `user_stats.gamification_intensity` (TEXT)
- ✅ Índice GIN para queries JSONB
- ✅ Migração de dados existentes (current_streak → trend)

### 4. Aplicar Migration 3: Consciousness Points

```bash
# Copiar conteúdo
cat supabase/migrations/20260124_consciousness_points.sql
```

**No SQL Editor:**
1. Cole todo o conteúdo
2. Run (Ctrl+Enter)
3. Aguarde ~8 segundos

**O que cria:**
- ✅ Coluna `user_stats.consciousness_points` (JSONB)
- ✅ Tabela `cp_transactions` (histórico de CP)
- ✅ RLS policies para `cp_transactions`
- ✅ Função `award_consciousness_points()`
- ✅ Índices para performance

### 5. Aplicar Migration 4: RECIPE Badges

```bash
# Copiar conteúdo
cat supabase/migrations/20260125_recipe_badges.sql
```

**No SQL Editor:**
1. Cole todo o conteúdo
2. Run (Ctrl+Enter)
3. Aguarde ~10 segundos

**O que cria:**
- ✅ Coluna `user_stats.recipe_progress` (JSONB)
- ✅ Tabela `recipe_badges` (53 badges pré-populados)
- ✅ Tabela `badge_progress` (tracking de conquistas)
- ✅ RLS policies (4 policies)
- ✅ Funções: `unlock_badge()`, `check_badge_unlock()`

### 6. Aplicar Migration 5: Unified Efficiency

```bash
# Copiar conteúdo
cat supabase/migrations/20260126_unified_efficiency.sql
```

**No SQL Editor:**
1. Cole todo o conteúdo
2. Run (Ctrl+Enter)
3. Aguarde ~8 segundos

**O que cria:**
- ✅ Coluna `user_stats.unified_efficiency` (JSONB)
- ✅ Função `calculate_unified_efficiency()`
- ✅ Trigger para recalcular efficiency automaticamente
- ✅ Índices para queries de leaderboard

---

## ✅ Validação

### Após aplicar TODAS as 5 migrations, execute:

```sql
-- SCRIPT DE VALIDAÇÃO COMPLETA
-- Cole no SQL Editor após aplicar todas as migrations

SELECT
  'Migration Status' AS categoria,
  version AS migration_version,
  name AS migration_name,
  '✅ APLICADA' AS status
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260122000003',
  '20260123',
  '20260124',
  '20260125',
  '20260126'
)

UNION ALL

SELECT
  'Migration Status',
  missing.version,
  missing.name,
  '❌ NÃO APLICADA'
FROM (
  VALUES
    ('20260122000003', 'WhatsApp Document Tracking'),
    ('20260123', 'Streak Trends'),
    ('20260124', 'Consciousness Points'),
    ('20260125', 'RECIPE Badges'),
    ('20260126', 'Unified Efficiency')
) AS missing(version, name)
WHERE missing.version NOT IN (
  SELECT version FROM supabase_migrations.schema_migrations
)

ORDER BY migration_version;

-- ============================================================================
-- VERIFICAÇÃO DE TABELAS CRIADAS
-- ============================================================================

SELECT
  'Table Status' AS categoria,
  table_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND information_schema.tables.table_name = checks.table_name
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END AS status
FROM (
  VALUES
    ('whatsapp_media_tracking'),
    ('cp_transactions'),
    ('recipe_badges'),
    ('badge_progress')
) AS checks(table_name);

-- ============================================================================
-- VERIFICAÇÃO DE COLUNAS ADICIONADAS
-- ============================================================================

SELECT
  'Column Status' AS categoria,
  CONCAT(table_name, '.', column_name) AS coluna,
  data_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND information_schema.columns.table_name = checks.table_name
        AND information_schema.columns.column_name = checks.column_name
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END AS status
FROM (
  VALUES
    ('user_stats', 'streak_trend'),
    ('user_stats', 'gamification_intensity'),
    ('user_stats', 'consciousness_points'),
    ('user_stats', 'recipe_progress'),
    ('user_stats', 'unified_efficiency')
) AS checks(table_name, column_name)
LEFT JOIN information_schema.columns
  ON columns.table_schema = 'public'
  AND columns.table_name = checks.table_name
  AND columns.column_name = checks.column_name;

-- ============================================================================
-- VERIFICAÇÃO DE STORAGE BUCKET
-- ============================================================================

SELECT
  'Storage Bucket' AS categoria,
  id AS bucket_id,
  file_size_limit,
  allowed_mime_types,
  '✅ EXISTE' AS status
FROM storage.buckets
WHERE id = 'whatsapp-documents'

UNION ALL

SELECT
  'Storage Bucket',
  'whatsapp-documents',
  NULL,
  NULL,
  '❌ NÃO EXISTE'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'whatsapp-documents'
);

-- ============================================================================
-- CONTAGEM DE BADGES RECIPE
-- ============================================================================

SELECT
  'RECIPE Badges' AS categoria,
  COUNT(*)::TEXT AS total_badges,
  STRING_AGG(DISTINCT dimension, ', ' ORDER BY dimension) AS dimensions,
  '✅ POPULADO' AS status
FROM public.recipe_badges;
```

---

## 📊 Resultado Esperado

**Todas as verificações devem mostrar ✅:**

```
categoria          | migration_version | migration_name                    | status
-------------------+-------------------+-----------------------------------+----------------
Migration Status   | 20260122000003    | WhatsApp Document Tracking        | ✅ APLICADA
Migration Status   | 20260123          | Streak Trends                     | ✅ APLICADA
Migration Status   | 20260124          | Consciousness Points              | ✅ APLICADA
Migration Status   | 20260125          | RECIPE Badges                     | ✅ APLICADA
Migration Status   | 20260126          | Unified Efficiency                | ✅ APLICADA

categoria          | table_name                | status
-------------------+---------------------------+----------------
Table Status       | whatsapp_media_tracking   | ✅ EXISTE
Table Status       | cp_transactions           | ✅ EXISTE
Table Status       | recipe_badges             | ✅ EXISTE
Table Status       | badge_progress            | ✅ EXISTE

categoria          | coluna                             | status
-------------------+------------------------------------+----------------
Column Status      | user_stats.streak_trend            | ✅ EXISTE
Column Status      | user_stats.gamification_intensity  | ✅ EXISTE
Column Status      | user_stats.consciousness_points    | ✅ EXISTE
Column Status      | user_stats.recipe_progress         | ✅ EXISTE
Column Status      | user_stats.unified_efficiency      | ✅ EXISTE

categoria          | bucket_id           | status
-------------------+---------------------+----------------
Storage Bucket     | whatsapp-documents  | ✅ EXISTE

categoria          | total_badges | dimensions                                      | status
-------------------+--------------+-------------------------------------------------+----------------
RECIPE Badges      | 53           | Reflection, Empathy, Connection, Intention, ... | ✅ POPULADO
```

---

## 🛑 Se Algo Falhar

### Erro: "relation already exists"
**Causa:** Migration já foi aplicada parcialmente
**Solução:** Continuar para próxima migration

### Erro: "column already exists"
**Causa:** Coluna já existe de tentativa anterior
**Solução:** Migration é idempotente, pode continuar

### Erro: "permission denied"
**Causa:** Usuário sem permissão
**Solução:** Usar SQL Editor do Supabase Dashboard (já tem permissões corretas)

### Erro de timeout
**Causa:** Migration muito grande
**Solução:** Executar em partes (comentar blocos e executar separadamente)

---

## 📝 Registro de Execução

Após aplicar cada migration, marque abaixo:

- [ ] Migration 1: WhatsApp Document Tracking (20260122000003)
- [ ] Migration 2: Streak Trends (20260123)
- [ ] Migration 3: Consciousness Points (20260124)
- [ ] Migration 4: RECIPE Badges (20260125)
- [ ] Migration 5: Unified Efficiency (20260126)
- [ ] Script de validação executado
- [ ] Todas verificações com ✅

---

## 🔗 Links Rápidos

- **SQL Editor:** https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new
- **Dashboard:** https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg
- **Table Editor:** https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/editor
- **Storage:** https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/storage/buckets

---

**Tempo estimado:** 10-15 minutos para aplicar todas as 5 migrations + validação

**Próximo passo após validação:** Testar Gamification 2.0 no staging app
