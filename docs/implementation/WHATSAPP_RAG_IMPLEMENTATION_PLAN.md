# WhatsApp RAG Implementation Plan (Issue #118)

## Objetivo
Permitir que usuários enviem documentos (PDF, images, audio) via WhatsApp e o sistema automaticamente:
1. Detecte mensagens com anexos
2. Baixe e processe o conteúdo
3. Indexe no File Search (Gemini vector embeddings)
4. Torne pesquisável via Journey/Atlas

---

## Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                 WhatsApp Message Received                    │
│                   (via Evolution API)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              webhook-evolution/index.ts                      │
│   - Detecta mediaType (image, audio, video, document)       │
│   - Salva mensagem em whatsapp_messages                     │
│   - Queue: process_whatsapp_document (async)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         NEW: process-whatsapp-document Edge Function        │
│                                                              │
│   1. Download media via Evolution API                       │
│      GET /message/{messageId}/media                         │
│                                                              │
│   2. Process by type:                                       │
│      ┌──────────────────────────────────────────────┐      │
│      │ PDF:       Upload to Gemini Files API         │      │
│      │            Extract text via Gemini            │      │
│      │                                               │      │
│      │ Image:     Upload to Gemini Files API         │      │
│      │            OCR via Gemini Vision              │      │
│      │                                               │      │
│      │ Audio:     Upload to Gemini Files API         │      │
│      │            Transcribe via Gemini              │      │
│      │            (or fallback to Whisper API)       │      │
│      │                                               │      │
│      │ Document:  Convert to PDF → Process as PDF    │      │
│      └──────────────────────────────────────────────┘      │
│                                                              │
│   3. Index in file_search_documents:                        │
│      - gemini_file_name (for File Search queries)           │
│      - module_type: 'whatsapp'                              │
│      - metadata: {sender, contact_name, message_id}         │
│                                                              │
│   4. Update whatsapp_messages:                              │
│      - document_processed: true                             │
│      - gemini_file_name: 'files/xxx'                        │
│                                                              │
│   5. Create timeline event (optional):                      │
│      - "Documento recebido de {contact_name}"               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               File Search Integration                        │
│   - Journey: searchInDocuments('keyword') → finds WhatsApp  │
│   - Atlas: Search tasks by WhatsApp document content        │
│   - Aica Auto: Answer questions using WhatsApp docs         │
└─────────────────────────────────────────────────────────────┘
```

---

## Reutilização de Infraestrutura Existente

### ✅ Já Implementado (Reutilizar)

#### 1. **process-edital Edge Function** (MODELO BASE)
**Localização**: `supabase/functions/process-edital/index.ts`

**O que reutilizar:**
```typescript
// ✅ Upload para Gemini Files API
async function uploadToGoogleFiles(
  base64Data: string,
  fileName: string,
  mimeType: string
): Promise<string>

// ✅ Aguardar file.state === 'ACTIVE'
async function waitForFileActive(
  geminiFileName: string,
  maxWaitMs = 120000
): Promise<void>

// ✅ Salvar em file_search_documents
async function saveDocumentReference(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  geminiFileName: string,
  originalFileName: string,
  fileSize: number
): Promise<string>

// ✅ Error handling with status codes
// ✅ Logging infrastructure
// ✅ CORS configuration
```

**O que adaptar:**
- Adicionar suporte para images (mime_type: image/*)
- Adicionar suporte para audio (mime_type: audio/*)
- Adicionar metadata específica do WhatsApp (contact_id, message_id)

#### 2. **webhook-evolution Message Detection**
**Localização**: `supabase/functions/webhook-evolution/index.ts`

**Já implementado** (linhas 1508-1583):
```typescript
// Detecta tipo de mídia
const mediaType = message.imageMessage ? 'image' :
                  message.audioMessage ? 'audio' :
                  message.videoMessage ? 'video' :
                  message.documentMessage ? 'document' : 'text'

// Download URL (Evolution API fornece)
const mediaUrl = message.imageMessage?.url ||
                 message.audioMessage?.url ||
                 message.documentMessage?.url
