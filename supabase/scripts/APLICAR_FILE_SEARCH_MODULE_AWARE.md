# Como Aplicar Migration: File Search Module-Aware

## 📋 Pré-requisitos

- ✅ Acesso ao Supabase Dashboard
- ✅ Fase 1 concluída (service layer implementado)
- ✅ Backup do banco de dados (recomendado)

---

## 🚀 Passo a Passo

### 1. Acessar Supabase SQL Editor

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto **Aica Life OS**
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New query**

### 2. Copiar e Colar a Migration

1. Abra o arquivo `supabase/migrations/20251209180000_file_search_module_aware.sql`
2. Copie **TODO o conteúdo** (245 linhas)
3. Cole no SQL Editor
4. Clique em **Run** ou pressione `Ctrl+Enter`

### 3. Verificar Execução

A migration inclui verificação automática. Você deve ver no output:

```
=== Verificação da Migration ===
NOTICE: file_search_corpora.module_type: true
NOTICE: file_search_corpora.module_id: true
NOTICE: file_search_documents.module_type: true
NOTICE: file_search_documents.module_id: true
NOTICE: ✅ Migration concluída com sucesso!
```

Se aparecer **⚠️ Algumas colunas podem não ter sido criadas**, verifique os logs de erro.

---

## 🔍 Validação Manual (Opcional)

### Verificar Colunas Criadas

```sql
-- Verificar estrutura da tabela file_search_corpora
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'file_search_corpora'
  AND column_name IN ('module_type', 'module_id');

-- Verificar estrutura da tabela file_search_documents
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'file_search_documents'
  AND column_name IN ('module_type', 'module_id');
```

**Resultado esperado:**
```
column_name  | data_type | is_nullable
-------------|-----------|------------
module_type  | text      | YES
module_id    | text      | YES
```

### Verificar Índices Criados

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('file_search_corpora', 'file_search_documents')
  AND indexname LIKE '%module%'
ORDER BY tablename, indexname;
```

**Resultado esperado:** 6 índices
- `idx_corpora_user_module`
- `idx_corpora_module_type`
- `idx_documents_user_module`
- `idx_documents_corpus_module`
- `idx_documents_module_type`
- `idx_documents_status_module`

### Verificar RLS Policies

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('file_search_corpora', 'file_search_documents')
ORDER BY tablename, cmd;
```

**Resultado esperado:** 8 policies (4 por tabela)
- SELECT: "Users can view their own..."
- INSERT: "Users can create their own..."
- UPDATE: "Users can update their own..."
- DELETE: "Users can delete their own..."

### Verificar Funções Helper

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'count_documents_by_module',
  'get_module_documents',
  'get_module_file_search_stats'
)
ORDER BY routine_name;
```

**Resultado esperado:** 3 funções
- `count_documents_by_module`
- `get_module_documents`
- `get_module_file_search_stats`

---

## 🧪 Testes Funcionais

### Teste 1: Constraints de Validação

```sql
-- Deve FALHAR (module_type inválido)
INSERT INTO file_search_corpora (user_id, corpus_name, display_name, module_type)
VALUES (
  auth.uid(),
  'test-corpus',
  'Test Corpus',
  'invalid_module' -- valor inválido
);

