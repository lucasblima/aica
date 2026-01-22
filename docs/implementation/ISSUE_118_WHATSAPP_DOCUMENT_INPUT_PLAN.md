# Issue #118 - WhatsApp Input de Documentos

## Plano de Implementacao Detalhado

**Epic:** #113 - File Processing Pipeline
**Data:** 2026-01-22
**Arquiteto:** Master Architect & Planner Agent

---

## 1. Resumo Executivo

A Issue #118 implementa a integracao do WhatsApp como canal de input de documentos para o File Pipeline existente. Esta feature permite que usuarios enviem documentos (PDF, imagens, audio, video) via WhatsApp e tenham processamento automatico com classificacao, extracao e indexacao semantica.

**Objetivos principais:**
1. **Handler de midia no webhook** - Detectar e baixar arquivos enviados via WhatsApp
2. **Upload automatico para Storage** - Armazenar documentos no bucket `whatsapp-documents`
3. **Integracao com File Pipeline** - Disparar processamento automatico (process-document)
4. **Fluxo conversacional** - Responder usuario com resultado e solicitar vinculacao
5. **Comandos de texto** - `/docs`, `/contexto`, `/gerar` para interacao avancada

---

## 2. Contexto Existente (Assets Reutilizaveis)

### 2.1 File Pipeline Completo (Issues #114, #115, #116)

```
Arquivos existentes:
- supabase/functions/process-document/index.ts      # Processamento principal
- supabase/functions/search-documents/index.ts      # Busca semantica RAG
- supabase/migrations/20260112000001_create_document_processing.sql

Funcionalidades disponiveis:
- Extracao de texto via Gemini Vision (PDF, PPTX, DOCX, imagens)
- Classificacao automatica de documento (projeto_rouanet, estatuto, etc.)
- Chunking e geracao de embeddings (text-embedding-004)
- Busca semantica por similaridade (pgvector)
- Sugestoes de vinculacao a organizacoes/projetos
```

### 2.2 Multi-Instance WhatsApp Architecture (Epic #122)

```
Arquivos existentes:
- supabase/functions/webhook-evolution/index.ts     # Webhook principal
- supabase/functions/_shared/evolution-client.ts    # Cliente Evolution API
- supabase/migrations/20260113_whatsapp_sessions_multi_instance.sql
- supabase/migrations/20260114000004_whatsapp_pending_actions.sql

Funcionalidades disponiveis:
- Multi-instance por usuario (aica_<user_id>)
- Webhook com HMAC-SHA256 validation
- Roteamento de eventos por instancia
- Rate limiting e retry logic
- Fluxo de pending actions (confirmacao via WhatsApp)
- Integracao com contact_network
```

### 2.3 Schema de Documentos Ja Preparado

A tabela `processed_documents` ja possui colunas para WhatsApp:
```sql
source TEXT DEFAULT 'web' CHECK (source IN ('web', 'whatsapp', 'email'))
source_phone TEXT
whatsapp_message_id TEXT

CREATE INDEX idx_processed_documents_whatsapp
  ON processed_documents(source_phone, whatsapp_message_id)
  WHERE source = 'whatsapp';
```

### 2.4 Pending Actions Framework

A tabela `whatsapp_pending_actions` ja suporta:
```sql
action_type TEXT CHECK (action_type IN (
  'register_organization',
  'update_organization',
  'create_task',
  'schedule_reminder'
))
```
**Novo tipo necessario:** `'process_document'`

---

## 3. Arquitetura Proposta

### 3.1 Diagrama de Fluxo Completo

