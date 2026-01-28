# Manual Fix: Grants PDF Upload Errors

## Diagnóstico Realizado

Foram identificados 3 erros ao fazer upload de PDF no módulo grants:

| Erro | Endpoint | Status | Causa |
|------|----------|--------|-------|
| 401 | generate-questions | 🟢 Tratado | Race condition na inicialização da sessão |
| 400 | start_tour RPC | 🟡 Corrigido | user_id undefined quando não autenticado |
| 500 | process-edital | 🔴 CRÍTICO | GEMINI_API_KEY não configurada ou RLS policy inválida |

---

## Passo 1: Verificar Secrets (CRÍTICO)

Acesse: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/settings/functions

Verifique se os seguintes secrets estão configurados:

```
GEMINI_API_KEY=AIza... (sua chave da Google AI)
SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service role key)
```

### Como obter a GEMINI_API_KEY:
1. Acesse https://aistudio.google.com/apikey
2. Clique em "Create API Key"
3. Copie a chave e adicione nos secrets do Supabase

---

## Passo 2: Aplicar Migration de RLS

Acesse: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new

Execute o seguinte SQL:

```sql
-- =====================================================
-- FIX: Service Role RLS Policy for file_search_documents
-- =====================================================

-- Step 1: Drop potentially malformed policies
DROP POLICY IF EXISTS "Service role can insert documents" ON public.file_search_documents;
DROP POLICY IF EXISTS "Service role can select documents" ON public.file_search_documents;
DROP POLICY IF EXISTS "Service role can update documents" ON public.file_search_documents;

-- Step 2: Create policies with correct syntax
CREATE POLICY "Service role can insert documents"
  ON public.file_search_documents
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select documents"
  ON public.file_search_documents
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update documents"
  ON public.file_search_documents
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 3: Verify
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'file_search_documents'
  AND policyname LIKE 'Service role%';
```

---

## Passo 3: Deployar Edge Function de Teste

No terminal, execute:

```bash
cd /c/Users/lucas/repos/Aica_frontend/Aica_frontend
npx supabase login
npx supabase functions deploy test-process-edital --no-verify-jwt
```

Depois teste:
```bash
curl -X GET "https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/test-process-edital"
```

Resposta esperada:
```json
{
  "environment": {
    "SUPABASE_URL": "✅ Set",
    "SUPABASE_SERVICE_ROLE_KEY": "✅ Set",
    "GEMINI_API_KEY": "✅ Set"
  },
  "geminiApiTest": {
    "reachable": "✅ Yes"
  }
}
```

---

## Passo 4: Verificar Correção

1. Acesse a aplicação em https://aica-staging-5p22u2w6jq-rj.a.run.app/
2. Vá para o módulo Grants
3. Faça upload de um PDF
4. Verifique se não há mais erros 500 no console

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/contexts/TourContext.tsx` | Adicionado null-check para user_id antes de chamar RPCs |
| `supabase/migrations/20260128210000_fix_service_role_rls_policy.sql` | Nova migration para corrigir RLS policies |

---

## Troubleshooting

### Se GEMINI_API_KEY retornar "❌ Missing":
1. Verifique se o secret foi salvo corretamente no Dashboard
2. Redeploy a Edge Function: `npx supabase functions deploy process-edital`

### Se RLS policy falhar:
1. Verifique se a tabela `file_search_documents` existe
2. Execute `SELECT * FROM pg_tables WHERE tablename = 'file_search_documents';`

### Se o erro 500 persistir:
1. Verifique os logs: `npx supabase functions logs process-edital --tail`
2. Ou no Dashboard: Edge Functions → process-edital → Logs
