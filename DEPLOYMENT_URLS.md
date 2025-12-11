# 🔗 URLs e Endpoints - Deployment Completo

## 📍 Supabase Project URLs

**Project ID:** `gppebtrshbvuzatmebhr`

### Dashboard
- 🔗 [Supabase Dashboard](https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr)
- 🔗 [Edge Functions Console](https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr/functions)
- 🔗 [SQL Editor](https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr/sql)
- 🔗 [Table Editor](https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr/editor)

### API Endpoints
- **REST API Base:** `https://gppebtrshbvuzatmebhr.supabase.co/rest/v1`
- **GraphQL API:** `https://gppebtrshbvuzatmebhr.supabase.co/graphql/v1`

---

## 🚀 Edge Functions URLs

### Webhook Evolution (Nova)
```
https://gppebtrshbvuzatmebhr.supabase.co/functions/v1/webhook-evolution
```
- **Método:** POST
- **Descrição:** Recebe webhooks da Evolution API
- **Evento:** `messages.upsert`, `connection.update`

### Gemini Chat (Atualizado)
```
https://gppebtrshbvuzatmebhr.supabase.co/functions/v1/gemini-chat
```
- **Método:** POST
- **Ações:** Novo action `whatsapp_sentiment` para análise
- **Exemplo de Payload:**
```json
{
  "action": "whatsapp_sentiment",
  "payload": {
    "text": "Mensagem para análise",
    "instance": "user_instance"
  }
}
```

---

## 📊 Database Tables

### message_embeddings
```sql
-- Listar embeddings
SELECT id, user_id, remote_jid, sentiment, created_at
FROM message_embeddings
ORDER BY created_at DESC
LIMIT 10;

-- Busca semântica (exemplo)
SELECT id, remote_jid, message_text,
       1 - (embedding <=> '[...]') as similarity
FROM message_embeddings
WHERE user_id = 'YOUR_USER_ID'
ORDER BY similarity DESC
LIMIT 5;
```

### memories
```sql
-- Ver memories criadas do WhatsApp
SELECT id, user_id, content, sentiment, message_embedding_id, created_from
FROM memories
WHERE created_from = 'whatsapp'
ORDER BY created_at DESC
LIMIT 10;
```

### contact_network
```sql
-- Ver contatos atualizados
SELECT user_id, phone, health_score, last_interaction
FROM contact_network
ORDER BY last_interaction DESC
LIMIT 10;
```

### Cron Jobs
```sql
-- Listar jobs agendados
SELECT jobname, schedule, command
FROM cron.job
ORDER BY jobname;

-- Status de execução
SELECT jobname, start_time, end_time, status
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- Monitorar jobs específicos
SELECT * FROM cron.job_run_details
WHERE jobname LIKE '%evolution%' OR jobname LIKE '%memories%'
ORDER BY start_time DESC
LIMIT 10;
```

---

## 🔐 Environment Variables (Supabase)

**Localização:** Project Settings → Edge Functions → Environment Variables

### Variáveis Configuradas
```
EVOLUTION_API_URL=https://evolution-evolution-api.w9jo16.easypanel.host/
EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
EVOLUTION_WEBHOOK_SECRET=aica_webhook_secret_123
EVOLUTION_BOT_PHONE=5511987654321
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_DAILY_PER_USER=1000
GEMINI_API_KEY=AIzaSy...
SUPABASE_URL=https://gppebtrshbvuzatmebhr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## ⚙️ Evolution API Webhook Configuration

### Atual (n8n - Será Substituído)
```
https://n8n-n8n.w9jo16.easypanel.host/webhook/aicomtxae-client-4569
```

### Novo (Supabase - Alterar Para)
```
https://gppebtrshbvuzatmebhr.supabase.co/functions/v1/webhook-evolution
```

**Onde Alterar:** Painel Evolution API → Webhooks/Settings

---

## 📝 Arquivos de Documentação

### No Repositório
- 📄 [`QUICK_START.txt`](./QUICK_START.txt) - Resumo visual (2 min)
- 📄 [`DEPLOYMENT_COMPLETED.md`](./DEPLOYMENT_COMPLETED.md) - Relatório final (5 min)
- 📄 [`SERVERLESS_IMPLEMENTATION_SUMMARY.md`](./SERVERLESS_IMPLEMENTATION_SUMMARY.md) - Guia completo (15 min)
- 📄 [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) - Checklist técnico (10 min)
- 📄 [`GIT_CHANGES_SUMMARY.md`](./GIT_CHANGES_SUMMARY.md) - Mudanças de código (5 min)

---

## 🧪 Teste de Webhook

### Teste Local
```bash
# Com curl
curl -X POST https://gppebtrshbvuzatmebhr.supabase.co/functions/v1/webhook-evolution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "event": "messages.upsert",
    "instance": "userid_instance",
    "data": {
      "data": {
        "key": {
          "remoteJid": "5511987654321@s.whatsapp.net",
          "fromMe": false
        },
        "message": {
          "conversation": "Teste"
        },
        "messageTimestamp": '$(date +%s)'
      }
    }
  }'