```
+---------------------------------------------------------------------+
|                      USUARIO WHATSAPP                                |
+---------------------------------------------------------------------+
                              |
                              | 1. Envia documento (PDF, imagem, audio)
                              v
+---------------------------------------------------------------------+
|                      EVOLUTION API                                   |
|   - Recebe midia                                                     |
|   - Armazena temporariamente                                         |
|   - Dispara webhook com mediaUrl/base64                              |
+---------------------------------------------------------------------+
                              |
                              | 2. Webhook event: messages.upsert (media)
                              v
+---------------------------------------------------------------------+
|                  WEBHOOK-EVOLUTION (Enhanced)                        |
+---------------------------------------------------------------------+
|                                                                      |
|  +--------------------+    +------------------------+                |
|  | handleMessagesUpsert|   | handleMediaMessage     |  <- NOVO       |
|  +--------------------+    +------------------------+                |
|           |                         |                                |
|           |  (text msg)             | (media msg)                    |
|           v                         v                                |
|  +--------------------+    +------------------------+                |
|  | Processa texto     |    | 1. Baixa midia da      |                |
|  | (existente)        |    |    Evolution API       |                |
|  +--------------------+    | 2. Upload para Storage |                |
|                            | 3. Envia "Processando" |                |
|                            | 4. Chama process-doc   |                |
|                            | 5. Envia resultado     |                |
|                            | 6. Cria pending action |                |
|                            +------------------------+                |
|                                      |                               |
+---------------------------------------------------------------------+
                              |
                              | 3. Chama Edge Function
                              v
+---------------------------------------------------------------------+
|                  PROCESS-DOCUMENT (Existente)                        |
|   - Extrai texto (Gemini Vision)                                     |
|   - Classifica documento                                             |
|   - Gera chunks e embeddings                                         |
|   - Sugere vinculacoes                                               |
+---------------------------------------------------------------------+
                              |
                              | 4. Retorna resultado
                              v
+---------------------------------------------------------------------+
|                  WEBHOOK-EVOLUTION (Response)                        |
|   - Formata mensagem de resultado                                    |
|   - Envia via Evolution API sendText                                 |
|   - Cria pending action para vinculacao                              |
+---------------------------------------------------------------------+
                              |
                              | 5. Usuario responde (opcional)
                              v
+---------------------------------------------------------------------+
|                  FLUXO CONVERSACIONAL                                |
|   "Vincular a qual organizacao?"                                     |
|   1) Org A  2) Org B  3) Ignorar                                     |
|   -> Usuario responde "1"                                            |
|   -> Sistema vincula e confirma                                      |
+---------------------------------------------------------------------+
```

### 3.2 Componentes Envolvidos

| Componente | Tipo | Acao |
|------------|------|------|
| `webhook-evolution/index.ts` | Edge Function | **MODIFICAR** - Adicionar handler de midia |
| `_shared/whatsapp-media-handler.ts` | Shared Module | **CRIAR** - Logica de download/upload |
| `_shared/whatsapp-document-processor.ts` | Shared Module | **CRIAR** - Orquestrador do fluxo |
| `process-document/index.ts` | Edge Function | **EXISTENTE** - Ja suporta source='whatsapp' |
| Storage bucket `whatsapp-documents` | Supabase Storage | **CRIAR** - Novo bucket |
| Migration `whatsapp_document_tracking` | SQL | **CRIAR** - Tracking adicional |

### 3.3 Tipos de Arquivo Suportados

| Tipo WhatsApp | MIME Type | File Pipeline Type | Processamento |
|---------------|-----------|-------------------|---------------|
| `documentMessage` | `application/pdf` | `pdf` | Extracao texto direto |
| `documentMessage` | `application/vnd.openxmlformats...` | `docx`/`pptx` | Extracao texto direto |
| `imageMessage` | `image/jpeg`, `image/png` | `image` | OCR via Gemini Vision |
| `audioMessage` | `audio/ogg`, `audio/mp4` | *futuro* | Transcricao (v2) |
| `videoMessage` | `video/mp4` | *futuro* | Frame extraction (v2) |

---

## 4. Delegacao de Agentes

### 4.1 Matriz de Delegacao

| Componente | Agente Responsavel | Skills Necessarias |
|------------|-------------------|-------------------|
| Storage bucket + migration | `backend-architect-supabase` | Supabase Storage, SQL |
| Media handler module | `backend-architect-supabase` | Evolution API, Deno |
| Webhook enhancement | `backend-architect-supabase` | Edge Functions, HMAC |
| Fluxo conversacional | `ai-integration-specialist` | Prompt engineering |
| Comandos de texto | `ai-integration-specialist` | NLU, Intent detection |
| Testes E2E | `testing-qa-playwright` | Playwright, mocks |
| Coordenacao Geral | `master-architect-planner` | Architecture |

### 4.2 Responsabilidades Detalhadas

#### Agent: `backend-architect-supabase`
```
Entrega 1: Storage bucket whatsapp-documents com RLS policies
Entrega 2: Migration para tracking de documentos WhatsApp
Entrega 3: Shared module _shared/whatsapp-media-handler.ts
Entrega 4: Shared module _shared/whatsapp-document-processor.ts
Entrega 5: Modificacao webhook-evolution para suportar midia
Entrega 6: Integracao com process-document existente
```

#### Agent: `ai-integration-specialist`
```
Entrega 1: Prompts para resposta conversacional
Entrega 2: Intent detection para comandos de texto
Entrega 3: Fluxo de vinculacao com opcoes
Entrega 4: Mensagens de erro amigaveis
```

#### Agent: `testing-qa-playwright`
```
Entrega 1: Mock server para Evolution API
Entrega 2: Testes de integracao do fluxo completo
Entrega 3: Testes de edge cases (timeout, erro de download)
```

---

## 5. Task Breakdown (Checklist Executavel)

### Fase 1: Infraestrutura (Backend)
**Agente:** `backend-architect-supabase`
**Tempo Estimado:** 4 horas

