# 🔍 Plano de Auditoria e Correção de Saldos - Módulo Finance

**Data:** 2025-12-08
**Problema Identificado:** Saldo exibido R$ 11.680,00 vs Saldo Real R$ 1.796,08
**Diferença:** R$ 9.883,92 (651% de erro)
**Objetivo:** Garantir que saldo_final_dezembro_2025 = R$ 1.796,08

---

## 📋 Tarefas por Agente

### 🏗️ **AGENTE 1: Backend Architect (Supabase)**

**Responsabilidade:** Auditar database schema, RLS policies, funções de cálculo de saldo

#### **1.1 Auditar Schema `finance_statements`**

**Ação:**
```sql
-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'finance_statements'
ORDER BY ordinal_position;
```

**Campos Críticos a Validar:**
- `opening_balance` DECIMAL - Saldo inicial do período
- `closing_balance` DECIMAL - Saldo final do período
- `statement_period_start` DATE - Início do período
- `statement_period_end` DATE - Fim do período
- `transaction_count` INTEGER - Total de transações
- `total_credits` DECIMAL - Total de receitas
- `total_debits` DECIMAL - Total de despesas

**Validação Esperada:**
```sql
-- Para cada extrato, validar:
-- closing_balance = opening_balance + total_credits - total_debits
SELECT
    id,
    bank_name,
    statement_period_start,
    statement_period_end,
    opening_balance,
    closing_balance,
    total_credits,
    total_debits,
    (opening_balance + total_credits - total_debits) AS expected_closing,
    (closing_balance - (opening_balance + total_credits - total_debits)) AS discrepancy
FROM finance_statements
WHERE processing_status = 'completed'
ORDER BY statement_period_start;
```

#### **1.2 Auditar Schema `finance_transactions`**

**Ação:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'finance_transactions'
ORDER BY ordinal_position;
```

**Campos Críticos:**
- `hash_id` TEXT UNIQUE - Deve prevenir duplicação
- `amount` DECIMAL - Valor absoluto da transação
- `type` TEXT - 'income' ou 'expense'
- `balance_after` DECIMAL - Saldo após a transação
- `transaction_date` DATE - Data da transação

**Validação de Duplicação:**
```sql
-- Verificar se existem hash_id duplicados (NÃO DEVERIA EXISTIR)
SELECT hash_id, COUNT(*) as count
FROM finance_transactions
GROUP BY hash_id
HAVING COUNT(*) > 1;
```

**Validação de Balance After:**
```sql
-- Verificar se balance_after está correto sequencialmente
WITH ordered_transactions AS (
    SELECT
        id,
        transaction_date,
        description,
        amount,
        type,
        balance_after,
        LAG(balance_after) OVER (ORDER BY transaction_date, created_at) AS previous_balance
    FROM finance_transactions
    WHERE user_id = '<USER_ID>'
    ORDER BY transaction_date, created_at
)
SELECT
    transaction_date,
    description,
    type,
    amount,
    previous_balance,
    balance_after,
    CASE
        WHEN type = 'income' THEN previous_balance + amount
        WHEN type = 'expense' THEN previous_balance - amount
    END AS expected_balance,
    (balance_after - CASE
        WHEN type = 'income' THEN previous_balance + amount
        WHEN type = 'expense' THEN previous_balance - amount
    END) AS discrepancy
FROM ordered_transactions;
```

#### **1.3 Verificar Função `getAllTimeSummary()`**

**Arquivo:** `src/modules/finance/services/financeService.ts`

**Verificar Lógica:**
```typescript
// Como está sendo calculado currentBalance?
// Está somando corretamente: opening_balance + totalIncome - totalExpenses?
// Ou está usando closing_balance do último extrato?
```

**Query Esperada:**
```sql
-- Opção 1: Usar closing_balance do último extrato
SELECT closing_balance
FROM finance_statements
WHERE user_id = ?
  AND processing_status = 'completed'
ORDER BY statement_period_end DESC
LIMIT 1;

-- Opção 2: Calcular a partir do primeiro opening_balance
WITH first_statement AS (
    SELECT opening_balance
    FROM finance_statements
    WHERE user_id = ?
    ORDER BY statement_period_start ASC
    LIMIT 1
),
totals AS (
    SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense
    FROM finance_transactions
    WHERE user_id = ?
)
SELECT
    f.opening_balance + t.total_income - t.total_expense AS current_balance
