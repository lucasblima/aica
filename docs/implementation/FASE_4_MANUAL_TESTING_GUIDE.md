# Fase 4: Fluxo Conversacional - Guia de Testes Manuais

**Data:** 2026-01-23
**Issue:** #118 - WhatsApp Input de Documentos
**Ambiente:** Staging (https://aica-staging-5562559893.southamerica-east1.run.app/)
**Commit:** 59a1f2b

---

## 📋 Pré-requisitos

### 1. Verificar Deploy
```bash
gcloud builds list --limit=5 --region=southamerica-east1
```

**Esperado:** Build mais recente com status `SUCCESS` e timestamp após o push do commit 59a1f2b.

### 2. Verificar Migrations Aplicadas
```sql
-- Conectar ao Supabase: https://uzywajqzbdbrfammshdg.supabase.co
-- SQL Editor

SELECT version, name, applied_at
FROM supabase_migrations.schema_migrations
WHERE version = '20260122000003'
ORDER BY applied_at DESC;
```

**Esperado:** 1 linha com `applied_at` recente (últimas 24h).

### 3. Verificar Bucket de Storage
```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'whatsapp-documents';
```

**Esperado:**
- `id`: 'whatsapp-documents'
- `public`: false
- `file_size_limit`: 26214400 (25MB)
- `allowed_mime_types`: 6 tipos (PDF, DOCX, PPTX, JPEG, PNG, WebP)

### 4. Verificar Tabela whatsapp_media_tracking
```sql
SELECT COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_media_tracking';
```

**Esperado:** 14 colunas.

---

## 🧪 Cenários de Teste

### Teste 1: Fluxo Completo com Vinculação ✅

**Objetivo:** Validar caminho feliz completo (enviar PDF → SIM → selecionar organização existente).

**Pré-requisito:** Usuário deve ter pelo menos 1 organização cadastrada.

**Query de verificação:**
```sql
-- Substituir {seu_user_id} pelo UUID do usuário de teste
SELECT id, name, document_number
FROM organizations
WHERE user_id = '{seu_user_id}'
ORDER BY name;
```

Se não houver organizações, criar uma no app ou via SQL:
```sql
INSERT INTO organizations (user_id, name, organization_type, document_number)
VALUES (
  '{seu_user_id}',
  'Instituto Vagalume',
  'instituto',
  '12345678000190'
);
```

**Passos:**

1. **Enviar PDF via WhatsApp** (ex: qualquer PDF de projeto cultural/Rouanet)
   - Pode ser um PDF de teste ou um documento real
   - Aguardar ~10-15 segundos para processamento

2. **Verificar mensagens da Aica:**
   ```
   ⏳ Recebi seu documento! Processando...
   ```
   Depois (após processamento):
   ```
   ✅ Documento processado!
   📄 Tipo detectado: [tipo]
   📊 Confiança: [XX]%

   Deseja vincular este documento a uma organização?
   Responda com SIM para ver opções ou NAO para ignorar
   ```

3. **Responder:** `SIM`

4. **Verificar resposta da Aica:**
   ```
   🏢 A qual organização vincular este documento?

   *Organizações disponíveis:*
   1) Instituto Vagalume (CNPJ: 12.345.678/0001-90)
   2) [Outras organizações se houver]

   0) Criar nova organização

   _Responda com o número da opção_
   ```

5. **Responder:** `1` (ou o número da organização desejada)

6. **Verificar resposta da Aica:**
   ```
   ✅ Documento vinculado!

   🏢 Organização: Instituto Vagalume

   O documento já está disponível no contexto para consultas e geração de apresentações.
   ```

**Validação no Banco:**
```sql
-- Verificar documento vinculado (últimos 5 minutos)
SELECT
  pd.id,
  pd.original_filename,
  pd.detected_type,
  pd.confidence,
  pd.organization_id,
  o.name AS organization_name,
  pd.created_at
FROM processed_documents pd
LEFT JOIN organizations o ON pd.organization_id = o.id
WHERE pd.user_id = '{seu_user_id}'
  AND pd.source = 'whatsapp'
  AND pd.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY pd.created_at DESC
LIMIT 1;
```

**Esperado:** 1 linha com `organization_id` preenchido.

**Validação de Pending Action:**
```sql
SELECT
  id,
  action_type,
  status,
  action_payload,
  created_at,
  updated_at
FROM whatsapp_pending_actions
WHERE user_id = '{seu_user_id}'
  AND action_type = 'link_document'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

**Esperado:** 1 linha com `status = 'completed'`.

---

### Teste 2: Cancelamento (Responder NAO) ❌

**Objetivo:** Validar fluxo de cancelamento.

**Passos:**

1. **Enviar PDF via WhatsApp**
2. **Aguardar mensagem de processamento:**
   ```
   ✅ Documento processado!
   📄 Tipo detectado: [tipo]
   ...
   Deseja vincular este documento a uma organização?
   Responda com SIM para ver opções ou NAO para ignorar
   ```

3. **Responder:** `NAO` (ou `NÃO`, `N`)

4. **Verificar resposta da Aica:**
   ```
   ✅ Ok, documento não vinculado.

   Você pode consultá-lo depois no app ou vincular manualmente.
   ```

**Validação no Banco:**
```sql
SELECT
  id,
  action_type,
  status,
  action_payload->>'document_id' AS document_id,
  created_at
FROM whatsapp_pending_actions
WHERE user_id = '{seu_user_id}'
  AND action_type = 'link_document'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

**Esperado:** 1 linha com `status = 'cancelled'`.

**Verificar documento NÃO vinculado:**
```sql
SELECT id, original_filename, organization_id
FROM processed_documents
WHERE id = (
  SELECT action_payload->>'document_id'
  FROM whatsapp_pending_actions
  WHERE user_id = '{seu_user_id}'
    AND action_type = 'link_document'
    AND status = 'cancelled'
  ORDER BY created_at DESC
  LIMIT 1
);
```

**Esperado:** `organization_id` deve ser `NULL`.

---

### Teste 3: Criar Nova Organização (Opção 0) 🆕

**Objetivo:** Validar criação de organização durante o fluxo.

**Passos:**

1. **Enviar PDF via WhatsApp**
2. **Responder:** `SIM`
3. **Verificar lista de organizações:**
   ```
   🏢 A qual organização vincular este documento?

   *Organizações disponíveis:*
   1) [Organização existente]
   ...

   0) Criar nova organização
   ```

4. **Responder:** `0`

5. **Verificar prompt da Aica:**
   ```
   🏢 Criar nova organização

   Responda com o nome da organização que deseja criar.
   ```

6. **Responder:** `Fundação Arte Cultura`

7. **Verificar resposta da Aica:**
   ```
   ✅ Organização criada e documento vinculado!

   🏢 Organização: Fundação Arte Cultura

   Tudo pronto! O documento já está disponível no app.
   ```

**Validação no Banco:**
```sql
-- Verificar organização criada (últimos 5 minutos)
SELECT id, name, organization_type, created_at
FROM organizations
WHERE user_id = '{seu_user_id}'
  AND name = 'Fundação Arte Cultura'
  AND created_at > NOW() - INTERVAL '5 minutes';
```

**Esperado:** 1 linha com `organization_type = 'outro'`.

**Verificar documento vinculado à nova organização:**
```sql
SELECT
  pd.id,
  pd.original_filename,
  o.name AS organization_name,
  o.created_at AS org_created_at,
  pd.created_at AS doc_created_at
FROM processed_documents pd
JOIN organizations o ON pd.organization_id = o.id
WHERE pd.user_id = '{seu_user_id}'
  AND o.name = 'Fundação Arte Cultura'
  AND pd.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY pd.created_at DESC
LIMIT 1;
```

**Esperado:** 1 linha com ambos timestamps próximos (diferença < 30 segundos).

---

### Teste 4: Primeira Organização (Sem Cadastro Prévio) 🥇

**Objetivo:** Validar fluxo quando usuário não tem nenhuma organização cadastrada.

**Pré-requisito:** Criar usuário de teste sem organizações OU deletar todas as organizações do usuário de teste (CUIDADO: backup antes!).

**Limpar organizações (OPCIONAL - apenas em ambiente de teste):**
```sql
-- BACKUP FIRST!
SELECT * FROM organizations WHERE user_id = '{user_id_teste}';

-- Depois deletar
DELETE FROM organizations WHERE user_id = '{user_id_teste}';
```

**Passos:**

1. **Enviar PDF via WhatsApp**
2. **Responder:** `SIM`
3. **Verificar mensagem da Aica (sem lista):**
   ```
   🏢 Você ainda não tem organizações cadastradas.

   Para vincular documentos, primeiro cadastre uma organização no app.

   Ou responda com o nome da organização para criar uma nova agora.
   ```

4. **Responder:** `Instituto Cultural XYZ`

5. **Verificar resposta da Aica:**
   ```
   ✅ Organização criada e documento vinculado!

   🏢 Organização: Instituto Cultural XYZ

   Tudo pronto! O documento já está disponível no app.
   ```

**Validação no Banco:**
```sql
-- Verificar primeira organização criada
SELECT id, name, organization_type, created_at
FROM organizations
WHERE user_id = '{seu_user_id}'
  AND name = 'Instituto Cultural XYZ'
ORDER BY created_at DESC
LIMIT 1;
```

**Esperado:** 1 linha com `organization_type = 'outro'`.

---

### Teste 5: Validação de Entrada Inválida ⚠️

**Objetivo:** Validar tratamento de erros de entrada.

#### 5.1. Resposta não-numérica

**Passos:**

1. **Enviar PDF → SIM → Ver lista**
2. **Responder:** `abc` (texto aleatório)
3. **Verificar erro da Aica:**
   ```
   ❌ Resposta inválida. Por favor, responda com o *número* da organização.
   ```
4. **Status da pending action deve permanecer `pending`** (não completa, aguardando resposta válida)

**Validação:**
```sql
SELECT status, action_payload->>'step' AS step
FROM whatsapp_pending_actions
WHERE user_id = '{seu_user_id}'
  AND action_type = 'link_document'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

**Esperado:** `status = 'pending'`, `step = 'awaiting_org_selection'`.

#### 5.2. Número fora do range

**Passos:**

1. **Após erro anterior, responder:** `99` (número maior que o total de organizações)
2. **Verificar erro da Aica:**
   ```
   ❌ Opção inválida. Escolha um número entre 1 e [N], ou 0 para criar nova organização.
   ```
   (onde [N] é o número total de organizações listadas)

#### 5.3. Resposta válida após erros

**Passos:**

1. **Após erros anteriores, responder:** `1` (número válido)
2. **Verificar vinculação bem-sucedida:**
   ```
   ✅ Documento vinculado!
   🏢 Organização: [Nome da organização]
   ```

**Validação:**
```sql
SELECT status
FROM whatsapp_pending_actions
WHERE user_id = '{seu_user_id}'
  AND action_type = 'link_document'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

**Esperado:** `status = 'completed'`.

---

### Teste 6: Validação de Nome de Organização Muito Curto ⚠️

**Objetivo:** Validar que nomes de organização devem ter >= 3 caracteres.

**Passos:**

1. **Enviar PDF → SIM → 0 (criar nova)**
2. **Responder:** `AB` (apenas 2 caracteres)
3. **Verificar erro da Aica:**
   ```
   ❌ Nome muito curto. Por favor, forneça um nome com pelo menos 3 caracteres.
   ```
4. **Responder:** `ABC Associação` (válido)
5. **Verificar sucesso:**
   ```
   ✅ Organização criada e documento vinculado!
   🏢 Organização: ABC Associação
   ```

---

### Teste 7: Formatação de CNPJ 🇧🇷

**Objetivo:** Validar que CNPJs são formatados corretamente (XX.XXX.XXX/XXXX-XX).

**Pré-requisito:** Organização com `document_number` no formato apenas numérico.

**Criar organização com CNPJ:**
```sql
INSERT INTO organizations (user_id, name, organization_type, document_number)
VALUES (
  '{seu_user_id}',
  'Empresa Teste CNPJ',
  'empresa',
  '12345678000190'  -- Apenas números
)
RETURNING id, name, document_number;
```

**Passos:**

1. **Enviar PDF → SIM**
2. **Verificar lista de organizações:**
   ```
   🏢 A qual organização vincular este documento?

   *Organizações disponíveis:*
   1) Empresa Teste CNPJ (CNPJ: 12.345.678/0001-90)
   ...
   ```

**Esperado:** CNPJ formatado com pontos, barra e hífen, mesmo que no banco esteja apenas numérico.

---

## 🔍 Queries Úteis para Debugging

### Ver todos os media tracking recentes
```sql
SELECT
  id,
  message_id,
  media_type,
  original_filename,
  download_status,
  processing_status,
  processed_document_id,
  error_message,
  created_at,
  downloaded_at,
  processed_at
FROM whatsapp_media_tracking
WHERE user_id = '{seu_user_id}'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Ver todas as pending actions recentes
```sql
SELECT
  id,
  action_type,
  status,
  action_payload,
  created_at,
  updated_at,
  expires_at
FROM whatsapp_pending_actions
WHERE user_id = '{seu_user_id}'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Ver documentos processados recentes com organização
```sql
SELECT
  pd.id,
  pd.original_filename,
  pd.detected_type,
  pd.confidence,
  pd.source,
  o.name AS organization_name,
  pd.created_at
FROM processed_documents pd
LEFT JOIN organizations o ON pd.organization_id = o.id
WHERE pd.user_id = '{seu_user_id}'
  AND pd.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pd.created_at DESC;
```

### Ver storage files do bucket
```sql
SELECT
  name AS storage_path,
  metadata->>'size' AS file_size,
  metadata->>'mimetype' AS mime_type,
  created_at
FROM storage.objects
WHERE bucket_id = 'whatsapp-documents'
  AND (storage.foldername(name))[1] = '{seu_user_id}'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## 📊 Checklist de Validação

### Fluxos Conversacionais
- [ ] Teste 1: Fluxo completo com vinculação (SIM → número → sucesso)
- [ ] Teste 2: Cancelamento (NAO → cancelled)
- [ ] Teste 3: Criar nova organização (0 → nome → sucesso)
- [ ] Teste 4: Primeira organização (sem orgs → nome → sucesso)
- [ ] Teste 5.1: Entrada não-numérica (abc → erro)
- [ ] Teste 5.2: Número fora do range (99 → erro)
- [ ] Teste 5.3: Resposta válida após erros (1 → sucesso)
- [ ] Teste 6: Nome muito curto (AB → erro → ABC → sucesso)
- [ ] Teste 7: Formatação de CNPJ (12345678000190 → 12.345.678/0001-90)

### Mensagens da Aica
- [ ] Emoji ⏳ aparece antes do processamento
- [ ] Emoji ✅ aparece após sucesso
- [ ] Emoji 🏢 aparece nas mensagens de organização
- [ ] Emoji 📄 aparece para tipo de documento
- [ ] Emoji 📊 aparece para confiança
- [ ] Formatação WhatsApp (*negrito*, _itálico_) funciona corretamente
- [ ] CNPJs formatados corretamente na lista

### Banco de Dados
- [ ] `whatsapp_media_tracking` cria registros com `source = 'whatsapp'`
- [ ] `processed_documents` vincula `organization_id` corretamente
- [ ] `whatsapp_pending_actions` atualiza status (`pending` → `completed`/`cancelled`)
- [ ] `organizations` criadas têm `organization_type = 'outro'`
- [ ] Deduplicação funciona (enviar mesmo PDF 2x não cria duplicatas)

### Storage
- [ ] Arquivos são salvos no bucket `whatsapp-documents`
- [ ] Path pattern: `{user_id}/{timestamp}_{filename}`
- [ ] Apenas usuário dono pode acessar seus arquivos (RLS)
- [ ] Arquivos grandes (>25MB) são rejeitados
- [ ] MIME types não permitidos são rejeitados

### Performance
- [ ] Processamento completo < 30 segundos para PDF pequeno (<5MB)
- [ ] Mensagens WhatsApp chegam em < 2 segundos após resposta do usuário
- [ ] Sem memory leaks ou timeouts

---

## 🐛 Problemas Comuns e Soluções

### Problema: Mensagem "⏳ Processando..." mas nunca completa

**Diagnóstico:**
```sql
SELECT id, download_status, processing_status, error_message
FROM whatsapp_media_tracking
WHERE user_id = '{seu_user_id}'
  AND processing_status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes';
```

**Causas possíveis:**
- Evolution API não respondeu (timeout)
- process-document Edge Function falhou
- Gemini API rate limit

**Verificar logs:**
```bash
# Supabase Dashboard → Edge Functions → webhook-evolution → Logs
# Filtrar por: "Processing media" ou "ERROR"
```

### Problema: CNPJ não formatado corretamente

**Diagnóstico:**
```sql
SELECT name, document_number, LENGTH(document_number) AS cnpj_length
FROM organizations
WHERE user_id = '{seu_user_id}'
  AND document_number IS NOT NULL;
```

**Solução:** CNPJ deve ter exatamente 14 dígitos numéricos. Atualizar:
```sql
UPDATE organizations
SET document_number = REGEXP_REPLACE(document_number, '[^0-9]', '', 'g')
WHERE user_id = '{seu_user_id}'
  AND document_number IS NOT NULL;
```

### Problema: Pending action expirada (24h)

**Diagnóstico:**
```sql
SELECT id, action_type, status, expires_at
FROM whatsapp_pending_actions
WHERE user_id = '{seu_user_id}'
  AND expires_at < NOW()
  AND status = 'pending';
```

**Solução:** Marcar como `cancelled` manualmente (ou esperar cleanup automático):
```sql
UPDATE whatsapp_pending_actions
SET status = 'cancelled'
WHERE user_id = '{seu_user_id}'
  AND expires_at < NOW()
  AND status = 'pending';
```

### Problema: Usuário não recebe mensagens da Aica

**Verificar instância WhatsApp:**
```sql
SELECT instance_name, status, connected_at
FROM whatsapp_instances
WHERE user_id = '{seu_user_id}';
```

**Esperado:** `status = 'connected'`, `connected_at` recente.

**Verificar webhook configurado:**
- Evolution API Dashboard → Instances → aica_{user_id} → Webhooks
- URL deve apontar para: `https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/webhook-evolution`
- Events habilitados: `messages.upsert`, `messages.update`

---

## 📸 Screenshots Recomendados

Durante os testes, tirar screenshots de:

1. **Mensagem inicial de processamento** (⏳ Recebi seu documento!)
2. **Mensagem de sucesso com tipo detectado** (✅ Documento processado!)
3. **Lista de organizações com CNPJ formatado** (🏢 A qual organização...)
4. **Confirmação de vinculação** (✅ Documento vinculado!)
5. **Mensagem de erro (validação)** (❌ Resposta inválida...)
6. **Criação de nova organização** (✅ Organização criada e documento vinculado!)

---

## ✅ Critérios de Aceite (Revalidação)

Após todos os testes, validar que:

- [x] `handleDocumentLinkingFlow()` implementada e funcional
- [ ] Resposta "SIM" lista organizações corretamente ✅
- [ ] Resposta "NAO" cancela vinculação ✅
- [ ] Resposta numérica vincula documento ✅
- [ ] Opção "0" permite criar nova organização ✅
- [ ] Validação de entrada (número inválido, fora do range) ✅
- [ ] Mensagens formatadas com emojis e markdown ✅
- [ ] CNPJ formatado corretamente (XX.XXX.XXX/XXXX-XX) ✅
- [ ] Pending action atualizada em cada step ✅
- [ ] Status transitions corretos (pending → completed/cancelled) ✅
- [ ] Logging detalhado em cada etapa ✅
- [ ] TypeScript compila sem erros ✅
- [ ] Compatibilidade com pending actions existentes preservada ✅

---

## 🚀 Após Validação Bem-Sucedida

Se todos os 7 cenários passarem:

1. **Marcar Fase 4 como ✅ VALIDADA**
2. **Criar issue/comentário no GitHub** com screenshots e resultados
3. **Decidir próximo passo:**
   - Fase 5: Comandos de Texto (4h)
   - Fase 6: Testes E2E (6h)

---

**Testado por:** [Seu nome]
**Data de teste:** [Data]
**Ambiente:** Staging
**Build:** [Verificar com `gcloud builds list`]