- [ ] **1.1** Criar storage bucket `whatsapp-documents`
  ```bash
  # Via Supabase Dashboard ou SQL
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('whatsapp-documents', 'whatsapp-documents', false);
  ```
  - Criar RLS policy: usuarios acessam apenas proprios arquivos
  - Configurar limite de tamanho (25MB por arquivo)
  - Configurar tipos MIME permitidos

- [ ] **1.2** Criar migration `20260122000001_whatsapp_document_tracking.sql`
  ```sql
  -- Adicionar novo action_type para pending_actions
  ALTER TABLE whatsapp_pending_actions
  DROP CONSTRAINT IF EXISTS whatsapp_pending_actions_action_type_check;

  ALTER TABLE whatsapp_pending_actions
  ADD CONSTRAINT whatsapp_pending_actions_action_type_check
  CHECK (action_type IN (
    'register_organization',
    'update_organization',
    'create_task',
    'schedule_reminder',
    'process_document',      -- NOVO
    'link_document'          -- NOVO
  ));

  -- Tabela para tracking de midia recebida
  CREATE TABLE IF NOT EXISTS whatsapp_media_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    instance_name TEXT NOT NULL,
    media_type TEXT NOT NULL,
    media_key TEXT,
    original_filename TEXT,
    mime_type TEXT,
    file_size_bytes INTEGER,
    storage_path TEXT,
    download_status TEXT DEFAULT 'pending',
    processing_status TEXT DEFAULT 'pending',
    processed_document_id UUID REFERENCES processed_documents(id),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
  );

  CREATE INDEX idx_whatsapp_media_user ON whatsapp_media_tracking(user_id);
  CREATE INDEX idx_whatsapp_media_status ON whatsapp_media_tracking(download_status, processing_status);
  ```

- [ ] **1.3** Configurar CORS e policies no bucket
  - Apenas authenticated users podem fazer upload
  - Service role pode fazer download para processamento
  - Path pattern: `{user_id}/{timestamp}_{filename}`

**Criterios de Aceite:**
- [ ] Bucket criado e acessivel via Supabase client
- [ ] Migration aplicada sem erros
- [ ] RLS policies funcionando (testadas via SQL)

---

### Fase 2: Media Handler Module
**Agente:** `backend-architect-supabase`
**Tempo Estimado:** 6 horas

- [ ] **2.1** Criar `supabase/functions/_shared/whatsapp-media-handler.ts`
  ```typescript
  /**
   * WhatsApp Media Handler
   * Downloads media from Evolution API and uploads to Supabase Storage
   */

  export interface MediaInfo {
    url: string
    mimetype: string
    filename?: string
    fileLength?: number
    base64?: string
  }

  export interface DownloadResult {
    success: boolean
    storagePath?: string
    mimeType?: string
    sizeBytes?: number
    error?: string
  }

  export async function downloadMediaFromEvolution(
    instanceName: string,
    messageKey: { id: string, remoteJid: string },
    mediaType: 'document' | 'image' | 'audio' | 'video'
  ): Promise<{ data: ArrayBuffer, mimeType: string } | null>

  export async function uploadToStorage(
    supabase: SupabaseClient,
    userId: string,
    data: ArrayBuffer,
    filename: string,
    mimeType: string
  ): Promise<DownloadResult>

  export function determineFileType(mimeType: string): 'pdf' | 'docx' | 'pptx' | 'image' | null

  export function generateStoragePath(userId: string, filename: string): string
  ```

