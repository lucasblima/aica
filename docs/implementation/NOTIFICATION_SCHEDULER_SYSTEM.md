# Notification Scheduler System - Issue #173

## Visão Geral

Sistema completo de notificações agendadas para Aica Life OS, suportando múltiplos canais (in-app, email, push, WhatsApp) com processamento automático via CRON jobs.

## Arquitetura

### Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                      NOTIFICATION SCHEDULER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Frontend   │    │   Database   │    │ Edge Function│     │
│  │              │    │              │    │              │     │
│  │ - useNotif   │───▶│ scheduled_   │◀───│ notification-│     │
│  │   ications   │    │ notifications│    │   sender     │     │
│  │ - Notif Bell │    │              │    │              │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                    ▲                     ▲            │
│         │                    │                     │            │
│         │            ┌──────────────┐              │            │
│         └───────────▶│   pg_cron    │──────────────┘            │
│                      │  (Every 5min)│                           │
│                      └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Processamento

1. **Criação** → Frontend cria notificação via `notificationSchedulerService.ts`
2. **Agendamento** → Registro salvo em `scheduled_notifications` com status `scheduled`
3. **Processamento** → CRON job executa a cada 5 minutos
4. **Disparo** → Edge Function `notification-sender` processa notificações devido
5. **Entrega** → Envia via canal apropriado (WhatsApp, in-app, etc.)
6. **Atualização** → Status atualizado para `sent` ou `failed`
7. **Real-time** → Frontend recebe atualização via Supabase Realtime

## Database Schema

### Tabela: `scheduled_notifications`

```sql
CREATE TABLE scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Target
  target_phone TEXT NOT NULL,
  target_name TEXT,

  -- Content
  notification_type TEXT NOT NULL,  -- reminder, daily_report, weekly_summary, custom, etc.
  message_template TEXT NOT NULL,
  message_variables JSONB DEFAULT '{}',

  -- Schedule
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,  -- daily, weekly, monthly, weekdays, weekends
  recurrence_config JSONB,
  recurrence_end_date DATE,

  -- Execution
  status TEXT DEFAULT 'scheduled',  -- scheduled, queued, sending, sent, failed, cancelled, expired
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  evolution_message_id TEXT,

  -- Metadata
  priority INTEGER DEFAULT 5,
  notification_group TEXT,
  rate_limit_key TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### Tabela: `notification_templates`

Templates pré-definidos para notificações comuns:

```sql
INSERT INTO notification_templates (template_key, template_name, message_template, notification_type)
VALUES
  ('daily_morning_motivation', 'Motivação Matinal',
   'Bom dia, {{name}}! Lembre-se: cada dia é uma nova oportunidade.',
   'daily_report'),

  ('task_reminder', 'Lembrete de Tarefa',
   'Oi {{name}}, lembrete: "{{task_title}}" está agendado para {{task_time}}.',
   'reminder');
```

### Tabela: `notification_log`

Log detalhado de todas as tentativas de envio:

```sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY,
  notification_id UUID REFERENCES scheduled_notifications(id),
  user_id UUID NOT NULL,
  target_phone TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,  -- success, failed, rate_limited
  error_message TEXT,
  evolution_response JSONB,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);
```

## CRON Jobs

### 1. Processar Notificações (Cada 5 minutos)

```sql
SELECT cron.schedule(
  'process-scheduled-notifications',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/notification-sender',
    headers := jsonb_build_object(
      'Authorization', 'Bearer [SERVICE_ROLE_KEY]'
    ),
    body := jsonb_build_object('mode', 'auto', 'batch_size', 50)
  );
  $$
);
```

### 2. Limpar Logs Antigos (Diariamente às 3h)

```sql
SELECT cron.schedule(
  'cleanup-notification-logs',
  '0 3 * * *',
  $$SELECT public.cleanup_old_notification_logs()$$
);
```

### 3. Marcar Notificações Expiradas (A cada hora)

```sql
SELECT cron.schedule(
  'mark-expired-notifications',
  '0 * * * *',
  $$SELECT public.mark_expired_notifications()$$
);
```

## Edge Function: notification-sender

### Funcionalidades

1. **Processamento em lote** - Até 50 notificações por execução
2. **Rate limiting** - 1.1s entre mensagens (WhatsApp compliance)
3. **Retry logic** - Exponential backoff: 5s, 15s, 60s
4. **Template engine** - Substituição de variáveis `{{name}}` → "Lucas"
5. **Logging completo** - Todas tentativas registradas em `notification_log`
6. **Recorrência** - Cria próxima ocorrência automaticamente

### Modos de Operação

#### Auto Mode (padrão)
```typescript
// Tenta queue primeiro, depois direct
POST /functions/v1/notification-sender
{
  "mode": "auto",
  "batch_size": 50
}
```

#### Queue Mode
```typescript
// Processa apenas mensagens na fila pgmq
{
  "mode": "queue",
  "batch_size": 50
}
```

#### Direct Mode
```typescript
// Processa diretamente da tabela
{
  "mode": "direct",
  "batch_size": 50
}
```

## Frontend Integration

### Hook: `useNotifications`

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const {
    notifications,      // Array de notificações
    unreadCount,        // Contador de não lidas
    stats,              // Estatísticas gerais
    isLoading,
    error,
    markAsRead,         // Marcar como lida
    markAllAsRead,      // Marcar todas como lidas
    deleteNotification, // Excluir notificação
    triggerProcessing,  // Processar manualmente
    refresh,            // Atualizar lista
  } = useNotifications();

  return (
    <div>
      <p>Você tem {unreadCount} notificações não lidas</p>
      {notifications.map(notif => (
        <div key={notif.id}>{notif.body}</div>
      ))}
    </div>
  );
}
```

