# AI Cost Dashboard Troubleshooting Guide

## Problema: Dashboard vazio (nenhum dado aparece)

### ✅ Solução Passo a Passo

---

## 🔍 Passo 1: Verificar se as migrations foram aplicadas

Execute este SQL no Supabase SQL Editor:

```sql
-- Verificar se tabelas existem
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ai_usage_analytics', 'ai_model_pricing');
```

**Resultado esperado**: Ambas as tabelas devem existir.

**Se não existirem**, aplique as migrations na ordem:

```bash
# 1. Core multimodal analytics
npx supabase migration up --db-url <YOUR_DB_URL> --file supabase/migrations/20251208180300_multimodal_analytics.sql

# 2. AI cost tracking enhancements
npx supabase migration up --db-url <YOUR_DB_URL> --file supabase/migrations/20251209000000_ai_cost_tracking_enhancements.sql
```

Ou via Supabase Dashboard:
1. Vá para **Database → Migrations**
2. Clique em **Run Migration**
3. Cole o conteúdo de cada arquivo .sql

---

## 🔍 Passo 2: Verificar RLS (Row-Level Security)

Execute este SQL:

```sql
-- Verificar policies da tabela ai_usage_analytics
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'ai_usage_analytics';
```

**Resultado esperado**: Deve haver uma policy que permite users visualizarem apenas seus próprios logs.

**Se não houver**, crie a policy:

```sql
-- Criar RLS policy
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own AI usage"
  ON public.ai_usage_analytics
  FOR SELECT
  USING (user_id = auth.uid());
```

---

## 🔍 Passo 3: Testar inserção manual de dados

Execute este SQL para testar se você consegue inserir e ler dados:

```sql
-- Verificar user atual
SELECT auth.uid() AS my_user_id, auth.email() AS my_email;

-- Inserir log de teste
INSERT INTO ai_usage_analytics (
  user_id,
  operation_type,
  ai_model,
  input_tokens,
  output_tokens,
  total_tokens,
  input_cost_usd,
  output_cost_usd,
  total_cost_usd,
  module_type,
  request_metadata
) VALUES (
  auth.uid(),
  'file_search_query',
  'aqa',
  500,
  200,
  700,
  0.0005,
  0.0002,
  0.0007,
  'grants',
  '{"query": "teste manual", "results": 5}'::jsonb
);

-- Verificar se foi inserido
SELECT * FROM ai_usage_analytics WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 5;
```

**Resultado esperado**: O log deve aparecer na query SELECT.

**Se aparecer**: O problema NÃO é com o banco de dados. Continue para Passo 4.

**Se NÃO aparecer**: Há um problema com RLS ou permissões. Verifique:
- Se você está autenticado (auth.uid() não deve ser NULL)
- Se RLS está habilitado mas sem policies

---

## 🔍 Passo 4: Verificar se o tracking está sendo chamado

Abra o navegador e:

1. Abra **DevTools** (F12)
2. Vá para a aba **Console**
3. Execute uma busca File Search em qualquer módulo
4. Procure por logs:
   - `[aiUsageTracking] Successfully logged usage`
   - `[fileSearchApiClient] Tracking error`

**Se NÃO ver nenhum log**:
- O `trackAIUsage` não está sendo chamado
- Verifique se `fileSearchApiClient.ts` tem as chamadas de tracking (devem estar lá após as correções)

**Se ver erro de tracking**:
- Leia a mensagem de erro no console
- Pode ser um problema de autenticação ou permissão

---

## 🔍 Passo 5: Verificar funções RPC

Execute este SQL:

```sql
-- Verificar funções RPC
SELECT proname AS function_name
FROM pg_proc
WHERE proname IN ('log_ai_usage', 'get_current_model_pricing', 'calculate_token_cost')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

**Resultado esperado**: Todas as 3 funções devem existir.

**Se não existirem**, aplique a migration `20251209000000_ai_cost_tracking_enhancements.sql`.

---

## 🔍 Passo 6: Testar função RPC manualmente

Execute este SQL:

```sql
-- Testar log_ai_usage
SELECT public.log_ai_usage(
  auth.uid(),                  -- user_id
  'file_search_query',         -- operation_type
  'aqa',                       -- ai_model
  500,                         -- input_tokens
  200,                         -- output_tokens
  700,                         -- total_tokens
  1.5,                         -- duration_seconds
  0.0005,                      -- input_cost_usd
  0.0002,                      -- output_cost_usd
  0.0007,                      -- total_cost_usd
  'grants',                    -- module_type
  NULL,                        -- module_id
  NULL,                        -- asset_id
  '{"query": "teste RPC"}'::jsonb  -- request_metadata
);

