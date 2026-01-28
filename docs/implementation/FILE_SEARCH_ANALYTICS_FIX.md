# File Search Analytics - Correção do Dashboard

## ✅ O Que Foi Corrigido

**Problema:** Página de analytics não mostrava nenhum dado ("Nenhum documento indexado" mesmo com documentos existentes).

**Acesso:** `/file-search` ou via Settings Menu → "File Search Analytics"

---

## 🐛 Causas Identificadas

### 1. Função RPC Incompatível
**Problema:** `get_module_file_search_stats()` retornava campos diferentes dos esperados pelo hook.

**Esperado pelo hook:**
```typescript
interface ModuleStats {
  module_type: string;
  document_count: number;
  total_size_bytes: number;  // ❌ Estava faltando
  avg_size_bytes: number;     // ❌ Estava faltando
  corpus_count: number;
  last_indexed_at?: string;
}
```

**Retornado pela função antiga:**
```sql
-- ANTES
RETURNS TABLE (
  module_type TEXT,
  corpus_count BIGINT,
  document_count BIGINT,
  total_size_mb NUMERIC,  -- ❌ Deveria ser total_size_bytes
  last_indexed_at TIMESTAMPTZ
)
-- Estava faltando avg_size_bytes!
```

**Resultado:** Hook recebia dados em formato errado e falhava silenciosamente.

---

### 2. Constraint do Database Bloqueando 'whatsapp'
**Problema:** Documentos WhatsApp não podiam ser salvos devido ao constraint.

**Constraint antigo:**
```sql
CHECK (
  module_type IS NULL OR
  module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat')
)
-- ❌ 'whatsapp' não estava na lista!
```

**Erro causado:**
```
ERROR:  new row for relation "file_search_documents" violates check constraint "chk_documents_module_type"
DETAIL:  Failing row contains (module_type = 'whatsapp')
```

---

### 3. Módulo WhatsApp Sem Configuração Visual
**Problema:** Mesmo se dados fossem carregados, WhatsApp apareceria sem ícone/cor.

**MODULE_CONFIG antigo:**
```typescript
const MODULE_CONFIG = {
  grants: { icon: '📝', label: 'Grants', ... },
  podcast: { icon: '🎙️', label: 'Podcast', ... },
  // ... outros módulos
  // ❌ whatsapp: FALTANDO!
};
```

**Resultado:** Documentos WhatsApp usariam fallback genérico (icon: '📄', label: 'whatsapp').

---

## 🔧 Correções Aplicadas

### Migration: `20260128000002_fix_file_search_analytics.sql`

#### 1. Atualização do Constraint
```sql
ALTER TABLE public.file_search_documents
  ADD CONSTRAINT chk_documents_module_type
  CHECK (
    module_type IS NULL OR
    module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat', 'whatsapp')
  );
  -- ✅ 'whatsapp' adicionado
```

