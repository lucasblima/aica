# WhatsApp RAG - Deployment & Testing Guide

## ✅ O Que Foi Implementado

**WhatsApp RAG completo** - Envio de PDFs/imagens pelo WhatsApp → auto-indexação → busca no Journey

### Arquivos Criados:
1. `supabase/functions/process-whatsapp-document/index.ts` - Edge Function (600+ linhas)
2. `supabase/migrations/20260128000001_whatsapp_document_processing.sql` - Schema update
3. `supabase/functions/webhook-evolution/index.ts` - Integração webhook (modificado)

---

## 🚀 Deployment Instructions

### ⚠️ ATUALIZAÇÃO IMPORTANTE - Busca Unificada Journey + WhatsApp

**Mudança arquitetural:** Documentos WhatsApp agora são indexados no mesmo corpus do Journey, permitindo busca unificada em um único local.

### Passo 1: Aplicar Migration (Database Schema)

```bash
npx supabase db push
```

**O que faz:**
- Adiciona campos `media_type`, `media_url`, `document_processed`, `gemini_file_name`, `file_search_document_id` em `whatsapp_messages`
- Cria 3 indexes para performance

**Verificar sucesso:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'whatsapp_messages'
  AND column_name IN ('media_type', 'media_url', 'document_processed');
```

Deve retornar 3 linhas.

---

### Passo 2: Deploy Edge Function (ATUALIZADO)

```bash
npx supabase functions deploy process-whatsapp-document --project-ref uzywajqzbdbrfammshdg
```

**Aguarde ~1-2 minutos** até aparecer: `Deployed Function process-whatsapp-document`

**✅ NOVO:** Agora cria/reutiliza corpus do Journey para indexar documentos WhatsApp

---

### Passo 3: Deploy Webhook Atualizado

```bash
npx supabase functions deploy webhook-evolution --project-ref uzywajqzbdbrfammshdg
```

**O que mudou:**
- Agora detecta mensagens com mídia (image, document, audio, video)
- Salva com `media_type` e `media_url`
- Chama `process-whatsapp-document` automaticamente (fire-and-forget)

---

### Passo 4: Rebuild Frontend (Busca Unificada)

**IMPORTANTE:** O código frontend foi atualizado para buscar em múltiplos módulos.

```bash
git add -A
git commit -m "feat(journey): Implement unified search (Journey + WhatsApp documents)"
git push origin main
```

**Aguarde ~4 minutos** para build automático no Cloud Run.

---

### Passo 4: Verificar Secrets (CRÍTICO)

**Necessários:**
- `GEMINI_API_KEY` ✅ (para processar documentos)
- `EVOLUTION_API_URL` ✅ (para baixar mídia)
- `EVOLUTION_API_KEY` ✅ (para autenticar download)

**Como verificar:**
```bash
# Dashboard Supabase
# Settings → Edge Functions → Secrets
# Confirmar que os 3 existem
```

**Se GEMINI_API_KEY faltar:**
1. https://aistudio.google.com/app/apikey
2. Create API Key
3. Copiar key
4. Dashboard Supabase → Add Secret: `GEMINI_API_KEY`

---

## 🧪 Testing Guide

### Teste 1: Enviar PDF pelo WhatsApp

**Pré-requisito:** WhatsApp conectado no Aica

1. **No WhatsApp mobile**, abra conversa com o número conectado ao Aica
2. **Envie um PDF** (qualquer documento)
3. **Aguarde 5-10 segundos** (processamento em background)

**Verificar no database:**
```sql
-- Verificar se mensagem foi salva com mídia
SELECT
  id,
  message_text,
  media_type,
  media_url,
  document_processed,
  gemini_file_name,
  created_at
FROM whatsapp_messages
WHERE media_type = 'document'
ORDER BY created_at DESC
LIMIT 5;
```

**Esperado:**
- `media_type`: `'document'`
- `media_url`: URL do Evolution API (https://...)
- `document_processed`: `true` (após ~10s)
- `gemini_file_name`: `'files/xxx...'` (quando processado)

---

### Teste 2: Verificar File Search Document

```sql
-- Verificar se documento foi indexado
SELECT
  id,
  gemini_file_name,
  original_filename,
  module_type,
  indexing_status,
  metadata->>'contact_name' AS contact_name,
  metadata->>'extracted_text_preview' AS text_preview,
  created_at
FROM file_search_documents
WHERE module_type = 'whatsapp'
ORDER BY created_at DESC
LIMIT 5;
```

**Esperado:**
- `module_type`: `'whatsapp'`
- `indexing_status`: `'completed'`
- `metadata.contact_name`: Nome do contato WhatsApp
- `metadata.extracted_text_preview`: Primeiros 500 chars do PDF

---

### Teste 3: Buscar no Journey

1. Acesse: https://aica-staging-5562559893.southamerica-east1.run.app/
2. Navegue: **Minha Jornada → Busca**
3. Digite uma **palavra-chave** que existe no PDF enviado
4. ✅ **Deve aparecer o documento** nos resultados

**Exemplo:**
- PDF enviado: "Contrato de Prestação de Serviços"
- Busca por: "contrato"
- Resultado: Documento WhatsApp aparece com preview do texto

---

### Teste 4: Enviar Imagem com Texto (OCR)

1. **No WhatsApp**, envie uma **foto de um documento** (ex: foto de contrato, placa, receita)
2. Aguarde 5-10 segundos
3. **Busque no Journey** por palavras visíveis na imagem

**Verificar:**
```sql
SELECT
  id,
  media_type,
  document_processed,
  gemini_file_name
FROM whatsapp_messages
WHERE media_type = 'image'
  AND document_processed = true
