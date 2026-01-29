# Connection Invitations Email System

**Última atualização:** 2026-01-29
**Issue:** #172
**Status:** ✅ Implementado

## Visão Geral

Sistema completo de envio de emails para convites de membros no módulo Connections. Utiliza **Resend** como provedor de email, com template HTML responsivo e tracking de entrega.

---

## Arquitetura

### Fluxo de Convite

```
1. Frontend → invitationService.createInvitation()
2. Criar registro em connection_invitations (status: pending)
3. Gerar token único (UUID sem hyphens)
4. Chamar Edge Function send-invitation-email
5. Resend API → Enviar email com template HTML
6. Atualizar email_delivery_status (sent/failed)
7. Usuário clica link no email → /invite/{token}
8. acceptInvitation() → Adicionar em connection_members
9. Atualizar status → accepted
```

---

## Database Schema

### Tabela: `connection_invitations`

**Migration:** `20260129000001_connection_invitations.sql`

```sql
CREATE TABLE connection_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES connection_spaces(id) ON DELETE CASCADE,

    -- Invitee
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,

    -- Status
    status connection_invitation_status DEFAULT 'pending',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    role connection_member_role DEFAULT 'member',

    -- Email Tracking
    email_sent_at TIMESTAMPTZ,
    email_delivery_status email_delivery_status DEFAULT 'pending',
    email_delivery_error TEXT,

    -- Lifecycle
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enum Types

```sql
-- Invitation status
CREATE TYPE connection_invitation_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'expired'
);

-- Email delivery status
CREATE TYPE email_delivery_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'bounced',
    'failed'
);
```

### RLS Policies

```sql
-- SELECT: Owner/admin OR invitee can view
CREATE POLICY "connection_invitations_select"
    ON connection_invitations FOR SELECT
    USING (
        can_manage_invitations(space_id)
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- INSERT/UPDATE/DELETE: Only owner/admin
CREATE POLICY "connection_invitations_insert"
    ON connection_invitations FOR INSERT
    WITH CHECK (can_manage_invitations(space_id));
```

### Helper Function

```sql
CREATE FUNCTION can_manage_invitations(_space_id uuid)
RETURNS boolean
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM connection_members
        WHERE space_id = _space_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
    ) OR EXISTS (
        SELECT 1 FROM connection_spaces
        WHERE id = _space_id AND user_id = auth.uid()
    );
END;
$$;
```

---

## Edge Function: send-invitation-email

**Path:** `supabase/functions/send-invitation-email/index.ts`

### Request Body

```typescript
{
  invitation_id: string;      // UUID da invitation
  to_email: string;           // Email do convidado
  inviter_name: string;       // Nome de quem convidou
  space_name: string;         // Nome do espaço
  space_archetype: 'habitat' | 'ventures' | 'academia' | 'tribo';
  token: string;              // Token único para link
}
```

### Response

**Sucesso (200):**
```json
{
  "success": true,
  "message": "Invitation email sent successfully",
  "messageId": "resend-message-id-123"
}
```

**Erro (500):**
```json
{
  "success": false,
  "error": "Failed to send email: [reason]"
}
```

### Template HTML

O template é responsivo, com design moderno e cores dinâmicas baseadas no archetype:

- **habitat:** Verde (#10b981)
- **ventures:** Azul (#3b82f6)
- **academia:** Roxo (#8b5cf6)
- **tribo:** Âmbar (#f59e0b)

**Estrutura:**
1. Header com gradiente do archetype
2. Saudação personalizada
3. Descrição do convite
4. Botão CTA "Aceitar Convite"
5. Link alternativo (para copiar)
6. Aviso de expiração (7 dias)
7. Footer com nome do inviter

### Secrets Necessários

Adicionar no **Supabase Dashboard → Edge Functions → Secrets**:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
APP_BASE_URL=https://aica-staging-5p22u2w6jq-rj.a.run.app
```

---

## Frontend Integration

### invitationService.ts

