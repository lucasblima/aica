"""
Finance Balance Auditor
Valida a integridade dos saldos processados dos extratos bancários.

Usage:
    python scripts/audit_finance_balances.py
"""

import os
from decimal import Decimal
from typing import List, Dict
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente do .env
load_dotenv()

# Configuração Supabase
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] ERRO: Variáveis de ambiente não configuradas!")
    print("   Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

USER_ID = 'bff0b38a-eb13-4763-bf90-3098c2d922dc'
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
        print("[AUDIT] Iniciando Auditoria de Saldos...\n")

        # 1. Buscar extratos
        statements = self.fetch_statements()
        print(f"[INFO] Total de extratos encontrados: {len(statements)}\n")

        # 2. Validar cada extrato
        print("=" * 80)
        print("VALIDAÇÃO DE SALDOS POR EXTRATO")
        print("=" * 80)

        for stmt in statements:
            result = self.validate_statement_balance(stmt)

            status = "[OK] OK" if result['is_valid'] else "[ERROR] ERRO"
            print(f"\n{status} {result['bank_name']} - {result['period']}")
            print(f"   Saldo Inicial: R$ {result['opening_balance']:,.2f}")
            print(f"   Receitas:      R$ {result['total_credits']:,.2f}")
            print(f"   Despesas:      R$ {result['total_debits']:,.2f}")
            print(f"   Saldo Final:   R$ {result['closing_balance']:,.2f}")
            print(f"   Esperado:      R$ {result['expected_closing']:,.2f}")

            if not result['is_valid']:
                print(f"   [WARN]  Discrepância: R$ {result['discrepancy']:,.2f}")
                self.discrepancies.append(result)

        # 3. Validar continuidade
        print("\n" + "=" * 80)
        print("VALIDAÇÃO DE CONTINUIDADE ENTRE MESES")
        print("=" * 80)

        continuity_errors = self.validate_continuity(statements)

        if continuity_errors:
            print(f"\n[ERROR] Encontrados {len(continuity_errors)} erros de continuidade:\n")
            for error in continuity_errors:
                print(f"   {error['current_period']} → {error['next_period']}")
                print(f"   Saldo Final: R$ {error['current_closing']:,.2f}")
                print(f"   Próximo Inicial: R$ {error['next_opening']:,.2f}")
                print(f"   Gap: R$ {error['gap']:,.2f}\n")
        else:
            print("\n[OK] Continuidade OK: Todos os saldos estão encadeados corretamente.")

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
                print("\n[OK] SALDO FINAL CORRETO!")
            else:
                print(f"\n[ERROR] SALDO FINAL INCORRETO! Diferença de R$ {difference:,.2f}")

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
