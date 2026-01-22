# Issue #118 - WhatsApp Document Input Tasks

## Quick Reference
**Epic:** #113 - File Processing Pipeline
**Issue:** #118 - WhatsApp Integration como canal de input de documentos
**Plano Detalhado:** `ISSUE_118_WHATSAPP_DOCUMENT_INPUT_PLAN.md`

---

## Fase 1: Infraestrutura (Backend)
**Agente:** backend-architect-supabase
**Status:** [ ] Nao Iniciado | [ ] Em Progresso | [ ] Completo

- [ ] 1.1 Criar storage bucket `whatsapp-documents`
  - [ ] Bucket criado no Supabase
  - [ ] RLS policy configurada
  - [ ] Limite de tamanho (25MB)
  - [ ] MIME types permitidos configurados

- [ ] 1.2 Criar migration `20260122000001_whatsapp_document_tracking.sql`
  - [ ] Novos action_types em whatsapp_pending_actions
  - [ ] Tabela whatsapp_media_tracking criada
  - [ ] Indexes criados
  - [ ] RLS policies aplicadas

- [ ] 1.3 Testar infraestrutura
  - [ ] Upload manual para bucket funciona
  - [ ] Queries na tabela funcionam
  - [ ] RLS policies validadas

---

## Fase 2: Media Handler Module
**Agente:** backend-architect-supabase
**Status:** [ ] Nao Iniciado | [ ] Em Progresso | [ ] Completo

- [ ] 2.1 Criar `_shared/whatsapp-media-handler.ts`
  - [ ] Interface MediaInfo definida
  - [ ] Interface DownloadResult definida
  - [ ] Funcao downloadMediaFromEvolution implementada
  - [ ] Funcao uploadToStorage implementada
  - [ ] Funcao determineFileType implementada
  - [ ] Funcao generateStoragePath implementada

- [ ] 2.2 Implementar download via Evolution API
  - [ ] Endpoint `/chat/getBase64FromMediaMessage` funcionando
  - [ ] Decodificacao base64 funcionando
  - [ ] Timeout configuravel implementado
  - [ ] Retry logic implementado

- [ ] 2.3 Implementar upload para Storage
  - [ ] Path pattern `{user_id}/{timestamp}_{filename}`
  - [ ] Content-Type correto
  - [ ] Error handling implementado

- [ ] 2.4 Implementar tracking
  - [ ] Funcao trackMediaDownload criada
  - [ ] Funcao updateTrackingStatus criada
  - [ ] Deduplicacao por message_id funcionando

---

## Fase 3: Webhook Enhancement
**Agente:** backend-architect-supabase
**Status:** [ ] Nao Iniciado | [ ] Em Progresso | [ ] Completo

- [ ] 3.1 Criar `_shared/whatsapp-document-processor.ts`
  - [ ] Interface ProcessDocumentResult definida
  - [ ] Funcao processWhatsAppDocument implementada
  - [ ] Funcao formatResultMessage implementada
  - [ ] Funcao formatLinkingQuestion implementada

- [ ] 3.2 Modificar handleMessagesUpsert
  - [ ] Deteccao de tipo de mensagem (text vs media)
  - [ ] Roteamento para handler correto
  - [ ] Mensagem para audio/video nao suportados

- [ ] 3.3 Implementar handleMediaMessage
  - [ ] Envio de "Processando..."
  - [ ] Tracking criado
  - [ ] Download de midia
  - [ ] Upload para storage
  - [ ] Chamada a process-document
  - [ ] Envio de resultado
  - [ ] Criacao de pending action
  - [ ] Atualizacao de tracking

- [ ] 3.4 Integracao com process-document
  - [ ] Chamada via supabase.functions.invoke
  - [ ] Parametros corretos (source='whatsapp', etc.)
  - [ ] Error handling

- [ ] 3.5 Pending action para vinculacao
  - [ ] Funcao createLinkingPendingAction criada
  - [ ] Payload com link_suggestions

---

## Fase 4: Fluxo Conversacional
**Agente:** ai-integration-specialist
**Status:** [ ] Nao Iniciado | [ ] Em Progresso | [ ] Completo

