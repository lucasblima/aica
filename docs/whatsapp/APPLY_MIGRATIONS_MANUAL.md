# Aplicação Manual das Migrations WhatsApp

Devido a conflitos no histórico de migrations, execute os seguintes passos manualmente no Supabase SQL Editor.

## Passo 1: Acesse o SQL Editor

1. Acesse: https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr
2. Vá em **SQL Editor** no menu lateral
3. Click em **New Query**

## Passo 2: Habilitar Extensões

Cole e execute este SQL:

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar filas PGMQ
SELECT pgmq.create('whatsapp_notifications');
SELECT pgmq.create('whatsapp_media_processing');
```

## Passo 3: Aplicar Migrations WhatsApp

Execute em ordem:

### 3.1 WhatsApp Messages
```bash
# No terminal (Windows):
Get-Content supabase\migrations\20251230_whatsapp_messages.sql | clip
```

Cole no SQL Editor e execute.

### 3.2 Scheduled Notifications
```bash
Get-Content supabase\migrations\20251230_scheduled_notifications.sql | clip
```

Cole no SQL Editor e execute.

### 3.3 Consent Records (LGPD)
```bash
Get-Content supabase\migrations\20251230_consent_records.sql | clip
```

Cole no SQL Editor e execute.

### 3.4 WhatsApp Media Bucket
```bash
Get-Content supabase\migrations\20251230_whatsapp_media_bucket.sql | clip
```

Cole no SQL Editor e execute.

## Passo 4: Verificar Aplicação

Execute esta query para verificar se tudo foi criado:

```sql
-- Verificar tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'whatsapp%'
ORDER BY table_name;

-- Verificar extensões
SELECT * FROM pg_extension
WHERE extname IN ('pg_cron', 'pgmq', 'vector');

-- Verificar filas PGMQ
SELECT queue_name FROM pgmq.list_queues();

-- Verificar bucket Storage
SELECT * FROM storage.buckets WHERE id = 'whatsapp-media';
```

## Resultado Esperado

Você deve ver:
- ✅ 5 tabelas whatsapp_*
- ✅ 3 extensões habilitadas
- ✅ 2 filas PGMQ criadas
- ✅ 1 bucket 'whatsapp-media'

## Em Caso de Erro

Se alguma tabela já existir, você pode:
1. Ignorar (se for exatamente igual)
2. Ou fazer DROP TABLE antes (⚠️ cuidado com dados existentes)

---

**Próximo passo**: Deploy das Edge Functions