**Arquivo:** `src/modules/connections/services/invitationService.ts`

#### Criar Convite (com email)

```typescript
import { createInvitation } from '@/modules/connections/services/invitationService';

const result = await createInvitation(
  spaceId,
  'user@example.com',
  currentUserId,
  'member',  // Role: owner/admin/member/guest
  7          // Expira em 7 dias
);

if (result.success) {
  console.log('Invitation created:', result.invitation);
  console.log('Invite link:', result.inviteLink);
  // Email enviado automaticamente
} else {
  console.error('Error:', result.error);
}
```

#### Reenviar Convite

```typescript
import { resendInvitation } from '@/modules/connections/services/invitationService';

const result = await resendInvitation(invitationId);

if (result.success) {
  console.log('Invitation resent with new token');
  // Novo email enviado automaticamente
}
```

#### Aceitar Convite

```typescript
import { acceptInvitation } from '@/modules/connections/services/invitationService';

const result = await acceptInvitation(token, userId);

if (result.success) {
  console.log('User added to space as member');
  // Redirect to /connections/{space_id}
}
```

#### Listar Convites

```typescript
import { getSpaceInvitations } from '@/modules/connections/services/invitationService';

const invitations = await getSpaceInvitations(spaceId);

invitations.forEach(invite => {
  console.log(`${invite.email} - ${invite.status}`);
  console.log(`Email sent: ${invite.email_sent_at}`);
  console.log(`Delivery status: ${invite.email_delivery_status}`);
});
```

---

## Email Tracking

### Status Lifecycle

```
pending → sent → delivered
          ↓
        failed
          ↓
        bounced
```

### Campos de Tracking

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `email_sent_at` | TIMESTAMPTZ | Timestamp de envio |
| `email_delivery_status` | ENUM | Status de entrega |
| `email_delivery_error` | TEXT | Mensagem de erro (se falhou) |

### Atualização de Status

**Automática (Edge Function):**
- `sent` - Quando Resend API retorna sucesso
- `failed` - Quando Resend API retorna erro

**Manual (futura integração com Resend Webhooks):**
- `delivered` - Confirmação de entrega
- `bounced` - Email bounced (inválido)

---

## Resend Configuration

### 1. Criar Conta Resend

1. Acesse: https://resend.com/signup
2. Verifique email
3. Free tier: 3,000 emails/mês

### 2. Gerar API Key

1. Dashboard → API Keys
2. Create API Key
3. Nome: `aica-invitations`
4. Permissões: `Sending access`
5. Copiar chave (começa com `re_`)

### 3. Configurar Domínio (Opcional)

**Para usar email personalizado:**

1. Dashboard → Domains → Add Domain
2. Domain: `aica.app`
3. Adicionar DNS records (TXT, MX, CNAME)
4. Aguardar verificação (~10 min)
5. Email from: `noreply@aica.app`

**Sem domínio:**
- Email from: `noreply@resend.dev` (domínio compartilhado)

### 4. Webhooks (Futuro)

Para rastrear `delivered` e `bounced`:

1. Dashboard → Webhooks → Add Endpoint
2. URL: `https://[supabase-url]/functions/v1/resend-webhook`
3. Events: `email.delivered`, `email.bounced`, `email.complained`
4. Criar Edge Function para processar webhooks

---

## Security Considerations

### 1. Token Generation

```typescript
function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
```

- **Formato:** UUID v4 sem hyphens (32 caracteres hexadecimais)
- **Entropia:** 122 bits
- **Único:** Constraint UNIQUE no banco

### 2. Token Expiration

- **Default:** 7 dias
- **Validação:** `expires_at > NOW()`
- **Auto-expire:** Trigger ou cron job atualiza status para `expired`

### 3. Email Validation

```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

- Validação frontend + backend
- Normalização: `email.toLowerCase()`

### 4. RLS Policies

- **Isolamento:** Usuários só veem convites de seus espaços
- **SECURITY DEFINER:** Previne recursão RLS
- **Least Privilege:** Service role key apenas em Edge Function

---

## Testing

### Manual Testing

```bash
# 1. Apply migration
npx supabase db push

