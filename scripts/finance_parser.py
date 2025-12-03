#!/usr/bin/env python3
"""
AICA Finance Parser - Privacy-First PDF Transaction Processor
Processes Nubank PDF statements locally and uploads to Supabase
"""

import os
import re
import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from decimal import Decimal

try:
    import pymupdf4llm
    from supabase import create_client, Client
except ImportError:
    print("❌ Missing dependencies. Install with:")
    print("   pip install pymupdf4llm supabase")
    exit(1)

# =====================================================
# CONFIGURATION
# =====================================================

# Month name mapping (Portuguese to number)
MONTH_MAP = {
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
    'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
    'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
}

# Lines to ignore (avoid duplicates and non-transaction items)
IGNORE_PATTERNS = [
    r'saldo inicial',
    r'saldo final',
    r'rendimento',
    r'pagamento de fatura',
    r'total',
]

# Auto-categorization rules
CATEGORY_RULES = {
    'income': [r'LUIZ FERNANDO LIMA DA SILVA'],
    'housing': [r'Fernanda Jardim', r'Richard Borba'],
    'utilities': [r'LIGHT SERVICOS'],
    'transport': [r'Uber', r'99 Pop', r'Uber\*'],
    'food': [r'iFood', r'Zona Sul', r'O Economico', r'Polux'],
}

# Recurring transaction patterns (for housing)
RECURRING_PATTERNS = [r'Fernanda Jardim', r'Richard Borba', r'LIGHT SERVICOS']


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def parse_date(date_str: str) -> Optional[str]:
    """
    Parse date from format '12 NOV 2024' to '2024-11-12'
    """
    match = re.search(r'(\d{2})\s+([A-Z]{3})\s+(\d{4})', date_str)
    if match:
        day, month_abbr, year = match.groups()
        month = MONTH_MAP.get(month_abbr)
        if month:
            return f"{year}-{month}-{day}"
    return None


def parse_amount(amount_str: str) -> Optional[float]:
    """
    Convert Brazilian format '1.200,50' to float 1200.50
    """
    try:
        # Remove dots (thousand separator) and replace comma with dot
        cleaned = amount_str.replace('.', '').replace(',', '.')
        return float(cleaned)
    except (ValueError, AttributeError):
        return None


def generate_hash(date: str, amount: float, description: str) -> str:
    """
    Generate unique hash for transaction to prevent duplicates
    """
    hash_input = f"{date}|{amount}|{description}".encode('utf-8')
    return hashlib.sha256(hash_input).hexdigest()[:16]


def should_ignore_line(line: str) -> bool:
    """
    Check if line should be ignored based on patterns
    """
    line_lower = line.lower()
    return any(re.search(pattern, line_lower) for pattern in IGNORE_PATTERNS)


def categorize_transaction(description: str) -> tuple[str, bool]:
    """
    Auto-categorize transaction and detect if recurring
    Returns: (category, is_recurring)
    """
    # Check for income
    for pattern in CATEGORY_RULES['income']:
        if re.search(pattern, description, re.IGNORECASE):
            return 'income', False
    
    # Check other categories
    for category, patterns in CATEGORY_RULES.items():
        if category == 'income':
            continue
        for pattern in patterns:
            if re.search(pattern, description, re.IGNORECASE):
                # Check if recurring
                is_recurring = any(re.search(p, description, re.IGNORECASE) 
                                 for p in RECURRING_PATTERNS)
                return category, is_recurring
    
    return 'outros', False