```

---

## 📊 Monitorar Execução

### Logs em Tempo Real
```bash
# Via CLI
npx supabase functions logs webhook-evolution --project-ref gppebtrshbvuzatmebhr

# Via Dashboard
# https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr/functions
# → webhook-evolution → Logs
```

### Métricas
```bash
# Ver execution statistics
npx supabase functions list --project-ref gppebtrshbvuzatmebhr

# Detailed info
npx supabase functions info webhook-evolution --project-ref gppebtrshbvuzatmebhr
```

---

## 📈 Exemplos de Queries SQL

### Ver Dados Recentes
```sql
-- Últimas 10 mensagens processadas
SELECT
  id,
  user_id,
  remote_jid as contact,
  message_text,
  sentiment->>'label' as sentiment,
  created_at
FROM message_embeddings
ORDER BY created_at DESC
LIMIT 10;
```

### Busca Semântica
```sql
-- Encontrar mensagens similares
SELECT
  id,
  remote_jid,
  message_text,
  1 - (embedding <=> $1::vector) as similarity
FROM message_embeddings
WHERE user_id = $2::uuid
ORDER BY similarity DESC
LIMIT 5;

-- Substituir $1 com embedding vector
-- Substituir $2 com user_id
```

### Análise de Sentimento
```sql
-- Distribuição de sentimentos
SELECT
  sentiment->>'label' as sentiment,
  COUNT(*) as count,
  AVG((sentiment->>'score')::float) as avg_score
FROM message_embeddings
GROUP BY sentiment->>'label'
ORDER BY count DESC;
```

### Performance
```sql
-- Verificar índices
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'message_embeddings'
ORDER BY indexname;

-- Tamanho da tabela
SELECT
  pg_size_pretty(pg_total_relation_size('message_embeddings')) as size;
```

---

## 🔔 Cron Jobs Status

### Ver Próximas Execuções
```sql
SELECT
  jobname,
  schedule,
  CASE schedule
    WHEN '0 2 * * *' THEN '2 AM daily'
    WHEN '0 */6 * * *' THEN 'Every 6 hours'
    WHEN '0 3 * * 0' THEN 'Sunday 3 AM'
    WHEN '0 4 * * *' THEN '4 AM daily'
    ELSE schedule
  END as description
FROM cron.job
WHERE jobname IN (
  'cleanup-old-message-embeddings',
  'sync-contact-network-from-embeddings',
  'archive-old-memories',
  'update-user-stats-from-embeddings'
)
ORDER BY jobname;
```

### Forçar Execução Manual
```sql
-- Executar cleanup agora
SELECT cron.force_run('cleanup-old-message-embeddings');

-- Ver resultado
SELECT * FROM cron.job_run_details
WHERE jobname = 'cleanup-old-message-embeddings'
ORDER BY start_time DESC
LIMIT 1;
```

---

## 🎯 Checklist de Verificação

### ✅ Migrations
- [ ] `message_embeddings` table criada
- [ ] Índices IVFFLAT criados
- [ ] RLS policy ativa
- [ ] `message_embedding_id` coluna em `memories`
- [ ] Cron jobs agendados (4/4)

### ✅ Edge Functions
- [ ] `webhook-evolution` deployado
- [ ] `gemini-chat` atualizado e deployado
- [ ] Environment variables configuradas
- [ ] CORS habilitado

### ✅ Integration
- [ ] Webhook URL alterada na Evolution API
- [ ] Primeira mensagem WhatsApp processada
- [ ] Dados aparecem em `message_embeddings`
- [ ] `memories` criadas com referência
- [ ] `contact_network` atualizado

---

## 🆘 Troubleshooting

### Se o webhook não responde
1. Verificar logs: `npx supabase functions logs webhook-evolution`
2. Verificar variables: Dashboard → Edge Functions → Environment Variables
3. Testar manualmente com curl (ver acima)

### Se dados não aparecem em message_embeddings
1. Verificar permissões RLS
2. Verificar se tabela existe: `SELECT * FROM message_embeddings LIMIT 1;`
3. Verificar Gemini API key está correta

### Se cron jobs não executam
1. Verificar se pg_cron foi habilitado
2. Listar jobs: `SELECT * FROM cron.job;`
3. Ver status: `SELECT * FROM cron.job_run_details LIMIT 10;`

---

## 📞 Suporte Rápido

| Problema | Solução |
|----------|---------|
| Webhook não recebe eventos | Alterar URL na Evolution API |
| Dados não aparecem | Verificar env vars e RLS |
| Embeddings inválidos | Verificar Google API key |
| Cron jobs não executam | Verificar pg_cron habilitado |
| CORS errors | Verificar CORS_ORIGIN env var |

---

**Última Atualização:** 2025-12-11
**Status:** ✅ Pronto para Produção
**Versão:** 1.0.0
