# Migration Fix: Budget Limits

## Problema Identificado

A migration original `20251209200000_production_optimizations.sql` tentava modificar a tabela `auth.users`:

```sql
ALTER TABLE auth.users
ADD COLUMN ai_budget_monthly_usd NUMERIC(10, 2) DEFAULT 10.00
```

**Erro**:
```
ERROR: 42501: must be owner of table users
```

**Causa**: A tabela `auth.users` é gerenciada pelo Supabase Auth e não pode ser modificada diretamente por políticas de segurança.

---

## Solução Implementada

Criamos uma nova tabela `user_ai_settings` para armazenar as configurações de budget separadamente.

### Migration Corrigida: `20251209200001_production_optimizations_fixed.sql`

#### 1. Nova Tabela

```sql
CREATE TABLE public.user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Budget settings
  ai_budget_monthly_usd NUMERIC(10, 2) DEFAULT 10.00 NOT NULL,
  ai_budget_alert_threshold NUMERIC(3, 2) DEFAULT 0.80 NOT NULL,
  ai_budget_hard_limit BOOLEAN DEFAULT false NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### 2. Auto-Creation Trigger

```sql
CREATE FUNCTION public.ensure_user_ai_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_ai_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on ai_usage_analytics
CREATE TRIGGER trigger_ensure_user_ai_settings
  BEFORE INSERT ON public.ai_usage_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_ai_settings();
```

#### 3. Funções Atualizadas

Todas as funções RPC foram atualizadas para usar `user_ai_settings`:

- `get_current_month_spend()` - Lê de `user_ai_settings`
- `can_perform_ai_operation()` - Usa `get_current_month_spend()`
- `create_budget_alert()` - Funciona com a nova estrutura

---

## Mudanças no Frontend

### Arquivo: `src/services/userSettingsService.ts`

**Antes** (usando user_metadata):
```typescript
export async function getUserAIBudget(): Promise<number> {
  const { data } = await supabase.auth.getUser();
  const metadata = data.user?.user_metadata || {};
  return metadata.monthly_ai_budget_usd || 0;
}
```

**Depois** (usando user_ai_settings):
```typescript
export async function getUserAIBudget(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('user_ai_settings')
    .select('ai_budget_monthly_usd')
    .eq('user_id', user.id)
    .single();

  // Auto-create if not exists
  if (error?.code === 'PGRST116') {
    const { data: newSettings } = await supabase
      .from('user_ai_settings')
      .insert({ user_id: user.id })
      .select('ai_budget_monthly_usd')
      .single();

    return newSettings?.ai_budget_monthly_usd || 10.00;
  }

  return data?.ai_budget_monthly_usd || 10.00;
}
```

---

## Como Aplicar a Correção

### Passo 1: Aplicar a Migration Corrigida

```bash
npx supabase migration up --db-url <YOUR_DB_URL> \
  --file supabase/migrations/20251209200001_production_optimizations_fixed.sql
```

Ou via Supabase Dashboard:
1. Vá para **Database → SQL Editor**
2. Cole o conteúdo de `20251209200001_production_optimizations_fixed.sql`
3. Clique em **Run**

### Passo 2: Verificar Tabela Criada

```sql
-- Verificar se tabela existe
SELECT * FROM pg_tables WHERE tablename = 'user_ai_settings';

-- Ver estrutura
\d user_ai_settings

-- Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'user_ai_settings';
```

### Passo 3: Testar Auto-Creation

```sql
-- Inserir um log de AI usage (vai criar settings automaticamente)
INSERT INTO ai_usage_analytics (
  user_id, operation_type, ai_model,
  input_tokens, output_tokens, total_tokens,
  input_cost_usd, output_cost_usd, total_cost_usd
) VALUES (
  auth.uid(), 'text_generation', 'gemini-1.5-flash',
  100, 50, 150,
  0.0001, 0.00005, 0.00015
);

-- Verificar se settings foram criados
SELECT * FROM user_ai_settings WHERE user_id = auth.uid();
```

**Resultado esperado**:
```
 id | user_id | ai_budget_monthly_usd | ai_budget_alert_threshold | ai_budget_hard_limit | created_at | updated_at
----+---------+-----------------------+---------------------------+----------------------+------------+------------
 ... | ...     | 10.00                 | 0.80                      | false                | ...        | ...
```

### Passo 4: Testar Budget Monitoring

```sql
-- Verificar status do budget
SELECT * FROM get_current_month_spend(auth.uid());
```

**Resultado esperado**:
```
 total_spend_usd | budget_limit_usd | percentage_used | alert_threshold | should_alert | should_block
-----------------+------------------+-----------------+-----------------+--------------+-------------
 0.00015         | 10.00            | 0.00            | 0.80            | false        | false
