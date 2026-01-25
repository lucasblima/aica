# 🔧 Resolver Erro de Trigger Duplicado

**Novo erro reportado:**
```
ERROR: 42710: trigger "update_processed_documents_updated_at_trigger"
for relation "processed_documents" already exists
```

---

## ✅ Solução Atualizada (2 minutos)

### Passo 1: Limpar policies E triggers

Execute este script atualizado que dropa **TUDO** (policies + triggers):

```bash
cat FIX_POLICIES_AND_TRIGGERS.sql
```

**Copie TODO o conteúdo** → Cole no SQL Editor → Execute (Ctrl+Enter)

Este script dropa:
- ✅ 1 trigger (update_processed_documents_updated_at_trigger)
- ✅ 18 policies RLS
- ✅ Tudo de forma segura com `IF EXISTS`

---

### Passo 2: Re-executar Migration 0

```bash
cat MIGRATION_0_DOCUMENT_PROCESSING.sql
```

**Copie TODO** → Cole no SQL Editor → Execute

**Esperado:** "Success. No rows returned" (~15 segundos)

---

### Passo 3: Re-executar Migration 3

```bash
cat MIGRATION_3_CONSCIOUSNESS_POINTS.sql
```

**Copie TODO** → Cole no SQL Editor → Execute

**Esperado:** "Success. No rows returned" (~8 segundos)

---

### Passo 4: Validar todas as 6 migrations

```sql
SELECT version, '✅ APLICADA' AS status
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260112000001',
  '20260122000003',
  '20260123',
  '20260124',
  '20260125',
  '20260126'
)
ORDER BY version;
```

**Esperado:** 6 linhas com ✅ APLICADA

---

## 📊 Status Atual

```
✅ Migration 1 (WhatsApp): SUCESSO
⚠️ Migration 0 (Document Processing):
   - Policies dropadas ✅
   - Trigger AINDA EXISTE ❌ (novo erro)
   - Solução: Usar FIX_POLICIES_AND_TRIGGERS.sql

✅ Migration 2 (Streak Trends): SUCESSO

⚠️ Migration 3 (Consciousness Points):
   - Policies dropadas ✅
   - Requer re-execução

✅ Migration 4 (RECIPE Badges): SUCESSO
✅ Migration 5 (Unified Efficiency): SUCESSO
```

---

## 🔍 Por Que Aconteceu?

A migration 0 cria:
1. ✅ Tabelas (CREATE TABLE IF NOT EXISTS) → OK, idempotente
2. ✅ Funções (CREATE OR REPLACE FUNCTION) → OK, substitui automaticamente
3. ❌ Triggers (CREATE TRIGGER) → FALHA se já existir
4. ❌ Policies (CREATE POLICY) → FALHA se já existir

**Triggers e Policies precisam ser dropados antes de recriar.**

---

## ⚠️ O Que o Script Faz

```sql
-- Dropa trigger (seguro)
DROP TRIGGER IF EXISTS update_processed_documents_updated_at_trigger
  ON public.processed_documents;

-- Dropa 18 policies (seguro)
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

**Resultado:**
- Remove apenas regras (não remove dados)
- Migration recria tudo novamente
- Idempotente (pode executar múltiplas vezes)

---

## 🔗 Links

**SQL Editor:** https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new

**Script atualizado:**
```bash
cat FIX_POLICIES_AND_TRIGGERS.sql
```

---

**Tempo total:** 2-3 minutos para resolver
