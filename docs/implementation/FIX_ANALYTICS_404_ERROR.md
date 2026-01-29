# FIX: Analytics Dashboard 404 Error

## ❌ Erro Atual

```
POST https://uzywajqzbdbrfammshdg.supabase.co/rest/v1/rpc/get_module_file_search_stats 404 (Not Found)
Error: Could not find the function public.get_module_file_search_stats(p_user_id) in the schema cache
```

**Causa:** A função RPC não foi criada no database remoto ou o schema cache não foi atualizado.

---

## ✅ Solução Manual (5 minutos)

### Passo 1: Acessar Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql
2. Clique em "+ New query"

### Passo 2: Executar SQL de Correção

Copie e cole o conteúdo de `docs/implementation/MANUAL_FIX_ANALYTICS_RPC.sql` no editor.

**OU** copie diretamente daqui:

```sql
-- Remover versões antigas
DROP FUNCTION IF EXISTS public.get_module_file_search_stats(UUID);
DROP FUNCTION IF EXISTS public.get_module_file_search_stats();
DROP FUNCTION IF EXISTS public.get_module_file_search_stats(p_user_id UUID);

-- Criar função correta
CREATE OR REPLACE FUNCTION public.get_module_file_search_stats(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  module_type TEXT,
  document_count BIGINT,
  total_size_bytes BIGINT,
  avg_size_bytes BIGINT,
  corpus_count BIGINT,
  last_indexed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(fd.module_type, 'unassigned') AS module_type,
    COUNT(fd.id) AS document_count,
    COALESCE(SUM(fd.file_size_bytes), 0) AS total_size_bytes,
    CASE
      WHEN COUNT(fd.id) > 0 THEN (COALESCE(SUM(fd.file_size_bytes), 0) / COUNT(fd.id))::BIGINT
      ELSE 0
    END AS avg_size_bytes,
    COUNT(DISTINCT fd.corpus_id) AS corpus_count,
    MAX(fd.created_at) AS last_indexed_at
  FROM public.file_search_documents fd
  WHERE
    (p_user_id IS NULL OR fd.user_id = p_user_id)
    AND fd.indexing_status = 'completed'
  GROUP BY fd.module_type
  ORDER BY document_count DESC;
END;
$$;

-- Atualizar constraints para incluir 'whatsapp'
ALTER TABLE public.file_search_corpora
  DROP CONSTRAINT IF EXISTS chk_corpora_module_type;

ALTER TABLE public.file_search_corpora
  ADD CONSTRAINT chk_corpora_module_type
  CHECK (
    module_type IS NULL OR
    module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat', 'whatsapp')
  );

ALTER TABLE public.file_search_documents
  DROP CONSTRAINT IF EXISTS chk_documents_module_type;

ALTER TABLE public.file_search_documents
  ADD CONSTRAINT chk_documents_module_type
  CHECK (
    module_type IS NULL OR
    module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat', 'whatsapp')
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats(UUID) TO anon;

-- Forçar reload do schema cache
NOTIFY pgrst, 'reload schema';

-- Testar
SELECT * FROM public.get_module_file_search_stats(NULL) LIMIT 5;
```

### Passo 3: Executar

1. Clique em **"RUN"** (ou pressione Ctrl+Enter)
2. Aguarde execução (~5 segundos)

**✅ Esperado:**
```
Success. No rows returned
Success. No rows returned
...
Success. 1 row(s) returned
```

**Última query deve retornar uma tabela com dados:**
```
module_type | document_count | total_size_bytes | ...
-----------+----------------+------------------+-----
whatsapp   |              3 |           524288 | ...
```

### Passo 4: Recarregar Dashboard

1. Volte para https://aica-staging-5p22u2w6jq-rj.a.run.app/file-search
2. Pressione **Ctrl+Shift+R** (hard reload)
3. Dashboard deve carregar com dados

---

## 🔍 Verificação

### Verificar se função existe:

```sql
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS result_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_module_file_search_stats';
```

**Esperado:**
```
function_name                  | arguments           | result_type
-------------------------------+---------------------+-------------------
get_module_file_search_stats  | p_user_id uuid      | TABLE(module_type text, ...)
```

### Verificar constraints:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname LIKE '%module_type%';
```

**Esperado:** Deve incluir `'whatsapp'` na lista de valores permitidos.

---

## 🐛 Troubleshooting

### Erro: "permission denied for function"

**Solução:** Execute novamente apenas a parte de GRANT:
```sql
GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_module_file_search_stats(UUID) TO anon;
```

---

### Erro: "function does not exist"

**Causa:** Função não foi criada corretamente.

**Solução:** Executar novamente apenas a parte CREATE:
```sql
DROP FUNCTION IF EXISTS public.get_module_file_search_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_module_file_search_stats(
  p_user_id UUID DEFAULT NULL
)
-- ... (código completo acima)
```

---

### Dashboard ainda mostra erro 404

**Causa:** Schema cache não foi recarregado.

**Solução 1:** Aguardar 30 segundos e tentar novamente (cache expira automaticamente)

**Solução 2:** Forçar reload via SQL:
```sql
NOTIFY pgrst, 'reload schema';
```

**Solução 3:** Reiniciar projeto no Supabase Dashboard:
1. Settings → General
2. Scroll até "Pause project"
3. Pausar e depois retomar (isso força reload completo)

---

### Dashboard mostra "Nenhum documento indexado" após corrigir

**Causa:** Documentos não estão com `indexing_status = 'completed'`

**Diagnóstico:**
```sql
SELECT indexing_status, COUNT(*)
FROM file_search_documents
GROUP BY indexing_status;
```

**Se todos estão 'pending':** Edge Function `process-whatsapp-document` não completou processamento.

**Solução temporária:** Marcar manualmente como completed (só para teste):
```sql
UPDATE file_search_documents
SET indexing_status = 'completed'
WHERE indexing_status = 'pending'
  AND gemini_file_name IS NOT NULL;
```

---

## ✅ Checklist de Validação

Execute este checklist após aplicar o fix:

- [ ] Função existe no database
  ```sql
  SELECT proname FROM pg_proc WHERE proname = 'get_module_file_search_stats';
  ```

- [ ] Constraints incluem 'whatsapp'
  ```sql
  SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'chk_documents_module_type';
  ```

- [ ] Função retorna dados
  ```sql
  SELECT * FROM get_module_file_search_stats(NULL);
  ```

- [ ] Dashboard carrega sem erros
  - Acessar `/file-search`
  - Ver dados nos cards

- [ ] Documentos WhatsApp aparecem
  - Seção "Documentos Recentes" tem itens com ícone 📱

---

## 📝 Alternativa: Via Supabase CLI (se SQL Editor não funcionar)

```bash
# Navegar até o projeto
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend

# Executar migration manualmente
npx supabase db execute -f supabase/migrations/20260128000003_force_recreate_analytics_function.sql --linked

# Verificar
npx supabase db execute --command "SELECT * FROM get_module_file_search_stats(NULL)" --linked
```

---

**Próximo passo:** Executar o SQL no Supabase SQL Editor e recarregar o dashboard
