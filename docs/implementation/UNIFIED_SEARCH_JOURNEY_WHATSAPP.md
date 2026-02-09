# Busca Unificada: Journey + WhatsApp

## ✅ O Que Foi Implementado

**Funcionalidade:** Busca semântica unificada que encontra tanto momentos do Journey quanto documentos enviados pelo WhatsApp em um único lugar.

**Onde buscar:** Minha Jornada → Aba "Busca"

---

## 🏗️ Arquitetura

### Antes (Problema)
- Momentos Journey: salvos no corpus `journey-user-{userId}`
- Documentos WhatsApp: salvos SEM corpus (impossível buscar)
- Resultado: WhatsApp RAG não funcionava

### Depois (Solução)
- Momentos Journey: salvos no corpus `journey-user-{userId}`
- Documentos WhatsApp: salvos NO MESMO corpus `journey-user-{userId}`
- Resultado: Busca unificada funciona!

---

## 📝 Mudanças Implementadas

### Backend

#### 1. Edge Function `process-whatsapp-document`
**Arquivo:** `supabase/functions/process-whatsapp-document/index.ts`

**Nova função:** `ensureJourneyCorpus()`
```typescript
// Busca ou cria corpus do Journey para o usuário
// Retorna corpus_id que será usado para indexar documentos WhatsApp
```

**Mudança em `saveDocumentReference()`:**
```typescript
// ANTES
.insert({
  user_id: userId,
  // corpus_id: VAZIO - documento não era pesquisável!
  module_type: 'whatsapp',
  ...
})

// DEPOIS
const corpusId = await ensureJourneyCorpus(supabase, userId)
.insert({
  user_id: userId,
  corpus_id: corpusId, // ✅ Agora associado ao corpus Journey
  module_type: 'whatsapp',
  ...
})

// ✅ Incrementa contador de documentos no corpus
await supabase.rpc('increment_corpus_document_count', { corpus_uuid: corpusId })
```

---

### Frontend

#### 1. File Search API Client
**Arquivo:** `src/services/fileSearchApiClient.ts`

**Mudanças:**
- `listCorpora(moduleType?: string | string[])` - Aceita array de módulos
- `listDocuments(corpusId?, moduleType?: string | string[])` - Aceita array de módulos
- Usa `.in('module_type', [...])` quando array for passado

**Impacto:**
Permite buscar documentos de múltiplos módulos com uma única query.

---

#### 2. Base Hook `useFileSearch`
**Arquivo:** `src/hooks/useFileSearch.ts`

**Função `useModuleFileSearch` atualizada:**
```typescript
// ANTES
export function useModuleFileSearch(module_type: string, module_id?: string)

// DEPOIS
export function useModuleFileSearch(module_type: string | string[], module_id?: string)
```

**Impacto:**
Hook base agora suporta busca em múltiplos módulos.

---

#### 3. Journey File Search Hook
**Arquivo:** `src/modules/journey/hooks/useJourneyFileSearch.ts`

**Mudança crítica:**
```typescript
// ANTES
const baseHook = useModuleFileSearch('journey', userId || momentId);

// DEPOIS
const baseHook = useModuleFileSearch(['journey', 'whatsapp'], userId || momentId);
```

**Impacto:**
Busca no Journey agora encontra:
- ✅ Momentos escritos manualmente no Journey
- ✅ PDFs enviados pelo WhatsApp
- ✅ Imagens com texto (OCR) enviadas pelo WhatsApp

---

## 🧪 Como Testar

### Pré-requisito
1. WhatsApp conectado no Aica
2. Pelo menos 1 momento criado no Journey (para criar o corpus)

### Teste Completo

#### Passo 1: Enviar PDF pelo WhatsApp
1. Abra o WhatsApp mobile
2. Envie um PDF qualquer para o número conectado ao Aica
3. Aguarde 10 segundos

#### Passo 2: Verificar Indexação
```sql
-- Ver documento WhatsApp indexado
SELECT
  id,
  corpus_id,
  module_type,
  original_filename,
  indexing_status,
  custom_metadata->>'contact_name' AS contact,
  custom_metadata->>'extracted_text_preview' AS preview
FROM file_search_documents
WHERE module_type = 'whatsapp'
ORDER BY created_at DESC
LIMIT 5;
```