```

**O que adicionar:**
```typescript
// Após salvar mensagem, verificar se tem mídia
if (mediaType !== 'text' && mediaUrl) {
  // Queue para processar documento
  await supabase.functions.invoke('process-whatsapp-document', {
    body: {
      message_id: storedMessage.id,
      contact_id: contactId,
      media_url: mediaUrl,
      media_type: mediaType,
      file_name: message.documentMessage?.fileName || `${mediaType}_${Date.now()}`
    }
  })
}
```

#### 3. **File Search Integration**
**Localização**: `src/services/fileSearchService.ts`

**Já implementado:**
```typescript
// ✅ Query documents via Gemini Files API
export async function queryDocuments(
  query: string,
  geminiFileNames: string[],
  limit: number = 10
): Promise<SearchResult[]>

// ✅ Get document by gemini_file_name
export async function getDocumentByGeminiFileName(
  geminiFileName: string
): Promise<FileSearchDocument | null>
```

**Nenhuma mudança necessária** - funciona out-of-the-box!

---

## Schema Updates Necessários

### 1. Adicionar Campos em `whatsapp_messages`
```sql
ALTER TABLE whatsapp_messages
ADD COLUMN media_type TEXT CHECK (media_type IN ('text', 'image', 'audio', 'video', 'document')),
ADD COLUMN media_url TEXT,
ADD COLUMN document_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN gemini_file_name TEXT,
ADD COLUMN file_search_document_id UUID REFERENCES file_search_documents(id);