- [ ] **2.2** Implementar download via Evolution API
  ```typescript
  // Evolution API endpoint para download de midia
  // POST /chat/getBase64FromMediaMessage/{instanceName}
  async function downloadMediaFromEvolution(...) {
    const response = await fetch(
      `${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          key: {
            id: messageKey.id,
            remoteJid: messageKey.remoteJid,
          },
        }),
      }
    )
    // Decode base64 to ArrayBuffer
    // Return with mimeType
  }
  ```

- [ ] **2.3** Implementar upload para Storage
  ```typescript
  async function uploadToStorage(...) {
    const path = generateStoragePath(userId, filename)
    const { data, error } = await supabase.storage
      .from('whatsapp-documents')
      .upload(path, data, {
        contentType: mimeType,
        upsert: false,
      })
    // Handle errors
    // Return result with storage path
  }
  ```

- [ ] **2.4** Implementar tracking em `whatsapp_media_tracking`
  ```typescript
  async function trackMediaDownload(
    supabase: SupabaseClient,
    userId: string,
    messageId: string,
    instanceName: string,
    mediaInfo: MediaInfo
  ): Promise<string>  // Returns tracking ID

  async function updateTrackingStatus(
    supabase: SupabaseClient,
    trackingId: string,
    status: 'downloaded' | 'processing' | 'completed' | 'failed',
    details?: { storagePath?: string, documentId?: string, error?: string }
  ): Promise<void>
  ```

**Criterios de Aceite:**
- [ ] Download de midia da Evolution API funcionando
- [ ] Upload para storage com path correto
- [ ] Tracking de status em tabela
- [ ] Tratamento de erros (timeout, arquivo grande)

---

### Fase 3: Webhook Enhancement
**Agente:** `backend-architect-supabase`
**Tempo Estimado:** 8 horas

- [ ] **3.1** Criar `supabase/functions/_shared/whatsapp-document-processor.ts`
  ```typescript
  /**
   * WhatsApp Document Processor
   * Orchestrates the full document processing flow
   */

  export interface ProcessDocumentResult {
    success: boolean
    documentId?: string
    detectedType?: string
    confidence?: number
    extractedFields?: Record<string, unknown>
    linkSuggestions?: Array<{
      entityType: string
      entityId: string
      entityName: string
    }>
    error?: string
  }

  export async function processWhatsAppDocument(
    supabase: SupabaseClient,
    userId: string,
    storagePath: string,
    fileType: 'pdf' | 'docx' | 'pptx' | 'image',
    sourcePhone: string,
    messageId: string
  ): Promise<ProcessDocumentResult>

  export function formatResultMessage(result: ProcessDocumentResult): string

  export function formatLinkingQuestion(
    result: ProcessDocumentResult,
    existingOrgs: Array<{ id: string, name: string }>
  ): string
  ```

- [ ] **3.2** Modificar `handleMessagesUpsert` em webhook-evolution
  ```typescript
  // Adicionar deteccao de mensagens com midia
  async function handleMessagesUpsert(...) {
    const messageData = eventData.data
    const messageType = getMessageType(messageData.message)

    // Roteamento baseado em tipo
    if (messageType === 'text') {
      await handleTextMessage(...)
    } else if (['document', 'image'].includes(messageType)) {
      await handleMediaMessage(supabase, userId, instanceName, messageData, messageType)
    } else if (['audio', 'video'].includes(messageType)) {
      // V2: audio/video transcription
      await sendWhatsAppMessage(instanceName, remoteJid,
        'Audio e video serao suportados em breve! Por enquanto, envie documentos ou imagens.')
    }
  }
  ```

- [ ] **3.3** Implementar `handleMediaMessage`
  ```typescript
  async function handleMediaMessage(
    supabase: SupabaseClient,
    userId: string,
    instanceName: string,
    messageData: MessageData,
    mediaType: 'document' | 'image'
  ): Promise<void> {
    const remoteJid = messageData.key.remoteJid
    const contactPhone = jidToPhone(remoteJid)

    // 1. Enviar mensagem de "processando"
    await sendWhatsAppMessage(instanceName, remoteJid,
      'Recebi seu documento! Processando...')

    // 2. Criar tracking record
    const trackingId = await trackMediaDownload(...)

    // 3. Baixar midia da Evolution API
    const downloadResult = await downloadMediaFromEvolution(
      instanceName,
      messageData.key,
      mediaType
    )

    if (!downloadResult) {
      await sendWhatsAppMessage(instanceName, remoteJid,
        'Nao consegui baixar o arquivo. Tente enviar novamente.')
      await updateTrackingStatus(supabase, trackingId, 'failed', { error: 'Download failed' })
      return
    }

    // 4. Upload para Storage
    const uploadResult = await uploadToStorage(
      supabase,
      userId,
      downloadResult.data,
      getFilename(messageData),
      downloadResult.mimeType
    )

    if (!uploadResult.success) {
      await sendWhatsAppMessage(instanceName, remoteJid,
        'Erro ao salvar o arquivo. Tente novamente.')
      await updateTrackingStatus(supabase, trackingId, 'failed', { error: uploadResult.error })
      return
    }

    // 5. Chamar process-document
    await updateTrackingStatus(supabase, trackingId, 'processing', { storagePath: uploadResult.storagePath })

    const fileType = determineFileType(downloadResult.mimeType)
    const result = await processWhatsAppDocument(
      supabase,
      userId,
      uploadResult.storagePath!,
      fileType!,
      contactPhone,
      messageData.key.id
    )

    // 6. Enviar resultado
    const resultMessage = formatResultMessage(result)
    await sendWhatsAppMessage(instanceName, remoteJid, resultMessage)

    // 7. Se sucesso, criar pending action para vinculacao
    if (result.success && result.linkSuggestions?.length) {
      await createLinkingPendingAction(
        supabase,
        userId,
        contactPhone,
        remoteJid,
        instanceName,
        result
      )

      // Enviar opcoes de vinculacao
      const linkQuestion = formatLinkingQuestion(result, existingOrgs)
      await sendWhatsAppMessage(instanceName, remoteJid, linkQuestion)
    }

    // 8. Atualizar tracking
    await updateTrackingStatus(supabase, trackingId,
      result.success ? 'completed' : 'failed',
      { documentId: result.documentId, error: result.error }
    )
  }
  ```

- [ ] **3.4** Implementar chamada ao process-document
  ```typescript
  async function processWhatsAppDocument(...): Promise<ProcessDocumentResult> {
    try {
      // Chamar Edge Function process-document
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: {
          storage_path: storagePath,
          file_type: fileType,
          source: 'whatsapp',
          source_phone: sourcePhone,
          whatsapp_message_id: messageId,
        },
      })

      if (error) throw error

      return {
        success: true,
        documentId: data.document_id,
        detectedType: data.detected_type,
        confidence: data.confidence,
        extractedFields: data.extracted_fields,
        linkSuggestions: data.link_suggestions,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }
  ```

- [ ] **3.5** Implementar pending action para vinculacao
  ```typescript
  async function createLinkingPendingAction(
    supabase: SupabaseClient,
    userId: string,
    contactPhone: string,
    remoteJid: string,
    instanceName: string,
    result: ProcessDocumentResult
  ): Promise<void> {
    await supabase.from('whatsapp_pending_actions').insert({
      user_id: userId,
      contact_phone: contactPhone,
      remote_jid: remoteJid,
      instance_name: instanceName,
      source_message_id: /* ... */,
      action_type: 'link_document',
      action_payload: {
        document_id: result.documentId,
        detected_type: result.detectedType,
        link_suggestions: result.linkSuggestions,
      },
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  }
  ```

**Criterios de Aceite:**
- [ ] Webhook detecta mensagens com midia
- [ ] Download e upload funcionam end-to-end
- [ ] process-document e chamado corretamente
- [ ] Mensagens de status enviadas ao usuario
- [ ] Pending action criada para vinculacao

---

### Fase 4: Fluxo Conversacional
**Agente:** `ai-integration-specialist`
**Tempo Estimado:** 4 horas

- [ ] **4.1** Implementar respostas de status
  ```typescript
  // Mensagens padrao
  const MESSAGES = {
    PROCESSING: 'Recebi seu documento! Processando...',
    SUCCESS: (type: string, confidence: number) =>
      `Documento processado!\n\n` +
      `Tipo detectado: *${type}*\n` +
      `Confianca: ${(confidence * 100).toFixed(0)}%`,
    ERROR: 'Nao consegui processar o documento. Verifique se o arquivo esta legivel.',
    TIMEOUT: 'O processamento esta demorando mais que o esperado. Voce sera notificado quando concluir.',
  }
  ```

- [ ] **4.2** Implementar formatacao de resultado
  ```typescript
  function formatResultMessage(result: ProcessDocumentResult): string {
    if (!result.success) {
      return MESSAGES.ERROR
    }

    let message = MESSAGES.SUCCESS(result.detectedType!, result.confidence!)

    // Adicionar campos extraidos relevantes
    const fields = result.extractedFields || {}
    if (fields.pronac) message += `\nPRONAC: ${fields.pronac}`
    if (fields.cnpj) message += `\nCNPJ: ${fields.cnpj}`
    if (fields.valor_aprovado) message += `\nValor: R$ ${formatCurrency(fields.valor_aprovado)}`

    return message
  }
  ```

- [ ] **4.3** Implementar pergunta de vinculacao
  ```typescript
  function formatLinkingQuestion(
    result: ProcessDocumentResult,
    existingOrgs: Array<{ id: string, name: string }>
  ): string {
    let message = '\nVincular a qual organizacao?\n'

    // Primeiro, sugestoes do AI
    if (result.linkSuggestions?.length) {
      message += '\n*Sugestoes automaticas:*\n'
      result.linkSuggestions.forEach((s, i) => {
        message += `${i + 1}) ${s.entityName}\n`
      })
    }

    // Depois, outras organizacoes do usuario
    const otherOrgs = existingOrgs.filter(
      o => !result.linkSuggestions?.some(s => s.entityId === o.id)
    )
    if (otherOrgs.length) {
      message += '\n*Outras organizacoes:*\n'
      otherOrgs.forEach((o, i) => {
        const num = (result.linkSuggestions?.length || 0) + i + 1
        message += `${num}) ${o.name}\n`
      })
    }

    message += '\n0) Ignorar vinculacao'
    message += '\n\n_Responda com o numero da opcao_'

    return message
  }
  ```

- [ ] **4.4** Implementar handler de resposta de vinculacao
  ```typescript
  // Em checkPendingActionResponse (webhook-evolution)
  async function handleLinkDocumentResponse(
    supabase: SupabaseClient,
    pendingAction: PendingAction,
    responseText: string
  ): Promise<{ handled: boolean, response?: string }> {
    const choice = parseInt(responseText.trim())

    if (isNaN(choice)) {
      return { handled: false }
    }

    if (choice === 0) {
      // Usuario ignorou vinculacao
      await supabase.from('whatsapp_pending_actions')
        .update({ status: 'rejected' })
        .eq('id', pendingAction.id)

      return {
        handled: true,
        response: 'OK! O documento foi salvo sem vinculacao.'
      }
    }

    // Vincular a organizacao selecionada
    const payload = pendingAction.action_payload
    const suggestions = payload.link_suggestions || []

    if (choice > 0 && choice <= suggestions.length) {
      const selected = suggestions[choice - 1]

      // Atualizar documento com organizacao
      await supabase.from('processed_documents')
        .update({ organization_id: selected.entityId })
        .eq('id', payload.document_id)

      // Confirmar sugestao de link
      await supabase.from('document_link_suggestions')
        .update({ is_confirmed: true, confirmed_at: new Date().toISOString() })
        .eq('document_id', payload.document_id)
        .eq('entity_id', selected.entityId)

      // Atualizar pending action
      await supabase.from('whatsapp_pending_actions')
        .update({
          status: 'completed',
          result_data: { linked_to: selected.entityId, entity_name: selected.entityName }
        })
        .eq('id', pendingAction.id)

      return {
        handled: true,
        response: `Documento vinculado a *${selected.entityName}*!`
      }
    }

    return { handled: false }
  }
  ```

**Criterios de Aceite:**
- [ ] Mensagens formatadas corretamente
- [ ] Opcoes de vinculacao apresentadas
- [ ] Resposta numerica processada
- [ ] Documento vinculado corretamente

---

### Fase 5: Comandos de Texto (Opcional)
**Agente:** `ai-integration-specialist`
**Tempo Estimado:** 4 horas

- [ ] **5.1** Implementar deteccao de comandos
  ```typescript
  function detectCommand(text: string): { command: string, args: string[] } | null {
    const commands = ['/docs', '/contexto', '/gerar', '/help']
    const normalized = text.trim().toLowerCase()

    for (const cmd of commands) {
      if (normalized.startsWith(cmd)) {
        const args = normalized.slice(cmd.length).trim().split(/\s+/).filter(a => a)
        return { command: cmd, args }
      }
    }

    return null
  }
  ```

- [ ] **5.2** Implementar `/docs` - Listar documentos
  ```typescript
  async function handleDocsCommand(
    supabase: SupabaseClient,
    userId: string,
    args: string[]
  ): Promise<string> {
    // Se tem argumento, filtrar por organizacao
    let query = supabase
      .from('processed_documents')
      .select('id, original_name, detected_type, created_at')
      .eq('user_id', userId)
      .eq('source', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(10)

    if (args[0]) {
      // Buscar organizacao por nome
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .ilike('name', `%${args[0]}%`)
        .single()

      if (org) {
        query = query.eq('organization_id', org.id)
      }
    }

    const { data: docs } = await query

    if (!docs?.length) {
      return 'Nenhum documento encontrado.'
    }

    let message = '*Seus documentos recentes:*\n\n'
    docs.forEach((doc, i) => {
      const date = new Date(doc.created_at).toLocaleDateString('pt-BR')
      message += `${i + 1}. ${doc.original_name}\n   Tipo: ${doc.detected_type || 'N/A'} | ${date}\n\n`
    })

    return message
  }
  ```

- [ ] **5.3** Implementar `/contexto` - Buscar contexto RAG
  ```typescript
  async function handleContextoCommand(
    supabase: SupabaseClient,
    userId: string,
    args: string[]
  ): Promise<string> {
    if (!args.length) {
      return 'Uso: /contexto [pergunta]\nExemplo: /contexto qual o valor do projeto?'
    }

    const query = args.join(' ')

    // Chamar search-documents
    const { data, error } = await supabase.functions.invoke('search-documents', {
      body: { query, limit: 3 }
    })

    if (error || !data?.results?.length) {
      return 'Nao encontrei informacoes relevantes nos seus documentos.'
    }

    let message = `*Contexto encontrado para:* "${query}"\n\n`

    data.results.forEach((result: any, i: number) => {
      message += `---\n`
      message += `*${result.document_name}* (${(result.similarity * 100).toFixed(0)}% relevante)\n`
      message += `${result.chunk_text.substring(0, 300)}...\n\n`
    })

    return message
  }
  ```

- [ ] **5.4** Implementar `/help`
  ```typescript
  function getHelpMessage(): string {
    return `*Comandos disponiveis:*\n\n` +
      `/docs - Lista documentos recentes\n` +
      `/docs [org] - Documentos de uma organizacao\n` +
      `/contexto [pergunta] - Busca semantica nos documentos\n` +
      `/help - Esta mensagem\n\n` +
      `*Dica:* Envie qualquer documento (PDF, imagem) para processamento automatico!`
  }
  ```

**Criterios de Aceite:**
- [ ] Comandos detectados corretamente
- [ ] `/docs` lista documentos
- [ ] `/contexto` retorna resultados RAG
- [ ] `/help` mostra instrucoes

---

### Fase 6: Testes e Validacao
**Agente:** `testing-qa-playwright`
**Tempo Estimado:** 6 horas

- [ ] **6.1** Criar mock server para Evolution API
  ```typescript
  // tests/mocks/evolution-api-mock.ts
  export function createEvolutionApiMock() {
    return {
      '/chat/getBase64FromMediaMessage/:instance': (req) => ({
        base64: 'JVBERi0xLjQKJ...', // PDF base64 sample
        mimeType: 'application/pdf'
      }),
      '/message/sendText/:instance': (req) => ({
        key: { id: 'msg_123' },
        status: 'sent'
      })
    }
  }
  ```

- [ ] **6.2** Testes de integracao
  ```typescript
  // tests/integration/whatsapp-document-input.test.ts
  describe('WhatsApp Document Input', () => {
    test('processa PDF enviado via WhatsApp', async () => {
      // 1. Simular webhook com documentMessage
      // 2. Verificar download chamado
      // 3. Verificar upload no storage
      // 4. Verificar process-document chamado
      // 5. Verificar mensagem de resposta
      // 6. Verificar pending action criada
    })

    test('trata erro de download graciosamente', async () => {})
    test('trata timeout de processamento', async () => {})
    test('vincula documento apos confirmacao', async () => {})
    test('ignora vinculacao quando usuario responde 0', async () => {})
  })
  ```

- [ ] **6.3** Teste end-to-end manual
  ```
  Checklist de teste manual:
  [ ] Enviar PDF via WhatsApp
  [ ] Verificar mensagem "Processando..."
  [ ] Verificar mensagem com resultado
  [ ] Responder com numero para vincular
  [ ] Verificar documento no app web
  [ ] Testar comando /docs
  [ ] Testar comando /contexto
  ```

**Criterios de Aceite:**
- [ ] Todos os testes passando
- [ ] Cobertura > 80% do novo codigo
- [ ] Teste manual documentado

---

## 6. Riscos Tecnicos e Mitigacoes

### 6.1 Risco: Timeout no Download de Midia

**Problema:** Evolution API pode demorar para retornar midia grande (>5MB).

**Mitigacao:**
1. Implementar timeout configuravel (30s padrao)
2. Notificar usuario se demorar: "Processando arquivo grande..."
3. Background processing com notificacao posterior
4. Limite de tamanho (25MB)

```typescript
const DOWNLOAD_TIMEOUT_MS = 30000
const response = await Promise.race([
  downloadMediaFromEvolution(...),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), DOWNLOAD_TIMEOUT_MS)
  )
])
```

### 6.2 Risco: Rate Limit da Evolution API

**Problema:** Muitos downloads simultaneos podem atingir rate limit.

**Mitigacao:**
1. Queue com pgmq para serializar downloads
2. Retry com exponential backoff
3. Rate limit tracking por instancia
4. Fallback: notificar usuario para reenviar depois

### 6.3 Risco: Falha no Processamento do Documento

**Problema:** Gemini pode falhar ou retornar erro.

**Mitigacao:**
1. Retry logic ja implementada em process-document
2. Mensagem de erro amigavel para usuario
3. Tracking de erros em `whatsapp_media_tracking`
4. Alertas para erros frequentes

### 6.4 Risco: Mensagens Duplicadas

**Problema:** Evolution API pode enviar mesmo evento multiplas vezes.

**Mitigacao:**
1. Deduplicacao por `message_id` em `whatsapp_media_tracking`
2. Constraint UNIQUE em (user_id, message_id)
3. Verificar se documento ja foi processado antes de iniciar

```typescript
// Verificar duplicata
const { data: existing } = await supabase
  .from('whatsapp_media_tracking')
  .select('id')
  .eq('user_id', userId)
  .eq('message_id', messageId)
  .single()

