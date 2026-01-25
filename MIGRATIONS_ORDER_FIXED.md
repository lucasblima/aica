# 🔧 Ordem Correta de Aplicação das Migrations

**Data:** 2026-01-25
**Status:** ✅ Migrations corrigidas e testadas

---

## ⚠️ PROBLEMAS IDENTIFICADOS E RESOLVIDOS

### Problema 1: Migration `20260125_recipe_badges.sql`
**Erros:**
```
ERROR: 42703: column "achievement_id" does not exist
ERROR: 42703: column "earned_at" does not exist
ERROR: 42703: column p.display_name does not exist
```

**Causas:**
- Migration usava `achievement_id` mas a coluna correta é `badge_id`
- Migration usava `earned_at` mas a coluna correta é `unlocked_at`
- Migration usava `p.display_name` e `p.email` mas profiles tem `full_name` e email vem de `auth.users`

**Solução:** ✅ **CORRIGIDO**
- Linha 72: `achievement_id` → `badge_id`
- Linha 75: `earned_at` → `unlocked_at`
- Linha 210: `p.display_name` → `p.full_name`
- Linha 210: `p.email` → `u.email` (join com auth.users)
- Linha 214: `earned_at` → `unlocked_at`
- Linha 218: Adicionado `LEFT JOIN auth.users u`
- Linha 219: GROUP BY atualizado (`p.full_name`, `u.email`)
- Linha 263: Comentário de rollback atualizado

### Problema 2: Migration `20260122000003_whatsapp_document_tracking.sql`
**Erro:**
```
ERROR: 42P01: relation "public.processed_documents" does not exist
```

**Causa:**
- Migration depende da tabela `processed_documents` criada em `20260112000001_create_document_processing.sql`
- Essa migration PRÉ-REQUISITO não foi aplicada primeiro

**Solução:** ✅ **ORDEM CORRIGIDA**
- Aplicar `20260112000001_create_document_processing.sql` ANTES de `20260122000003`

### Problema 3: Migration `20260126_unified_efficiency.sql`
**Erro:**
```
ERROR: 42703: column p.display_name does not exist
LINE 192: COALESCE(p.display_name, p.email, 'Anonymous') as user_name
```

**Causa:**
- Mesma causa do Problema 1: view `v_efficiency_leaderboard` usava colunas incorretas
- `p.display_name` e `p.email` não existem na tabela profiles

**Solução:** ✅ **CORRIGIDO**
- Linha 192: `p.display_name` → `p.full_name`
- Linha 192: `p.email` → `u.email` (join com auth.users)
- Linha 204: Adicionado `LEFT JOIN auth.users u`

---

## 📋 ORDEM CORRETA DE APLICAÇÃO (6 migrations)

### ⚡ PRÉ-REQUISITO (Aplicar PRIMEIRO)

**Migration 0: Document Processing Infrastructure**
```bash
supabase/migrations/20260112000001_create_document_processing.sql
```
- **O que cria:** Tabela `processed_documents` (requerida pelo WhatsApp tracking)
- **Tamanho:** 25KB (~700 linhas)
- **Tempo estimado:** ~15 segundos

**Como aplicar:**
1. Acesse: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new
2. Cole o conteúdo de `supabase/migrations/20260112000001_create_document_processing.sql`
3. Run (Ctrl+Enter)
4. Aguarde "Success"

---

### 🚀 SEQUÊNCIA PRINCIPAL (Gamification 2.0 + WhatsApp)

**Migration 1: WhatsApp Document Tracking**
```bash
supabase/migrations/20260122000003_whatsapp_document_tracking.sql
```
- **Depende de:** `processed_documents` table (Migration 0) ✅
- **O que cria:**
  - Storage bucket `whatsapp-documents`
  - Tabela `whatsapp_media_tracking` (14 colunas)
  - RLS policies (9 policies)
  - Funções helper
- **Tamanho:** 16KB (467 linhas)
- **Tempo estimado:** ~10 segundos

---

**Migration 2: Streak Trends**
```bash
supabase/migrations/20260123_streak_trends.sql
```
- **Depende de:** Nada (independente)
- **O que cria:**
  - Coluna `user_stats.streak_trend` (JSONB)
  - Coluna `user_stats.gamification_intensity` (TEXT)
  - Índice GIN
- **Tamanho:** 5.6KB (190 linhas)
- **Tempo estimado:** ~5 segundos

---

**Migration 3: Consciousness Points**
```bash
supabase/migrations/20260124_consciousness_points.sql
```
- **Depende de:** Nada (independente)
- **O que cria:**
  - Coluna `user_stats.consciousness_points` (JSONB)
  - Tabela `cp_transactions` (histórico)
  - Função `award_consciousness_points()`
  - RLS policies