FROM first_statement f, totals t;
```

#### **1.4 Auditar Lógica de Saldo Inicial/Final**

**Validação de Continuidade entre Meses:**
```sql
-- O closing_balance de um mês DEVE SER IGUAL ao opening_balance do próximo mês
WITH monthly_balances AS (
    SELECT
        bank_name,
        statement_period_start,
        statement_period_end,
        opening_balance,
        closing_balance,
        LEAD(opening_balance) OVER (ORDER BY statement_period_start) AS next_month_opening
    FROM finance_statements
    WHERE user_id = '<USER_ID>'
      AND processing_status = 'completed'
    ORDER BY statement_period_start
)
SELECT
    bank_name,
    statement_period_end AS period_end,
    closing_balance,
    next_month_opening,
    (next_month_opening - closing_balance) AS gap
FROM monthly_balances
WHERE next_month_opening IS NOT NULL
  AND ABS(next_month_opening - closing_balance) > 0.01; -- Tolerância de 1 centavo
```

#### **1.5 Query de Validação Completa (Jan-Dez 2025)**

```sql
-- Relatório completo de saldos mês a mês
SELECT
    TO_CHAR(statement_period_start, 'YYYY-MM') AS month,
    bank_name,
    statement_period_start,
    statement_period_end,
    opening_balance,
    total_credits AS income,
    total_debits AS expenses,
    closing_balance,
    (opening_balance + total_credits - total_debits) AS calculated_closing,
    (closing_balance - (opening_balance + total_credits - total_debits)) AS discrepancy,
    transaction_count,
    file_name
FROM finance_statements
WHERE user_id = '<USER_ID>'
  AND processing_status = 'completed'
  AND EXTRACT(YEAR FROM statement_period_start) = 2025
ORDER BY statement_period_start;
```

**Resultado Esperado:**
- Janeiro 2025: `opening_balance` = Saldo inicial do ano
- Dezembro 2025: `closing_balance` = R$ 1.796,08 ✅
- Todos os meses: `discrepancy` = 0.00

---

### 🐍 **AGENTE 2: Python Processing (Validação e Recálculo)**

**Responsabilidade:** Criar scripts Python para auditar, validar e recalcular saldos

#### **2.1 Script de Auditoria de Saldos**

**Arquivo:** `scripts/audit_finance_balances.py`

```python
"""
Finance Balance Auditor
Valida a integridade dos saldos processados dos extratos bancários.
"""

import os
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Optional
from supabase import create_client, Client

# Configuração Supabase
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

USER_ID = '<INSERT_USER_ID>'  # Obter do dashboard
EXPECTED_FINAL_BALANCE = Decimal('1796.08')

