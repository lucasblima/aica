-- ================================================
-- FIX FINANCE BALANCES - Recalcular saldos corretos
-- ================================================
-- Este script recalcula total_credits e total_debits
-- para cada extrato baseado nas transações reais.
--
-- IMPORTANTE: Execute no Supabase SQL Editor
-- ================================================

-- 1. Criar função temporária para recálculo
CREATE OR REPLACE FUNCTION recalculate_statement_totals(statement_id_param UUID)
RETURNS void AS $$
DECLARE
    calc_income NUMERIC;
    calc_expense NUMERIC;
    calc_closing NUMERIC;
    stmt_opening NUMERIC;
BEGIN
    -- Buscar saldo inicial
    SELECT opening_balance INTO stmt_opening
    FROM finance_statements
    WHERE id = statement_id_param;

    -- Calcular totais reais das transações
    SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO calc_income, calc_expense
    FROM finance_transactions
    WHERE statement_id = statement_id_param;

    -- Calcular saldo final correto
    calc_closing := stmt_opening + calc_income - calc_expense;

    -- Atualizar statement com valores corretos
    UPDATE finance_statements
    SET
        total_credits = calc_income,
        total_debits = calc_expense,
        closing_balance = calc_closing,
        updated_at = NOW()
    WHERE id = statement_id_param;

    RAISE NOTICE 'Statement % updated: Income=%, Expense=%, Closing=%',
        statement_id_param, calc_income, calc_expense, calc_closing;
END;
$$ LANGUAGE plpgsql;

-- 2. Executar recálculo para TODOS os extratos do usuário
DO $$
DECLARE
    stmt RECORD;
    user_id_param UUID := 'bff0b38a-eb13-4763-bf90-3098c2d922dc'; -- AJUSTE SE NECESSÁRIO
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Iniciando recálculo de saldos...';
    RAISE NOTICE '========================================';

    FOR stmt IN
        SELECT id, bank_name, statement_period_start, statement_period_end
        FROM finance_statements
        WHERE user_id = user_id_param
          AND processing_status = 'completed'
        ORDER BY statement_period_start
    LOOP
        RAISE NOTICE 'Processando: % - % a %',
            stmt.bank_name, stmt.statement_period_start, stmt.statement_period_end;

        PERFORM recalculate_statement_totals(stmt.id);
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Recálculo completo!';
    RAISE NOTICE '========================================';
END;
$$;

-- 3. Validar resultados (query de verificação)
SELECT
    TO_CHAR(statement_period_start, 'YYYY-MM') AS month,
    bank_name,
    opening_balance,
    total_credits AS receitas,
    total_debits AS despesas,
    closing_balance AS saldo_final,
    (opening_balance + total_credits - total_debits) AS saldo_calculado,
    (closing_balance - (opening_balance + total_credits - total_debits)) AS discrepancia,
    CASE
        WHEN ABS(closing_balance - (opening_balance + total_credits - total_debits)) < 0.01
        THEN '✅ OK'
        ELSE '❌ ERRO'
    END AS status
FROM finance_statements
WHERE user_id = 'bff0b38a-eb13-4763-bf90-3098c2d922dc'
  AND processing_status = 'completed'
  AND EXTRACT(YEAR FROM statement_period_start) = 2025
ORDER BY statement_period_start;

-- 4. Verificar saldo final de dezembro
SELECT
    'Saldo Final Dezembro 2025' AS descricao,
    closing_balance AS saldo_sistema,
    1796.08 AS saldo_real,
    (closing_balance - 1796.08) AS diferenca,
    CASE
        WHEN ABS(closing_balance - 1796.08) < 0.01
        THEN '✅ CORRETO'
        ELSE '❌ INCORRETO'
    END AS status
FROM finance_statements
WHERE user_id = 'bff0b38a-eb13-4763-bf90-3098c2d922dc'
  AND statement_period_start = '2025-12-01'
  AND processing_status = 'completed';

-- 5. Limpar função temporária (opcional)
-- DROP FUNCTION IF EXISTS recalculate_statement_totals(UUID);
