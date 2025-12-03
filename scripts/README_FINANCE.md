# AICA Finance Parser

Privacy-first PDF transaction processor for Nubank statements.

## Installation

```bash
pip install pymupdf4llm supabase
```

## Usage

1. Place your Nubank PDF statements in a folder
2. Set environment variables:
   ```bash
   export VITE_SUPABASE_URL="your_supabase_url"
   export VITE_SUPABASE_ANON_KEY="your_supabase_key"
   ```
3. Run the script:
   ```bash
   python finance_parser.py
   ```
4. Review the summary and confirm upload

## Features

- **Privacy First**: All processing happens locally
- **Auto-Categorization**: Automatically categorizes transactions
- **Duplicate Prevention**: Uses hash-based deduplication
- **Recurring Detection**: Identifies recurring payments (rent, utilities)
- **Batch Upload**: Efficient batch insertion to Supabase

## Categories

- `income`: Salary and income
- `housing`: Rent and housing costs
- `utilities`: Electricity, water, etc.
- `transport`: Uber, 99, etc.
- `food`: Restaurants, groceries
- `outros`: Uncategorized transactions

## Customization

Edit the `CATEGORY_RULES` and `RECURRING_PATTERNS` dictionaries in `finance_parser.py` to customize categorization for your needs.
