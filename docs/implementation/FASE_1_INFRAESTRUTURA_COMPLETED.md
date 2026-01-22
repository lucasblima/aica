# Fase 1: Infraestrutura - CONCLUÍDA ✅

## Issue #118 - WhatsApp Input de Documentos

**Data:** 2026-01-22
**Agente:** Backend Architect Supabase Agent
**Status:** ✅ CONCLUÍDO - Pronto para deploy

---

## 📦 Arquivos Criados

### 1. Migration Principal
**Arquivo:** `supabase/migrations/20260122000002_whatsapp_document_tracking.sql`

**Conteúdo:**
- ✅ Storage bucket `whatsapp-documents` (25MB limit, 6 MIME types)
- ✅ 4 RLS policies para Storage (SELECT, INSERT, UPDATE, DELETE)
- ✅ Tabela `whatsapp_media_tracking` (15 colunas)
- ✅ Constraint UNIQUE para deduplicação (user_id, message_id)
- ✅ 4 índices para performance
- ✅ RLS habilitado na tabela
- ✅ 5 RLS policies (4 user + 1 service role)
- ✅ Atualização do constraint de `whatsapp_pending_actions`
- ✅ 2 helper functions (path generation, pending queue)
- ✅ Comments em tabelas, colunas e functions
- ✅ Bloco de verificação ao final

### 2. Script de Validação
**Arquivo:** `supabase/migrations/VALIDATE_20260122000002.sql`

**Conteúdo:**
- ✅ 13 validações automatizadas
- ✅ Verificação de bucket, tabela, constraints, indexes, RLS
- ✅ Testes manuais opcionais incluídos
- ✅ Summary de resultados

### 3. Checklist de Validação
**Arquivo:** `supabase/migrations/FASE_1_CHECKLIST.md`

**Conteúdo:**
- ✅ 9 entregas detalhadas
- ✅ Critérios de aceite expandidos
- ✅ Instruções de validação passo a passo
- ✅ Testes manuais SQL
- ✅ Resumo de componentes criados
- ✅ Próximos passos (Fase 2)

---

## 🎯 Critérios de Aceite - Status

### ✅ Bucket `whatsapp-documents`
- [x] Criado via migration SQL
- [x] Limite 25MB configurado
- [x] 6 MIME types configurados (PDF, DOCX, PPTX, JPG, PNG, WEBP)
- [x] Bucket privado (public=false)
- [x] 4 RLS policies criadas

### ✅ Tabela `whatsapp_media_tracking`
- [x] Tabela criada com 15 colunas
- [x] UNIQUE constraint (user_id, message_id)
- [x] 3 CHECK constraints (media_type, download_status, processing_status)
- [x] 4+ índices criados
- [x] RLS habilitado
- [x] 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)
- [x] 1 RLS policy adicional (service role)

### ✅ Atualização de `whatsapp_pending_actions`
- [x] Constraint atualizado com `process_document`
- [x] Constraint atualizado com `link_document`
- [x] Action types anteriores mantidos

### ✅ Helper Functions
- [x] `generate_whatsapp_document_path` criada
- [x] `get_pending_whatsapp_media` criada
- [x] SECURITY DEFINER configurado
- [x] SET search_path = public

### ✅ Qualidade da Migration
- [x] Idempotente (IF NOT EXISTS, ON CONFLICT)
- [x] SECURITY DEFINER onde necessário
- [x] Comments em tabelas/colunas/functions
- [x] Success log ao final
- [x] Naming convention seguido

---

## 📊 Componentes Criados - Resumo

| Tipo | Nome | Descrição | Status |
|------|------|-----------|--------|
| **Storage Bucket** | `whatsapp-documents` | Bucket privado para documentos WhatsApp | ✅ |
| **Tabela** | `whatsapp_media_tracking` | Tracking de download/processamento | ✅ |
| **Function** | `generate_whatsapp_document_path` | Helper para gerar paths únicos | ✅ |
| **Function** | `get_pending_whatsapp_media` | Queue de processamento | ✅ |
| **RLS Policies** | Storage (4 policies) | SELECT, INSERT, UPDATE, DELETE | ✅ |
| **RLS Policies** | Table (5 policies) | User + Service role | ✅ |
| **Indexes** | 4 indexes | Performance optimization | ✅ |
| **Constraint** | UNIQUE (user_id, message_id) | Deduplicação | ✅ |
| **Constraint** | CHECK (3 constraints) | Validação de dados | ✅ |

---

## 🧪 Como Aplicar

### Opção 1: Deploy Direto para Staging

```bash
# Fazer commit da migration
git add supabase/migrations/20260122000002_whatsapp_document_tracking.sql
git add supabase/migrations/VALIDATE_20260122000002.sql
git add supabase/migrations/FASE_1_CHECKLIST.md
git add docs/implementation/FASE_1_INFRAESTRUTURA_COMPLETED.md

git commit -m "feat(whatsapp): Implement Fase 1 infrastructure for document input (#118)

- Create whatsapp-documents storage bucket (25MB, private)
- Add whatsapp_media_tracking table for download/processing tracking
- Update whatsapp_pending_actions with process_document/link_document types
- Add RLS policies for storage and table (9 total)
- Create helper functions for path generation and queue
- Add comprehensive validation script
- Add indexes for performance (4 total)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

**Deploy automático via GitHub trigger (~4 min)**

### Opção 2: Testar Localmente Primeiro

```bash
# Iniciar Supabase local
npx supabase start