def extract_transactions_from_pdf(pdf_path: str) -> List[Dict]:
    """
    Extract transactions from Nubank PDF statement
    """
    print(f"📄 Processing: {pdf_path}")
    
    # Convert PDF to markdown
    md_text = pymupdf4llm.to_markdown(pdf_path)
    
    transactions = []
    lines = md_text.split('\n')
    
    # Regex patterns
    date_pattern = r'\d{2}\s+[A-Z]{3}\s+\d{4}'
    amount_pattern = r'R\$\s*([\d.,]+)'
    
    for line in lines:
        # Skip ignored lines
        if should_ignore_line(line):
            continue
        
        # Try to find date and amount
        date_match = re.search(date_pattern, line)
        amount_match = re.search(amount_pattern, line)
        
        if date_match and amount_match:
            date_str = date_match.group()
            amount_str = amount_match.group(1)
            
            parsed_date = parse_date(date_str)
            parsed_amount = parse_amount(amount_str)
            
            if parsed_date and parsed_amount:
                # Extract description (text before the date)
                description = line[:date_match.start()].strip()
                if not description:
                    description = "Transação sem descrição"
                
                # Categorize
                category, is_recurring = categorize_transaction(description)
                
                # Determine type (income vs expense)
                trans_type = 'income' if category == 'income' else 'expense'
                
                # Generate hash
                hash_id = generate_hash(parsed_date, parsed_amount, description)
                
                transactions.append({
                    'description': description,
                    'amount': parsed_amount,
                    'type': trans_type,
                    'category': category,
                    'transaction_date': parsed_date,
                    'is_recurring': is_recurring,
                    'hash_id': hash_id
                })
    
    return transactions


def calculate_summary(transactions: List[Dict]) -> Dict:
    """
    Calculate financial summary
    """
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    
    by_category = {}
    for t in transactions:
        cat = t['category']
        if cat not in by_category:
            by_category[cat] = 0
        by_category[cat] += t['amount']
    
    return {
        'total_transactions': len(transactions),
        'total_income': float(total_income),
        'total_expense': float(total_expense),
        'balance': float(total_income - total_expense),
        'by_category': {k: float(v) for k, v in by_category.items()}
    }


def upload_to_supabase(transactions: List[Dict], user_id: str, supabase_url: str, supabase_key: str):
    """
    Upload transactions to Supabase
    """
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Add user_id to each transaction
    for t in transactions:
        t['user_id'] = user_id
    
    try:
        # Batch insert
        result = supabase.table('finance_transactions').insert(transactions).execute()
        print(f"✅ Successfully uploaded {len(transactions)} transactions!")
        return True
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return False


# =====================================================
# MAIN EXECUTION
# =====================================================

def main():
    print("=" * 60)
    print("🏦 AICA FINANCE PARSER - Privacy-First PDF Processor")
    print("=" * 60)
    print()
    
    # Find all PDFs in current directory
    pdf_files = list(Path('.').glob('*.pdf'))
    
    if not pdf_files:
        print("❌ No PDF files found in current directory.")
        return
    
    print(f"📁 Found {len(pdf_files)} PDF file(s)")
    print()
    
    all_transactions = []
    
    # Process each PDF
    for pdf_file in pdf_files:
        transactions = extract_transactions_from_pdf(str(pdf_file))
        all_transactions.extend(transactions)
        print(f"   ✓ Extracted {len(transactions)} transactions")
    
    print()
    
    if not all_transactions:
        print("⚠️  No transactions found.")
        return
    
    # Calculate and display summary
    summary = calculate_summary(all_transactions)
    
    print("=" * 60)
    print("📊 FINANCIAL SUMMARY")
    print("=" * 60)
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print()
    
    # Ask for confirmation
    response = input("💾 Deseja enviar para o Aica? (S/N): ").strip().upper()
    
    if response == 'S':
        # Get credentials
        supabase_url = os.getenv('VITE_SUPABASE_URL')
        supabase_key = os.getenv('VITE_SUPABASE_ANON_KEY')
        user_id = input("🔑 Enter your User ID: ").strip()
        
        if not supabase_url or not supabase_key:
            print("❌ Missing Supabase credentials in environment variables.")
            print("   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY")
            return
        
        if not user_id:
            print("❌ User ID is required.")
            return
        
        upload_to_supabase(all_transactions, user_id, supabase_url, supabase_key)
    else:
        print("❌ Upload cancelled.")
    
    print()
    print("✨ Done!")


if __name__ == '__main__':
    main()
