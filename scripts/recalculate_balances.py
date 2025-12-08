"""
Finance Balance Recalculator
Recalcula saldos a partir das transações reais.

Usage:
    python scripts/recalculate_balances.py          # DRY RUN (não salva)
    python scripts/recalculate_balances.py --apply  # PRODUÇÃO (salva no banco)
"""

import os
import sys
from decimal import Decimal
from typing import List, Dict
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente do .env
load_dotenv()

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERRO: Variáveis de ambiente não configuradas!")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

USER_ID = 'bff0b38a-eb13-4763-bf90-3098c2d922dc'

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

        # Saldo inicial (do PDF)
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

            if 'error' in result:
                print(f"\n❌ {result['bank_name']} - {result['period']}")
                print(f"   Erro: {result['error']}")
                continue

            print(f"\n{result['bank_name']} - {result['period']}")
            print(f"   Saldo Inicial:      R$ {result['opening_balance']:,.2f}")
            print(f"   Receitas:           R$ {result['total_income']:,.2f}")
            print(f"   Despesas:           R$ {result['total_expense']:,.2f}")
            print(f"   Saldo Atual (DB):   R$ {result['current_closing']:,.2f}")
            print(f"   Saldo Calculado:    R$ {result['calculated_closing']:,.2f}")

            if result['needs_update']:
                diff = result['calculated_closing'] - result['current_closing']
                print(f"   ⚠️  PRECISA ATUALIZAR! Diferença: R$ {diff:,.2f}")
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

        print(f"\n{'=' * 80}")
        print(f"{'DRY RUN COMPLETO' if dry_run else 'RECÁLCULO COMPLETO'}")
        print(f"Total processado: {len(statements)}")
        print(f"Atualizações necessárias: {len(updates_needed)}")

        if dry_run and updates_needed:
            print("\n💡 Para aplicar as mudanças, execute: python scripts/recalculate_balances.py --apply")

if __name__ == '__main__':
    dry_run = '--apply' not in sys.argv

    recalculator = BalanceRecalculator(USER_ID)
    recalculator.recalculate_all(dry_run=dry_run)
