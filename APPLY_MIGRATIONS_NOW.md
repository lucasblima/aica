# 🚨 Aplicar Migrations AGORA - Fixes Críticos

**Data**: 2026-01-21
**Urgência**: ALTA - Resolve erros 406 e 400 bloqueadores

---

## 📋 Passo a Passo

### **Migration 1: Fix Users Table (Resolve erro 406)**

#### 1. Abra o SQL Editor do Supabase
```
https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new
```

#### 2. Copie TODO o conteúdo do arquivo:
```
supabase/migrations/20260121000006_fix_users_table_missing_columns.sql
```

#### 3. Cole no SQL Editor e clique em **RUN**

#### 4. Verifique sucesso:
Você deve ver mensagens como:
- `ALTER TABLE`
- `UPDATE X rows`
- `CREATE OR REPLACE FUNCTION`
- `CREATE TRIGGER`

**Se houver erro**: Copie a mensagem de erro e me mostre.

---

### **Migration 2: Grant WhatsApp RPC Permissions (Resolve erro 400)**

#### 1. No mesmo SQL Editor (ou abra novo)

#### 2. Copie TODO o conteúdo do arquivo:
```
supabase/migrations/20260121000007_grant_whatsapp_rpc_permissions.sql
```

#### 3. Cole no SQL Editor e clique em **RUN**

#### 4. Verifique sucesso:
Você deve ver:
- `GRANT`
- `GRANT`
- `GRANT`
- (várias vezes)

**Se houver erro**: Copie a mensagem de erro e me mostre.

---

## ✅ Verificação

Após aplicar AMBAS as migrations, teste:

### Teste 1: Users Table (406)
Abra o console do navegador e verifique:
- ❌ **ANTES**: `GET .../users?... 406 (Not Acceptable)`
- ✅ **DEPOIS**: Requisição deve retornar 200 OK

### Teste 2: WhatsApp Pairing (400)
Tente gerar pairing code:
- ❌ **ANTES**: `POST .../generate-pairing-code 400 (Bad Request)`
- ✅ **DEPOIS**: Deve retornar código de 8 dígitos

---

## 🔄 Se Algo Der Errado

### Rollback Migration 1 (se necessário):
```sql
-- Remove columns added
ALTER TABLE public.users
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS active,
  DROP COLUMN IF EXISTS onboarding_completed,
  DROP COLUMN IF EXISTS onboarding_version,
  DROP COLUMN IF EXISTS onboarding_completed_at;

-- Drop functions and triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS sync_user_from_auth ON auth.users;
DROP FUNCTION IF EXISTS public.ensure_user_profile_exists(UUID);
DROP FUNCTION IF EXISTS public.handle_new_user();
```

### Rollback Migration 2 (não necessário, GRANTs são seguros):
GRANTs não quebram nada, apenas adicionam permissões.

---

## 📝 Depois de Aplicar

Me avise que aplicou as migrations e eu continuo com:
1. Commitar o fix do getUserProfile()
2. Adicionar tests ao PR #149
3. Merge do PR #149

---

**Instruções preparadas por**: Claude Sonnet 4.5
**Documentação completa**: `docs/CRITICAL_FIXES_ISSUE_1_2.md`