### Componente: `NotificationBell`

```typescript
import { NotificationBell } from '@/components/features';

// Usar em HeaderGlobal ou qualquer outro lugar
<NotificationBell />
```

### Service: `notificationSchedulerService`

```typescript
import {
  createNotification,
  scheduleReminder,
  scheduleDailyReport,
  getScheduledNotifications,
  cancelNotification,
} from '@/services/notificationSchedulerService';

// Criar lembrete simples
await scheduleReminder(
  '5511987654321',
  'Lembrete: Reunião às 15h',
  '2026-01-29T15:00:00Z',
  'Lucas'
);

// Criar relatório diário recorrente
await scheduleDailyReport(
  '5511987654321',
  '09:00',  // Hora
  'Lucas',
  { summary: 'Suas tarefas do dia...', pending_tasks: '5' }
);

// Listar notificações agendadas
const { data } = await getScheduledNotifications('scheduled');

// Cancelar notificação
await cancelNotification(notificationId);
```

## RPC Functions

### `trigger_notification_processing()`

Dispara processamento manual (fora do CRON):

```sql
SELECT trigger_notification_processing();
```

```typescript
// Frontend
await supabase.rpc('trigger_notification_processing');
```

### `get_notification_stats(user_uuid)`

Retorna estatísticas do usuário:

```typescript
const { data: stats } = await supabase.rpc('get_notification_stats', {
  user_uuid: userId
});

// stats = {
//   total_scheduled: 5,
//   total_sent: 120,
//   total_failed: 2,
//   success_rate: 98.36,
//   next_scheduled: '2026-01-29T15:00:00Z',
//   last_sent: '2026-01-29T10:00:00Z'
// }
```

### `create_next_recurring_notification(notification_id)`

Cria próxima ocorrência de notificação recorrente:

```sql
SELECT create_next_recurring_notification('uuid-here');
```

## Casos de Uso

### 1. Lembrete de Tarefa

```typescript
await scheduleReminder(
  userPhone,
  'Lembrete: {{task_title}} às {{task_time}}',
  scheduledDateTime,
  userName
);
```

### 2. Relatório Diário (Recorrente)

```typescript
await scheduleDailyReport(
  userPhone,
  '09:00',
  userName,
  {
    summary: 'Resumo gerado automaticamente...',
    pending_tasks: '8'
  }
);
```

### 3. Resumo Semanal (Recorrente)

```typescript
await scheduleWeeklySummary(
  userPhone,
  1,  // Segunda-feira (0 = Domingo, 6 = Sábado)
  '18:00',
  userName
);
```

### 4. Alerta de Gamificação (Streak em risco)

```typescript
await createNotification({
  target_phone: userPhone,
  target_name: userName,
  notification_type: 'reminder',
  message_template: '🔥 Sua sequência de {{streak_days}} dias está em risco! Complete uma tarefa hoje.',
  message_variables: { streak_days: '7' },
  scheduled_for: new Date(Date.now() + 3600000).toISOString(), // Daqui 1h
  priority: 2, // Alta prioridade
});
```

### 5. Notificação In-App

```typescript
// Para notificações in-app, usar notification_type = 'custom'
await createNotification({
  target_phone: userPhone,
  notification_type: 'custom',
  message_template: 'Nova mensagem de {{sender_name}}',
  message_variables: { sender_name: 'João Silva' },
  scheduled_for: new Date().toISOString(), // Imediato
  priority: 3,
});

// Frontend receberá via useNotifications em tempo real
```

## Troubleshooting

### Notificações não estão sendo processadas

1. **Verificar CRON job:**
```sql
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-notifications';
```

2. **Verificar logs do Edge Function:**
```bash
npx supabase functions logs notification-sender --tail
```

3. **Processar manualmente:**
```sql
SELECT trigger_notification_processing();
```

