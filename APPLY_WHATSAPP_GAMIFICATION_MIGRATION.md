# Aplicar Migration WhatsApp Gamification - Instruções Manuais

## Status
- **Migration:** `20250101_whatsapp_gamification_tracking.sql`
- **Status Local:** ✅ Criada
- **Status Remoto:** ❌ NÃO APLICADA (confirmado via `npx supabase migration list`)

## Por que Manual?
A CLI `supabase db push` está encontrando conflitos de versão com migrations anteriores (erro: duplicate key `20241209`). A aplicação manual via Supabase Studio é mais segura e confiável.

---

## Passo a Passo para Aplicação Manual

### 1️⃣ Acessar Supabase Studio
1. Abra: https://supabase.com/dashboard
2. Selecione seu projeto: **Aica Life OS**
3. No menu lateral, clique em: **SQL Editor**

### 2️⃣ Copiar SQL da Migration
Abra o arquivo local:
```
supabase/migrations/20250101_whatsapp_gamification_tracking.sql
```

**Ou copie diretamente daqui:**

```sql
-- ============================================================================
-- WhatsApp Gamification Tracking Migration
-- ============================================================================
-- Created: 2025-01-01
-- Purpose: Track WhatsApp user activities for gamification badge unlocks
-- ============================================================================

-- 1. CREATE ACTIVITY TRACKING TABLE
CREATE TABLE IF NOT EXISTS whatsapp_user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'connection',
    'consent_grant',
    'analytics_view',
    'contact_analysis',
    'anomaly_check'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_whatsapp_activity_user
  ON whatsapp_user_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_activity_type
  ON whatsapp_user_activity(user_id, activity_type);

CREATE INDEX IF NOT EXISTS idx_whatsapp_activity_metadata
  ON whatsapp_user_activity USING GIN (metadata);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE whatsapp_user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own whatsapp activities"
  ON whatsapp_user_activity
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp activities"
  ON whatsapp_user_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. HELPER FUNCTION: Count Analytics Views
CREATE OR REPLACE FUNCTION count_whatsapp_analytics_views(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM whatsapp_user_activity
  WHERE user_id = p_user_id
    AND activity_type = 'analytics_view';
$$;

GRANT EXECUTE ON FUNCTION count_whatsapp_analytics_views(UUID) TO authenticated;

COMMENT ON FUNCTION count_whatsapp_analytics_views(UUID) IS
  'Returns total count of analytics views for a user (for badge unlocks)';

-- 5. HELPER FUNCTION: Count Unique Contacts Analyzed
CREATE OR REPLACE FUNCTION count_unique_contacts_analyzed(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT metadata->>'contact_hash')::INTEGER
  FROM whatsapp_user_activity
  WHERE user_id = p_user_id
    AND activity_type = 'contact_analysis'
    AND metadata->>'contact_hash' IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION count_unique_contacts_analyzed(UUID) TO authenticated;

COMMENT ON FUNCTION count_unique_contacts_analyzed(UUID) IS
  'Returns count of unique contacts analyzed by a user (for badge unlocks)';

-- 6. HELPER FUNCTION: Check All WhatsApp Consents Granted
CREATE OR REPLACE FUNCTION check_all_whatsapp_consents_granted(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*) = 5  -- Must have all 5 consent types granted
  FROM whatsapp_consent_records
  WHERE user_id = p_user_id
    AND status = 'granted'
    AND consent_type IN (
      'data_collection',
      'ai_processing',
      'sentiment_analysis',
      'notifications',
      'data_retention'
    );
$$;

GRANT EXECUTE ON FUNCTION check_all_whatsapp_consents_granted(UUID) TO authenticated;

COMMENT ON FUNCTION check_all_whatsapp_consents_granted(UUID) IS
  'Returns TRUE if user has granted all 5 WhatsApp consent types (for "Consent Champion" badge)';

-- 7. HELPER FUNCTION: Get User Activity Summary
CREATE OR REPLACE FUNCTION get_whatsapp_activity_summary(p_user_id UUID)
RETURNS TABLE (
  activity_type TEXT,
  count BIGINT,
  first_activity TIMESTAMPTZ,
  last_activity TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    activity_type,
    COUNT(*) as count,
    MIN(created_at) as first_activity,
    MAX(created_at) as last_activity
  FROM whatsapp_user_activity
  WHERE user_id = p_user_id
  GROUP BY activity_type
  ORDER BY count DESC;
$$;

GRANT EXECUTE ON FUNCTION get_whatsapp_activity_summary(UUID) TO authenticated;

COMMENT ON FUNCTION get_whatsapp_activity_summary(UUID) IS
  'Returns activity summary grouped by type for a user';

-- 8. TABLE COMMENTS
COMMENT ON TABLE whatsapp_user_activity IS
  'Tracks WhatsApp-related user activities for gamification badge unlocks and XP rewards';

COMMENT ON COLUMN whatsapp_user_activity.id IS
  'Unique identifier for each activity record';

COMMENT ON COLUMN whatsapp_user_activity.user_id IS
  'User who performed the activity';

COMMENT ON COLUMN whatsapp_user_activity.activity_type IS
  'Type of activity: connection, consent_grant, analytics_view, contact_analysis, anomaly_check';

COMMENT ON COLUMN whatsapp_user_activity.metadata IS
  'Optional metadata (e.g., contact_hash for contact_analysis, consent_type for consent_grant)';

COMMENT ON COLUMN whatsapp_user_activity.created_at IS
  'Timestamp when the activity occurred';
```