- **Tamanho:** 7.9KB (265 linhas)
- **Tempo estimado:** ~8 segundos

---

**Migration 4: RECIPE Badges** ✅ CORRIGIDA
```bash
supabase/migrations/20260125_recipe_badges.sql
```
- **Depende de:** `user_achievements` table (já existe)
- **ATENÇÃO:** ✅ Versão corrigida (badge_id, unlocked_at)
- **O que cria:**
  - Coluna `user_stats.recipe_profile` (JSONB)
  - Colunas em `user_achievements`: `metadata`, `displayed`, `favorite`
  - Índices corrigidos: `badge_id`, `unlocked_at`
  - View `v_badge_leaderboard`
  - Funções: `get_user_badge_stats()`, `update_recipe_pillar_score()`, `toggle_black_hat_badges()`
- **Tamanho:** 8.8KB (269 linhas - corrigida)
- **Tempo estimado:** ~10 segundos

---

**Migration 5: Unified Efficiency** ✅ CORRIGIDA
```bash
supabase/migrations/20260126_unified_efficiency.sql
OU use: MIGRATION_UNIFIED_EFFICIENCY_FINAL.sql
```
- **Depende de:** `user_stats.recipe_profile` (Migration 4)
- **ATENÇÃO:** ✅ Versão corrigida (full_name, u.email)
- **O que cria:**
  - Coluna `user_stats.efficiency_score` (JSONB)
  - Tabela `efficiency_history`
  - View `v_efficiency_leaderboard` (CORRIGIDA)
  - Funções: `get_efficiency_stats()`, `get_efficiency_trend()`
  - RLS policies e índices
- **Tamanho:** 8.3KB (255 linhas - corrigida)
- **Tempo estimado:** ~8 segundos

---

## ✅ CHECKLIST DE APLICAÇÃO

Execute na ordem abaixo, marcando cada item:

- [ ] **0. PRÉ-REQUISITO:** `20260112000001_create_document_processing.sql`
- [ ] **1. WhatsApp:** `20260122000003_whatsapp_document_tracking.sql`
- [ ] **2. Streak Trends:** `20260123_streak_trends.sql`
- [ ] **3. Consciousness Points:** `20260124_consciousness_points.sql`
- [ ] **4. RECIPE Badges (CORRIGIDO):** `20260125_recipe_badges.sql`
- [ ] **5. Unified Efficiency:** `20260126_unified_efficiency.sql`
- [ ] **6. VALIDAÇÃO:** Execute `migration_status_check.sql`

---

## 🔍 SCRIPT DE VALIDAÇÃO ATUALIZADO

Após aplicar TODAS as 6 migrations (incluindo pré-requisito), execute:

```sql
-- VALIDAÇÃO COMPLETA (copiar/colar no SQL Editor)

SELECT
  'Migration Status' AS categoria,
  version AS migration_version,
  name AS migration_name,
  '✅ APLICADA' AS status
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260112000001',  -- PRÉ-REQUISITO
  '20260122000003',  -- WhatsApp
  '20260123',        -- Streak Trends
  '20260124',        -- Consciousness Points
  '20260125',        -- RECIPE Badges
  '20260126'         -- Unified Efficiency
)

UNION ALL

SELECT
  'Migration Status',
  missing.version,
  missing.name,
  '❌ NÃO APLICADA'
FROM (
  VALUES
    ('20260112000001', 'Document Processing Infrastructure'),
    ('20260122000003', 'WhatsApp Document Tracking'),
    ('20260123', 'Streak Trends'),
    ('20260124', 'Consciousness Points'),
    ('20260125', 'RECIPE Badges (FIXED)'),
    ('20260126', 'Unified Efficiency')
) AS missing(version, name)
WHERE missing.version NOT IN (
  SELECT version FROM supabase_migrations.schema_migrations
)

ORDER BY migration_version;

-- Verificar tabelas criadas
SELECT
  'Table Status' AS categoria,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public'
   AND information_schema.columns.table_name = checks.table_name) AS total_columns,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND information_schema.tables.table_name = checks.table_name
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END AS status
FROM (
  VALUES
    ('processed_documents'),       -- PRÉ-REQUISITO
    ('whatsapp_media_tracking'),   -- Migration 1
    ('cp_transactions'),           -- Migration 3
    ('user_achievements')          -- Já existia, atualizada na Migration 4
) AS checks(table_name);

-- Verificar colunas adicionadas
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
    ('user_stats', 'recipe_profile'),
    ('user_stats', 'unified_efficiency'),
    ('user_achievements', 'metadata'),
    ('user_achievements', 'displayed'),
    ('user_achievements', 'favorite')
) AS checks(table_name, column_name)
LEFT JOIN information_schema.columns
  ON columns.table_schema = 'public'
  AND columns.table_name = checks.table_name
  AND columns.column_name = checks.column_name;

-- Verificar storage bucket
SELECT
  'Storage Bucket' AS categoria,
  id AS bucket_id,
  file_size_limit,
  '✅ EXISTE' AS status
FROM storage.buckets
WHERE id = 'whatsapp-documents'

UNION ALL

SELECT
  'Storage Bucket',
  'whatsapp-documents',
  NULL,
  '❌ NÃO EXISTE'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'whatsapp-documents'
);

-- Verificar índices criados (CORRIGIDOS)
SELECT
  'Index Status' AS categoria,
  indexname,
  tablename,
  '✅ EXISTE' AS status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_user_achievements_badge_lookup',    -- CORRIGIDO: badge_id
    'idx_user_achievements_unlocked_at',     -- CORRIGIDO: unlocked_at
    'idx_whatsapp_media_user',
    'idx_whatsapp_media_status',
    'idx_user_stats_streak_trend_gin'
  );
```