# Aplicar migrations
npx supabase db reset --local

# Executar validação
npx supabase db query -f supabase/migrations/VALIDATE_20260122000002.sql --local

# Se OK, fazer push para staging
git push origin main
```

---

## ✅ Validação Pós-Deploy

### 1. Executar Script de Validação

No Supabase Dashboard → SQL Editor:

```sql
-- Copiar conteúdo de VALIDATE_20260122000002.sql
-- Executar
-- Verificar que todos os 13 checks retornam ✅ PASS
```

### 2. Teste Manual Básico

```sql
-- Teste 1: Gerar path
SELECT public.generate_whatsapp_document_path(
  auth.uid(),
  'documento_teste.pdf'
);
-- Esperado: <uuid>/YYYYMMDD_HHMMSS_documento_teste.pdf

-- Teste 2: Inserir tracking de teste
INSERT INTO public.whatsapp_media_tracking (
  user_id, message_id, instance_name, media_type, mime_type, original_filename, file_size_bytes
) VALUES (
  auth.uid(), 'test_msg_123', 'aica_test', 'document', 'application/pdf', 'test.pdf', 1024
);
-- Esperado: Sucesso

-- Teste 3: Verificar RLS
SELECT COUNT(*) FROM public.whatsapp_media_tracking;
-- Esperado: 1 (apenas o registro criado acima)

-- Teste 4: Limpar
DELETE FROM public.whatsapp_media_tracking WHERE message_id = 'test_msg_123';
```

### 3. Verificar Logs

```bash
# Verificar build do Cloud Run
gcloud builds list --limit=5 --region=southamerica-east1

# Se houver erros, verificar logs
gcloud builds log <BUILD_ID> --region=southamerica-east1
```

---

## 🚀 Próximos Passos - Fase 2

Com a infraestrutura validada, iniciar **Fase 2: Media Handler Module**:

### Entrega 2.1: `whatsapp-media-handler.ts`
```typescript
// supabase/functions/_shared/whatsapp-media-handler.ts
export interface MediaInfo { ... }
export interface DownloadResult { ... }
export async function downloadMediaFromEvolution(...) { ... }
export async function uploadToStorage(...) { ... }
export function determineFileType(...) { ... }
export function generateStoragePath(...) { ... }
```

### Entrega 2.2: `whatsapp-document-processor.ts`
```typescript
// supabase/functions/_shared/whatsapp-document-processor.ts
export interface ProcessDocumentResult { ... }
export async function processWhatsAppDocument(...) { ... }
export function formatResultMessage(...) { ... }
export function formatLinkingQuestion(...) { ... }
```

### Entrega 2.3: Modificar `webhook-evolution`
```typescript
// Adicionar handler de media messages
async function handleMediaMessage(...) { ... }
```

**Estimativa:** 6 horas (conforme planejamento)

---

## 📝 Notas Importantes

### Padrões de Segurança Seguidos

1. **SECURITY DEFINER Functions**
   - Evita recursão infinita de RLS
   - Usa `SET search_path = public` para prevenir injection
   - Funções desacopladas da lógica de RLS

2. **RLS Policies**
   - Usuários acessam apenas próprios dados
   - Service role tem acesso total (para webhooks)
   - Storage segue padrão `{user_id}/*`

3. **Deduplicação**
   - UNIQUE constraint em (user_id, message_id)
   - Previne processamento duplicado de mensagens

4. **Performance**
   - Índices em colunas frequentemente consultadas
   - Índices parciais para status específicos
   - HNSW index já existe em document_embeddings

### Path Pattern

Storage path pattern adotado:
```
{user_id}/{timestamp}_{original_filename}

Exemplo:
a1b2c3d4-e5f6-7890-abcd-ef1234567890/20260122_143055_projeto_cultural.pdf
```

Benefícios:
- ✅ Organização por usuário
- ✅ Ordem cronológica natural
- ✅ Nomes únicos (timestamp + filename)
- ✅ Compatível com RLS (foldername = user_id)

---

## 🎓 Lições Aprendidas

### O que funcionou bem:
1. **Reutilização de padrões** - Seguiu migration de `whatsapp_media_bucket.sql`
2. **SECURITY DEFINER desde o início** - Evitou problemas de RLS
3. **Validação automatizada** - Script de validação robusto
4. **Documentação inline** - Comments em SQL facilitam manutenção
5. **Idempotência** - Migration pode ser executada múltiplas vezes

### Para próximas fases:
1. **Retry logic** - Implementar em media-handler (Fase 2)
2. **Rate limiting** - Considerar para Evolution API (Fase 2)
3. **Monitoring** - Adicionar métricas de processamento (Fase 3)
4. **Alerts** - Notificar sobre falhas persistentes (Fase 3)

---

**Fase 1 CONCLUÍDA com sucesso! 🎉**

**Responsável:** Backend Architect Supabase Agent
**Data:** 2026-01-22
**Próxima Fase:** Fase 2 - Media Handler Module (6h estimadas)
