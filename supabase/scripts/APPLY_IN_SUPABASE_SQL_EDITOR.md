# Como Aplicar a Migration no Supabase

## Instruções:

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/hfjhthwspbivfbcvdniq
2. No menu lateral, clique em **SQL Editor**
3. Clique em **New query**
4. Copie e cole o conteúdo do arquivo `20251208_finance_robust_processing.sql`
5. Clique em **Run** (ou pressione Ctrl+Enter)

## Localização do arquivo SQL:

```
supabase/migrations/20251208_finance_robust_processing.sql
```

## O que a migration faz:

✅ **Cria tabelas novas:**
- `finance_processing_logs` - Logs de auditoria de processamento
- `finance_categorization_rules` - Regras de categorização deterministicas

✅ **Adiciona campos às tabelas existentes:**
- `finance_statements`: source_type, source_bank, validation_status, has_duplicates, etc.
- `finance_transactions`: transaction_hash, is_duplicate, categorization_history, etc.

✅ **Cria funções PostgreSQL:**
- `generate_transaction_hash()` - Gera hash SHA256 para deduplicação
- `validate_statement_balance()` - Valida matemática do extrato
- `detect_duplicate_transactions()` - Detecta duplicatas
- `recalculate_closing_balance()` - Recalcula saldo
- `check_period_continuity()` - Verifica continuidade entre períodos

✅ **Cria triggers automáticos:**
- Gera transaction_hash automaticamente ao inserir transação
- Valida statement automaticamente quando status = 'completed'

✅ **Insere regras de categorização:**
- 11 regras seed para categorização brasileira (Ifood, Uber, Netflix, etc.)

## Verificação pós-migration:

Execute no SQL Editor para verificar:

```sql
-- Verificar novas tabelas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'finance_%';

-- Verificar novos campos em finance_statements
SELECT column_name FROM information_schema.columns
WHERE table_name = 'finance_statements'
AND column_name IN ('source_type', 'validation_status', 'has_duplicates');

-- Verificar novos campos em finance_transactions
SELECT column_name FROM information_schema.columns
WHERE table_name = 'finance_transactions'
AND column_name IN ('transaction_hash', 'is_duplicate', 'categorization_history');

-- Verificar funções criadas
SELECT routine_name FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
AND routine_name LIKE '%transaction%' OR routine_name LIKE '%statement%';

-- Verificar regras de categorização inseridas
SELECT count(*) FROM finance_categorization_rules;
```

## Em caso de erro:

Se algum campo já existir, o `ADD COLUMN IF NOT EXISTS` irá ignorar silenciosamente.
A migration é idempotente e pode ser executada múltiplas vezes sem problemas.