-- Verificar se foi criado
SELECT * FROM ai_usage_analytics WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;
```

**Se funcionar**: O problema está na camada frontend (TypeScript).

**Se NÃO funcionar**: Leia o erro e verifique:
- Se o `operation_type` é válido (deve estar na lista do CHECK constraint)
- Se o `user_id` existe na tabela `auth.users`

---

## 🔍 Passo 7: Verificar erros de tracking

Execute este SQL:

```sql
-- Ver erros de tracking (se houver tabela de erros)
SELECT *
FROM ai_usage_tracking_errors
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

Se houver erros, o campo `error_message` dirá o que deu errado.

---

## 🔍 Passo 8: Recarregar a aplicação

Após as correções:

1. **Limpe o cache do navegador** (Ctrl + Shift + Delete)
2. **Faça hard reload** (Ctrl + Shift + R)
3. **Faça logout e login novamente**
4. Execute uma busca File Search em qualquer módulo
5. Vá para **Configurações → Custos de IA**
6. Deve aparecer um log

---

## 🧪 Script de Diagnóstico Completo

Execute este SQL para diagnóstico completo:

```sql
-- ===== DIAGNÓSTICO COMPLETO =====

SELECT '1️⃣ USER INFO' AS section;
SELECT auth.uid() AS user_id, auth.email() AS email;

SELECT '2️⃣ TABLES EXIST' AS section;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%ai%'
ORDER BY table_name;

SELECT '3️⃣ RPC FUNCTIONS EXIST' AS section;
SELECT proname
FROM pg_proc
WHERE proname LIKE '%ai%' OR proname LIKE '%log%' OR proname LIKE '%cost%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

SELECT '4️⃣ EXISTING LOGS FOR ME' AS section;
SELECT COUNT(*) AS total_logs, SUM(total_cost_usd) AS total_spent
FROM ai_usage_analytics
WHERE user_id = auth.uid();

SELECT '5️⃣ RECENT LOGS' AS section;
SELECT created_at, operation_type, ai_model, module_type, total_cost_usd
FROM ai_usage_analytics
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

SELECT '6️⃣ RLS POLICIES' AS section;
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'ai_usage_analytics';
```

---

## 📝 Checklist de Correções Aplicadas

- [x] **fileSearchApiClient.ts**: Adicionado `trackAIUsage` em `queryFileSearch()`
- [x] **fileSearchApiClient.ts**: Adicionado `trackAIUsage` em `indexDocument()`
- [x] **operation_type**: Corrigido para `'file_search_query'` (não `'file_search'`)
- [x] **ai_model**: Usando `'aqa'` para queries e `'text-embedding-004'` para indexação
- [x] **Fire-and-forget**: Tracking não bloqueia operações principais
- [x] **Error handling**: Erros de tracking são logados mas não propagados

---

## 🚨 Problemas Comuns

### Erro: "operation_type violates check constraint"

**Causa**: Tentando usar um `operation_type` inválido.

**Solução**: Use apenas os tipos válidos:
- `'text_generation'`
- `'image_generation'`
- `'video_generation'`
- `'audio_generation'`
- `'transcription'`
- `'file_indexing'`
- `'file_search_query'` ← Use este para File Search queries
- `'image_analysis'`
- `'embedding'` ← Use este para indexação de documentos

### Erro: "permission denied for table ai_usage_analytics"

**Causa**: RLS está habilitado mas sem policy, ou user não está autenticado.

**Solução**:
1. Verifique `auth.uid()` - deve retornar um UUID
2. Crie a RLS policy (ver Passo 2)

### Erro: "function log_ai_usage does not exist"

**Causa**: Migration não foi aplicada.

**Solução**: Aplique `20251209000000_ai_cost_tracking_enhancements.sql`

---

## ✅ Teste Final

Depois de seguir todos os passos:

```sql
-- 1. Inserir log de teste via RPC
SELECT public.log_ai_usage(
  auth.uid(),
  'file_search_query',
  'aqa',
  100, 50, 150, 0.5,
  0.0001, 0.00005, 0.00015,
  'grants', NULL, NULL,
  '{"test": true}'::jsonb
);

-- 2. Verificar se aparece
SELECT * FROM ai_usage_analytics WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;

-- 3. Se aparecer, vá para o dashboard e atualize a página
```

Se o log aparecer no SQL mas NÃO no dashboard, o problema é no frontend (AICostDashboard component).

---

## 📞 Ainda não funciona?

Execute o diagnóstico completo e compartilhe os resultados:

```bash
# 1. Executar diagnóstico SQL (acima)
# 2. Console do navegador (copiar erros)
# 3. Network tab (verificar requests para Supabase)
```

---

**Última atualização**: 2025-12-09
**Status**: Tracking integrado + Corrigido operation_type