- [ ] 4.1 Mensagens de status
  - [ ] PROCESSING message definida
  - [ ] SUCCESS message com tipo e confianca
  - [ ] ERROR message amigavel
  - [ ] TIMEOUT message

- [ ] 4.2 Formatacao de resultado
  - [ ] Campos extraidos formatados (PRONAC, CNPJ, valor)
  - [ ] Emojis apropriados

- [ ] 4.3 Pergunta de vinculacao
  - [ ] Sugestoes automaticas listadas
  - [ ] Outras organizacoes listadas
  - [ ] Opcao de ignorar (0)
  - [ ] Instrucao de resposta

- [ ] 4.4 Handler de resposta
  - [ ] Deteccao de resposta numerica
  - [ ] Vinculacao no documento
  - [ ] Confirmacao de link_suggestion
  - [ ] Atualizacao de pending action
  - [ ] Mensagem de confirmacao

---

## Fase 5: Comandos de Texto (Opcional)
**Agente:** ai-integration-specialist
**Status:** [ ] Nao Iniciado | [ ] Em Progresso | [ ] Completo

- [ ] 5.1 Deteccao de comandos
  - [ ] Funcao detectCommand implementada
  - [ ] Comandos: /docs, /contexto, /help

- [ ] 5.2 Comando /docs
  - [ ] Lista documentos recentes
  - [ ] Filtro por organizacao (argumento)
  - [ ] Formatacao adequada

- [ ] 5.3 Comando /contexto
  - [ ] Integracao com search-documents
  - [ ] Formatacao de resultados RAG
  - [ ] Limite de resultados

- [ ] 5.4 Comando /help
  - [ ] Instrucoes claras
  - [ ] Exemplos de uso

---

## Fase 6: Testes e Validacao
**Agente:** testing-qa-playwright
**Status:** [ ] Nao Iniciado | [ ] Em Progresso | [ ] Completo

- [ ] 6.1 Mock server Evolution API
  - [ ] Mock para getBase64FromMediaMessage
  - [ ] Mock para sendText
  - [ ] Cenarios de erro

- [ ] 6.2 Testes de integracao
  - [ ] Teste: processa PDF
  - [ ] Teste: trata erro de download
  - [ ] Teste: trata timeout
  - [ ] Teste: vincula documento
  - [ ] Teste: ignora vinculacao

- [ ] 6.3 Teste manual end-to-end
  - [ ] Enviar PDF real
  - [ ] Verificar mensagens
  - [ ] Testar vinculacao
  - [ ] Verificar no app web
  - [ ] Testar comandos

---

## Arquivos a Criar/Modificar

### Novos Arquivos
- [ ] `supabase/migrations/20260122000001_whatsapp_document_tracking.sql`
- [ ] `supabase/functions/_shared/whatsapp-media-handler.ts`
- [ ] `supabase/functions/_shared/whatsapp-document-processor.ts`
- [ ] `tests/integration/whatsapp-document-input.test.ts`
- [ ] `tests/mocks/evolution-api-mock.ts`

### Arquivos a Modificar
- [ ] `supabase/functions/webhook-evolution/index.ts`
  - Adicionar import de novos modulos
  - Adicionar handleMediaMessage
  - Modificar handleMessagesUpsert para roteamento

---

## Comandos Uteis

```bash
# Criar branch
git checkout -b feature/issue-118-whatsapp-document-input

# Testar webhook localmente
npx supabase functions serve webhook-evolution --env-file .env.local

# Aplicar migration localmente
npx supabase db push

# Verificar logs
npx supabase functions logs webhook-evolution --follow

# Build check
npm run typecheck && npm run lint
```

---

## Checklist de Deploy

- [ ] Todos os testes passando
- [ ] Migration aplicada em staging
- [ ] Bucket criado em staging
- [ ] Webhook testado com mensagem real
- [ ] Documentacao atualizada
- [ ] PR criado e aprovado
- [ ] Deploy via git push (automatico)

---

**Ultima atualizacao:** 2026-01-22
