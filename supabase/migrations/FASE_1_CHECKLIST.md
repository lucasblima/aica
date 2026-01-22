# Fase 1: Infraestrutura - Checklist de Validação

## Issue #118 - WhatsApp Input de Documentos

### 📋 Critérios de Aceite

#### ✅ Entrega 1: Storage Bucket `whatsapp-documents`

- [ ] **Bucket criado** via migration SQL
- [ ] **Limite de tamanho:** 25MB (26214400 bytes)
- [ ] **MIME types configurados:**
  - [ ] `application/pdf`
  - [ ] `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
  - [ ] `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)
  - [ ] `image/jpeg`
  - [ ] `image/png`
  - [ ] `image/webp`
- [ ] **Bucket é privado** (`public = false`)

#### ✅ Entrega 2: RLS Policies do Storage Bucket

- [ ] **Policy: SELECT** - Usuários veem apenas seus arquivos (`{user_id}/*`)
- [ ] **Policy: INSERT** - Usuários fazem upload apenas para sua pasta
- [ ] **Policy: UPDATE** - Usuários atualizam apenas seus arquivos
- [ ] **Policy: DELETE** - Usuários deletam apenas seus arquivos (LGPD)

#### ✅ Entrega 3: Tabela `whatsapp_media_tracking`

- [ ] **Tabela criada** com estrutura correta
- [ ] **Colunas obrigatórias:**
  - [ ] `id` (UUID, PK, default gen_random_uuid())
  - [ ] `user_id` (UUID, FK auth.users, NOT NULL)
  - [ ] `message_id` (TEXT, NOT NULL)
  - [ ] `instance_name` (TEXT, NOT NULL)
  - [ ] `media_type` (TEXT, CHECK constraint)
  - [ ] `mime_type` (TEXT)
  - [ ] `original_filename` (TEXT)
  - [ ] `file_size_bytes` (INTEGER)
  - [ ] `storage_path` (TEXT)
  - [ ] `download_status` (TEXT, CHECK constraint, default 'pending')
  - [ ] `processing_status` (TEXT, CHECK constraint, default 'pending')
  - [ ] `processed_document_id` (UUID, FK processed_documents)
  - [ ] `error_message` (TEXT)
  - [ ] `created_at` (TIMESTAMPTZ, default NOW())
  - [ ] `downloaded_at` (TIMESTAMPTZ)
  - [ ] `processed_at` (TIMESTAMPTZ)

#### ✅ Entrega 4: Constraints e Indexes

- [ ] **UNIQUE constraint:** `(user_id, message_id)` para deduplicação
- [ ] **CHECK constraints:**
  - [ ] `media_type IN ('document', 'image', 'audio', 'video')`
  - [ ] `download_status IN ('pending', 'downloading', 'completed', 'failed')`
  - [ ] `processing_status IN ('pending', 'processing', 'completed', 'failed')`
- [ ] **Indexes criados (4+):**
  - [ ] `idx_whatsapp_media_user` (user_id)
  - [ ] `idx_whatsapp_media_status` (download_status, processing_status)
  - [ ] `idx_whatsapp_media_created` (created_at DESC)
  - [ ] `idx_whatsapp_media_processed_doc` (processed_document_id WHERE NOT NULL)

#### ✅ Entrega 5: RLS Policies da Tabela

- [ ] **RLS habilitado** na tabela
- [ ] **4 políticas básicas criadas:**
  - [ ] SELECT - Usuários veem apenas seus registros
  - [ ] INSERT - Usuários criam apenas registros para si
  - [ ] UPDATE - Usuários atualizam apenas seus registros
  - [ ] DELETE - Usuários deletam apenas seus registros
- [ ] **Policy adicional:** Service role pode gerenciar tudo

#### ✅ Entrega 6: Atualização de `whatsapp_pending_actions`

- [ ] **Constraint atualizado** para incluir:
  - [ ] `'process_document'` - Novo action type
  - [ ] `'link_document'` - Novo action type
- [ ] **Constraint mantém** action types existentes:
  - [ ] `'register_organization'`
  - [ ] `'update_organization'`
  - [ ] `'create_task'`
  - [ ] `'schedule_reminder'`

#### ✅ Entrega 7: Helper Functions