### 3️⃣ Executar SQL no Supabase Studio
1. Cole todo o SQL acima no **SQL Editor**
2. Clique em **Run** (ou pressione Ctrl+Enter)
3. Aguarde a mensagem de sucesso

### 4️⃣ Validar a Aplicação
Execute estas queries de validação no SQL Editor:

```sql
-- Verificar que a tabela foi criada
SELECT * FROM whatsapp_user_activity LIMIT 1;

-- Verificar que as funções RPC existem
SELECT count_whatsapp_analytics_views(auth.uid());
SELECT count_unique_contacts_analyzed(auth.uid());
SELECT check_all_whatsapp_consents_granted(auth.uid());
SELECT * FROM get_whatsapp_activity_summary(auth.uid());

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'whatsapp_user_activity';

-- Verificar indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'whatsapp_user_activity';
```

**Resultados Esperados:**
- ✅ Tabela `whatsapp_user_activity` existe e está vazia (ou com dados se já houver tracking)
- ✅ 4 funções RPC retornam valores (0 se não houver atividades ainda)
- ✅ 2 políticas RLS aparecem ("Users can view own whatsapp activities" e "Users can insert own whatsapp activities")
- ✅ 3 indexes aparecem (idx_whatsapp_activity_user, idx_whatsapp_activity_type, idx_whatsapp_activity_metadata)

---

## O que Esta Migration Faz?

### 📊 Tabela: `whatsapp_user_activity`
Rastreia todas as atividades de gamificação relacionadas ao WhatsApp:
- **connection**: Conexão do WhatsApp realizada
- **consent_grant**: Consentimento LGPD concedido
- **analytics_view**: Visualização da aba Analytics
- **contact_analysis**: Análise de um contato específico
- **anomaly_check**: Verificação de anomalias

### 🔒 Segurança: Row Level Security (RLS)
- Usuários só podem VER suas próprias atividades
- Usuários só podem INSERIR atividades para si mesmos

### ⚡ Performance: 3 Indexes
- **idx_whatsapp_activity_user**: Consultas rápidas por usuário + ordenação por data
- **idx_whatsapp_activity_type**: Filtro por tipo de atividade
- **idx_whatsapp_activity_metadata**: Busca em metadata JSONB (ex: contact_hash)

### 🎯 Funções RPC para Badge Unlocks:
1. **count_whatsapp_analytics_views()** - Conta visualizações de analytics
   - Usado para badges: "Consciência Emocional" (5 views), "Mestre da Consciência" (20 views)

2. **count_unique_contacts_analyzed()** - Conta contatos únicos analisados
   - Usado para badge: "Explorador Emocional" (10 contatos)

3. **check_all_whatsapp_consents_granted()** - Verifica se todos 5 consentimentos foram concedidos
   - Usado para badge: "Guardião da Privacidade"

4. **get_whatsapp_activity_summary()** - Retorna resumo de atividades (útil para debug)

---

## Após Aplicar a Migration

1. **Testar no Frontend:**
   - Navegar para `/connections` → Aba WhatsApp
   - Conectar WhatsApp → Deve aparecer XP popup (+50 XP) e badge "Conectado" 📱
   - Conceder consentimentos → Deve aparecer XP popup (+20 XP cada)
   - Visualizar analytics → Deve aparecer XP popup (+10 XP)

2. **Executar Testes E2E:**
   ```bash
   npx playwright test tests/e2e/whatsapp-gamification.spec.ts
   ```

3. **Marcar FASE 4 como Completa** e seguir para FASE 5 (Pull Request)

---

## Troubleshooting

**Erro: "relation whatsapp_consent_records does not exist"**
- A função `check_all_whatsapp_consents_granted()` depende da tabela `whatsapp_consent_records`
- Verificar se esta tabela existe: `SELECT * FROM whatsapp_consent_records LIMIT 1;`
- Se não existir, aplicar migration de consent records primeiro

**Erro: "permission denied for function"**
- As funções usam `SECURITY DEFINER` para rodar com permissões do criador
- Verificar que as funções foram criadas pelo usuário correto (postgres role)

**Erro: "policy already exists"**
- Usar `DROP POLICY IF EXISTS` antes de criar as políticas
- Ou modificar o SQL para usar `CREATE POLICY IF NOT EXISTS` (Postgres 15+)

---

## Links Úteis
- **Supabase Studio:** https://supabase.com/dashboard
- **Issue #16:** https://github.com/lucasblima/Aica_frontend/issues/16
- **Migration File:** `supabase/migrations/20250101_whatsapp_gamification_tracking.sql`

---

**Status:** 📝 Aguardando aplicação manual
**Próximo Passo:** FASE 5 - Criar Pull Request

🤖 Documento gerado por Claude Code
