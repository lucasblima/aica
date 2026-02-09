# Quick Setup Guide: Invitation Email System

**Issue:** #172
**Time to deploy:** ~10 minutos

---

## Prerequisites

- [ ] Conta no Resend (https://resend.com/signup)
- [ ] Acesso ao Supabase Dashboard
- [ ] Supabase CLI instalado (`npm i -g supabase`)

---

## Step 1: Apply Database Migration (2 min)

```bash
# 1. Verificar migração
cat supabase/migrations/20260129000001_connection_invitations.sql

# 2. Aplicar localmente (teste)
npx supabase db reset

# 3. Aplicar em staging/produção
npx supabase db push --project-ref uzywajqzbdbrfammshdg
```

**Verificar criação:**
```sql
SELECT tablename FROM pg_tables WHERE tablename = 'connection_invitations';
SELECT typname FROM pg_type WHERE typname IN ('connection_invitation_status', 'email_delivery_status');
```

---

## Step 2: Configure Resend API (3 min)

### 2.1. Criar API Key

1. Login: https://resend.com/login
2. Dashboard → **API Keys**
3. **Create API Key**
   - Name: `aica-invitations`
   - Permission: `Sending access`
4. **Copy** key (começa com `re_`)

### 2.2. Configure Secrets

**Via Supabase Dashboard:**
1. https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg
2. **Edge Functions** → **Secrets**
3. Adicionar:
   ```
   RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxx
   APP_BASE_URL = https://aica-staging-5562559893.southamerica-east1.run.app
   ```

**Via CLI:**
```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxx --project-ref uzywajqzbdbrfammshdg
npx supabase secrets set APP_BASE_URL=https://aica-staging-5562559893.southamerica-east1.run.app --project-ref uzywajqzbdbrfammshdg
```

---

## Step 3: Deploy Edge Function (2 min)

```bash
# 1. Deploy function
npx supabase functions deploy send-invitation-email --project-ref uzywajqzbdbrfammshdg

# 2. Verificar deploy
npx supabase functions list --project-ref uzywajqzbdbrfammshdg

# 3. Testar endpoint
curl -X POST \
  https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/send-invitation-email \
  -H "Content-Type: application/json" \
  -d '{"invitation_id":"test","to_email":"test@example.com","inviter_name":"Test","space_name":"Test Space","space_archetype":"habitat","token":"abc123"}'
```

---

## Step 4: Test End-to-End (3 min)

### 4.1. Via Frontend (Recommended)

1. Login no app: https://aica-staging-5562559893.southamerica-east1.run.app/
2. Navigate to **Connections**
3. Create/open connection space
4. Click **"Convidar Membro"**
5. Enter email (use seu email pessoal para teste)
6. Submit
7. **Check inbox** (incluindo spam)

### 4.2. Via Code

```typescript
import { createInvitation } from '@/modules/connections/services/invitationService';

const result = await createInvitation(
  'your-space-id',
  'your-email@example.com',
  'your-user-id',
  'member',
  7
);

console.log('Result:', result);
// Expected: { success: true, invitation: {...}, inviteLink: "..." }
```

### 4.3. Verify Database

```sql
-- Check invitation created
SELECT * FROM connection_invitations
ORDER BY created_at DESC
LIMIT 5;

-- Check email status
SELECT
  email,
  email_sent_at,
  email_delivery_status,
  email_delivery_error
FROM connection_invitations
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## Step 5: Monitor (Ongoing)

### Edge Function Logs

```bash
# Real-time logs
npx supabase functions logs send-invitation-email --tail --project-ref uzywajqzbdbrfammshdg

# Last 100 lines
npx supabase functions logs send-invitation-email --limit 100 --project-ref uzywajqzbdbrfammshdg
```

### Resend Dashboard

1. https://resend.com/emails
2. Ver emails enviados
3. Status: Sent / Delivered / Bounced
4. Open rate (se ativado)

---

## Troubleshooting Checklist

### Email não enviado

- [ ] `RESEND_API_KEY` configurado corretamente?
- [ ] Edge Function deployed com sucesso?
- [ ] Logs mostram erro? (`npx supabase functions logs send-invitation-email`)
- [ ] Resend Dashboard mostra email na lista?
- [ ] Email foi para spam?

### Erro 401 Unauthorized

```bash
# Verificar se secret está configurado
npx supabase secrets list --project-ref uzywajqzbdbrfammshdg

# Re-set secret
npx supabase secrets set RESEND_API_KEY=re_xxxxx --project-ref uzywajqzbdbrfammshdg
```

### Erro 500 Internal Server Error

```bash
# Ver logs detalhados
npx supabase functions logs send-invitation-email --tail

# Testar Resend API diretamente
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@resend.dev",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>This is a test</p>"
  }'
```

### Migration failed

```sql
-- Rollback manual (se necessário)
DROP TABLE IF EXISTS connection_invitations;
DROP TYPE IF EXISTS connection_invitation_status;
DROP TYPE IF EXISTS email_delivery_status;
DROP FUNCTION IF EXISTS can_manage_invitations(uuid);

-- Re-apply
\i supabase/migrations/20260129000001_connection_invitations.sql
```

---

## Production Checklist

Antes de ir para produção:

- [ ] Configurar domínio no Resend (evitar `@resend.dev`)
- [ ] Verificar SPF/DKIM no DNS
- [ ] Testar com múltiplos provedores (Gmail, Outlook, Yahoo)
- [ ] Configurar rate limiting (evitar spam)
- [ ] Adicionar analytics de email (open rate, click rate)
- [ ] Configurar webhooks Resend (opcional)
- [ ] Backup da tabela `connection_invitations`

---

## Environment Variables Summary

| Variable | Required | Example | Where |
|----------|----------|---------|-------|
| `RESEND_API_KEY` | ✅ | `re_123abc...` | Supabase Secrets |
| `APP_BASE_URL` | ✅ | `https://aica-staging-...` | Supabase Secrets |
| `SUPABASE_URL` | Auto | `https://...supabase.co` | Edge Function env |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | `eyJhbGc...` | Edge Function env |

---

## Support

**Issues:** GitHub #172
**Docs:** `docs/features/CONNECTION_INVITATIONS_EMAIL_SYSTEM.md`
**Backend Architect:** backend-architect-supabase agent

---

## Next Steps (Optional)

1. **Custom Domain Email:**
   - Configure `noreply@aica.app` no Resend
   - Adicionar DNS records (TXT, MX, CNAME)

2. **Email Templates:**
   - Customizar por archetype
   - Suporte i18n (PT/EN/ES)

3. **Webhooks:**
   - Rastrear `delivered` e `bounced`
   - Auto-cleanup de emails inválidos

4. **Analytics:**
   - Dashboard de convites
   - Taxa de aceitação por archetype