ORDER BY created_at DESC
LIMIT 5;
```

**Esperado:**
- OCR extrai texto da imagem
- Texto fica pesquisável no Journey

---

## 🐛 Troubleshooting

### Problema 1: `document_processed` fica `false`

**Causa:** Edge Function `process-whatsapp-document` falhou

**Debug:**
```bash
# Ver logs da Edge Function
npx supabase functions logs process-whatsapp-document --limit 50

# Ou via Dashboard:
# Supabase Dashboard → Edge Functions → process-whatsapp-document → Logs
```

**Erros comuns:**
- `GEMINI_API_KEY not configured` → Adicionar secret
- `Failed to download media` → Evolution API down ou URL inválida
- `Gemini upload failed (403)` → API key inválida/expirada
- `Timeout waiting for file to be ACTIVE` → PDF muito grande (>20MB)

---

### Problema 2: Busca não encontra documento

**Causa:** Gemini File Search não indexou ainda

**Verificar:**
```sql
SELECT
  gemini_file_name,
  indexing_status,
  created_at
FROM file_search_documents
WHERE module_type = 'whatsapp'
ORDER BY created_at DESC
LIMIT 5;
```

**Se `indexing_status` = `'processing'`:**
- Aguarde mais tempo (pode levar até 2 minutos)

**Se `indexing_status` = `'failed'`:**
- Logs da Edge Function mostrarão o erro

---

### Problema 3: Mensagem sem mídia não aparece

**Causa:** Mensagens só são salvas se tiverem `text` OU `media`

**Solução:** Isso é esperado. Mensagens vazias (sem texto, sem mídia) são ignoradas.

---

### Problema 4: Áudio não processa

**Status:** Áudio ainda não implementado (placeholder)

**Próximos passos:**
- Implementar transcrição via Whisper API
- Ou usar Gemini Audio API (quando disponível)

---

## 📊 Monitoring Queries

### Dashboard: Documentos Processados

```sql
-- Total de documentos por tipo
SELECT
  media_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE document_processed = TRUE) AS processed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE document_processed = TRUE) / COUNT(*), 1) AS success_rate
FROM whatsapp_messages
WHERE media_type IS NOT NULL
GROUP BY media_type
ORDER BY total DESC;
```

### Dashboard: Tempo de Processamento

```sql
-- Tempo médio entre mensagem recebida e processamento completo
SELECT
  media_type,
  AVG(
    EXTRACT(EPOCH FROM (fsd.created_at - wm.message_timestamp))
  ) AS avg_processing_seconds
FROM whatsapp_messages wm
JOIN file_search_documents fsd ON wm.file_search_document_id = fsd.id
WHERE wm.document_processed = TRUE
GROUP BY media_type;
```

### Dashboard: Documentos Pendentes

```sql
-- Documentos que falharam ou estão esperando processamento
SELECT
  wm.id,
  wm.message_timestamp,
  wm.media_type,
  wm.media_url,
  cn.name AS contact_name,
  EXTRACT(EPOCH FROM (NOW() - wm.created_at)) / 60 AS minutes_ago
FROM whatsapp_messages wm
JOIN contact_network cn ON wm.contact_id = cn.id
WHERE wm.media_type IS NOT NULL
  AND wm.document_processed = FALSE
ORDER BY wm.created_at DESC
LIMIT 10;
```

---

## 🎯 Success Metrics

- ✅ **Processing success rate**: >95%
- ✅ **Average processing time**: <10 seconds
- ✅ **Search accuracy**: Users find documents with keywords
- ✅ **User adoption**: 30% of WhatsApp users send documents weekly

---

## 🔐 Security Notes

### Data Retention
- **Gemini Files API**: Auto-deletes files after 48 hours
- **file_search_documents**: Persists permanently (controlled by user)
- **whatsapp_messages**: Respects 24h auto-purge (LGPD compliance)

### Privacy
- All operations respect RLS policies (user_id isolation)
- Media downloads require valid Evolution API key
- OCR/extraction happens server-side (Gemini API)
- No PII exposed in logs (media_url truncated)

---

## 📝 Comandos Úteis

```bash
# Deploy Edge Function
npx supabase functions deploy process-whatsapp-document --project-ref uzywajqzbdbrfammshdg

# Ver logs em tempo real
npx supabase functions logs process-whatsapp-document --tail

# Aplicar migration
npx supabase db push

# Verificar status do database
npx supabase db remote status --linked
```

---

## ✅ Checklist Final

Antes de considerar deployment completo:

- [ ] Migration aplicada (`db push` executado)
- [ ] Edge Function deployada (`process-whatsapp-document`)
- [ ] Webhook atualizado (`webhook-evolution` re-deployed)
- [ ] Secrets configurados (GEMINI_API_KEY, EVOLUTION_API_*)
- [ ] Teste 1: PDF enviado e processado ✅
- [ ] Teste 2: Documento aparece em file_search_documents ✅
- [ ] Teste 3: Busca no Journey encontra documento ✅
- [ ] Teste 4: OCR de imagem funciona ✅
- [ ] Logs da Edge Function sem erros críticos ✅

---

## 🚀 Próximas Melhorias (Future Work)

1. **Audio transcription**: Implementar Whisper API
2. **Video support**: Extract frames + OCR
3. **Frontend UI**: Badge "Documento indexado" nas mensagens
4. **Timeline cards**: Preview de documentos com thumbnail
5. **Bulk reprocessing**: Re-processar documentos antigos
6. **Cost optimization**: Batch processing, deduplication

---

**Deployment concluído quando todos os checkboxes acima estiverem ✅**