class BalanceAuditor:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.discrepancies = []

    def fetch_statements(self) -> List[Dict]:
        """Busca todos os extratos do usuário ordenados por data."""
        response = supabase.table('finance_statements') \
            .select('*') \
            .eq('user_id', self.user_id) \
            .eq('processing_status', 'completed') \
            .order('statement_period_start') \
            .execute()
        return response.data

    def validate_statement_balance(self, statement: Dict) -> Dict:
        """
        Valida: closing_balance = opening_balance + total_credits - total_debits
        """
        opening = Decimal(str(statement['opening_balance'] or 0))
        closing = Decimal(str(statement['closing_balance'] or 0))
        credits = Decimal(str(statement['total_credits'] or 0))
        debits = Decimal(str(statement['total_debits'] or 0))

        expected_closing = opening + credits - debits
        discrepancy = closing - expected_closing

        return {
            'statement_id': statement['id'],
            'bank_name': statement['bank_name'],
            'period': f"{statement['statement_period_start']} - {statement['statement_period_end']}",
            'opening_balance': opening,
            'closing_balance': closing,
            'total_credits': credits,
            'total_debits': debits,
            'expected_closing': expected_closing,
            'discrepancy': discrepancy,
            'is_valid': abs(discrepancy) < Decimal('0.01')
        }

    def validate_continuity(self, statements: List[Dict]) -> List[Dict]:
        """
        Valida que closing_balance(n) = opening_balance(n+1)
        """
        continuity_errors = []

        for i in range(len(statements) - 1):
            current = statements[i]
            next_stmt = statements[i + 1]

            current_closing = Decimal(str(current['closing_balance'] or 0))
            next_opening = Decimal(str(next_stmt['opening_balance'] or 0))

            gap = next_opening - current_closing

            if abs(gap) > Decimal('0.01'):
                continuity_errors.append({
                    'current_period': current['statement_period_end'],
                    'next_period': next_stmt['statement_period_start'],
                    'current_closing': current_closing,
                    'next_opening': next_opening,
                    'gap': gap
                })

        return continuity_errors

    def audit(self):
        """Executa auditoria completa."""
        print("🔍 Iniciando Auditoria de Saldos...\n")

        # 1. Buscar extratos
        statements = self.fetch_statements()
        print(f"📊 Total de extratos encontrados: {len(statements)}\n")

        # 2. Validar cada extrato
        print("=" * 80)
        print("VALIDAÇÃO DE SALDOS POR EXTRATO")
        print("=" * 80)

        for stmt in statements:
            result = self.validate_statement_balance(stmt)

            status = "✅ OK" if result['is_valid'] else "❌ ERRO"
            print(f"\n{status} {result['bank_name']} - {result['period']}")
            print(f"   Saldo Inicial: R$ {result['opening_balance']:,.2f}")
            print(f"   Receitas:      R$ {result['total_credits']:,.2f}")
            print(f"   Despesas:      R$ {result['total_debits']:,.2f}")
            print(f"   Saldo Final:   R$ {result['closing_balance']:,.2f}")
            print(f"   Esperado:      R$ {result['expected_closing']:,.2f}")

            if not result['is_valid']:
                print(f"   ⚠️  Discrepância: R$ {result['discrepancy']:,.2f}")
                self.discrepancies.append(result)

        # 3. Validar continuidade
        print("\n" + "=" * 80)
        print("VALIDAÇÃO DE CONTINUIDADE ENTRE MESES")
        print("=" * 80)

        continuity_errors = self.validate_continuity(statements)

        if continuity_errors:
            print(f"\n❌ Encontrados {len(continuity_errors)} erros de continuidade:\n")
            for error in continuity_errors:
                print(f"   {error['current_period']} → {error['next_period']}")
                print(f"   Saldo Final: R$ {error['current_closing']:,.2f}")
                print(f"   Próximo Inicial: R$ {error['next_opening']:,.2f}")
                print(f"   Gap: R$ {error['gap']:,.2f}\n")
        else:
            print("\n✅ Continuidade OK: Todos os saldos estão encadeados corretamente.")

        # 4. Validar saldo final
        print("\n" + "=" * 80)
        print("VALIDAÇÃO DE SALDO FINAL")
        print("=" * 80)

        if statements:
            last_statement = statements[-1]
            final_balance = Decimal(str(last_statement['closing_balance'] or 0))

            print(f"\nSaldo Final (último extrato): R$ {final_balance:,.2f}")
            print(f"Saldo Esperado (real):        R$ {EXPECTED_FINAL_BALANCE:,.2f}")

            difference = final_balance - EXPECTED_FINAL_BALANCE
            print(f"Diferença:                    R$ {difference:,.2f}")

            if abs(difference) < Decimal('0.01'):
                print("\n✅ SALDO FINAL CORRETO!")
            else:
                print(f"\n❌ SALDO FINAL INCORRETO! Diferença de R$ {difference:,.2f}")

        # 5. Resumo
        print("\n" + "=" * 80)
        print("RESUMO DA AUDITORIA")
        print("=" * 80)
        print(f"Total de extratos: {len(statements)}")
        print(f"Extratos com discrepância: {len(self.discrepancies)}")
        print(f"Erros de continuidade: {len(continuity_errors)}")

if __name__ == '__main__':
    auditor = BalanceAuditor(USER_ID)
    auditor.audit()
```

#### **2.2 Script de Recálculo de Saldos**

**Arquivo:** `scripts/recalculate_balances.py`

```python
"""
Finance Balance Recalculator
Recalcula saldos a partir das transações reais.
"""

import os
from decimal import Decimal
from typing import List, Dict
from supabase import create_client, Client

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

USER_ID = '<INSERT_USER_ID>'

