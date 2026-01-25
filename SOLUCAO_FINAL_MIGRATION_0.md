# 🎯 SOLUÇÃO FINAL - Migration 0 (Document Processing)

**Problema:** Mesmo depois de executar o script de limpeza, o trigger ainda existe ao executar a migration 0.

---

## ✅ SOLUÇÃO DEFINITIVA (Método em 2 Partes)

### Parte 1: Execute este SQL primeiro

Cole isto no SQL Editor e execute:

```sql
-- ============================================================================
-- LIMPEZA COMPLETA - Migration 0
-- Execute ISTO PRIMEIRO, depois execute a migration 0
-- ============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS update_processed_documents_updated_at_trigger ON public.processed_documents;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.processed_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.processed_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.processed_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.processed_documents;
DROP POLICY IF EXISTS "Organization members can view shared documents" ON public.processed_documents;

DROP POLICY IF EXISTS "Users can view chunks of accessible documents" ON public.document_chunks;
DROP POLICY IF EXISTS "System can insert chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can delete chunks of own documents" ON public.document_chunks;

DROP POLICY IF EXISTS "Users can view embeddings of accessible chunks" ON public.document_embeddings;
DROP POLICY IF EXISTS "System can insert embeddings" ON public.document_embeddings;
DROP POLICY IF EXISTS "Users can delete embeddings of own chunks" ON public.document_embeddings;

DROP POLICY IF EXISTS "Users can view suggestions for own documents" ON public.document_link_suggestions;
DROP POLICY IF EXISTS "System can insert suggestions" ON public.document_link_suggestions;
DROP POLICY IF EXISTS "Users can update suggestions for own documents" ON public.document_link_suggestions;
DROP POLICY IF EXISTS "Users can delete suggestions for own documents" ON public.document_link_suggestions;
```

**Execute no SQL Editor** → Aguarde "Success"

---

### Parte 2: Use a migration idempotente

```bash
cat MIGRATION_0_DOCUMENT_PROCESSING_IDEMPOTENT.sql
```

Esta versão tem `DROP TRIGGER IF EXISTS` ANTES do `CREATE TRIGGER`.

**Copie TODO** → Cole no SQL Editor → Execute

**Esperado:** "Success. No rows returned" (~15 segundos)

---

## 🔄 OU Use o Método Manual (Mais Simples)

Se preferir, execute tudo de uma vez via SQL Editor:

### Passo 1: Cole e execute a limpeza (acima)

### Passo 2: Espere 2 segundos

### Passo 3: Cole e execute a migration 0
```bash
cat MIGRATION_0_DOCUMENT_PROCESSING.sql
```

**IMPORTANTE:** Execute em **2 passos separados** (não tudo de uma vez).

---

## 📋 Depois da Migration 0

Execute a Migration 3 (Consciousness Points):

### Limpeza da Migration 3:
```sql
DROP POLICY IF EXISTS "Users can read own CP transactions" ON public.cp_transactions;
DROP POLICY IF EXISTS "Users can insert own CP transactions" ON public.cp_transactions;
DROP POLICY IF EXISTS "Service role full access to CP transactions" ON public.cp_transactions;
```

**Execute** → Aguarde "Success"

### Depois execute Migration 3:
```bash
cat MIGRATION_3_CONSCIOUSNESS_POINTS.sql
```

**Execute** → Aguarde "Success" (~8 segundos)

---

## ✅ Validação Final

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

## 🔍 Por Que em 2 Partes?

**O problema:** CREATE TRIGGER não tem opção IF NOT EXISTS.

**Solução:**
1. Dropar tudo primeiro (Parte 1)
2. Criar tudo depois (Parte 2)

Executar em **2 passos separados** garante que o DROP acontece antes do CREATE.

---

## 📊 Resumo

```
✅ Migrations 1, 2, 4, 5: JÁ APLICADAS (sucesso)
⏳ Migration 0: Execute Parte 1 + Parte 2
⏳ Migration 3: Execute limpeza + migration

Tempo total: 5 minutos
```

---

🔗 **SQL Editor:** https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new
