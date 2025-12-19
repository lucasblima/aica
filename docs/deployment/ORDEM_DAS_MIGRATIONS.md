# Ordem Correta das Migrations - File Search

## ⚠️ IMPORTANTE: Sequência Obrigatória

As migrations devem ser aplicadas **nesta ordem exata**:

---

## 📋 Migrations Ordenadas

### 1️⃣ Migration Base (PRIMEIRO)
**Arquivo:** `supabase/migrations/20251209170000_create_file_search_corpora_tables.sql`

**O que faz:**
- ✅ Cria tabela `file_search_corpora`
- ✅ Cria tabela `file_search_documents`
- ✅ RLS policies básicas (8 policies)
- ✅ Índices básicos (4 índices)
- ✅ 2 funções helper (`count_corpus_documents`, `get_corpus_size`)
- ✅ Triggers para `updated_at`

**Tempo:** ~2 segundos

---

### 2️⃣ Migration Module-Aware (SEGUNDO)
**Arquivo:** `supabase/migrations/20251209180000_file_search_module_aware.sql`

**O que faz:**
- ✅ Adiciona `module_type` e `module_id` (4 colunas)
- ✅ Cria 6 índices module-aware
- ✅ Atualiza 8 RLS policies
- ✅ Adiciona 3 funções helper avançadas
- ✅ Constraints de validação

**Tempo:** ~3 segundos

**⚠️ Depende de:** Migration 1️⃣ (precisa que as tabelas existam)

---

## 🚀 Como Aplicar (Passo a Passo)

### Passo 1: Aplicar Migration Base

