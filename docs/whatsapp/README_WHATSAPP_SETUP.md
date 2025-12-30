# WhatsApp Integration Setup Guide

## Issue #12: WhatsApp Integration via Evolution API

Este documento descreve como configurar a integracao completa do WhatsApp com o AICA Life OS usando a Evolution API.

---

## Indice

1. [Visao Geral](#visao-geral)
2. [Pre-requisitos](#pre-requisitos)
3. [Configuracao do Supabase](#configuracao-do-supabase)
4. [Configuracao da Evolution API](#configuracao-da-evolution-api)
5. [Variaveis de Ambiente](#variaveis-de-ambiente)
6. [Deploy das Edge Functions](#deploy-das-edge-functions)
7. [Configuracao do Webhook](#configuracao-do-webhook)
8. [Testando a Integracao](#testando-a-integracao)
9. [Compliance LGPD](#compliance-lgpd)
10. [Troubleshooting](#troubleshooting)

---

## Visao Geral

A integracao WhatsApp permite:

- **Receber mensagens** de texto, audio, imagens e documentos
- **Enviar notificacoes** agendadas e recorrentes
- **Transcricao automatica** de audios via Gemini
- **OCR de imagens** via Gemini Vision
- **Analise de sentimento** das conversas
- **Compliance LGPD** com opt-in/opt-out via keywords

### Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   WhatsApp      │────▶│  Evolution API  │────▶│    Webhook      │
│   (Usuario)     │     │   (Servidor)    │     │  (Edge Func)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │◀───▶│    Supabase     │◀────│  Media Proc.    │
│   (React)       │     │   (Database)    │     │  (Edge Func)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Pre-requisitos

### Contas e Acessos

- [ ] Conta Supabase com projeto criado
- [ ] Evolution API configurada (self-hosted ou SaaS)
- [ ] API Key do Gemini (para transcricao/OCR)
- [ ] Numero WhatsApp dedicado para o bot

### Ferramentas

- Node.js 18+
- Supabase CLI (`npm install -g supabase`)
- Git

---

## Configuracao do Supabase

### 1. Aplicar Migrations

Execute as migrations na ordem correta:

```bash
# Conectar ao projeto
supabase link --project-ref YOUR_PROJECT_REF

# Aplicar migrations
supabase db push
```

Ou execute manualmente no SQL Editor do Supabase:

1. `20251230_whatsapp_messages.sql` - Tabela principal de mensagens
2. `20251230_scheduled_notifications.sql` - Sistema de agendamento
3. `20251230_consent_records.sql` - Compliance LGPD
4. `20251230_whatsapp_media_bucket.sql` - Storage bucket

### 2. Habilitar Extensoes

No SQL Editor, execute:

```sql
-- Extensoes necessarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS vector;
```

**IMPORTANTE**: Para habilitar `pg_cron`, va em:
- Database > Extensions > Procure "pg_cron" > Enable

### 3. Criar Bucket de Storage

Verifique se o bucket `whatsapp-media` foi criado:

```sql
SELECT * FROM storage.buckets WHERE id = 'whatsapp-media';
```

Se nao existir, crie manualmente:
1. Va em Storage no dashboard do Supabase
2. Clique em "New bucket"
3. Nome: `whatsapp-media`
4. Marque como "Private"

### 4. Criar Fila PGMQ

```sql
SELECT pgmq.create('whatsapp_notifications');
SELECT pgmq.create('whatsapp_media_processing');
```

---

## Configuracao da Evolution API

### Credenciais Atuais

```
Servidor: https://evolution-evolution-api.w9jo16.easypanel.host/
Instancia: Lucas_4569
API Key: 429683C4C977415CAAFCCE10F7D57E11
Numero AICA: +55 21 96556-4006
```

### Verificar Status da Instancia

```bash
curl -X GET "https://evolution-evolution-api.w9jo16.easypanel.host/instance/info/Lucas_4569" \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11"
```

### Conectar WhatsApp (se desconectado)

1. Gere um QR Code:
```bash
curl -X GET "https://evolution-evolution-api.w9jo16.easypanel.host/instance/qrcode/Lucas_4569" \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11"
```

2. Escaneie o QR Code com o WhatsApp

---

## Variaveis de Ambiente

### Supabase Vault (Secrets)

Adicione os seguintes secrets no Vault do Supabase:

| Secret Name | Valor |
|-------------|-------|
| `EVOLUTION_API_URL` | `https://evolution-evolution-api.w9jo16.easypanel.host` |
| `EVOLUTION_API_KEY` | `429683C4C977415CAAFCCE10F7D57E11` |
| `EVOLUTION_INSTANCE_NAME` | `Lucas_4569` |
| `EVOLUTION_WEBHOOK_SECRET` | (Gere um secret forte) |
| `GEMINI_API_KEY` | `AIzaSyAihJ__7YQNFTZFx5HiulUjjS2vfUjwJsM` |
| `AICA_WHATSAPP_PHONE` | `5521965564006` |

Para adicionar secrets:

1. Va em Project Settings > Edge Functions
2. Clique em "Manage secrets"
3. Adicione cada secret acima

### Frontend (.env)

```bash
# .env.local
VITE_EVOLUTION_INSTANCE_NAME=Lucas_4569
VITE_EVOLUTION_API_URL=https://evolution-evolution-api.w9jo16.easypanel.host
```

---

## Deploy das Edge Functions

### 1. Deploy Individual

```bash
# Webhook receiver
supabase functions deploy webhook-evolution

# Media processor
supabase functions deploy media-processor

# Notification sender
supabase functions deploy notification-sender
```

### 2. Deploy em Lote

```bash
supabase functions deploy
```

### 3. Verificar Deploy

```bash
supabase functions list
```

---

## Configuracao do Webhook

### URL do Webhook

Apos o deploy, sua URL sera:

```
https://<PROJECT_REF>.supabase.co/functions/v1/webhook-evolution
```

### Configurar na Evolution API

1. Acesse o painel da Evolution API
2. Va em Settings > Webhooks
3. Configure:

```json
{
  "url": "https://<PROJECT_REF>.supabase.co/functions/v1/webhook-evolution",
  "events": [
    "messages.upsert",
    "connection.update",
    "qrcode.updated"
  ],
  "webhook_secret": "SEU_WEBHOOK_SECRET"
}
```

Ou via API:

```bash
curl -X POST "https://evolution-evolution-api.w9jo16.easypanel.host/webhook/set/Lucas_4569" \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "url": "https://YOUR_PROJECT.supabase.co/functions/v1/webhook-evolution",
    "webhookByEvents": false,
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
  }'
```

---

## Testando a Integracao

### 1. Testar Recebimento de Mensagem

Envie uma mensagem de texto para o numero AICA (+55 21 96556-4006).

Verifique se foi salva:

```sql
SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 5;
```

### 2. Testar Envio de Mensagem

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/webhook-evolution" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_message",
    "phone": "5521999999999",
    "message": "Teste de envio via AICA"
  }'
```

### 3. Testar Notificacao Agendada

```sql
INSERT INTO scheduled_notifications (
  user_id, target_phone, notification_type,
  message_template, scheduled_for
)
VALUES (
  'SEU_USER_ID',
  '5521999999999',
  'reminder',
  'Lembrete de teste: {{message}}',
  NOW() + INTERVAL '1 minute'
);
```

### 4. Testar Consent Keywords

Envie uma dessas mensagens para o numero AICA:
- `ACEITO` - Opt-in para coleta de dados
- `CANCELAR` - Opt-out e solicita exclusao

Verifique:
```sql
SELECT * FROM whatsapp_consent_records ORDER BY created_at DESC LIMIT 5;
```

---

## Compliance LGPD

### Keywords de Opt-In

| Keyword | Idioma | Acao |
|---------|--------|------|
| `ACEITO` | pt-BR | Consentimento para coleta |
| `SIM` | pt-BR | Consentimento para coleta |
| `CONCORDO` | pt-BR | Consentimento para coleta |
| `ATIVAR` | pt-BR | Ativar notificacoes |
| `ACCEPT` | en | Consent |
| `YES` | en | Consent |

### Keywords de Opt-Out

| Keyword | Idioma | Acao |
|---------|--------|------|
| `CANCELAR` | pt-BR | Revogar consentimento |
| `PARAR` | pt-BR | Parar notificacoes |
| `SAIR` | pt-BR | Revogar consentimento |
| `NAO` | pt-BR | Recusar |
| `STOP` | en | Revoke consent |
| `CANCEL` | en | Revoke consent |

### Politica de Retencao

- Mensagens: 30 dias (configuravel)
- Media: 30 dias (configuravel)
- Dados apos opt-out: 72 horas para exclusao

### Funcoes LGPD

```sql
-- Verificar consentimento
SELECT check_whatsapp_consent('user_id', '5521999999999', 'data_collection');

-- Solicitar exclusao
INSERT INTO data_deletion_requests (user_id, request_type, requested_via)
VALUES ('user_id', 'full_deletion', 'web');
```

---

## Troubleshooting

### Webhook nao recebe eventos

1. Verifique se a URL esta correta
2. Verifique se o secret esta configurado
3. Teste a conectividade:
```bash
curl -X POST "SUA_URL_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

### Mensagens nao sao salvas

1. Verifique os logs da Edge Function:
```bash
supabase functions logs webhook-evolution
```

2. Verifique se o usuario existe na tabela users
3. Verifique as permissoes RLS

### Media nao e processada

1. Verifique os logs:
```bash
supabase functions logs media-processor
```

2. Verifique a fila PGMQ:
```sql
SELECT * FROM pgmq.q_whatsapp_media_processing;
```

3. Verifique o bucket de storage

### Notificacoes nao sao enviadas

1. Verifique o cron job:
```sql
SELECT * FROM cron.job WHERE jobname = 'process-whatsapp-notifications';
```

2. Verifique a fila:
```sql
SELECT * FROM pgmq.q_whatsapp_notifications;
```

3. Teste manualmente:
```bash
supabase functions invoke notification-sender
```

---

## Proximos Passos

- [ ] Implementar UI de gerenciamento de notificacoes
- [ ] Dashboard de analytics de mensagens
- [ ] Integracao com modulo Journey (momentos via WhatsApp)
- [ ] Integracao com modulo Calendar (lembretes)
- [ ] Chatbot com Gemini para respostas automaticas

---

## Contato

Para duvidas sobre a implementacao, consulte:
- Issue #12 no GitHub
- Documentacao da Evolution API: https://doc.evolution-api.com/
- Documentacao do Supabase: https://supabase.com/docs