- [ ] **Function criada:** `generate_whatsapp_document_path(user_id, filename)`
  - [ ] Sanitiza filename
  - [ ] Gera timestamp prefix
  - [ ] Retorna path no formato `{user_id}/{timestamp}_{filename}`
- [ ] **Function criada:** `get_pending_whatsapp_media(limit)`
  - [ ] Retorna media com download_status='completed' e processing_status='pending'
  - [ ] Ordenado por created_at ASC
  - [ ] SECURITY DEFINER configurado

#### ✅ Entrega 8: Documentação

- [ ] **Comments na tabela:** Descrição do propósito
- [ ] **Comments nas colunas principais:**
  - [ ] `download_status`
  - [ ] `processing_status`
  - [ ] `processed_document_id`
- [ ] **Comments nas functions** criadas

#### ✅ Entrega 9: Migration Quality

- [ ] **Idempotência:** Usa `IF NOT EXISTS`, `ON CONFLICT DO UPDATE`
- [ ] **SECURITY DEFINER:** Configurado onde necessário com `SET search_path = public`
- [ ] **Success log:** Migration inclui bloco de verificação ao final
- [ ] **Naming convention:** Arquivo segue padrão `YYYYMMDD_description.sql`

---

## 🧪 Como Validar

### Passo 1: Aplicar Migration

```bash
# Se testando localmente
npx supabase db reset --local

# Se aplicando em staging/produção
npx supabase db push
```

### Passo 2: Executar Script de Validação

```bash
# Executar no Supabase Dashboard SQL Editor ou via CLI
psql -f supabase/migrations/VALIDATE_20260122000002.sql
```

### Passo 3: Verificar Resultados

Todos os checks devem retornar `✅ PASS`. Se algum retornar `❌ FAIL`, investigar a mensagem de erro.

### Passo 4: Testes Manuais

```sql
-- Teste 1: Gerar path de storage
SELECT public.generate_whatsapp_document_path(
  auth.uid(),
  'projeto_cultural.pdf'
);
-- Deve retornar: <user_id>/YYYYMMDD_HHMMSS_projeto_cultural.pdf

-- Teste 2: Inserir registro de teste
INSERT INTO public.whatsapp_media_tracking (
  user_id,
  message_id,
  instance_name,
  media_type,
  mime_type,
  original_filename,
  file_size_bytes
) VALUES (
  auth.uid(),
  'test_msg_' || gen_random_uuid()::text,
  'aica_test',
  'document',
  'application/pdf',
  'test.pdf',
  1024
);

-- Teste 3: Verificar RLS (só deve ver seus registros)
SELECT * FROM public.whatsapp_media_tracking;

-- Teste 4: Limpar dados de teste
DELETE FROM public.whatsapp_media_tracking
WHERE message_id LIKE 'test_msg_%';
```

---

## 📊 Resumo de Componentes Criados

| Componente | Tipo | Descrição |
|------------|------|-----------|
| `whatsapp-documents` | Storage Bucket | Bucket privado para documentos do WhatsApp |
| `whatsapp_media_tracking` | Tabela | Tracking de download e processamento |
| `generate_whatsapp_document_path` | Function | Helper para gerar paths de storage |
| `get_pending_whatsapp_media` | Function | Queue de media para processamento |
| 4 Storage Policies | RLS | Controle de acesso ao bucket |
| 5 Table Policies | RLS | Controle de acesso à tabela |
| 4 Indexes | Performance | Otimização de queries |

---

## 🎯 Próximos Passos (Fase 2)

Após validação bem-sucedida da Fase 1:

1. **Criar** `supabase/functions/_shared/whatsapp-media-handler.ts`
   - Download de media da Evolution API
   - Upload para Storage
   - Tracking de status

2. **Criar** `supabase/functions/_shared/whatsapp-document-processor.ts`
   - Orquestrador do fluxo
   - Chamada ao `process-document`
   - Formatação de respostas

3. **Modificar** `supabase/functions/webhook-evolution/index.ts`
   - Adicionar handler de media messages
   - Integrar com media-handler
   - Criar pending actions

---

**Data de Criação:** 2026-01-22
**Agente Responsável:** Backend Architect Supabase Agent
**Issue:** #118 - WhatsApp Input de Documentos