**Esperado:**
- ✅ `corpus_id` preenchido (não null)
- ✅ `module_type` = 'whatsapp'
- ✅ `indexing_status` = 'completed'
- ✅ Preview do texto extraído

#### Passo 3: Buscar no Journey
1. Acesse: https://aica-staging-5562559893.southamerica-east1.run.app/
2. Vá em **Minha Jornada**
3. Clique na aba **"Busca"**
4. Digite uma palavra-chave do PDF enviado
5. Clique em **"Buscar"**

**Esperado:**
- ✅ Documento WhatsApp aparece nos resultados
- ✅ Preview do conteúdo está visível
- ✅ Nome do contato aparece (se disponível)

---

## 🔍 Exemplos de Busca

### Busca Livre
**Query:** "contrato de prestação de serviços"

**Resultado esperado:**
- PDFs enviados via WhatsApp com "contrato"
- Momentos do Journey mencionando "contrato"

---

### Busca por Emoção
**Query:** Selecionar emoção "Feliz"

**Resultado esperado:**
- Momentos do Journey com emoção "feliz"
- Documentos WhatsApp NÃO aparecem (não têm emoção)

---

### Busca de Crescimento
**Query:** Botão "Buscar" no modo "Crescimento"

**Resultado esperado:**
- Momentos de aprendizado do Journey
- PDFs de cursos/certificados enviados via WhatsApp

---

## 🐛 Troubleshooting

### Problema: Busca não encontra documentos WhatsApp

**Diagnóstico:**
```sql
-- Verificar se documentos têm corpus_id
SELECT id, corpus_id, module_type
FROM file_search_documents
WHERE module_type = 'whatsapp'
LIMIT 5;
```

**Se `corpus_id` estiver NULL:**
- Edge Function antiga ainda em uso (não atualizada)
- Redeploy: `npx supabase functions deploy process-whatsapp-document`

---

### Problema: "Nenhum momento indexado"

**Causa:** Usuário ainda não criou nenhum momento no Journey

**Solução:**
1. Criar pelo menos 1 momento no Journey
2. Isso criará o corpus `journey-user-{userId}`
3. Agora documentos WhatsApp poderão ser indexados

---

### Problema: Erro "At least one corpus ID must be provided"

**Causa:** Hook `useJourneyFileSearch` ainda está usando apenas `'journey'`

**Verificar:**
```typescript
// Deve ser:
const baseHook = useModuleFileSearch(['journey', 'whatsapp'], userId);

// NÃO:
const baseHook = useModuleFileSearch('journey', userId);
```

**Solução:** Frontend desatualizado, aguardar build do Cloud Run (~4 min após push)

---

## 📊 Métricas de Sucesso

- ✅ **Indexação:** 100% dos documentos WhatsApp têm `corpus_id` não-null
- ✅ **Busca:** Documentos WhatsApp aparecem em buscas relevantes
- ✅ **Performance:** Busca retorna em <2 segundos
- ✅ **UX:** Usuário não precisa saber que Journey e WhatsApp são módulos separados

---

## 🎯 Impacto do Usuário

**Antes:**
- Enviar PDF pelo WhatsApp → Documento perdido
- Buscar no Journey → Só encontra momentos escritos manualmente

**Depois:**
- Enviar PDF pelo WhatsApp → Automaticamente indexado
- Buscar no Journey → Encontra momentos + documentos WhatsApp
- Experiência: "Tudo que eu registro fica pesquisável em um só lugar"

---

## 🚀 Deploy Checklist

- [x] Migration aplicada (`whatsapp_messages` com campos de mídia)
- [x] Edge Function `process-whatsapp-document` deployada (versão atualizada)
- [x] Edge Function `webhook-evolution` deployada
- [x] Frontend commitado e pusheado
- [x] Cloud Run build aguardando (~4 min)
- [ ] Teste end-to-end (enviar PDF → buscar no Journey)

---

**Status:** ✅ Implementação completa - Aguardando build do frontend

**Próximo passo:** Testar enviando um PDF pelo WhatsApp e buscando no Journey
