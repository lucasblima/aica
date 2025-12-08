-- Debug Script: Investigar Saldo de Dezembro 2024
-- Este script ajuda a entender de onde vem o saldo de R$ 1.429,41

-- 1. Total de Receitas de Dezembro 2024
SELECT
  'RECEITAS DEZEMBRO' as tipo,
  COUNT(*) as quantidade,
  SUM(amount::numeric) as total
FROM finance_transactions
WHERE transaction_date >= '2024-12-01'
  AND transaction_date <= '2024-12-31'
  AND type = 'income';

-- 2. Total de Despesas de Dezembro 2024
SELECT
  'DESPESAS DEZEMBRO' as tipo,
  COUNT(*) as quantidade,
  SUM(amount::numeric) as total
FROM finance_transactions
WHERE transaction_date >= '2024-12-01'
  AND transaction_date <= '2024-12-31'
  AND type = 'expense';

-- 3. Saldo de Dezembro (Receitas - Despesas)
SELECT
  'SALDO DEZEMBRO' as tipo,
  (SELECT COALESCE(SUM(amount::numeric), 0)
   FROM finance_transactions
   WHERE transaction_date >= '2024-12-01'
     AND transaction_date <= '2024-12-31'
     AND type = 'income') -
  (SELECT COALESCE(SUM(amount::numeric), 0)
   FROM finance_transactions
   WHERE transaction_date >= '2024-12-01'
     AND transaction_date <= '2024-12-31'
     AND type = 'expense') as saldo;

-- 4. Despesas por Categoria em Dezembro
SELECT
  category,
  COUNT(*) as quantidade,
  SUM(amount::numeric) as total,
  ROUND((SUM(amount::numeric) / (SELECT SUM(amount::numeric) FROM finance_transactions WHERE transaction_date >= '2024-12-01' AND transaction_date <= '2024-12-31' AND type = 'expense') * 100)::numeric, 2) as percentual
FROM finance_transactions
WHERE transaction_date >= '2024-12-01'
  AND transaction_date <= '2024-12-31'
  AND type = 'expense'
GROUP BY category
ORDER BY total DESC;

-- 5. Todas as transações de Dezembro (para auditoria)
SELECT
  transaction_date,
  type,
  category,
  description,
  amount::numeric
FROM finance_transactions
WHERE transaction_date >= '2024-12-01'
  AND transaction_date <= '2024-12-31'
ORDER BY transaction_date DESC, type;

-- 6. Verificar extratos de Dezembro
SELECT
  id,
  statement_period_start,
  statement_period_end,
  opening_balance::numeric,
  closing_balance::numeric,
  processing_status,
  created_at
FROM finance_statements
WHERE (statement_period_start >= '2024-12-01' AND statement_period_start <= '2024-12-31')
   OR (statement_period_end >= '2024-12-01' AND statement_period_end <= '2024-12-31')
ORDER BY statement_period_start;