# 2. Deploy Edge Function
npx supabase functions deploy send-invitation-email

# 3. Set secrets
npx supabase secrets set RESEND_API_KEY=re_xxxxx

# 4. Test in frontend
# - Create connection space
# - Invite member via UI
# - Check email inbox
# - Click invite link
# - Verify member added
```

### Unit Tests (TODO)

```typescript
describe('invitationService', () => {
  it('creates invitation and sends email', async () => {
    const result = await createInvitation(
      'space-id',
      'test@example.com',
      'user-id'
    );

    expect(result.success).toBe(true);
    expect(result.invitation.email_delivery_status).toBe('sent');
  });

  it('validates email format', async () => {
    const result = await createInvitation(
      'space-id',
      'invalid-email',
      'user-id'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid email');
  });
});
```

---

## Troubleshooting

### Email não enviado

**Sintoma:** `email_delivery_status = 'pending'` ou `'failed'`

**Debug:**
1. Verificar secrets no Supabase Dashboard
2. Checar logs da Edge Function:
   ```bash
   npx supabase functions logs send-invitation-email --tail
   ```
3. Testar Resend API diretamente:
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer re_xxxxx" \
     -H "Content-Type: application/json" \
     -d '{"from":"noreply@resend.dev","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
   ```

### Email vai para spam

**Solução:**
1. Configurar SPF, DKIM, DMARC no domínio
2. Usar domínio verificado no Resend
3. Evitar palavras de spam no subject/body
4. Aquecer domínio (enviar poucos emails inicialmente)

### Token expirado

**Sintoma:** `Invitation has expired`

**Solução:**
1. Reenviar convite: `resendInvitation(invitationId)`
2. Novo token gerado automaticamente
3. Novo email enviado

### RLS policy negando acesso

**Sintoma:** `new row violates row-level security policy`

**Debug:**
```sql
-- Verificar se usuário é owner/admin
SELECT * FROM connection_members
WHERE space_id = 'space-id'
  AND user_id = auth.uid()
  AND role IN ('owner', 'admin');

-- Verificar função helper
SELECT can_manage_invitations('space-id');
```

---

## Future Enhancements

### Phase 2: Webhooks Resend

- [ ] Criar Edge Function `resend-webhook`
- [ ] Processar eventos: `email.delivered`, `email.bounced`
- [ ] Atualizar `email_delivery_status` automaticamente
- [ ] Notificar owner se email bounced

### Phase 3: Email Templates

- [ ] Template customizável por archetype
- [ ] Suporte a i18n (PT/EN/ES)
- [ ] Preview de email antes de enviar
- [ ] A/B testing de subject lines

### Phase 4: Analytics

- [ ] Dashboard de convites (enviados, aceitos, rejeitados)
- [ ] Taxa de conversão por archetype
- [ ] Tempo médio de aceitação
- [ ] Emails mais engajados

### Phase 5: Batch Invitations

- [ ] Convidar múltiplos emails de uma vez
- [ ] Upload CSV de contatos
- [ ] Rate limiting (evitar spam)
- [ ] Fila de envio assíncrona

---

## Related Documentation

- **Database Schema:** `supabase/migrations/20260129000001_connection_invitations.sql`
- **Edge Function:** `supabase/functions/send-invitation-email/index.ts`
- **Service Layer:** `src/modules/connections/services/invitationService.ts`
- **Backend Architecture:** `docs/architecture/backend_architecture.md`

---

## Changelog

| Data | Mudança | Autor |
|------|---------|-------|
| 2026-01-29 | Sistema inicial implementado | Backend Architect Agent |
| 2026-01-29 | Migration + Edge Function + Service | Backend Architect Agent |

---

**Maintainers:** Backend Architect Agent
**Status:** ✅ Ready for Production (pending Resend API key configuration)