class BalanceRecalculator:
    def __init__(self, user_id: str):
        self.user_id = user_id

    def fetch_transactions(self, statement_id: str) -> List[Dict]:
        """Busca transações de um extrato ordenadas por data."""
        response = supabase.table('finance_transactions') \
            .select('*') \
            .eq('statement_id', statement_id) \
            .order('transaction_date') \
            .order('created_at') \
            .execute()
        return response.data

    def recalculate_statement(self, statement: Dict) -> Dict:
        """
        Recalcula saldo de um extrato a partir das transações.
        """
        transactions = self.fetch_transactions(statement['id'])

        if not transactions:
            return {
                'statement_id': statement['id'],
                'error': 'Nenhuma transação encontrada'
            }

        # Saldo inicial (do PDF ou do último extrato)
        opening_balance = Decimal(str(statement['opening_balance'] or 0))

        # Recalcular a partir das transações
        running_balance = opening_balance
        total_income = Decimal('0')
        total_expense = Decimal('0')

        for txn in transactions:
            amount = Decimal(str(txn['amount']))

            if txn['type'] == 'income':
                running_balance += amount
                total_income += amount
            elif txn['type'] == 'expense':
                running_balance -= amount
                total_expense += amount

        calculated_closing = running_balance
        current_closing = Decimal(str(statement['closing_balance'] or 0))

        return {
            'statement_id': statement['id'],
            'bank_name': statement['bank_name'],
            'period': f"{statement['statement_period_start']} - {statement['statement_period_end']}",
            'opening_balance': opening_balance,
            'calculated_closing': calculated_closing,
            'current_closing': current_closing,
            'total_income': total_income,
            'total_expense': total_expense,
            'transaction_count': len(transactions),
            'needs_update': abs(calculated_closing - current_closing) > Decimal('0.01')
        }

    def recalculate_all(self, dry_run=True):
        """Recalcula todos os extratos."""
        print("🔄 Iniciando Recálculo de Saldos...\n")
        print(f"Modo: {'DRY RUN (não salva)' if dry_run else 'PRODUÇÃO (salva no banco)'}\n")

        # Buscar extratos
        response = supabase.table('finance_statements') \
            .select('*') \
            .eq('user_id', self.user_id) \
            .eq('processing_status', 'completed') \
            .order('statement_period_start') \
            .execute()

        statements = response.data

        updates_needed = []

        for stmt in statements:
            result = self.recalculate_statement(stmt)

            print(f"\n{result['bank_name']} - {result['period']}")
            print(f"   Saldo Inicial:      R$ {result['opening_balance']:,.2f}")
            print(f"   Receitas:           R$ {result['total_income']:,.2f}")
            print(f"   Despesas:           R$ {result['total_expense']:,.2f}")
            print(f"   Saldo Atual (DB):   R$ {result['current_closing']:,.2f}")
            print(f"   Saldo Calculado:    R$ {result['calculated_closing']:,.2f}")

            if result['needs_update']:
                print(f"   ⚠️  PRECISA ATUALIZAR!")
                updates_needed.append(result)
            else:
                print(f"   ✅ OK")

        # Aplicar atualizações se não for dry run
        if not dry_run and updates_needed:
            print(f"\n🔄 Aplicando {len(updates_needed)} atualizações...\n")

            for update in updates_needed:
                supabase.table('finance_statements') \
                    .update({
                        'closing_balance': float(update['calculated_closing']),
                        'total_credits': float(update['total_income']),
                        'total_debits': float(update['total_expense'])
                    }) \
                    .eq('id', update['statement_id']) \
                    .execute()

                print(f"✅ Atualizado: {update['bank_name']} - {update['period']}")

        print(f"\n{'DRY RUN COMPLETO' if dry_run else 'RECÁLCULO COMPLETO'}")
        print(f"Total processado: {len(statements)}")
        print(f"Atualizações necessárias: {len(updates_needed)}")

if __name__ == '__main__':
    import sys

    dry_run = '--apply' not in sys.argv

    recalculator = BalanceRecalculator(USER_ID)
    recalculator.recalculate_all(dry_run=dry_run)

    if dry_run:
        print("\n💡 Para aplicar as mudanças, execute: python recalculate_balances.py --apply")