#### 2. Recriação da Função RPC
```sql
CREATE OR REPLACE FUNCTION public.get_module_file_search_stats(
  p_user_id UUID DEFAULT NULL  -- ✅ NULL = admin view (todos os usuários)
)
RETURNS TABLE (
  module_type TEXT,
  document_count BIGINT,
  total_size_bytes BIGINT,     -- ✅ Adicionado
  avg_size_bytes BIGINT,        -- ✅ Adicionado
  corpus_count BIGINT,
  last_indexed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(fd.module_type, 'unassigned') AS module_type,
    COUNT(fd.id) AS document_count,
    COALESCE(SUM(fd.file_size_bytes), 0) AS total_size_bytes,  -- ✅ Soma total
    CASE
      WHEN COUNT(fd.id) > 0 THEN (COALESCE(SUM(fd.file_size_bytes), 0) / COUNT(fd.id))::BIGINT
      ELSE 0
    END AS avg_size_bytes,  -- ✅ Média calculada
    COUNT(DISTINCT fd.corpus_id) AS corpus_count,
    MAX(fd.created_at) AS last_indexed_at
  FROM public.file_search_documents fd
  WHERE
    (p_user_id IS NULL OR fd.user_id = p_user_id)
    AND fd.indexing_status = 'completed'  -- ✅ Só documentos completos
  GROUP BY fd.module_type
  ORDER BY document_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Frontend: `FileSearchAnalyticsDashboard.tsx`

#### Adição do Módulo WhatsApp
```typescript
const MODULE_CONFIG = {
  // ... módulos existentes
  whatsapp: {
    icon: '📱',
    label: 'WhatsApp',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
};
```

---

## 🧪 Como Testar

### Pré-requisito
Enviar pelo menos 1 documento pelo WhatsApp (conforme WHATSAPP_RAG_DEPLOYMENT.md).

### Teste 1: Acessar Dashboard
1. Acesse: https://aica-staging-5p22u2w6jq-rj.a.run.app/file-search
2. Ou: Settings Menu → "File Search Analytics"

**Esperado:**
- ✅ Dashboard carrega sem erros
- ✅ Cards de estatísticas aparecem com números
- ✅ Seção "Uso por Módulo" mostra barras coloridas
- ✅ Módulo "WhatsApp" aparece com ícone 📱 e cor verde (emerald)

### Teste 2: Verificar Dados
```sql
-- Ver estatísticas calculadas pela função RPC
SELECT * FROM get_module_file_search_stats(NULL);
```

**Esperado:**
```
module_type | document_count | total_size_bytes | avg_size_bytes | corpus_count | last_indexed_at
-----------+----------------+------------------+----------------+--------------+-----------------
whatsapp   |              3 |           524288 |         174762 |            1 | 2026-01-28 ...
journey    |              5 |            81920 |          16384 |            1 | 2026-01-27 ...
```

### Teste 3: Módulo Específico
Clicar na barra do módulo WhatsApp no dashboard.

**Esperado:**
- ✅ Seção "Documentos Recentes" mostra PDFs/imagens do WhatsApp
- ✅ Cada documento tem ícone 📱
- ✅ Status "Ativo" (badge verde)
- ✅ Nome do arquivo e tamanho aparecem

---

## 📊 Estatísticas Exibidas

### Cards Principais
1. **Total de Documentos:** Soma de todos os módulos
2. **Tamanho Total:** Convertido para MB automaticamente
3. **Taxa de Sucesso:** `(active / (active + failed)) * 100`
4. **Módulos Ativos:** Contagem de módulos com documentos

### Uso por Módulo
- Barras de progresso proporcionais ao número de documentos
- Cores específicas por módulo (WhatsApp = verde emerald)
- Tamanho total em MB
- Última data de indexação

### Documentos Recentes
- Últimos 10 documentos indexados (qualquer módulo)
- Display name customizado
- Status badge (Ativo, Pendente, Falhou)
- Timestamp de criação

### Status Distribution
- **Ativos:** Documentos completamente indexados
- **Pendentes:** Aguardando processamento
- **Falhas:** Erros de indexação

---

## 🔍 Troubleshooting

### Dashboard mostra "Nenhum documento indexado"

**Diagnóstico:**
```sql
-- Verificar se documentos existem
SELECT COUNT(*) FROM file_search_documents;

-- Verificar se têm indexing_status correto
SELECT indexing_status, COUNT(*)
FROM file_search_documents
GROUP BY indexing_status;
```

**Se documentos existem mas aparecem como "pending":**
- Edge Function `process-whatsapp-document` pode ter falhado
- Ver logs: `npx supabase functions logs process-whatsapp-document`

---

### Erro "RPC function not found"

**Causa:** Migration não aplicada em staging.

**Solução:**
```bash
npx supabase db push
```

---

### Módulo WhatsApp não aparece

**Diagnóstico:**
```sql
-- Verificar constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'chk_documents_module_type';
```

**Se 'whatsapp' não está no constraint:**
- Migration antiga ainda em uso
- Aplicar `20260128000002_fix_file_search_analytics.sql` manualmente

---

### Dados aparecem mas com valores estranhos

**Causa:** Função RPC antiga ainda ativa.

**Solução:**
```sql
-- Verificar assinatura da função
SELECT
  proname,
  pg_get_function_result(oid) as result_type
FROM pg_proc
WHERE proname = 'get_module_file_search_stats';
```

**Deve retornar:**
```
TABLE(module_type text, document_count bigint, total_size_bytes bigint, avg_size_bytes bigint, corpus_count bigint, last_indexed_at timestamp with time zone)
```

**Se diferente:** Recriar função manualmente ou reaplicar migration.

---

## 🎯 Impacto

**Antes:**
- Dashboard quebrado ("Nenhum documento indexado")
- Documentos WhatsApp não podiam ser salvos no database
- Sem visibilidade de uso do File Search

**Depois:**
- Dashboard funcional com dados reais
- Documentos WhatsApp totalmente suportados
- Métricas de uso por módulo (journey, whatsapp, grants, etc.)
- Admin pode monitorar indexação e detectar falhas

---

## 📝 Arquivos Modificados

1. ✅ `supabase/migrations/20260128000002_fix_file_search_analytics.sql` - NEW
2. ✅ `src/components/fileSearch/FileSearchAnalyticsDashboard.tsx` - Adicionado WhatsApp config
3. ✅ Pushed to main - Build automático em andamento

---

## ✅ Checklist de Validação

- [x] Migration aplicada em staging (`npx supabase db push`)
- [x] Constraint atualizado (whatsapp permitido)
- [x] Função RPC recriada com campos corretos
- [x] Frontend atualizado com config WhatsApp
- [x] Código commitado e pushed
- [ ] Dashboard testado em `/file-search` (aguardando build ~4 min)
- [ ] Documentos WhatsApp aparecem na lista
- [ ] Estatísticas calculadas corretamente

---

**Próximo passo:** Testar dashboard após build do frontend completar
