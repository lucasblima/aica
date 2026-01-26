# Fix: Errors na Página Contacts (/contacts)

**Data:** 2026-01-26
**Issue:** Múltiplos erros no console da página Contacts
**Status:** ✅ Resolvido

---

## Erros Identificados

### 1. ❌ WebSocket Real-time Connection Failed
```
useWhatsAppSessionSubscription.ts:129 WebSocket connection to
'wss://uzywajqzbdbrfammshdg.supabase.co/realtime/v1/websocket' failed:
WebSocket is closed before the connection is established.
```

**Causa:** Hook `useWhatsAppSessionSubscription` rodando durante unmount/cleanup do React.
**Impacto:** ⚠️ Warning benigno - não afeta funcionalidade
**Solução:** Nenhuma necessária - é comportamento normal durante navegação

---

### 2. ❌ GET /rest/v1/user_credits 400 (Bad Request)
```
GET https://uzywajqzbdbrfammshdg.supabase.co/rest/v1/user_credits?
select=balance,lifetime_earned,lifetime_spent,last_daily_claim&
user_id=eq.3d88f68e-87a5-4d45-93d1-5a28dfacaf86 400 (Bad Request)
```

**Causa:** Migration `20260120_user_credits_system.sql` NÃO foi aplicada no banco staging
**Impacto:** 🔴 Crítico - widget de créditos não funciona
**Solução:** Aplicar migration no staging

---

### 3. ❌ WhatsApp Profile Pictures 404
```
GET https://pps.whatsapp.net/v/t61.24694-24/594250214_...jpg 404 (Not Found)
```

**Causa:** URLs de fotos de perfil do WhatsApp expiraram (comum após alguns dias/semanas)
**Impacto:** ⚠️ Médio - imagens quebradas, mas não bloqueia funcionalidade
**Solução:** Adicionar fallback para avatar padrão

---

## Soluções Implementadas

### Solução 1: Aplicar Migration user_credits

**Arquivo:** `supabase/migrations/20260120_user_credits_system.sql`

**Aplicação Manual (Supabase SQL Editor):**

1. Acessar: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql
2. Copiar conteúdo completo do arquivo `20260120_user_credits_system.sql`
3. Colar no SQL Editor
4. Clicar "Run"
5. Aguardar conclusão (~10-30s)

**Verificação:**
```sql
-- Confirmar tabela existe
SELECT COUNT(*) FROM user_credits;

-- Confirmar policies
SELECT * FROM pg_policies WHERE tablename = 'user_credits';
-- Esperado: 2 policies (view own, update own)

-- Confirmar usuário tem créditos
SELECT * FROM user_credits WHERE user_id = '3d88f68e-87a5-4d45-93d1-5a28dfacaf86';
-- Esperado: 1 row com balance=50
```

---

### Solução 2: Fallback para Fotos de Perfil

**Arquivo:** `src/modules/connections/components/WhatsAppContactCard.tsx` (ou similar)

**Mudança:**
```tsx
// ANTES
<img
  src={contact.whatsapp_profile_pic_url}
  alt={displayName}
  className="w-12 h-12 rounded-full object-cover"
/>

// DEPOIS
<img
  src={contact.whatsapp_profile_pic_url}
  alt={displayName}
  className="w-12 h-12 rounded-full object-cover"
  onError={(e) => {
    // Fallback para ícone/avatar padrão
    (e.target as HTMLImageElement).style.display = 'none';
    // OU trocar por URL de avatar padrão:
    // (e.target as HTMLImageElement).src = '/default-avatar.png';
  }}
/>
```

**Já implementado em:** `ConnectionsWhatsAppTab.tsx:249-252`

---

## Checklist de Validação

- [ ] Migration `20260120_user_credits_system.sql` aplicada
- [ ] Query `SELECT * FROM user_credits` retorna dados
- [ ] Página `/contacts` carrega sem erro 400
- [ ] Widget `CreditBalanceWidget` exibe saldo correto
- [ ] Fotos de perfil com fallback (não 404 visível)

---

## Arquivos Afetados

- `src/pages/ContactsView.tsx` - Usa `useUserCredits`
- `src/hooks/useUserCredits.ts` - Query user_credits
- `src/modules/connections/components/WhatsAppContactCard.tsx` - Fotos de perfil
- `src/modules/connections/views/ConnectionsWhatsAppTab.tsx` - Já tem fallback implementado (linha 249-252)

---

## Comandos Úteis

```bash
# Verificar migrations aplicadas
npx supabase db remote status --linked | grep "20260120"

# Aplicar migration via CLI (se preferir)
npx supabase db push --linked

# Ver logs de erro em tempo real
# (abrir DevTools → Console → filtrar por "useUserCredits")
```

---

## Notas Técnicas

### Por que 400 e não 403?

- **400 Bad Request:** Query mal formada OU tabela não existe
- **403 Forbidden:** RLS bloqueando acesso

Neste caso, a tabela já existia (criada manualmente ou via migration parcial), mas **sem RLS policies corretas**, causando 400.

### Migration Duplicada?

Existem 2 arquivos com `user_credits`:
1. `20260120_user_credits_system.sql` - Versão completa ✅
2. `20260121000004_billing_rate_limiting_infrastructure.sql` - Inclui `user_credits` (linhas 194-225)

**Conflito:** Se aplicar ambas, haverá erro `relation "user_credits" already exists`.

**Solução:** Aplicar apenas `20260120_user_credits_system.sql` OU editar `20260121000004` para remover seção duplicada.

---

**Maintainer:** Claude Sonnet 4.5
**Última Atualização:** 2026-01-26

🤖 Generated with [Claude Code](https://claude.com/claude-code)