### Edge Function retornando erro

1. **Verificar variáveis de ambiente:**
```bash
# Supabase Dashboard → Edge Functions → Secrets
EVOLUTION_API_URL=https://your-api.com
EVOLUTION_API_KEY=your-key
EVOLUTION_INSTANCE_NAME=Lucas_4569
SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

2. **Verificar permissões RLS:**
```sql
-- Service role deve ter acesso total
SELECT * FROM scheduled_notifications LIMIT 1;
```

### Notificações enviadas mas não recebidas

1. **Verificar logs:**
```sql
SELECT * FROM notification_log
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

2. **Verificar Evolution API:**
```bash
curl -X GET https://your-api.com/instance/connectionState/Lucas_4569 \
  -H "apikey: your-key"
```

### Real-time não funciona

1. **Verificar replicação:**
   - Supabase Dashboard → Database → Replication
   - Habilitar `scheduled_notifications` table

2. **Verificar subscription:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user?.id);

const channel = supabase
  .channel(`notifications:${user.id}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'scheduled_notifications',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    console.log('Real-time event:', payload);
  })
  .subscribe();
```

## Performance

### Otimizações Implementadas

1. **Índices estratégicos:**
   - `idx_scheduled_notifications_pending` - Query principal de processamento
   - `idx_scheduled_notifications_user` - Listagem por usuário
   - `idx_scheduled_notifications_rate_limit` - Rate limiting

2. **Processamento em lote:**
   - Máximo 50 notificações por execução
   - Evita timeouts em grandes volumes

3. **Rate limiting:**
   - 1.1s delay entre mensagens
   - Compliance com WhatsApp Business API

4. **Cleanup automático:**
   - Logs > 90 dias deletados diariamente
   - Notificações expiradas marcadas automaticamente

### Métricas de Monitoramento

```sql
-- Taxa de sucesso geral
SELECT
  COUNT(*) FILTER (WHERE status = 'sent') AS sent,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'sent')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'failed')), 0) * 100,
    2
  ) AS success_rate
FROM scheduled_notifications;

-- Tempo médio de processamento
SELECT
  AVG(duration_ms) AS avg_duration_ms,
  MAX(duration_ms) AS max_duration_ms
FROM notification_log
WHERE created_at > now() - INTERVAL '24 hours';

-- Notificações pendentes por prioridade
SELECT
  priority,
  COUNT(*) AS count
FROM scheduled_notifications
WHERE status = 'scheduled'
  AND scheduled_for <= now()
GROUP BY priority
ORDER BY priority;
```

## Security

### RLS Policies

Todas as tabelas têm RLS habilitado:

```sql
-- Usuários veem apenas suas próprias notificações
CREATE POLICY "Users can view own notifications"
  ON scheduled_notifications FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Usuários podem criar suas próprias notificações
CREATE POLICY "Users can create notifications"
  ON scheduled_notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

### SECURITY DEFINER Functions

Funções privilegiadas usam SECURITY DEFINER:

```sql
CREATE OR REPLACE FUNCTION trigger_notification_processing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$...$$;
```

## Migration Checklist

✅ **Concluído:**
- [x] Tabelas criadas (`20251230000002_scheduled_notifications.sql`)
- [x] CRON jobs configurados (`20260129000001_notification_scheduler_cron.sql`)
- [x] Edge Function `notification-sender` implementada
- [x] RPC functions criadas
- [x] Hook `useNotifications` criado
- [x] Componente `NotificationBell` criado
- [x] Service `notificationSchedulerService` existe
- [x] RLS policies aplicadas
- [x] Índices otimizados
- [x] Real-time subscriptions configuradas

⚠️ **Pendente (Deploy):**
- [ ] Configurar `app.settings.supabase_url` no database
- [ ] Configurar `app.settings.service_role_key` no database
- [ ] Testar CRON job em produção
- [ ] Verificar Evolution API integração

## Próximos Passos

1. **Integrar com Gamificação (Issue #?):**
   - Alertas de streak em risco
   - Notificação de novos badges
   - Lembretes de check-in diário

2. **Integrar com Atlas (Tarefas):**
   - Lembretes de tarefas próximas
   - Alertas de deadlines
   - Resumos de tarefas pendentes

3. **Integrar com Journey (Consciência):**
   - Prompts diários de reflexão
   - Resumos semanais de momentos
   - Insights de padrões emocionais

4. **Email Channel:**
   - Implementar envio via SendGrid/Postmark
   - Templates HTML para emails
   - Unsubscribe handling

5. **Push Notifications:**
   - Integrar com Firebase Cloud Messaging
   - Web Push API
   - Service Worker para offline support

---

**Maintainers:** Lucas Boscacci Lima + Claude Sonnet 4.5
**Issue:** #173
**Date:** 2026-01-29