```

---

### 🎨 **AGENTE 3: Frontend Display (Exibição de Saldos)**

**Responsabilidade:** Adicionar saldos iniciais/finais nos cards de mês e na lista de extratos

#### **3.1 Adicionar Saldos nos Cards de Mês (Cobertura 2025)**

**Arquivo:** `src/modules/finance/views/FinanceDashboard.tsx`

**Modificações no `monthlyData` useMemo:**

```typescript
// Precisamos buscar os saldos de cada mês dos extratos
const monthlyData = useMemo(() => {
  const currentYear = new Date().getFullYear();
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Criar mapa: mês -> {opening_balance, closing_balance, transactionCount, statementCount}
  const monthMap = new Map<string, {
    transactionCount: number;
    statementCount: number;
    openingBalance: number;
    closingBalance: number;
  }>();

  statements.forEach((statement) => {
    if (statement.statement_period_start) {
      const [yearStr, monthStr] = statement.statement_period_start.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const key = `${year}-${month}`;

      const existing = monthMap.get(key) || {
        transactionCount: 0,
        statementCount: 0,
        openingBalance: 0,
        closingBalance: 0
      };

      monthMap.set(key, {
        transactionCount: existing.transactionCount + (statement.transaction_count || 0),
        statementCount: existing.statementCount + 1,
        openingBalance: statement.opening_balance || 0,  // ✅ NOVO
        closingBalance: statement.closing_balance || 0,   // ✅ NOVO
      });
    }
  });

  // Gerar 12 meses incluindo saldos
  const months: MonthData[] = [];
  for (let month = 1; month <= 12; month++) {
    const key = `${currentYear}-${month}`;
    const data = monthMap.get(key);

    months.push({
      month,
      monthName: monthNames[month - 1],
      year: currentYear,
      hasData: !!data,
      transactionCount: data?.transactionCount || 0,
      statementCount: data?.statementCount || 0,
      openingBalance: data?.openingBalance || 0,  // ✅ NOVO
      closingBalance: data?.closingBalance || 0,  // ✅ NOVO
    });
  }

  return months;
}, [statements]);
```

**Atualizar Interface `MonthData`:**

```typescript
interface MonthData {
  month: number;
  monthName: string;
  year: number;
  hasData: boolean;
  transactionCount: number;
  statementCount: number;
  openingBalance: number;  // ✅ NOVO
  closingBalance: number;  // ✅ NOVO
}
```

**Exibir Saldos no Card do Mês:**

```tsx
{monthlyData.map((monthData) => (
  <button
    key={monthData.month}
    onClick={() => !monthData.hasData && setShowUpload(true)}
    className={`
      ceramic-tray p-4 transition-all duration-200
      ${monthData.hasData
        ? 'bg-gradient-to-br from-green-50 to-transparent hover:scale-105'
        : 'hover:scale-105 hover:bg-ceramic-highlight'
      }
    `}
  >
    <div className="flex flex-col items-center gap-2">
      {/* Month Icon/Status */}
      {monthData.hasData ? (
        <div className="ceramic-concave w-10 h-10 flex items-center justify-center bg-green-100">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
      ) : (
        <div className="ceramic-inset w-10 h-10 flex items-center justify-center opacity-40">
          <Upload className="w-5 h-5 text-ceramic-text-secondary" />
        </div>
      )}

      {/* Month Name */}
      <div className="text-center w-full">
        <p className={`text-xs font-bold ${monthData.hasData ? 'text-green-700' : 'text-ceramic-text-secondary'}`}>
          {monthData.monthName}
        </p>

        {/* ✅ NOVO: Saldos */}
        {monthData.hasData && isValuesVisible && (
          <div className="mt-2 space-y-1">
            <div className="ceramic-inset px-2 py-1 rounded">
              <p className="text-[9px] text-ceramic-text-secondary uppercase">Inicial</p>
              <p className="text-[10px] font-bold text-ceramic-text-primary">
                {formatCurrency(monthData.openingBalance)}
              </p>
            </div>
            <div className="ceramic-inset px-2 py-1 rounded">
              <p className="text-[9px] text-ceramic-text-secondary uppercase">Final</p>
              <p className="text-[10px] font-bold text-green-700">
                {formatCurrency(monthData.closingBalance)}
              </p>
            </div>
          </div>
        )}

        {monthData.hasData && !isValuesVisible && (
          <p className="text-[10px] text-green-600 mt-0.5">
            {monthData.transactionCount} {monthData.transactionCount === 1 ? 'transação' : 'transações'}
          </p>
        )}

        {!monthData.hasData && (
          <p className="text-[10px] text-ceramic-text-secondary opacity-60 mt-0.5">
            Sem dados
          </p>
        )}
      </div>
    </div>
  </button>
))}
```

#### **3.2 Adicionar Saldos em "Gerenciar Extratos"**

**Modificar a lista de extratos para incluir saldos:**

```tsx
{statements.map((statement) => {
  const statusBadge = getStatusBadge(statement.processing_status || 'pending');

  return (
    <div
      key={statement.id}
      className="ceramic-card p-5 hover:scale-[1.01] transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        {/* Bank Icon */}
        <div className="ceramic-concave w-12 h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <Building2 className="w-6 h-6 text-ceramic-accent" />
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header: Bank Name + Status Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-black text-ceramic-text-primary text-etched">
              {statement.bank_name || 'Banco Desconhecido'}
            </h4>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadge.className}`}>
              {statusBadge.icon}
              {statusBadge.text}
            </span>
          </div>

          {/* Period */}
          {statement.statement_period_start && statement.statement_period_end && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-ceramic-text-secondary" />
              <span className="text-xs font-medium text-ceramic-text-secondary">
                {formatPeriod(statement.statement_period_start, statement.statement_period_end)}
              </span>
            </div>
          )}

          {/* ✅ NOVO: Saldos Inicial e Final */}
          {isValuesVisible && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="ceramic-inset px-3 py-1.5 rounded-lg">
                <p className="text-[9px] text-ceramic-text-secondary uppercase">Saldo Inicial</p>
                <p className="text-xs font-bold text-ceramic-text-primary">
                  {formatCurrency(statement.opening_balance || 0)}
                </p>
              </div>
              <div className="ceramic-inset px-3 py-1.5 rounded-lg">
                <p className="text-[9px] text-ceramic-text-secondary uppercase">Saldo Final</p>
                <p className="text-xs font-bold text-green-700">
                  {formatCurrency(statement.closing_balance || 0)}
                </p>
              </div>
            </div>
          )}

          {/* Metrics Row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Transaction Count */}
            <div className="ceramic-inset px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-ceramic-accent" />
              <span className="text-xs font-bold text-ceramic-text-primary">
                {statement.transaction_count || 0}
              </span>
              <span className="text-[10px] text-ceramic-text-secondary">
                {statement.transaction_count === 1 ? 'transação' : 'transações'}
              </span>
            </div>

            {/* File Name (truncated) */}
            {statement.file_name && (
              <div className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-ceramic-text-secondary opacity-50" />
                <span className="text-[10px] text-ceramic-text-secondary truncate max-w-[200px]">
                  {statement.file_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={() => handleDelete(statement.id)}
          disabled={deletingId === statement.id || deletingAll}
          className="ceramic-inset w-9 h-9 flex items-center justify-center hover:scale-110 hover:bg-red-50 transition-all disabled:opacity-50 flex-shrink-0 group"
          title="Deletar extrato"
        >
          {deletingId === statement.id ? (
            <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>
    </div>
  );
})}
```

---

## 🎯 Ordem de Execução Recomendada

### **Fase 1: Diagnóstico (Backend Architect)**
1. Executar queries SQL de validação
2. Identificar todas as discrepâncias
3. Documentar problemas encontrados

### **Fase 2: Correção (Python Processing)**
1. Executar `audit_finance_balances.py` (DRY RUN)
2. Analisar relatório de discrepâncias
3. Executar `recalculate_balances.py` (DRY RUN)
4. Se validado, aplicar: `python recalculate_balances.py --apply`

### **Fase 3: Validação Final (Backend + Python)**
1. Re-executar auditoria após recálculo
2. Confirmar: `closing_balance_dezembro_2025 = R$ 1.796,08`
3. Confirmar: Todos os meses têm continuidade válida

### **Fase 4: Exibição (Frontend Display)**
1. Adicionar campos `openingBalance` e `closingBalance` em `MonthData`
2. Modificar cards de mês para exibir saldos
3. Modificar lista de extratos para exibir saldos
4. Testar com valores ocultos/visíveis

---

## ✅ Critérios de Sucesso

1. ✅ **Saldo Final = R$ 1.796,08** (Dezembro 2025)
2. ✅ **Nenhuma discrepância** em `opening + income - expense = closing`
3. ✅ **Continuidade perfeita** entre meses (`closing(n) = opening(n+1)`)
4. ✅ **Sem duplicação** de transações (hash_id único)
5. ✅ **Saldos visíveis** nos cards de mês (quando valores visíveis)
6. ✅ **Saldos visíveis** na lista de extratos (quando valores visíveis)

---

## 📞 Contatos para Dúvidas

- **Backend Issues:** Consultar `docs/architecture/backend_architecture.md`
- **Database Schema:** Consultar `docs/architecture/DATABASE_SCHEMA_VERIFIED.md`
- **Finance Module:** Consultar `docs/architecture/FINANCE_MODULE_ARCHITECTURE.md`
