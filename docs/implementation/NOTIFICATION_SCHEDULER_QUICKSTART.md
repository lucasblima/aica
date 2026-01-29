# Notification Scheduler - Quick Start Guide

## Issue #173: Implementação do Sistema de Notificações Agendadas

## Setup Rápido (5 minutos)

### 1. Aplicar Migrations

```bash
# Aplicar todas as migrations de notificações
npx supabase db push
```

Migrations aplicadas:
- ✅ `20251230000002_scheduled_notifications.sql` - Tabelas e funções base
- ✅ `20260129000001_notification_scheduler_cron.sql` - CRON jobs
- ✅ `20260129000002_configure_notification_settings.sql` - Configurações

### 2. Configurar Variáveis de Ambiente

#### Supabase Dashboard → Edge Functions → Secrets

Adicionar as seguintes secrets:

```bash
EVOLUTION_API_URL=https://your-evolution-api.com
EVOLUTION_API_KEY=your-api-key
EVOLUTION_INSTANCE_NAME=Lucas_4569
SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Supabase Dashboard → SQL Editor

Configurar database settings:

```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://uzywajqzbdbrfammshdg.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 3. Verificar Instalação

Execute o teste de configuração:

```sql
SELECT test_notification_config();
```

Resultado esperado:
```json
{
  "supabase_url_configured": true,
  "service_role_key_configured": true,
  "pg_cron_installed": true,
  "http_extension_installed": true,
  "cron_job_exists": true,
  "test_timestamp": "2026-01-29T..."
}
```

### 4. Deploy Edge Function

```bash
# Deploy notification-sender Edge Function
npx supabase functions deploy notification-sender
```

### 5. Testar Sistema

Execute o script de teste:

```bash
# No Supabase SQL Editor, copie e execute:
# test-notification-system.sql
```

## Uso Básico

### Frontend - Criar Notificação

```typescript
import { scheduleReminder } from '@/services/notificationSchedulerService';

// Agendar lembrete simples
await scheduleReminder(
  '5511987654321',              // Phone
  'Lembrete: Reunião às 15h',  // Message
  '2026-01-29T15:00:00Z',       // When
  'Lucas'                       // Name (optional)
);
```

### Frontend - Usar Hook de Notificações

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    refresh,
  } = useNotifications();

  return (
    <div>
      <p>{unreadCount} não lidas</p>
      {notifications.map(n => (
        <div key={n.id} onClick={() => markAsRead(n.id)}>
          {n.body}
        </div>
      ))}
    </div>
  );
}
```

### Frontend - Adicionar NotificationBell

```typescript
import { NotificationBell } from '@/components/features';

// No Header ou qualquer componente
<NotificationBell />
```

## Casos de Uso Comuns

### 1. Lembrete de Tarefa

```typescript
import { scheduleReminder } from '@/services/notificationSchedulerService';

await scheduleReminder(
  userPhone,
  `Lembrete: ${taskTitle} às ${taskTime}`,
  taskDateTime,
  userName
);
```

### 2. Relatório Diário Recorrente

```typescript
import { scheduleDailyReport } from '@/services/notificationSchedulerService';

await scheduleDailyReport(
  userPhone,
  '09:00',  // Hora do dia
  userName,
  {
    summary: 'Suas tarefas do dia...',
    pending_tasks: '5'
  }
);
```

### 3. Resumo Semanal

```typescript
import { scheduleWeeklySummary } from '@/services/notificationSchedulerService';

await scheduleWeeklySummary(
  userPhone,
  1,        // 1 = Segunda-feira (0 = Domingo)
  '18:00',  // Hora
  userName
);
```

### 4. Notificação Imediata (In-App)

```typescript
import { createNotification } from '@/services/notificationSchedulerService';