---

## 📊 RESULTADO ESPERADO

Todas as verificações devem mostrar ✅:

```
categoria          | migration_version | migration_name                        | status
-------------------+-------------------+---------------------------------------+----------------
Migration Status   | 20260112000001    | Document Processing Infrastructure    | ✅ APLICADA
Migration Status   | 20260122000003    | WhatsApp Document Tracking            | ✅ APLICADA
Migration Status   | 20260123          | Streak Trends                         | ✅ APLICADA
Migration Status   | 20260124          | Consciousness Points                  | ✅ APLICADA
Migration Status   | 20260125          | RECIPE Badges (FIXED)                 | ✅ APLICADA
Migration Status   | 20260126          | Unified Efficiency                    | ✅ APLICADA

categoria          | table_name                | total_columns | status
-------------------+---------------------------+---------------+----------------
Table Status       | processed_documents       | ~15           | ✅ EXISTE
Table Status       | whatsapp_media_tracking   | 14            | ✅ EXISTE
Table Status       | cp_transactions           | ~10           | ✅ EXISTE
Table Status       | user_achievements         | ~14           | ✅ EXISTE (atualizada)

categoria          | coluna                             | status
-------------------+------------------------------------+----------------
Column Status      | user_stats.streak_trend            | ✅ EXISTE
Column Status      | user_stats.gamification_intensity  | ✅ EXISTE
Column Status      | user_stats.consciousness_points    | ✅ EXISTE
Column Status      | user_stats.recipe_profile          | ✅ EXISTE
Column Status      | user_stats.unified_efficiency      | ✅ EXISTE
Column Status      | user_achievements.metadata         | ✅ EXISTE
Column Status      | user_achievements.displayed        | ✅ EXISTE
Column Status      | user_achievements.favorite         | ✅ EXISTE

categoria          | indexname                                | status
-------------------+------------------------------------------+----------------
Index Status       | idx_user_achievements_badge_lookup       | ✅ EXISTE (CORRIGIDO)
Index Status       | idx_user_achievements_unlocked_at        | ✅ EXISTE (CORRIGIDO)
```

---

## 🚨 SE VOCÊ JÁ APLICOU MIGRATIONS COM ERRO

### Se aplicou `20260125_recipe_badges.sql` (versão antiga com erro):

```sql
-- 1. Dropar índices criados incorretamente
DROP INDEX IF EXISTS public.idx_user_achievements_badge_lookup;
DROP INDEX IF EXISTS public.idx_user_achievements_earned_at;

-- 2. Aplicar novamente a migration corrigida
-- (Copie todo o conteúdo de 20260125_recipe_badges.sql)
```

### Se tentou aplicar `20260122000003` SEM o pré-requisito:

Basta aplicar a migration pré-requisito primeiro:

```sql
-- 1. Aplicar pré-requisito
-- (Copie conteúdo de 20260112000001_create_document_processing.sql)

-- 2. Depois aplicar 20260122000003_whatsapp_document_tracking.sql
```

---

## ⏱️ TEMPO TOTAL ESTIMADO

**6 migrations:** 10-15 minutos (incluindo PRÉ-REQUISITO e validação)

---

## 🔗 Links Úteis

- **SQL Editor:** https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new
- **Table Editor:** https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/editor
- **Storage:** https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/storage/buckets

---

**Status:** ✅ Pronto para aplicação
**Última atualização:** 2026-01-25 (migrations corrigidas)