1. Abra [Supabase Dashboard](https://supabase.com/dashboard) → Seu projeto
2. Vá em **SQL Editor** → **New query**
3. Copie **TODO** o conteúdo de `20251209170000_create_file_search_corpora_tables.sql`
4. Cole no SQL Editor
5. Clique em **Run** ou `Ctrl+Enter`

**Resultado esperado:**
```
NOTICE: === Verificação da Migration Base ===
NOTICE: file_search_corpora criada: true
NOTICE: file_search_documents criada: true
NOTICE: ✅ Migration base concluída com sucesso!
NOTICE: Próximo passo: Aplicar migration module-aware (20251209180000)
```

---

### Passo 2: Aplicar Migration Module-Aware

⚠️ **Só faça este passo DEPOIS do Passo 1 ter sucesso!**

1. No mesmo **SQL Editor**
2. **Limpe** o editor (apague o SQL anterior)
3. Copie **TODO** o conteúdo de `20251209180000_file_search_module_aware.sql`
4. Cole no SQL Editor
5. Clique em **Run** ou `Ctrl+Enter`

**Resultado esperado:**
```
NOTICE: === Verificação da Migration ===
NOTICE: file_search_corpora.module_type: true
NOTICE: file_search_corpora.module_id: true
NOTICE: file_search_documents.module_type: true
NOTICE: file_search_documents.module_id: true
NOTICE: ✅ Migration concluída com sucesso!
```

---

## ✅ Verificação Final

Após aplicar **AMBAS** as migrations, execute esta query para validar:

```sql
-- Verificar estrutura completa
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('file_search_corpora', 'file_search_documents')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

**Resultado esperado:**

### file_search_corpora (9 colunas):
- `id` - uuid
- `user_id` - uuid
- `corpus_name` - text
- `display_name` - text
- `gemini_corpus_id` - text
- **`module_type`** - text ← **DEVE EXISTIR**
- **`module_id`** - text ← **DEVE EXISTIR**
- `created_at` - timestamp with time zone
- `updated_at` - timestamp with time zone

### file_search_documents (14 colunas):
- `id` - uuid
- `user_id` - uuid
- `corpus_id` - uuid
- `gemini_file_name` - text
- `gemini_document_name` - text
- `original_filename` - text
- `mime_type` - text
- `file_size_bytes` - bigint
- `storage_url` - text
- **`module_type`** - text ← **DEVE EXISTIR**
- **`module_id`** - text ← **DEVE EXISTIR**
- `custom_metadata` - jsonb
- `indexing_status` - text
- `created_at` - timestamp with time zone
- `updated_at` - timestamp with time zone

---

## 🔍 Verificar Índices

```sql
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('file_search_corpora', 'file_search_documents')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
```

**Resultado esperado:** 10 índices totais
- 4 índices base (da migration 1️⃣)
- 6 índices module-aware (da migration 2️⃣)

---

## 🔍 Verificar Funções

```sql
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%corpus%'
   OR routine_name LIKE '%module%'
ORDER BY routine_name;
```

**Resultado esperado:** 5 funções
- `count_corpus_documents` (migration 1️⃣)
- `get_corpus_size` (migration 1️⃣)
- `count_documents_by_module` (migration 2️⃣)
- `get_module_documents` (migration 2️⃣)
- `get_module_file_search_stats` (migration 2️⃣)

---

## 🔍 Verificar RLS Policies

```sql
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('file_search_corpora', 'file_search_documents')
ORDER BY tablename, cmd;
```

**Resultado esperado:** 8 policies (4 por tabela)

---

## ❌ Erros Comuns e Soluções

### Erro: "relation already exists"
**Causa:** Tentando aplicar migration 1️⃣ duas vezes

**Solução:**
1. As tabelas já existem
2. Pule para migration 2️⃣ (module-aware)
3. Se precisar limpar, execute:
```sql
DROP TABLE IF EXISTS public.file_search_documents CASCADE;
DROP TABLE IF EXISTS public.file_search_corpora CASCADE;
```

---

### Erro: "relation does not exist"
**Causa:** Tentando aplicar migration 2️⃣ sem ter aplicado 1️⃣ antes

**Solução:**
1. Volte e aplique migration 1️⃣ primeiro
2. Depois aplique migration 2️⃣

---

### Erro: "column already exists"
**Causa:** Tentando aplicar migration 2️⃣ duas vezes

**Solução:**
- Migration usa `ADD COLUMN IF NOT EXISTS`
- É seguro executar múltiplas vezes
- Apenas ignore a mensagem

---

## 📊 Resumo da Arquitetura

```
┌─────────────────────────────────────┐
│     file_search_corpora             │
│  (Coleções de documentos)           │
├─────────────────────────────────────┤
│ id                        UUID      │
│ user_id                   UUID      │
│ corpus_name               TEXT      │
│ display_name              TEXT      │
│ gemini_corpus_id          TEXT      │
│ module_type               TEXT  ⭐  │ ← Migration 2️⃣
│ module_id                 TEXT  ⭐  │ ← Migration 2️⃣
│ created_at                TIMESTAMP │
│ updated_at                TIMESTAMP │
└─────────────────────────────────────┘
            │
            │ 1:N
            ▼
┌─────────────────────────────────────┐
│    file_search_documents            │
│  (Documentos indexados)             │
├─────────────────────────────────────┤
│ id                        UUID      │
│ user_id                   UUID      │
│ corpus_id                 UUID      │
│ gemini_file_name          TEXT      │
│ gemini_document_name      TEXT      │
│ original_filename         TEXT      │
│ mime_type                 TEXT      │
│ file_size_bytes           BIGINT    │
│ storage_url               TEXT      │
│ module_type               TEXT  ⭐  │ ← Migration 2️⃣
│ module_id                 TEXT  ⭐  │ ← Migration 2️⃣
│ custom_metadata           JSONB     │
│ indexing_status           TEXT      │
│ created_at                TIMESTAMP │
│ updated_at                TIMESTAMP │
└─────────────────────────────────────┘
```

---

## ✅ Checklist Completo

Marque conforme for completando:

- [ ] Migration 1️⃣ aplicada com sucesso
- [ ] Mensagem "✅ Migration base concluída" apareceu
- [ ] Tabela `file_search_corpora` existe (9 colunas)
- [ ] Tabela `file_search_documents` existe (14 colunas)
- [ ] Migration 2️⃣ aplicada com sucesso
- [ ] Mensagem "✅ Migration concluída" apareceu
- [ ] Colunas `module_type` e `module_id` existem (4 total)
- [ ] 10 índices criados
- [ ] 8 RLS policies ativas
- [ ] 5 funções helper criadas
- [ ] Constraints de validação funcionando

---

## 🎯 Após Aplicar Ambas

Você estará pronto para:

1. ✅ Usar o backend FastAPI (endpoints já implementados)
2. ✅ Usar o service layer frontend (já implementado)
3. ✅ Usar os hooks React (`useFileSearch`, `useModuleFileSearch`)
4. ➡️ Começar **Fase 3: Integração Grants**

---

**Data:** 2025-12-09
**Status:** Pronto para aplicação
**Ordem:** SEMPRE 1️⃣ → 2️⃣