-- Deve FUNCIONAR (module_type válido)
INSERT INTO file_search_corpora (user_id, corpus_name, display_name, module_type)
VALUES (
  auth.uid(),
  'test-corpus-grants',
  'Test Corpus Grants',
  'grants'
);
```

### Teste 2: Função Helper - Contar Documentos

```sql
-- Contar documentos por módulo
SELECT * FROM count_documents_by_module(auth.uid());
```

**Resultado esperado:**
```
module_type | document_count
------------|----------------
unassigned  | 0
```

### Teste 3: Função Helper - Estatísticas

```sql
-- Obter estatísticas de uso
SELECT * FROM get_module_file_search_stats(auth.uid());
```

**Resultado esperado:**
```
module_type | corpus_count | document_count | total_size_mb | last_indexed_at
------------|--------------|----------------|---------------|----------------
(vazio se nenhum documento indexado)
```

---

## ✅ Checklist de Validação

Marque conforme for validando:

- [ ] Migration executada sem erros
- [ ] Mensagem "✅ Migration concluída com sucesso!" apareceu
- [ ] 2 colunas criadas em `file_search_corpora` (module_type, module_id)
- [ ] 2 colunas criadas em `file_search_documents` (module_type, module_id)
- [ ] 6 índices criados
- [ ] 8 RLS policies atualizadas (4 por tabela)
- [ ] 3 funções helper criadas
- [ ] Constraints de validação funcionando
- [ ] Testes funcionais OK

---

## 🔄 Rollback (Se Necessário)

Se algo der errado e precisar reverter:

```sql
-- Remover colunas
ALTER TABLE public.file_search_corpora
  DROP COLUMN IF EXISTS module_type,
  DROP COLUMN IF EXISTS module_id;

ALTER TABLE public.file_search_documents
  DROP COLUMN IF EXISTS module_type,
  DROP COLUMN IF EXISTS module_id;

-- Remover índices
DROP INDEX IF EXISTS idx_corpora_user_module;
DROP INDEX IF EXISTS idx_corpora_module_type;
DROP INDEX IF EXISTS idx_documents_user_module;
DROP INDEX IF EXISTS idx_documents_corpus_module;
DROP INDEX IF EXISTS idx_documents_module_type;
DROP INDEX IF EXISTS idx_documents_status_module;

-- Remover funções
DROP FUNCTION IF EXISTS count_documents_by_module;
DROP FUNCTION IF EXISTS get_module_documents;
DROP FUNCTION IF EXISTS get_module_file_search_stats;
```

---

## 📊 O Que Esta Migration Faz?

### Parte 1: Colunas Module-Aware
Adiciona `module_type` e `module_id` às tabelas para permitir filtros por módulo.

**Exemplo de uso:**
```typescript
// Buscar apenas documentos do módulo Grants, projeto específico
const docs = await listDocuments(
  'corpus-123',
  'grants',       // module_type
  'project-456'   // module_id
);
```

### Parte 2: Índices de Performance
Cria 6 índices para otimizar queries filtradas por módulo.

**Impacto:** Queries 10-100x mais rápidas ao filtrar por módulo.

### Parte 3: RLS Policies
Atualiza policies para garantir isolamento completo de dados entre usuários.

**Segurança:** Apenas o dono do corpus/documento pode acessá-lo.

### Parte 4: Funções Helper
Adiciona 3 funções úteis:

1. **count_documents_by_module**: Conta documentos por tipo de módulo
2. **get_module_documents**: Lista documentos de um módulo com paginação
3. **get_module_file_search_stats**: Estatísticas de uso (corpus, docs, tamanho)

### Parte 5: Validações
Adiciona constraints para garantir que `module_type` seja válido:
- `'grants'`
- `'podcast'`
- `'finance'`
- `'journey'`
- `'atlas'`
- `'chat'`

### Parte 6: Verificação Automática
Script de validação que confirma se tudo foi criado corretamente.

---

## 🎯 Próximos Passos Após Aplicar

1. ✅ Marcar Fase 2 como completa
2. ➡️ Começar **Fase 3: Integração Grants**
   - Criar `useGrantsFileSearch` hook
   - Indexar PDFs de editais automaticamente
   - Adicionar SearchBar na UI

---

## 🆘 Troubleshooting

### Erro: "permission denied for table"
**Solução:** Verifique se está usando o **service_role key** no Supabase.

### Erro: "column already exists"
**Solução:** A migration pode ser executada múltiplas vezes com segurança (usa `IF NOT EXISTS`).

### Erro: "constraint already exists"
**Solução:** Use `DROP CONSTRAINT IF EXISTS` antes de criar novamente.

### Erro: "function already exists"
**Solução:** Use `CREATE OR REPLACE FUNCTION`.

---

**Data:** 2025-12-09
**Versão:** 1.0
**Status:** Pronto para aplicação