CREATE INDEX idx_whatsapp_messages_media ON whatsapp_messages(media_type) WHERE media_type IS NOT NULL;
CREATE INDEX idx_whatsapp_messages_processed ON whatsapp_messages(document_processed) WHERE document_processed = FALSE;
```

### 2. Metadata em `file_search_documents`
**Já existe coluna `metadata` (JSONB)**, apenas documentar estrutura:
```typescript
interface WhatsAppDocumentMetadata {
  source: 'whatsapp'
  contact_id: string
  contact_name: string
  message_id: string
  message_timestamp: string
  media_type: 'image' | 'audio' | 'document'
  original_file_name?: string
}
```

---

## Implementação Step-by-Step

### Phase 1: Criar Edge Function `process-whatsapp-document`

#### Estrutura do Arquivo
**Localização**: `supabase/functions/process-whatsapp-document/index.ts`

```typescript
/**
 * Process WhatsApp Document Edge Function
 *
 * Processes media attachments from WhatsApp messages:
 * 1. Downloads media via Evolution API
 * 2. Uploads to Gemini Files API for indexing
 * 3. Processes based on type (PDF, image OCR, audio transcription)
 * 4. Indexes in file_search_documents
 * 5. Updates whatsapp_messages with processing status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// REUTILIZAR de process-edital:
// - uploadToGoogleFiles()
// - waitForFileActive()
// - saveDocumentReference()
// - log()
// - getCorsHeaders()

// NOVO:
async function downloadMediaFromEvolution(
  messageId: string,
  instanceName: string
): Promise<{ buffer: Uint8Array; mimeType: string }>

async function processImageOCR(geminiFileName: string): Promise<string>
async function processAudioTranscription(geminiFileName: string): Promise<string>
async function processPDFExtraction(geminiFileName: string): Promise<string>
```

#### Pipeline Completo
```typescript
serve(async (req) => {
  // 1. Parse request
  const { message_id, contact_id, media_url, media_type, file_name } = await req.json()

  // 2. Get message and user from DB
  const { data: message } = await supabase
    .from('whatsapp_messages')
    .select('*, contact_network!contact_id(name)')
    .eq('id', message_id)
    .single()

  // 3. Download media from Evolution API
  const { buffer, mimeType } = await downloadMediaFromEvolution(...)

  // 4. Convert buffer to base64
  const base64Data = btoa(String.fromCharCode(...buffer))

  // 5. Upload to Gemini Files API (REUTILIZAR de process-edital)
  const geminiFileName = await uploadToGoogleFiles(base64Data, file_name, mimeType)

  // 6. Wait for ACTIVE
  await waitForFileActive(geminiFileName)

  // 7. Process content based on type
  let extractedText = ''
  switch (media_type) {
    case 'image':
      extractedText = await processImageOCR(geminiFileName)
      break
    case 'audio':
      extractedText = await processAudioTranscription(geminiFileName)
      break
    case 'document':
      extractedText = await processPDFExtraction(geminiFileName)
      break
  }

  // 8. Save to file_search_documents
  const documentId = await saveDocumentReference(
    supabase,
    message.user_id,
    geminiFileName,
    file_name,
    buffer.length,
    {
      source: 'whatsapp',
      contact_id: contact_id,
      contact_name: message.contact_network.name,
      message_id: message_id,
      message_timestamp: message.message_timestamp,
      media_type: media_type,
      extracted_text_preview: extractedText.substring(0, 500)
    }
  )

  // 9. Update whatsapp_messages
  await supabase
    .from('whatsapp_messages')
    .update({
      document_processed: true,
      gemini_file_name: geminiFileName,
      file_search_document_id: documentId
    })
    .eq('id', message_id)

  // 10. Return success
  return new Response(JSON.stringify({
    success: true,
    gemini_file_name: geminiFileName,
    document_id: documentId,
    extracted_text: extractedText.substring(0, 200) // Preview
  }))
})
```

---

### Phase 2: Integrar Webhook

**Arquivo**: `supabase/functions/webhook-evolution/index.ts`

**Adicionar após linha 1583** (depois de salvar mensagem):

```typescript
// Check if message has media attachment
const hasMedia = ['image', 'audio', 'video', 'document'].includes(messageType)

if (hasMedia && mediaUrl) {
  log('INFO', 'Message has media, queuing for processing', {
    messageId: storedMessage.id,
    mediaType: messageType
  })

  // Fire-and-forget: Process document asynchronously
  supabase.functions.invoke('process-whatsapp-document', {
    body: {
      message_id: storedMessage.id,
      contact_id: contactId,
      media_url: mediaUrl,
      media_type: messageType,
      file_name: message.documentMessage?.fileName ||
                 `${messageType}_${Date.now()}.${getExtension(messageType)}`
    }
  }).then(() => {
    log('INFO', 'Document processing queued', { messageId: storedMessage.id })
  }).catch((err) => {
    log('WARN', 'Failed to queue document processing (non-critical)', err)
  })
}
```

---

### Phase 3: Frontend Integration

#### 1. Busca no Journey
**Arquivo**: `src/modules/journey/hooks/useJourneyFileSearch.ts`

**Já suporta múltiplos módulos!** Nenhuma mudança necessária:
```typescript
// Busca automática inclui whatsapp documents
const results = await searchInDocuments('contrato', 10)
// Retorna documentos de todos os módulos (grants, whatsapp, etc)
```

#### 2. Timeline Display
**Arquivo**: `src/modules/journey/components/timeline/TimelineEventCard.tsx`

**Adicionar caso para documentos WhatsApp:**
```typescript
if (event.source === 'whatsapp' && event.file_search_document_id) {
  return (
    <div className="timeline-event whatsapp-document">
      <FileIcon className="icon" />
      <div>
        <strong>Documento de {event.contact_name}</strong>
        <p>{event.extracted_text_preview}</p>
        <button onClick={() => openDocument(event.gemini_file_name)}>
          Ver documento
        </button>
      </div>
    </div>
  )
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// supabase/functions/process-whatsapp-document/test.ts

describe('processWhatsAppDocument', () => {
  it('should download and process PDF', async () => {
    const result = await invoke({
      message_id: 'test-123',
      media_type: 'document',
      media_url: 'https://example.com/test.pdf'
    })

    expect(result.success).toBe(true)
    expect(result.gemini_file_name).toMatch(/^files\//)
  })

  it('should extract text from image via OCR', async () => {
    const result = await invoke({
      message_id: 'test-456',
      media_type: 'image',
      media_url: 'https://example.com/test.jpg'
    })

    expect(result.extracted_text).toBeTruthy()
  })
})
```

### Integration Tests
```sql
-- Test data setup
INSERT INTO whatsapp_messages (user_id, contact_id, message_text, media_type, media_url)
VALUES ('test-user', 'test-contact', 'Segue contrato', 'document', 'https://test.com/contract.pdf');

-- Verify processing
SELECT
  wm.id,
  wm.document_processed,
  wm.gemini_file_name,
  fsd.gemini_file_name,
  fsd.metadata->>'contact_name' AS contact_name
FROM whatsapp_messages wm
LEFT JOIN file_search_documents fsd ON wm.file_search_document_id = fsd.id
WHERE wm.id = 'test-message-id';
```

### E2E Test Flow
1. Send PDF via WhatsApp (via Evolution API test interface)
2. Webhook receives message → saves to whatsapp_messages
3. process-whatsapp-document processes → creates file_search_document
4. Journey search finds document: `searchInDocuments('contrato')`
5. Timeline shows document event with preview

---

## Performance Considerations

### Processing Time Estimates
- **PDF (10 pages)**: ~5-10s (upload 2s + active wait 3s + extraction 5s)
- **Image OCR**: ~3-5s (upload 1s + active wait 1s + OCR 3s)
- **Audio transcription**: ~10-20s (upload 2s + active wait 3s + transcribe 15s)

### Rate Limits
- **Gemini Files API**: 1500 requests/min (generous)
- **File Search queries**: 60 queries/min (sufficient)

### Optimization Strategies
1. **Queue processing** - Use Supabase pg_cron for batch processing
2. **Deduplication** - Check if file already processed (hash media_url)
3. **Lazy loading** - Only process when user searches, not immediately

---

## Security & Privacy (LGPD)

### Data Retention
```sql
-- Auto-delete processed files after 30 days
CREATE OR REPLACE FUNCTION delete_old_whatsapp_documents()
RETURNS void AS $$
BEGIN
  DELETE FROM file_search_documents
  WHERE module_type = 'whatsapp'
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron
SELECT cron.schedule(
  'delete-old-whatsapp-docs',
  '0 2 * * *',  -- Daily at 2 AM
  'SELECT delete_old_whatsapp_documents()'
);
```

### User Consent
- **Opt-in required**: User must send keyword "indexar" to enable document processing
- **Opt-out available**: Send "parar indexação" to disable
- **Transparent**: Show which documents are indexed in settings

---

## Rollout Plan

### Week 1: Foundation
- ✅ Fix process-edital (DONE - commit c220b2a)
- ✅ Schema migration (whatsapp_messages media fields)
- ✅ Create process-whatsapp-document Edge Function (PDF only)

### Week 2: Media Support
- ✅ Implement image OCR (Gemini Vision)
- ✅ Implement audio transcription (Gemini or Whisper)
- ✅ Test with real WhatsApp messages

### Week 3: Frontend Integration
- ✅ Journey search shows WhatsApp documents
- ✅ Timeline displays document events
- ✅ Document viewer modal

### Week 4: Polish & Launch
- ✅ User consent workflow
- ✅ Settings page (manage indexed docs)
- ✅ E2E tests
- ✅ Production deployment

---

## Success Metrics

- ✅ **Processing success rate**: >95% of documents processed without error
- ✅ **Search accuracy**: Users find documents with natural language queries
- ✅ **Performance**: <10s average processing time per document
- ✅ **User adoption**: 30% of WhatsApp users send at least 1 document/week

---

## Monitoring & Alerts

```sql
-- Dashboard queries

-- Processing health
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total_messages,
  COUNT(*) FILTER (WHERE media_type IS NOT NULL) AS media_messages,
  COUNT(*) FILTER (WHERE document_processed = TRUE) AS processed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE document_processed = TRUE) /
        NULLIF(COUNT(*) FILTER (WHERE media_type IS NOT NULL), 0), 1) AS success_rate
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- Search usage
SELECT
  module_type,
  COUNT(*) AS documents,
  SUM((metadata->>'extracted_text_preview')::text IS NOT NULL) AS with_text
FROM file_search_documents
WHERE module_type = 'whatsapp'
GROUP BY module_type;
```

---

## Next Steps

**IMMEDIATE ACTION REQUIRED:**
1. Verify GEMINI_API_KEY is configured in Supabase Dashboard
2. Deploy fixed process-edital: `npx supabase functions deploy process-edital`
3. Test edital PDF upload to confirm infrastructure working
4. Proceed with Phase 1 (create process-whatsapp-document)

Once process-edital is working, RAG implementation is straightforward (reuse 80% of code).