```

### Passo 5: Atualizar Budget (Opcional)

```sql
-- Atualizar budget para $20
UPDATE user_ai_settings
SET ai_budget_monthly_usd = 20.00,
    updated_at = NOW()
WHERE user_id = auth.uid();

-- Verificar
SELECT * FROM get_current_month_spend(auth.uid());
```

---

## Diferenças Técnicas

### Estrutura de Dados

| Aspecto | Versão Original | Versão Corrigida |
|---------|----------------|------------------|
| **Storage** | `auth.users.user_metadata` | `user_ai_settings` table |
| **Acesso** | `supabase.auth.getUser()` | `supabase.from('user_ai_settings')` |
| **RLS** | Não aplicável | Habilitado |
| **Auto-creation** | Manual | Automático via trigger |
| **Queries** | Nested JSON | Tabela relacional |

### Benefícios da Nova Abordagem

1. **Segurança**: RLS policies aplicadas
2. **Performance**: Queries relacionais (com índices)
3. **Manutenibilidade**: Schema explícito e versionado
4. **Escalabilidade**: Pode adicionar mais campos facilmente
5. **Compliance**: Dados de billing separados de auth

---

## Compatibilidade Retroativa

### Migração de Dados Existentes (se aplicável)

Se você já tinha budgets em `user_metadata`:

```sql
-- Migrar dados de user_metadata para user_ai_settings
INSERT INTO user_ai_settings (user_id, ai_budget_monthly_usd)
SELECT
  id,
  COALESCE((raw_user_meta_data->>'monthly_ai_budget_usd')::NUMERIC, 10.00)
FROM auth.users
WHERE (raw_user_meta_data->>'monthly_ai_budget_usd') IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
  SET ai_budget_monthly_usd = EXCLUDED.ai_budget_monthly_usd;
```

---

## Troubleshooting

### Problema: Settings não são criados automaticamente

**Causa**: Trigger não foi criado ou não está ativo

**Solução**:
```sql
-- Verificar se trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'trigger_ensure_user_ai_settings';

-- Recriar trigger
CREATE TRIGGER trigger_ensure_user_ai_settings
  BEFORE INSERT ON public.ai_usage_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_ai_settings();
```

### Problema: Erro PGRST116 ao buscar settings

**Causa**: Usuário ainda não tem settings criados

**Solução**: O código frontend já trata isso automaticamente criando settings com defaults. Veja `userSettingsService.ts` lines 32-42.

### Problema: Permission denied ao inserir em user_ai_settings

**Causa**: RLS policy não permite INSERT

**Solução**:
```sql
-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'user_ai_settings';

-- Recriar policy de INSERT
CREATE POLICY "Users can insert their own AI settings"
  ON public.user_ai_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

---

## Testing Checklist

- [ ] Migration aplicada com sucesso
- [ ] Tabela `user_ai_settings` criada
- [ ] RLS habilitado e policies aplicadas
- [ ] Trigger `trigger_ensure_user_ai_settings` ativo
- [ ] Settings auto-criados ao inserir AI usage
- [ ] `get_current_month_spend()` funciona
- [ ] Frontend busca budget de `user_ai_settings`
- [ ] Update de budget funciona via frontend
- [ ] Alerts criados quando budget excede threshold

---

## Rollback (Se Necessário)

Para reverter a migration:

```sql
-- Remover trigger
DROP TRIGGER IF EXISTS trigger_ensure_user_ai_settings ON ai_usage_analytics;
DROP FUNCTION IF EXISTS ensure_user_ai_settings();

-- Remover tabela
DROP TABLE IF EXISTS user_ai_settings CASCADE;

-- Remover funções dependentes
DROP FUNCTION IF EXISTS get_current_month_spend(UUID);
DROP FUNCTION IF EXISTS can_perform_ai_operation(UUID);
DROP FUNCTION IF EXISTS create_budget_alert(...);
```

**⚠️ Atenção**: Isso vai deletar todos os budgets configurados!

---

## Próximos Passos

1. ✅ Aplicar migration corrigida
2. ✅ Verificar funcionamento do auto-creation
3. ✅ Testar BudgetMonitor component
4. ✅ Configurar budgets iniciais para usuários
5. ✅ Monitorar logs de alerts
6. ✅ Refresh da materialized view (opcional)

---

**Data**: 2025-12-09
**Status**: ✅ CORRIGIDO
**Arquivo**: `20251209200001_production_optimizations_fixed.sql`
**Frontend**: `userSettingsService.ts` atualizado

---

## Support

Para questões:
1. Verifique este guia de troubleshooting
2. Consulte `PHASE_10_PRODUCTION_OPTIMIZATIONS_SUMMARY.md`
3. Execute queries de diagnóstico acima