if (existing) {
  log('DEBUG', 'Duplicate message, skipping', { messageId })
  return
}
```

### 6.5 Risco: Arquivo Nao Suportado

**Problema:** Usuario envia formato nao suportado (ex: .exe, .zip).

**Mitigacao:**
1. Whitelist de MIME types
2. Mensagem clara informando formatos aceitos
3. Extensao futura para mais formatos

```typescript
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
]

if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
  await sendWhatsAppMessage(instanceName, remoteJid,
    'Formato nao suportado. Envie: PDF, Word, PowerPoint ou imagens (JPG/PNG).')
  return
}
```

---

## 7. Dependencias Entre Fases

```
Fase 1 (Infraestrutura)
    |
    +---> Fase 2 (Media Handler)
    |         |
    |         +---> Fase 3 (Webhook Enhancement)
    |                   |
    |                   +---> Fase 4 (Fluxo Conversacional)
    |                   |
    |                   +---> Fase 5 (Comandos) [paralelo]
    |
    +---> Fase 6 (Testes) [pode iniciar apos Fase 2]
```

---

## 8. Criterios de Aceite (Definition of Done)

### 8.1 Funcionalidade Core

- [ ] Usuario envia PDF via WhatsApp e recebe confirmacao de recebimento
- [ ] Documento e baixado e armazenado no Storage
- [ ] process-document e chamado automaticamente
- [ ] Usuario recebe resultado com tipo detectado e campos extraidos
- [ ] Usuario pode vincular documento a organizacao via resposta numerica
- [ ] Documentos aparecem no app web com source='whatsapp'

### 8.2 Formatos Suportados

- [ ] PDF funciona corretamente
- [ ] Imagens (JPG/PNG) funcionam com OCR
- [ ] Word/PowerPoint funcionam
- [ ] Formatos nao suportados retornam mensagem clara

### 8.3 Tratamento de Erros

- [ ] Timeout de download e tratado graciosamente
- [ ] Erro de processamento informa usuario
- [ ] Mensagens duplicadas sao ignoradas
- [ ] Rate limit nao quebra o fluxo

### 8.4 Comandos de Texto (Opcional)

- [ ] `/docs` lista documentos
- [ ] `/contexto [query]` retorna resultados RAG
- [ ] `/help` mostra instrucoes

### 8.5 Qualidade

- [ ] Testes de integracao passando
- [ ] Cobertura > 80%
- [ ] Documentacao atualizada
- [ ] Nenhum erro em producao nas primeiras 24h

---

## 9. Estimativa de Esforco

| Fase | Agente | Estimativa |
|------|--------|------------|
| 1. Infraestrutura | backend-architect-supabase | 4h |
| 2. Media Handler | backend-architect-supabase | 6h |
| 3. Webhook Enhancement | backend-architect-supabase | 8h |
| 4. Fluxo Conversacional | ai-integration-specialist | 4h |
| 5. Comandos de Texto | ai-integration-specialist | 4h |
| 6. Testes e Validacao | testing-qa-playwright | 6h |

**Total Estimado:** 32 horas (aproximadamente 4 dias de trabalho)

---

## 10. Proximos Passos

1. **Imediato:** Iniciar Fase 1 com `backend-architect-supabase`
2. **Paralelo:** Apos Fase 1, iniciar Fase 2
3. **Sequencial:** Fase 3 depende de Fase 2
4. **Paralelo:** Fases 4 e 5 podem ser feitas em paralelo apos Fase 3
5. **Continuo:** Fase 6 pode comecar apos Fase 2 (mock testing)

---

## 11. Comandos para Iniciar

```bash
# Criar branch de feature
git checkout -b feature/issue-118-whatsapp-document-input