await createNotification({
  target_phone: userPhone,
  notification_type: 'custom',
  message_template: 'Nova mensagem de {{sender}}',
  message_variables: { sender: 'João Silva' },
  scheduled_for: new Date().toISOString(), // Agora
  priority: 3,
});
```

## Monitoramento

### Ver Status do Sistema

```sql
SELECT * FROM notification_system_health;
```

### Ver Estatísticas do Usuário

```sql
SELECT get_notification_stats(auth.uid());
```

### Ver CRON Jobs

```sql
SELECT * FROM cron.job WHERE jobname LIKE '%notification%';
```

### Ver Logs Recentes

```sql
SELECT
  attempt_number,
  status,
  error_message,
  duration_ms,
  created_at
FROM notification_log
WHERE created_at > now() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

## Troubleshooting

### ❌ Notificações não processam

**Verificar:**
1. CRON job está ativo:
```sql
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-notifications';
```

2. Processar manualmente:
```sql
SELECT trigger_notification_processing();
```

3. Ver logs da Edge Function:
```bash
npx supabase functions logs notification-sender --tail
```

### ❌ Edge Function retorna erro

**Verificar secrets:**
```bash
npx supabase secrets list
```

**Testar manualmente:**
```bash
curl -X POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/notification-sender \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"mode": "auto", "batch_size": 10}'
```

### ❌ Real-time não atualiza

**Verificar replicação:**
- Supabase Dashboard → Database → Replication
- Habilitar `scheduled_notifications` table

### ❌ CRON não executa

**Verificar job history:**
```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

**Verificar database settings:**
```sql
SHOW app.settings.supabase_url;
SHOW app.settings.service_role_key;
```

## Estrutura de Arquivos

```
Aica_frontend/
├── supabase/
│   ├── migrations/
│   │   ├── 20251230000002_scheduled_notifications.sql
│   │   ├── 20260129000001_notification_scheduler_cron.sql
│   │   └── 20260129000002_configure_notification_settings.sql
│   └── functions/
│       └── notification-sender/
│           └── index.ts
├── src/
│   ├── services/
│   │   └── notificationSchedulerService.ts
│   ├── hooks/
│   │   └── useNotifications.ts
│   └── components/
│       └── features/
│           ├── NotificationBell.tsx
│           └── NotificationBell.css
├── docs/
│   └── implementation/
│       ├── NOTIFICATION_SCHEDULER_SYSTEM.md (documentação completa)
│       └── NOTIFICATION_SCHEDULER_QUICKSTART.md (este arquivo)
└── test-notification-system.sql (script de testes)
```

## Checklist de Deploy

### Development
- [x] Migrations aplicadas localmente
- [x] Edge Function testada localmente
- [x] Frontend integrado
- [x] Testes criados

### Staging/Production
- [ ] Migrations aplicadas via `npx supabase db push`
- [ ] Edge Function deployada
- [ ] Secrets configuradas
- [ ] Database settings configuradas
- [ ] CRON jobs verificados
- [ ] Sistema testado end-to-end
- [ ] Real-time testado
- [ ] Monitoring configurado

## Performance Esperada

- **Latência de processamento:** < 2s por notificação
- **Taxa de sucesso:** > 95%
- **Throughput:** ~1 mensagem/segundo (WhatsApp rate limit)
- **Batch size:** 50 notificações por execução
- **CRON interval:** 5 minutos

## Próximos Passos

1. **Integrar com módulos existentes:**
   - Atlas (lembretes de tarefas)
   - Journey (prompts de consciência)
   - Gamification (alertas de streak)

2. **Expandir canais:**
   - Email (SendGrid/Postmark)
   - Push Notifications (Firebase)
   - SMS (Twilio)

3. **Melhorar analytics:**
   - Dashboard de métricas
   - A/B testing de templates
   - Otimização de horários

## Suporte

- **Documentação completa:** `docs/implementation/NOTIFICATION_SCHEDULER_SYSTEM.md`
- **Issues:** GitHub Issue #173
- **Logs:** `npx supabase functions logs notification-sender --tail`

---

**Maintainers:** Lucas Boscacci Lima + Claude Sonnet 4.5
**Date:** 2026-01-29