# Criar estrutura de arquivos
touch supabase/functions/_shared/whatsapp-media-handler.ts
touch supabase/functions/_shared/whatsapp-document-processor.ts
touch supabase/migrations/20260122000001_whatsapp_document_tracking.sql

# Criar bucket via SQL (executar no Supabase Dashboard)
# INSERT INTO storage.buckets ...

# Testar localmente
npx supabase functions serve webhook-evolution --env-file .env.local
```

---

## Apendice A: Exemplo de Payload de Webhook com Midia

```json
{
  "event": "messages.upsert",
  "instance": "aica_a1b2c3d4",
  "data": {
    "key": {
      "remoteJid": "5521999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0C767D097B7C09D37"
    },
    "pushName": "Joao Silva",
    "message": {
      "documentMessage": {
        "url": "https://mmg.whatsapp.net/...",
        "mimetype": "application/pdf",
        "title": "projeto_cultural.pdf",
        "fileSha256": "abc123...",
        "fileLength": "2048576",
        "fileName": "projeto_cultural.pdf"
      }
    },
    "messageTimestamp": 1705952400
  }
}
```

---

## Apendice B: Exemplo de Conversa WhatsApp

```
Usuario: [envia PDF]

Aica: Recebi seu documento! Processando...

Aica: Documento processado!

Tipo detectado: *projeto_rouanet*
Confianca: 92%
PRONAC: 241234
Valor: R$ 500.000,00

Vincular a qual organizacao?

*Sugestoes automaticas:*
1) Instituto Vagalume (92% match - CNPJ)

*Outras organizacoes:*
2) Associacao Cultural XYZ
3) ONG Cultura Viva

0) Ignorar vinculacao

_Responda com o numero da opcao_

Usuario: 1

Aica: Documento vinculado a *Instituto Vagalume*!
```

---

**Documento criado por:** Master Architect & Planner Agent
**Revisao necessaria:** Lucas Boscacci Lima
**Data de criacao:** 2026-01-22
