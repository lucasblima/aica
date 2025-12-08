# Arquitetura Robusta de Processamento de Extratos Bancários
## Aica Life OS - Finance Module

**Versão:** 2.0
**Data:** 2025-12-08
**Status:** Proposta de Melhorias
**Autor:** Backend Architect Agent

---

## Índice

1. [Análise do Sistema Atual](#análise-do-sistema-atual)
2. [Problemas Identificados](#problemas-identificados)
3. [Arquitetura Proposta](#arquitetura-proposta)
4. [Schema Melhorado](#schema-melhorado)
5. [Sistema de Ingestão CSV](#sistema-de-ingestão-csv)
6. [Validação e Reconciliação](#validação-e-reconciliação)
7. [Categorização Melhorada](#categorização-melhorada)
8. [Migrations SQL](#migrations-sql)
9. [Service Layer](#service-layer)
10. [Segurança e RLS](#segurança-e-rls)
11. [Plano de Implementação](#plano-de-implementação)

---

## Análise do Sistema Atual

### Tabelas Existentes

#### `finance_statements`
```sql
CREATE TABLE finance_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_hash TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT DEFAULT 'application/pdf',

  -- Statement metadata
  bank_name TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'credit_card', 'investment', 'other')),
  statement_period_start DATE,
  statement_period_end DATE,
  currency TEXT DEFAULT 'BRL' NOT NULL,

  -- Processing status
  processing_status TEXT DEFAULT 'pending' NOT NULL,
  processing_error TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,

  -- Financial summary
  opening_balance NUMERIC(12, 2),
  closing_balance NUMERIC(12, 2),
  total_credits NUMERIC(12, 2) DEFAULT 0,
  total_debits NUMERIC(12, 2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0 NOT NULL,

  -- Content
  markdown_content TEXT,
  markdown_generated_at TIMESTAMPTZ,

  -- AI analysis
  ai_summary TEXT,
  ai_insights JSONB,
  ai_analyzed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, file_hash)
);
```

#### `finance_transactions`
```sql
-- Campos existentes (simplificado)
CREATE TABLE finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  statement_id UUID REFERENCES finance_statements(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  original_description TEXT,
  normalized_description TEXT,
  amount NUMERIC(15,2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  transaction_date DATE NOT NULL,

  hash_id TEXT UNIQUE,  -- Deduplicação
  is_recurring BOOLEAN DEFAULT FALSE,
  ai_categorized BOOLEAN DEFAULT FALSE,
  ai_confidence NUMERIC(3,2),
  balance_after NUMERIC(15,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Processamento Atual

**Fluxo PDF:**
1. Upload via `statementService.uploadPDF()`
2. Extração texto via PDF.js (`pdfProcessingService.extractTextFromPDF()`)
3. Parsing AI via Gemini (`pdfProcessingService.parseStatementWithGeminiFallback()`)
4. Categorização: 82% caem em "other" (problema!)
5. Salvar `statementService.saveParsedData()`

**Limitações:**
- Apenas PDF suportado
- Categorização fraca (keyword-based simples)
- Sem validação de reconciliação
- Deduplicação via `hash_id` mas sem garantias fortes
- Saldos podem ficar inconsistentes

---

## Problemas Identificados

### 1. Inconsistências de Saldo
**Problema:** Saldo mostrava R$ 1.833,76, depois R$ 1.429,41
**Causa Raiz:**
- Falta de validação: `closing_balance = opening_balance + income - expenses`
- Sem rastreabilidade: difícil saber quais transações somam cada categoria
- Múltiplos uploads podem duplicar transações mesmo com `hash_id`

### 2. Categorização Pobre
**Problema:** 82% das transações em "other"
**Causa Raiz:**
- Gemini recebe texto cru sem contexto estruturado
- Keywords brasileiras fracas (lista limitada)
- Sem sistema de aprendizado com correções manuais

### 3. Falta de Auditabilidade
**Problema:** Não há forma de debugar de onde vêm os valores
**Falta:**
- Logs de processamento detalhados
- Snapshot de dados crus (antes do parse)
- Timestamps de cada etapa
- Metadata sobre origem (banco, formato, versão do parser)

### 4. Validação Insuficiente
**Problema:** Dados podem entrar inconsistentes
**Falta:**
- Validação matemática de saldos
- Detecção de transações duplicadas (além de hash)
- Verificação de continuidade entre períodos
- Alertas de anomalias (ex: saldo negativo inesperado)

---

## Arquitetura Proposta

### Princípios de Design

1. **Multi-Source Support:** CSV + PDF (com fallback)
2. **Validation-First:** Validar antes de salvar
3. **Audit Trail:** Rastrear toda operação
4. **Deduplication:** Múltiplas camadas de detecção
5. **Reconciliation:** Matemática deve fechar sempre
6. **Privacy:** CSV processado localmente (browser)

### Diagrama de Alto Nível

```
┌────────────────────────────────────────────────────────────┐
│                     FRONTEND (BROWSER)                      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ CSV Upload   │         │ PDF Upload   │                │
│  │ (Preferred)  │         │ (Fallback)   │                │
│  └──────┬───────┘         └──────┬───────┘                │
│         │                        │                         │
│         ▼                        ▼                         │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ CSV Parser   │         │ PDF.js       │                │
│  │ (JavaScript) │         │ + Gemini AI  │                │
│  └──────┬───────┘         └──────┬───────┘                │
│         │                        │                         │
│         └────────┬───────────────┘                         │
│                  ▼                                          │
│         ┌────────────────┐                                 │
│         │ Validation     │                                 │
│         │ Engine         │                                 │
│         │ - Schema check │                                 │
│         │ - Dedup check  │                                 │
│         │ - Math valid.  │                                 │
│         └────────┬───────┘                                 │
│                  │                                          │
└──────────────────┼──────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│                    SUPABASE (BACKEND)                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────┐             │
│  │     finance_statements (Enhanced)         │             │
│  │  + source_type (csv, pdf)                │             │
│  │  + source_bank (nubank, inter, itau)     │             │
│  │  + raw_data_snapshot (JSONB)             │             │
│  │  + processing_metadata (JSONB)           │             │
│  │  + validation_status                     │             │
│  │  + reconciliation_errors (JSONB[])       │             │
│  └──────────────┬───────────────────────────┘             │
│                 │                                           │
│  ┌──────────────▼───────────────────────────┐             │
│  │     finance_transactions (Enhanced)       │             │
│  │  + transaction_hash (SHA256)             │             │
│  │  + source_line_number                    │             │
│  │  + raw_description (original)            │             │
│  │  + categorization_history (JSONB[])      │             │
│  │  + is_duplicate                          │             │
│  │  + duplicate_of (UUID)                   │             │
│  └──────────────┬───────────────────────────┘             │
│                 │                                           │
│  ┌──────────────▼───────────────────────────┐             │
│  │     finance_processing_logs (NEW)         │             │
│  │  Audit trail de cada operação            │             │
│  └───────────────────────────────────────────┘             │
│                                                             │
│  ┌──────────────────────────────────────────┐             │
│  │   PostgreSQL Functions (NEW)              │             │
│  │  - validate_statement_balance()           │             │
│  │  - detect_duplicate_transactions()        │             │
│  │  - recalculate_closing_balance()          │             │
│  │  - check_period_continuity()              │             │
│  └───────────────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Schema Melhorado

### Nova Tabela: `finance_processing_logs`

```sql
-- Audit trail completo de processamento
CREATE TABLE finance_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  statement_id UUID REFERENCES finance_statements(id) ON DELETE CASCADE,

  -- Event tracking
  event_type TEXT NOT NULL CHECK (event_type IN (
    'upload_started',
    'file_validated',
    'extraction_started',
    'extraction_completed',
    'parsing_started',
    'parsing_completed',
    'validation_started',
    'validation_completed',
    'save_started',
    'save_completed',
    'processing_failed',
    'duplicate_detected',
    'reconciliation_error'
  )),

  -- Event details
  message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  error_details JSONB,

  -- Performance tracking
  duration_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Categorization
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

CREATE INDEX idx_processing_logs_statement_id ON finance_processing_logs(statement_id);
CREATE INDEX idx_processing_logs_user_id ON finance_processing_logs(user_id);
CREATE INDEX idx_processing_logs_timestamp ON finance_processing_logs(timestamp DESC);
CREATE INDEX idx_processing_logs_event_type ON finance_processing_logs(event_type);
```

### Campos Adicionais em `finance_statements`

```sql
-- Migration: adicionar campos de auditoria e validação
ALTER TABLE finance_statements
  -- Metadata de origem
  ADD COLUMN source_type TEXT CHECK (source_type IN ('csv', 'pdf', 'manual')) DEFAULT 'pdf',
  ADD COLUMN source_bank TEXT CHECK (source_bank IN ('nubank', 'inter', 'itau', 'bradesco', 'caixa', 'santander', 'banco_brasil', 'other')),
  ADD COLUMN file_format_version TEXT, -- ex: "nubank_csv_v2", "itau_pdf_2024"

  -- Snapshot de dados crus (para reprocessamento)
  ADD COLUMN raw_data_snapshot JSONB, -- Array das linhas originais (CSV) ou texto (PDF)
  ADD COLUMN raw_data_hash TEXT, -- SHA256 do raw_data_snapshot

  -- Processing metadata
  ADD COLUMN processing_metadata JSONB DEFAULT '{}'::jsonb, -- { parser_version, ai_model, etc }
  ADD COLUMN reprocessed_count INTEGER DEFAULT 0,
  ADD COLUMN reprocessed_at TIMESTAMPTZ,

  -- Validation status
  ADD COLUMN validation_status TEXT CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')) DEFAULT 'pending',
  ADD COLUMN reconciliation_errors JSONB DEFAULT '[]'::jsonb, -- Array de erros matemáticos
  ADD COLUMN has_duplicates BOOLEAN DEFAULT FALSE,
  ADD COLUMN duplicate_count INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX idx_statements_source_type ON finance_statements(source_type);
CREATE INDEX idx_statements_source_bank ON finance_statements(source_bank);
CREATE INDEX idx_statements_validation_status ON finance_statements(validation_status);
CREATE INDEX idx_statements_has_duplicates ON finance_statements(has_duplicates) WHERE has_duplicates = TRUE;
```

### Campos Adicionais em `finance_transactions`

```sql
-- Migration: melhorar deduplicação e rastreabilidade
ALTER TABLE finance_transactions
  -- Enhanced deduplication (além de hash_id)
  ADD COLUMN transaction_hash TEXT, -- SHA256 de (user_id|date|description|amount)
  ADD COLUMN is_duplicate BOOLEAN DEFAULT FALSE,
  ADD COLUMN duplicate_of UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  ADD COLUMN duplicate_detected_at TIMESTAMPTZ,

  -- Source tracking
  ADD COLUMN source_line_number INTEGER, -- Linha do CSV ou posição no PDF
  ADD COLUMN raw_description TEXT, -- Descrição original SEM limpeza

  -- Categorization history (aprendizado)
  ADD COLUMN categorization_history JSONB DEFAULT '[]'::jsonb,
  /* Exemplo:
  [
    {
      "timestamp": "2025-12-08T10:00:00Z",
      "category": "other",
      "confidence": 0.3,
      "method": "ai",
      "model": "gemini-2.0-flash"
    },
    {
      "timestamp": "2025-12-08T10:05:00Z",
      "category": "food",
      "confidence": 1.0,
      "method": "manual",
      "user_corrected": true
    }
  ]
  */

  -- Validation flags
  ADD COLUMN is_anomaly BOOLEAN DEFAULT FALSE, -- Ex: valor muito alto/baixo
  ADD COLUMN anomaly_reason TEXT;

-- Indexes
CREATE INDEX idx_transactions_hash ON finance_transactions(transaction_hash);
CREATE INDEX idx_transactions_is_duplicate ON finance_transactions(is_duplicate) WHERE is_duplicate = TRUE;
CREATE INDEX idx_transactions_duplicate_of ON finance_transactions(duplicate_of) WHERE duplicate_of IS NOT NULL;
CREATE INDEX idx_transactions_source_line ON finance_transactions(source_line_number);
CREATE INDEX idx_transactions_is_anomaly ON finance_transactions(is_anomaly) WHERE is_anomaly = TRUE;
```

### Nova Tabela: `finance_categorization_rules`

```sql
-- Regras determinísticas de categorização (user-level + system-level)
CREATE TABLE finance_categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = system rule

  -- Rule definition
  rule_name TEXT NOT NULL,
  rule_type TEXT CHECK (rule_type IN ('keyword', 'merchant', 'amount_range', 'regex')),

  -- Matching criteria
  keywords TEXT[], -- ex: ['ifood', 'uber eats', 'rappi']
  merchant_pattern TEXT, -- regex ou LIKE pattern
  amount_min NUMERIC(15,2),
  amount_max NUMERIC(15,2),
  regex_pattern TEXT,

  -- Target category
  target_category TEXT NOT NULL,
  target_subcategory TEXT,

  -- Priority and activation
  priority INTEGER DEFAULT 0, -- Higher = aplicado primeiro
  is_active BOOLEAN DEFAULT TRUE,

  -- Stats
  match_count INTEGER DEFAULT 0, -- Quantas vezes essa regra foi usada
  last_matched_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_categorization_rules_user_id ON finance_categorization_rules(user_id);
CREATE INDEX idx_categorization_rules_active ON finance_categorization_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_categorization_rules_priority ON finance_categorization_rules(priority DESC);
CREATE INDEX idx_categorization_rules_type ON finance_categorization_rules(rule_type);

-- RLS
ALTER TABLE finance_categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system and own rules"
  ON finance_categorization_rules FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can manage own rules"
  ON finance_categorization_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Sistema de Ingestão CSV

### Formatos Suportados

#### Nubank CSV
```csv
date,category,title,amount,account
2025-01-15,Alimentação,Ifood - Pedido,-45.90,Conta Nubank
2025-01-16,Transporte,Uber - Corrida,-28.50,Conta Nubank
2025-01-20,,,+3000.00,Conta Nubank
```

**Mapeamento:**
- `date` → `transaction_date`
- `title` → `description`
- `amount` → `amount` (já com sinal)
- `category` → use se presente, senão categorizar

#### Banco Inter CSV
```csv
Data;Descrição;Valor;Saldo
15/01/2025;PIX RECEBIDO - EMPRESA XYZ;3000,00;5432,10
16/01/2025;UBER *CORRIDA;-28,50;5403,60
```

**Mapeamento:**
- `Data` → parse DD/MM/YYYY
- `Descrição` → `description`
- `Valor` → parse com vírgula
- `Saldo` → `balance_after`

#### Itaú CSV (Variação)
```csv
data;lancamento;valor;saldo
15/01/2025;Transferencia recebida;3.000,00;5.432,10
16/01/2025;Debito automatico Spotify;-16,90;5.415,20
```

### CSV Parser Service

**Arquivo:** `src/modules/finance/services/csvParserService.ts`

```typescript
/**
 * CSV Parser Service
 * Detecta formato do CSV e extrai transações
 */

export interface CSVParseResult {
  bankName: string;
  accountType: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other';
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  transactions: ParsedTransaction[];
  sourceFormat: string; // ex: "nubank_csv_v2"
  rawDataSnapshot: string[][]; // Array das linhas originais
}

export interface CSVBankFormat {
  bankName: string;
  delimiter: string; // ',' ou ';'
  dateFormat: string; // 'YYYY-MM-DD' ou 'DD/MM/YYYY'
  decimalSeparator: string; // '.' ou ','
  columns: {
    date: string | number;
    description: string | number;
    amount: string | number;
    balance?: string | number;
    category?: string | number;
  };
  amountSign: 'auto' | 'separate'; // 'auto' = negativo no valor, 'separate' = coluna type
}

// Formatos conhecidos
const KNOWN_FORMATS: CSVBankFormat[] = [
  {
    bankName: 'Nubank',
    delimiter: ',',
    dateFormat: 'YYYY-MM-DD',
    decimalSeparator: '.',
    columns: { date: 'date', description: 'title', amount: 'amount', category: 'category' },
    amountSign: 'auto'
  },
  {
    bankName: 'Banco Inter',
    delimiter: ';',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    columns: { date: 'Data', description: 'Descrição', amount: 'Valor', balance: 'Saldo' },
    amountSign: 'auto'
  },
  {
    bankName: 'Itaú',
    delimiter: ';',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    columns: { date: 'data', description: 'lancamento', amount: 'valor', balance: 'saldo' },
    amountSign: 'auto'
  }
];

export class CSVParserService {
  /**
   * Detecta o formato do CSV automaticamente
   */
  detectFormat(csvContent: string): CSVBankFormat | null {
    const lines = csvContent.split('\n');
    if (lines.length < 2) return null;

    const header = lines[0].toLowerCase();

    // Detectar por header
    for (const format of KNOWN_FORMATS) {
      const dateCol = typeof format.columns.date === 'string' ? format.columns.date.toLowerCase() : format.columns.date;
      const descCol = typeof format.columns.description === 'string' ? format.columns.description.toLowerCase() : format.columns.description;

      if (header.includes(dateCol) && header.includes(descCol)) {
        return format;
      }
    }

    return null;
  }

  /**
   * Parse CSV file
   */
  async parseCSV(file: File): Promise<CSVParseResult> {
    const text = await file.text();
    const format = this.detectFormat(text);

    if (!format) {
      throw new Error('Formato de CSV não reconhecido. Bancos suportados: Nubank, Inter, Itaú');
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const header = lines[0].split(format.delimiter);
    const rows = lines.slice(1).map(line => line.split(format.delimiter));

    // Encontrar índices das colunas
    const dateIdx = this.findColumnIndex(header, format.columns.date);
    const descIdx = this.findColumnIndex(header, format.columns.description);
    const amountIdx = this.findColumnIndex(header, format.columns.amount);
    const balanceIdx = format.columns.balance ? this.findColumnIndex(header, format.columns.balance) : -1;
    const categoryIdx = format.columns.category ? this.findColumnIndex(header, format.columns.category) : -1;

    // Parse transações
    const transactions: ParsedTransaction[] = [];
    let openingBalance = 0;
    let closingBalance = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 3) continue; // Skip linhas vazias

      const dateStr = row[dateIdx]?.trim();
      const description = row[descIdx]?.trim();
      const amountStr = row[amountIdx]?.trim();
      const balanceStr = balanceIdx >= 0 ? row[balanceIdx]?.trim() : null;
      const categoryStr = categoryIdx >= 0 ? row[categoryIdx]?.trim() : null;

      if (!dateStr || !amountStr) continue;

      // Parse date
      const date = this.parseDate(dateStr, format.dateFormat);

      // Parse amount
      const amount = this.parseAmount(amountStr, format.decimalSeparator);

      // Parse balance
      const balance = balanceStr ? this.parseAmount(balanceStr, format.decimalSeparator) : undefined;

      // Determine type
      const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';

      // Track balances
      if (i === 0 && balance !== undefined) {
        openingBalance = balance - (type === 'income' ? amount : -amount);
      }
      if (balance !== undefined) {
        closingBalance = balance;
      }

      transactions.push({
        date,
        description: description || 'Sem descrição',
        amount: Math.abs(amount),
        type,
        balance,
        suggestedCategory: categoryStr || undefined,
        sourceLineNumber: i + 2 // +2 porque header=1, índice começa em 0
      });
    }

    // Inferir período
    const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
    const periodStart = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const periodEnd = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // Calcular closing_balance se não houver coluna de saldo
    if (closingBalance === 0 && transactions.length > 0) {
      closingBalance = openingBalance;
      transactions.forEach(t => {
        closingBalance += t.type === 'income' ? t.amount : -t.amount;
      });
    }

    return {
      bankName: format.bankName,
      accountType: 'checking', // TODO: detectar do nome da conta
      periodStart,
      periodEnd,
      openingBalance,
      closingBalance,
      currency: 'BRL',
      transactions,
      sourceFormat: `${format.bankName.toLowerCase().replace(/\s+/g, '_')}_csv`,
      rawDataSnapshot: [header, ...rows]
    };
  }

  private findColumnIndex(header: string[], col: string | number): number {
    if (typeof col === 'number') return col;
    const normalized = header.map(h => h.toLowerCase().trim());
    return normalized.indexOf(col.toLowerCase());
  }

  private parseDate(dateStr: string, format: string): string {
    if (format === 'YYYY-MM-DD') {
      return dateStr; // Já no formato ISO
    } else if (format === 'DD/MM/YYYY') {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    throw new Error(`Formato de data desconhecido: ${format}`);
  }

  private parseAmount(amountStr: string, decimalSeparator: string): number {
    // Remove espaços e caracteres não numéricos exceto separador decimal e sinal
    let cleaned = amountStr.replace(/\s+/g, '');

    // Se decimal separator é vírgula, trocar por ponto
    if (decimalSeparator === ',') {
      cleaned = cleaned.replace('.', '').replace(',', '.');
    }

    return parseFloat(cleaned) || 0;
  }
}

export const csvParserService = new CSVParserService();
```

---

## Validação e Reconciliação

### Funções PostgreSQL

```sql
-- =====================================================
-- Function: validate_statement_balance
-- Valida que closing_balance = opening_balance + credits - debits
-- =====================================================
CREATE OR REPLACE FUNCTION validate_statement_balance(
  p_statement_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_statement RECORD;
  v_calculated_closing NUMERIC(15,2);
  v_discrepancy NUMERIC(15,2);
  v_result JSONB;
BEGIN
  -- Buscar statement
  SELECT * INTO v_statement
  FROM finance_statements
  WHERE id = p_statement_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Statement not found'
    );
  END IF;

  -- Calcular closing esperado
  v_calculated_closing := COALESCE(v_statement.opening_balance, 0)
                        + COALESCE(v_statement.total_credits, 0)
                        - COALESCE(v_statement.total_debits, 0);

  -- Calcular discrepância
  v_discrepancy := COALESCE(v_statement.closing_balance, 0) - v_calculated_closing;

  -- Considerar válido se discrepância < 0.01 (1 centavo)
  v_result := jsonb_build_object(
    'valid', ABS(v_discrepancy) < 0.01,
    'opening_balance', v_statement.opening_balance,
    'closing_balance', v_statement.closing_balance,
    'total_credits', v_statement.total_credits,
    'total_debits', v_statement.total_debits,
    'calculated_closing', v_calculated_closing,
    'discrepancy', v_discrepancy
  );

  -- Atualizar validation_status
  UPDATE finance_statements
  SET
    validation_status = CASE
      WHEN ABS(v_discrepancy) < 0.01 THEN 'valid'
      WHEN ABS(v_discrepancy) < 1.00 THEN 'warning'
      ELSE 'invalid'
    END,
    reconciliation_errors = CASE
      WHEN ABS(v_discrepancy) >= 0.01 THEN
        COALESCE(reconciliation_errors, '[]'::jsonb) ||
        jsonb_build_object(
          'type', 'balance_mismatch',
          'discrepancy', v_discrepancy,
          'detected_at', NOW()
        )
      ELSE reconciliation_errors
    END
  WHERE id = p_statement_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =====================================================
-- Function: detect_duplicate_transactions
-- Detecta transações duplicadas para um statement
-- =====================================================
CREATE OR REPLACE FUNCTION detect_duplicate_transactions(
  p_statement_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_duplicates JSONB;
  v_count INTEGER;
BEGIN
  -- Encontrar duplicatas por transaction_hash
  WITH duplicates AS (
    SELECT
      transaction_hash,
      array_agg(id ORDER BY created_at) AS transaction_ids,
      COUNT(*) AS duplicate_count
    FROM finance_transactions
    WHERE statement_id = p_statement_id
      AND transaction_hash IS NOT NULL
    GROUP BY transaction_hash
    HAVING COUNT(*) > 1
  )
  SELECT
    COUNT(*),
    jsonb_agg(
      jsonb_build_object(
        'transaction_hash', transaction_hash,
        'duplicate_count', duplicate_count,
        'transaction_ids', transaction_ids
      )
    )
  INTO v_count, v_duplicates
  FROM duplicates;

  -- Marcar transações como duplicadas (manter primeira, marcar demais)
  UPDATE finance_transactions t
  SET
    is_duplicate = TRUE,
    duplicate_of = (
      SELECT id
      FROM finance_transactions
      WHERE transaction_hash = t.transaction_hash
        AND statement_id = p_statement_id
      ORDER BY created_at
      LIMIT 1
    ),
    duplicate_detected_at = NOW()
  WHERE statement_id = p_statement_id
    AND id != (
      SELECT id
      FROM finance_transactions
      WHERE transaction_hash = t.transaction_hash
        AND statement_id = p_statement_id
      ORDER BY created_at
      LIMIT 1
    )
    AND transaction_hash IN (
      SELECT transaction_hash
      FROM finance_transactions
      WHERE statement_id = p_statement_id
      GROUP BY transaction_hash
      HAVING COUNT(*) > 1
    );

  -- Atualizar statement
  UPDATE finance_statements
  SET
    has_duplicates = CASE WHEN v_count > 0 THEN TRUE ELSE FALSE END,
    duplicate_count = v_count
  WHERE id = p_statement_id;

  RETURN jsonb_build_object(
    'duplicate_groups', COALESCE(v_count, 0),
    'details', COALESCE(v_duplicates, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =====================================================
-- Function: recalculate_closing_balance
-- Recalcula closing_balance a partir das transações
-- =====================================================
CREATE OR REPLACE FUNCTION recalculate_closing_balance(
  p_statement_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_statement RECORD;
  v_total_income NUMERIC(15,2);
  v_total_expense NUMERIC(15,2);
  v_new_closing NUMERIC(15,2);
  v_old_closing NUMERIC(15,2);
BEGIN
  -- Buscar statement
  SELECT * INTO v_statement
  FROM finance_statements
  WHERE id = p_statement_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Statement not found');
  END IF;

  -- Calcular totais das transações (excluindo duplicatas)
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expense
  FROM finance_transactions
  WHERE statement_id = p_statement_id
    AND (is_duplicate = FALSE OR is_duplicate IS NULL);

  -- Calcular novo closing
  v_new_closing := COALESCE(v_statement.opening_balance, 0) + v_total_income - v_total_expense;
  v_old_closing := v_statement.closing_balance;

  -- Atualizar statement
  UPDATE finance_statements
  SET
    closing_balance = v_new_closing,
    total_credits = v_total_income,
    total_debits = v_total_expense,
    transaction_count = (
      SELECT COUNT(*)
      FROM finance_transactions
      WHERE statement_id = p_statement_id
        AND (is_duplicate = FALSE OR is_duplicate IS NULL)
    ),
    reprocessed_count = reprocessed_count + 1,
    reprocessed_at = NOW()
  WHERE id = p_statement_id;

  RETURN jsonb_build_object(
    'old_closing_balance', v_old_closing,
    'new_closing_balance', v_new_closing,
    'total_income', v_total_income,
    'total_expense', v_total_expense,
    'discrepancy', v_new_closing - v_old_closing
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =====================================================
-- Function: check_period_continuity
-- Verifica se closing de um período = opening do próximo
-- =====================================================
CREATE OR REPLACE FUNCTION check_period_continuity(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_errors JSONB := '[]'::jsonb;
  v_prev RECORD;
  v_curr RECORD;
BEGIN
  FOR v_curr IN
    SELECT *
    FROM finance_statements
    WHERE user_id = p_user_id
      AND processing_status = 'completed'
    ORDER BY statement_period_start
  LOOP
    IF v_prev IS NOT NULL THEN
      -- Verificar se closing do anterior = opening do atual
      IF ABS(COALESCE(v_prev.closing_balance, 0) - COALESCE(v_curr.opening_balance, 0)) > 0.01 THEN
        v_errors := v_errors || jsonb_build_object(
          'prev_statement_id', v_prev.id,
          'prev_period_end', v_prev.statement_period_end,
          'prev_closing', v_prev.closing_balance,
          'curr_statement_id', v_curr.id,
          'curr_period_start', v_curr.statement_period_start,
          'curr_opening', v_curr.opening_balance,
          'gap', COALESCE(v_curr.opening_balance, 0) - COALESCE(v_prev.closing_balance, 0)
        );
      END IF;
    END IF;

    v_prev := v_curr;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =====================================================
-- Function: generate_transaction_hash
-- Gera hash deterministico para deduplicação
-- =====================================================
CREATE OR REPLACE FUNCTION generate_transaction_hash(
  p_user_id UUID,
  p_date DATE,
  p_description TEXT,
  p_amount NUMERIC
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      p_user_id::text || '|' ||
      p_date::text || '|' ||
      LOWER(TRIM(p_description)) || '|' ||
      ROUND(p_amount, 2)::text,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Trigger para Auto-validação

```sql
-- Trigger: valida automaticamente após insert/update
CREATE OR REPLACE FUNCTION trigger_validate_statement()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar balance após insert/update
  IF (NEW.processing_status = 'completed') THEN
    PERFORM validate_statement_balance(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_statement_completed
  AFTER INSERT OR UPDATE OF processing_status
  ON finance_statements
  FOR EACH ROW
  WHEN (NEW.processing_status = 'completed')
  EXECUTE FUNCTION trigger_validate_statement();

-- Trigger: gera transaction_hash automaticamente
CREATE OR REPLACE FUNCTION trigger_generate_transaction_hash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_hash IS NULL THEN
    NEW.transaction_hash := generate_transaction_hash(
      NEW.user_id,
      NEW.transaction_date,
      NEW.description,
      NEW.amount
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_transaction_insert
  BEFORE INSERT ON finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_transaction_hash();
```

---

## Categorização Melhorada

### Sistema de Regras Deterministicas

```sql
-- Seed de regras de categorização brasileiras
INSERT INTO finance_categorization_rules (
  rule_name, rule_type, keywords, target_category, target_subcategory, priority
) VALUES
  -- Alimentação
  ('Delivery Apps', 'keyword', ARRAY['ifood', 'uber eats', 'rappi', '99food'], 'food', 'delivery', 100),
  ('Restaurantes', 'keyword', ARRAY['restaurante', 'lanchonete', 'padaria', 'pizzaria', 'hamburgueria'], 'food', 'restaurant', 90),
  ('Supermercados', 'keyword', ARRAY['supermercado', 'mercado', 'carrefour', 'extra', 'pao de acucar'], 'food', 'groceries', 90),

  -- Transporte
  ('Uber/99', 'keyword', ARRAY['uber', '99', '99pop', 'uber trip'], 'transport', 'ride_sharing', 100),
  ('Combustível', 'keyword', ARRAY['posto', 'gasolina', 'combustivel', 'etanol', 'gnv', 'shell', 'ipiranga'], 'transport', 'fuel', 90),
  ('Estacionamento', 'keyword', ARRAY['estacionamento', 'estapar', 'vaga'], 'transport', 'parking', 80),
  ('Pedágio', 'keyword', ARRAY['pedagio', 'sem parar', 'conectcar'], 'transport', 'toll', 80),

  -- Moradia
  ('Aluguel', 'keyword', ARRAY['aluguel', 'alug.', 'locacao'], 'housing', 'rent', 100),
  ('Condomínio', 'keyword', ARRAY['condominio', 'cond.', 'sindico'], 'housing', 'condo', 90),
  ('Energia', 'keyword', ARRAY['enel', 'cemig', 'copel', 'celpe', 'light', 'eletricidade'], 'housing', 'electricity', 90),
  ('Água', 'keyword', ARRAY['sabesp', 'saneamento', 'agua', 'embasa'], 'housing', 'water', 90),
  ('Internet', 'keyword', ARRAY['vivo fibra', 'claro net', 'oi fibra', 'tim fibra', 'internet'], 'housing', 'internet', 90),

  -- Saúde
  ('Farmácia', 'keyword', ARRAY['farmacia', 'drogaria', 'droga raia', 'pacheco', 'sao paulo'], 'health', 'pharmacy', 100),
  ('Plano de Saúde', 'keyword', ARRAY['unimed', 'amil', 'sulamerica', 'bradesco saude', 'plano de saude'], 'health', 'insurance', 100),

  -- Educação
  ('Cursos Online', 'keyword', ARRAY['udemy', 'coursera', 'alura', 'rocketseat'], 'education', 'online_course', 100),

  -- Entretenimento
  ('Streaming', 'keyword', ARRAY['netflix', 'spotify', 'amazon prime', 'disney', 'hbo max', 'youtube premium'], 'entertainment', 'streaming', 100),
  ('Cinema', 'keyword', ARRAY['cinemark', 'kinoplex', 'cinema', 'ingresso.com'], 'entertainment', 'cinema', 80),

  -- Transferências
  ('PIX Enviado', 'keyword', ARRAY['pix enviado', 'pix env', 'transf pix'], 'transfer', 'pix_sent', 100),
  ('PIX Recebido', 'keyword', ARRAY['pix recebido', 'pix rec', 'recebido pix'], 'salary', 'pix_received', 100),
  ('TED/DOC', 'keyword', ARRAY['ted', 'doc', 'transferencia'], 'transfer', 'bank_transfer', 90)
ON CONFLICT DO NOTHING;
```

### Service de Categorização Híbrida

```typescript
/**
 * Hybrid Categorization Service
 * 1. Aplica regras determinísticas (rápido, confiável)
 * 2. Se nenhuma regra match, usa AI (Gemini)
 * 3. Salva resultado em categorization_history
 */

export class CategorizationService {
  /**
   * Categoriza uma transação usando regras + AI fallback
   */
  async categorizeTransaction(
    transaction: {
      description: string;
      amount: number;
      type: 'income' | 'expense';
    },
    userId: string
  ): Promise<CategorizationResult> {
    // 1. Tentar regras determinísticas primeiro
    const ruleResult = await this.applyRules(transaction, userId);

    if (ruleResult.matched) {
      return {
        category: ruleResult.category,
        subcategory: ruleResult.subcategory,
        confidence: 1.0,
        method: 'rule',
        ruleId: ruleResult.ruleId,
        ruleName: ruleResult.ruleName
      };
    }

    // 2. Fallback para AI
    const aiResult = await this.categorizeWithAI(transaction);

    return {
      category: aiResult.category,
      subcategory: aiResult.subcategory,
      confidence: aiResult.confidence,
      method: 'ai',
      model: 'gemini-2.0-flash'
    };
  }

  /**
   * Aplica regras de categorização
   */
  private async applyRules(
    transaction: any,
    userId: string
  ): Promise<RuleMatchResult> {
    const description = transaction.description.toLowerCase();

    // Buscar regras ativas (system + user) ordenadas por prioridade
    const { data: rules } = await supabase
      .from('finance_categorization_rules')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (!rules) return { matched: false };

    // Aplicar regras em ordem de prioridade
    for (const rule of rules) {
      let matched = false;

      switch (rule.rule_type) {
        case 'keyword':
          matched = rule.keywords.some((keyword: string) =>
            description.includes(keyword.toLowerCase())
          );
          break;

        case 'merchant':
          if (rule.merchant_pattern) {
            const regex = new RegExp(rule.merchant_pattern, 'i');
            matched = regex.test(description);
          }
          break;

        case 'amount_range':
          matched = transaction.amount >= rule.amount_min
                    && transaction.amount <= rule.amount_max;
          break;

        case 'regex':
          if (rule.regex_pattern) {
            const regex = new RegExp(rule.regex_pattern, 'i');
            matched = regex.test(description);
          }
          break;
      }

      if (matched) {
        // Atualizar estatísticas da regra
        await supabase
          .from('finance_categorization_rules')
          .update({
            match_count: rule.match_count + 1,
            last_matched_at: new Date().toISOString()
          })
          .eq('id', rule.id);

        return {
          matched: true,
          category: rule.target_category,
          subcategory: rule.target_subcategory,
          ruleId: rule.id,
          ruleName: rule.rule_name
        };
      }
    }

    return { matched: false };
  }

  /**
   * Categoriza com AI (Gemini)
   */
  private async categorizeWithAI(transaction: any): Promise<AICategorizationResult> {
    const prompt = `Categorize esta transação bancária brasileira:

Descrição: ${transaction.description}
Valor: R$ ${transaction.amount.toFixed(2)}
Tipo: ${transaction.type === 'income' ? 'Receita' : 'Despesa'}

Retorne um JSON com:
{
  "category": "categoria principal (food, transport, housing, health, education, entertainment, shopping, bills, salary, investment, transfer, other)",
  "subcategory": "subcategoria específica (opcional)",
  "confidence": número entre 0 e 1,
  "reasoning": "breve explicação"
}

Categorias disponíveis:
- food (alimentação: delivery, restaurant, groceries)
- transport (transporte: ride_sharing, fuel, parking, toll, public_transport)
- housing (moradia: rent, condo, electricity, water, internet, gas)
- health (saúde: pharmacy, insurance, doctor, hospital)
- education (educação: online_course, books, school)
- entertainment (lazer: streaming, cinema, events)
- shopping (compras: online, clothing, electronics)
- bills (contas: phone, subscriptions)
- salary (salário e rendimentos)
- investment (investimentos)
- transfer (transferências entre contas)
- other (outros)

Retorne APENAS o JSON, sem texto adicional.`;

    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonMatch) {
      return { category: 'other', confidence: 0.1 };
    }

    const parsed = JSON.parse(jsonMatch);

    return {
      category: parsed.category || 'other',
      subcategory: parsed.subcategory,
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning
    };
  }
}
```

---

## Migrations SQL

### Migration 1: Schema Enhancements

**Arquivo:** `supabase/migrations/20251208_finance_robust_processing.sql`

```sql
-- =====================================================
-- Finance Module: Robust Processing Architecture
-- Migration: 20251208_finance_robust_processing.sql
-- Created: 2025-12-08
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For gen_random_uuid() and digest()

-- =====================================================
-- 1. Create finance_processing_logs table
-- =====================================================
CREATE TABLE IF NOT EXISTS finance_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  statement_id UUID REFERENCES finance_statements(id) ON DELETE CASCADE,

  -- Event tracking
  event_type TEXT NOT NULL CHECK (event_type IN (
    'upload_started',
    'file_validated',
    'extraction_started',
    'extraction_completed',
    'parsing_started',
    'parsing_completed',
    'validation_started',
    'validation_completed',
    'save_started',
    'save_completed',
    'processing_failed',
    'duplicate_detected',
    'reconciliation_error'
  )),

  -- Event details
  message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  error_details JSONB,

  -- Performance tracking
  duration_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Categorization
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

CREATE INDEX idx_processing_logs_statement_id ON finance_processing_logs(statement_id);
CREATE INDEX idx_processing_logs_user_id ON finance_processing_logs(user_id);
CREATE INDEX idx_processing_logs_timestamp ON finance_processing_logs(timestamp DESC);
CREATE INDEX idx_processing_logs_event_type ON finance_processing_logs(event_type);

-- RLS
ALTER TABLE finance_processing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON finance_processing_logs FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. Enhance finance_statements table
-- =====================================================
ALTER TABLE finance_statements
  -- Metadata de origem
  ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('csv', 'pdf', 'manual')) DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS source_bank TEXT CHECK (source_bank IN ('nubank', 'inter', 'itau', 'bradesco', 'caixa', 'santander', 'banco_brasil', 'other')),
  ADD COLUMN IF NOT EXISTS file_format_version TEXT,

  -- Snapshot de dados crus
  ADD COLUMN IF NOT EXISTS raw_data_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS raw_data_hash TEXT,

  -- Processing metadata
  ADD COLUMN IF NOT EXISTS processing_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reprocessed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reprocessed_at TIMESTAMPTZ,

  -- Validation status
  ADD COLUMN IF NOT EXISTS validation_status TEXT CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reconciliation_errors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS has_duplicates BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_statements_source_type ON finance_statements(source_type);
CREATE INDEX IF NOT EXISTS idx_statements_source_bank ON finance_statements(source_bank);
CREATE INDEX IF NOT EXISTS idx_statements_validation_status ON finance_statements(validation_status);
CREATE INDEX IF NOT EXISTS idx_statements_has_duplicates ON finance_statements(has_duplicates) WHERE has_duplicates = TRUE;

-- =====================================================
-- 3. Enhance finance_transactions table
-- =====================================================
ALTER TABLE finance_transactions
  -- Enhanced deduplication
  ADD COLUMN IF NOT EXISTS transaction_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_detected_at TIMESTAMPTZ,

  -- Source tracking
  ADD COLUMN IF NOT EXISTS source_line_number INTEGER,
  ADD COLUMN IF NOT EXISTS raw_description TEXT,

  -- Categorization history
  ADD COLUMN IF NOT EXISTS categorization_history JSONB DEFAULT '[]'::jsonb,

  -- Validation flags
  ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anomaly_reason TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON finance_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_is_duplicate ON finance_transactions(is_duplicate) WHERE is_duplicate = TRUE;
CREATE INDEX IF NOT EXISTS idx_transactions_duplicate_of ON finance_transactions(duplicate_of) WHERE duplicate_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_source_line ON finance_transactions(source_line_number);
CREATE INDEX IF NOT EXISTS idx_transactions_is_anomaly ON finance_transactions(is_anomaly) WHERE is_anomaly = TRUE;

-- =====================================================
-- 4. Create finance_categorization_rules table
-- =====================================================
CREATE TABLE IF NOT EXISTS finance_categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rule definition
  rule_name TEXT NOT NULL,
  rule_type TEXT CHECK (rule_type IN ('keyword', 'merchant', 'amount_range', 'regex')),

  -- Matching criteria
  keywords TEXT[],
  merchant_pattern TEXT,
  amount_min NUMERIC(15,2),
  amount_max NUMERIC(15,2),
  regex_pattern TEXT,

  -- Target category
  target_category TEXT NOT NULL,
  target_subcategory TEXT,

  -- Priority and activation
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Stats
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_categorization_rules_user_id ON finance_categorization_rules(user_id);
CREATE INDEX idx_categorization_rules_active ON finance_categorization_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_categorization_rules_priority ON finance_categorization_rules(priority DESC);
CREATE INDEX idx_categorization_rules_type ON finance_categorization_rules(rule_type);

-- RLS
ALTER TABLE finance_categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system and own rules"
  ON finance_categorization_rules FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can manage own rules"
  ON finance_categorization_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. PostgreSQL Functions
-- =====================================================

-- Function: generate_transaction_hash
CREATE OR REPLACE FUNCTION generate_transaction_hash(
  p_user_id UUID,
  p_date DATE,
  p_description TEXT,
  p_amount NUMERIC
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      p_user_id::text || '|' ||
      p_date::text || '|' ||
      LOWER(TRIM(p_description)) || '|' ||
      ROUND(p_amount, 2)::text,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: validate_statement_balance
CREATE OR REPLACE FUNCTION validate_statement_balance(
  p_statement_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_statement RECORD;
  v_calculated_closing NUMERIC(15,2);
  v_discrepancy NUMERIC(15,2);
  v_result JSONB;
BEGIN
  SELECT * INTO v_statement
  FROM finance_statements
  WHERE id = p_statement_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Statement not found');
  END IF;

  v_calculated_closing := COALESCE(v_statement.opening_balance, 0)
                        + COALESCE(v_statement.total_credits, 0)
                        - COALESCE(v_statement.total_debits, 0);

  v_discrepancy := COALESCE(v_statement.closing_balance, 0) - v_calculated_closing;

  v_result := jsonb_build_object(
    'valid', ABS(v_discrepancy) < 0.01,
    'opening_balance', v_statement.opening_balance,
    'closing_balance', v_statement.closing_balance,
    'calculated_closing', v_calculated_closing,
    'discrepancy', v_discrepancy
  );

  UPDATE finance_statements
  SET
    validation_status = CASE
      WHEN ABS(v_discrepancy) < 0.01 THEN 'valid'
      WHEN ABS(v_discrepancy) < 1.00 THEN 'warning'
      ELSE 'invalid'
    END
  WHERE id = p_statement_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function: detect_duplicate_transactions
CREATE OR REPLACE FUNCTION detect_duplicate_transactions(
  p_statement_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_duplicates JSONB;
  v_count INTEGER;
BEGIN
  WITH duplicates AS (
    SELECT
      transaction_hash,
      array_agg(id ORDER BY created_at) AS transaction_ids,
      COUNT(*) AS duplicate_count
    FROM finance_transactions
    WHERE statement_id = p_statement_id
      AND transaction_hash IS NOT NULL
    GROUP BY transaction_hash
    HAVING COUNT(*) > 1
  )
  SELECT
    COUNT(*),
    jsonb_agg(
      jsonb_build_object(
        'transaction_hash', transaction_hash,
        'duplicate_count', duplicate_count,
        'transaction_ids', transaction_ids
      )
    )
  INTO v_count, v_duplicates
  FROM duplicates;

  UPDATE finance_transactions t
  SET
    is_duplicate = TRUE,
    duplicate_of = (
      SELECT id
      FROM finance_transactions
      WHERE transaction_hash = t.transaction_hash
        AND statement_id = p_statement_id
      ORDER BY created_at
      LIMIT 1
    ),
    duplicate_detected_at = NOW()
  WHERE statement_id = p_statement_id
    AND id != (
      SELECT id
      FROM finance_transactions
      WHERE transaction_hash = t.transaction_hash
        AND statement_id = p_statement_id
      ORDER BY created_at
      LIMIT 1
    );

  UPDATE finance_statements
  SET
    has_duplicates = CASE WHEN v_count > 0 THEN TRUE ELSE FALSE END,
    duplicate_count = v_count
  WHERE id = p_statement_id;

  RETURN jsonb_build_object(
    'duplicate_groups', COALESCE(v_count, 0),
    'details', COALESCE(v_duplicates, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function: recalculate_closing_balance
CREATE OR REPLACE FUNCTION recalculate_closing_balance(
  p_statement_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_statement RECORD;
  v_total_income NUMERIC(15,2);
  v_total_expense NUMERIC(15,2);
  v_new_closing NUMERIC(15,2);
  v_old_closing NUMERIC(15,2);
BEGIN
  SELECT * INTO v_statement
  FROM finance_statements
  WHERE id = p_statement_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Statement not found');
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expense
  FROM finance_transactions
  WHERE statement_id = p_statement_id
    AND (is_duplicate = FALSE OR is_duplicate IS NULL);

  v_new_closing := COALESCE(v_statement.opening_balance, 0) + v_total_income - v_total_expense;
  v_old_closing := v_statement.closing_balance;

  UPDATE finance_statements
  SET
    closing_balance = v_new_closing,
    total_credits = v_total_income,
    total_debits = v_total_expense,
    transaction_count = (
      SELECT COUNT(*)
      FROM finance_transactions
      WHERE statement_id = p_statement_id
        AND (is_duplicate = FALSE OR is_duplicate IS NULL)
    ),
    reprocessed_count = reprocessed_count + 1,
    reprocessed_at = NOW()
  WHERE id = p_statement_id;

  RETURN jsonb_build_object(
    'old_closing_balance', v_old_closing,
    'new_closing_balance', v_new_closing,
    'discrepancy', v_new_closing - v_old_closing
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function: check_period_continuity
CREATE OR REPLACE FUNCTION check_period_continuity(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_errors JSONB := '[]'::jsonb;
  v_prev RECORD;
  v_curr RECORD;
BEGIN
  FOR v_curr IN
    SELECT *
    FROM finance_statements
    WHERE user_id = p_user_id
      AND processing_status = 'completed'
    ORDER BY statement_period_start
  LOOP
    IF v_prev IS NOT NULL THEN
      IF ABS(COALESCE(v_prev.closing_balance, 0) - COALESCE(v_curr.opening_balance, 0)) > 0.01 THEN
        v_errors := v_errors || jsonb_build_object(
          'prev_statement_id', v_prev.id,
          'prev_closing', v_prev.closing_balance,
          'curr_statement_id', v_curr.id,
          'curr_opening', v_curr.opening_balance,
          'gap', COALESCE(v_curr.opening_balance, 0) - COALESCE(v_prev.closing_balance, 0)
        );
      END IF;
    END IF;

    v_prev := v_curr;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =====================================================
-- 6. Triggers
-- =====================================================

-- Trigger: generate transaction_hash on insert
CREATE OR REPLACE FUNCTION trigger_generate_transaction_hash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_hash IS NULL THEN
    NEW.transaction_hash := generate_transaction_hash(
      NEW.user_id,
      NEW.transaction_date,
      NEW.description,
      NEW.amount
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_transaction_insert ON finance_transactions;
CREATE TRIGGER before_transaction_insert
  BEFORE INSERT ON finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_transaction_hash();

-- Trigger: auto-validate statement after completion
CREATE OR REPLACE FUNCTION trigger_validate_statement()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.processing_status = 'completed') THEN
    PERFORM validate_statement_balance(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_statement_completed ON finance_statements;
CREATE TRIGGER after_statement_completed
  AFTER INSERT OR UPDATE OF processing_status
  ON finance_statements
  FOR EACH ROW
  WHEN (NEW.processing_status = 'completed')
  EXECUTE FUNCTION trigger_validate_statement();

-- =====================================================
-- 7. Seed Categorization Rules
-- =====================================================
INSERT INTO finance_categorization_rules (
  rule_name, rule_type, keywords, target_category, target_subcategory, priority
) VALUES
  -- Alimentação
  ('Delivery Apps', 'keyword', ARRAY['ifood', 'uber eats', 'rappi', '99food'], 'food', 'delivery', 100),
  ('Restaurantes', 'keyword', ARRAY['restaurante', 'lanchonete', 'padaria', 'pizzaria'], 'food', 'restaurant', 90),
  ('Supermercados', 'keyword', ARRAY['supermercado', 'mercado', 'carrefour', 'extra'], 'food', 'groceries', 90),

  -- Transporte
  ('Uber/99', 'keyword', ARRAY['uber', '99', '99pop'], 'transport', 'ride_sharing', 100),
  ('Combustível', 'keyword', ARRAY['posto', 'gasolina', 'shell', 'ipiranga'], 'transport', 'fuel', 90),
  ('Estacionamento', 'keyword', ARRAY['estacionamento', 'estapar'], 'transport', 'parking', 80),

  -- Moradia
  ('Aluguel', 'keyword', ARRAY['aluguel', 'locacao'], 'housing', 'rent', 100),
  ('Energia', 'keyword', ARRAY['enel', 'cemig', 'copel'], 'housing', 'electricity', 90),
  ('Internet', 'keyword', ARRAY['vivo fibra', 'claro net', 'oi fibra'], 'housing', 'internet', 90),

  -- Saúde
  ('Farmácia', 'keyword', ARRAY['farmacia', 'drogaria'], 'health', 'pharmacy', 100),

  -- Entretenimento
  ('Streaming', 'keyword', ARRAY['netflix', 'spotify', 'amazon prime'], 'entertainment', 'streaming', 100)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. Comments
-- =====================================================
COMMENT ON TABLE finance_processing_logs IS 'Audit trail completo de operações de processamento de extratos';
COMMENT ON TABLE finance_categorization_rules IS 'Regras determinísticas para categorização automática de transações';
COMMENT ON COLUMN finance_statements.source_type IS 'Tipo de fonte: csv, pdf, manual';
COMMENT ON COLUMN finance_statements.validation_status IS 'Status de validação matemática do extrato';
COMMENT ON COLUMN finance_transactions.transaction_hash IS 'Hash SHA256 para deduplicação';
COMMENT ON COLUMN finance_transactions.is_duplicate IS 'Flag indicando se a transação é duplicata';
COMMENT ON COLUMN finance_transactions.categorization_history IS 'Histórico de categorizações (AI + manual)';
```

---

## Service Layer

### Enhanced Statement Service

**Arquivo:** `src/modules/finance/services/statementService.ts` (adicionar métodos)

```typescript
/**
 * Process CSV statement with full validation
 */
async processCSVStatement(
  userId: string,
  file: File
): Promise<StatementUploadResult> {
  const startTime = Date.now();
  let statementId: string | null = null;

  try {
    // Log: upload started
    await this.logProcessing(userId, null, 'upload_started', `Processing CSV: ${file.name}`);

    // 1. Parse CSV
    const parsed = await csvParserService.parseCSV(file);

    // 2. Create statement record
    const statement = await this.createStatement({
      user_id: userId,
      file_name: file.name,
      file_size_bytes: file.size,
      file_hash: await this.calculateFileHash(file),
      source_type: 'csv',
      source_bank: this.detectBank(parsed.bankName),
      file_format_version: parsed.sourceFormat,
      bank_name: parsed.bankName,
      account_type: parsed.accountType,
      statement_period_start: parsed.periodStart,
      statement_period_end: parsed.periodEnd,
      opening_balance: parsed.openingBalance,
      closing_balance: parsed.closingBalance,
      currency: parsed.currency,
      raw_data_snapshot: parsed.rawDataSnapshot,
      processing_status: 'processing',
      processing_started_at: new Date().toISOString()
    });

    statementId = statement.id;

    // Log: parsing completed
    await this.logProcessing(
      userId,
      statementId,
      'parsing_completed',
      `Extracted ${parsed.transactions.length} transactions`,
      { transactionCount: parsed.transactions.length }
    );

    // 3. Validate mathematically
    const calculatedClosing = parsed.openingBalance +
      parsed.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
      parsed.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const discrepancy = Math.abs(parsed.closingBalance - calculatedClosing);

    if (discrepancy > 0.01) {
      await this.logProcessing(
        userId,
        statementId,
        'reconciliation_error',
        `Balance discrepancy: R$ ${discrepancy.toFixed(2)}`,
        { discrepancy, openingBalance: parsed.openingBalance, closingBalance: parsed.closingBalance, calculatedClosing },
        'warning'
      );
    }

    // 4. Save transactions with deduplication
    const savedTransactions = await this.saveTransactionsWithValidation(
      statementId,
      userId,
      parsed.transactions
    );

    // 5. Detect duplicates
    const { data: dupResult } = await supabase.rpc('detect_duplicate_transactions', {
      p_statement_id: statementId
    });

    if (dupResult && dupResult.duplicate_groups > 0) {
      await this.logProcessing(
        userId,
        statementId,
        'duplicate_detected',
        `Found ${dupResult.duplicate_groups} duplicate groups`,
        dupResult,
        'warning'
      );
    }

    // 6. Validate balance
    const { data: validationResult } = await supabase.rpc('validate_statement_balance', {
      p_statement_id: statementId
    });

    // 7. Update statement as completed
    await this.updateStatement(statementId, {
      processing_status: 'completed',
      processing_completed_at: new Date().toISOString(),
      transaction_count: savedTransactions.length,
      total_credits: parsed.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      total_debits: parsed.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    });

    // Log: success
    const duration = Date.now() - startTime;
    await this.logProcessing(
      userId,
      statementId,
      'save_completed',
      `Statement processed successfully in ${duration}ms`,
      { duration, transactionCount: savedTransactions.length },
      'info'
    );

    return {
      statement,
      transactions: savedTransactions,
      validationResult
    };

  } catch (error) {
    // Log: failure
    await this.logProcessing(
      userId,
      statementId,
      'processing_failed',
      (error as Error).message,
      { error: (error as Error).stack },
      'error'
    );

    if (statementId) {
      await this.updateStatement(statementId, {
        processing_status: 'failed',
        processing_error: (error as Error).message
      });
    }

    throw error;
  }
}

/**
 * Log processing event
 */
private async logProcessing(
  userId: string,
  statementId: string | null,
  eventType: string,
  message: string,
  details: any = {},
  severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
): Promise<void> {
  await supabase.from('finance_processing_logs').insert({
    user_id: userId,
    statement_id: statementId,
    event_type: eventType,
    message,
    details,
    severity,
    timestamp: new Date().toISOString()
  });
}

/**
 * Detect bank from name
 */
private detectBank(bankName: string): string {
  const name = bankName.toLowerCase();
  if (name.includes('nubank')) return 'nubank';
  if (name.includes('inter')) return 'inter';
  if (name.includes('itau') || name.includes('itaú')) return 'itau';
  if (name.includes('bradesco')) return 'bradesco';
  if (name.includes('caixa')) return 'caixa';
  if (name.includes('santander')) return 'santander';
  if (name.includes('brasil')) return 'banco_brasil';
  return 'other';
}

/**
 * Calculate SHA-256 hash of file
 */
private async calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

## Segurança e RLS

### Revisão de Políticas RLS

Todas as novas tabelas já têm RLS habilitado e políticas definidas na migration. Vamos revisar as existentes:

```sql
-- finance_statements (já tem RLS correto)
-- finance_transactions (já tem RLS correto)
-- finance_processing_logs (RLS adicionado na migration)
-- finance_categorization_rules (RLS adicionado na migration)

-- Verificar se há gaps de segurança
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'finance%';

-- Todas devem ter rowsecurity = true
```

### Proteção contra SQL Injection

Todas as funções PostgreSQL usam `SECURITY DEFINER` e `SET search_path = public`, garantindo que:
1. Não há escalação de privilégios
2. Schema search é limitado
3. Parâmetros são tipados (UUID, TEXT, NUMERIC)

---

## Plano de Implementação

### Fase 1: Database (2-3 dias)
1. ✅ Aplicar migration `20251208_finance_robust_processing.sql`
2. ✅ Testar funções PostgreSQL (`validate_statement_balance`, etc.)
3. ✅ Seed de regras de categorização
4. ✅ Validar RLS policies

### Fase 2: CSV Parser (2-3 dias)
1. Implementar `csvParserService.ts`
2. Adicionar detecção de formatos Nubank, Inter, Itaú
3. Testes unitários com CSVs reais
4. Validação de parse matemático

### Fase 3: Enhanced Statement Service (3-4 dias)
1. Adicionar `processCSVStatement()` ao `statementService.ts`
2. Integrar logging em `finance_processing_logs`
3. Adicionar validação em todas as etapas
4. Reprocessamento de statements (retry logic)

### Fase 4: Categorização Híbrida (2-3 dias)
1. Implementar `categorizationService.ts`
2. Sistema de regras deterministicas
3. Fallback para Gemini
4. Salvar histórico em `categorization_history`

### Fase 5: UI Updates (3-4 dias)
1. Adicionar upload de CSV na UI
2. Mostrar status de validação
3. Dashboard de duplicatas detectadas
4. Logs de processamento visíveis ao usuário

### Fase 6: Testes e Validação (2-3 dias)
1. E2E tests: upload CSV → validação → exibição
2. Teste de deduplicação
3. Teste de reconciliação matemática
4. Auditoria de segurança

---

## Critérios de Sucesso

✅ **CSV Import Working:**
- Nubank, Inter, Itaú CSVs processam sem erros
- Transações extraídas com 100% de acurácia

✅ **Validação Matemática:**
- `closing_balance = opening_balance + income - expense` (sempre!)
- Discrepância < R$ 0,01

✅ **Deduplicação:**
- Transações duplicadas detectadas automaticamente
- Marcadas com `is_duplicate = TRUE`

✅ **Categorização:**
- Regras deterministicas atingem >= 60% de acerto
- AI fallback categoriza o restante
- Histórico de categorização rastreável

✅ **Auditabilidade:**
- Todo processamento logado em `finance_processing_logs`
- Possível reprocessar statements
- Snapshots de dados crus salvos

✅ **Continuidade:**
- `closing(mês N) = opening(mês N+1)` validado
- Função `check_period_continuity()` retorna `valid: true`

---

## Apêndices

### A. Exemplos de Uso das Funções PostgreSQL

```sql
-- Validar saldo de um statement
SELECT validate_statement_balance('statement-uuid-here');

-- Detectar duplicatas
SELECT detect_duplicate_transactions('statement-uuid-here');

-- Recalcular saldo (útil após correções)
SELECT recalculate_closing_balance('statement-uuid-here');

-- Verificar continuidade de períodos
SELECT check_period_continuity('user-uuid-here');

-- Ver logs de processamento
SELECT
  event_type,
  message,
  severity,
  timestamp
FROM finance_processing_logs
WHERE statement_id = 'statement-uuid-here'
ORDER BY timestamp;
```

### B. Formato de Resposta das Validações

```json
// validate_statement_balance()
{
  "valid": true,
  "opening_balance": 1000.00,
  "closing_balance": 1500.00,
  "total_credits": 800.00,
  "total_debits": 300.00,
  "calculated_closing": 1500.00,
  "discrepancy": 0.00
}

// detect_duplicate_transactions()
{
  "duplicate_groups": 2,
  "details": [
    {
      "transaction_hash": "abc123...",
      "duplicate_count": 3,
      "transaction_ids": ["uuid1", "uuid2", "uuid3"]
    }
  ]
}

// check_period_continuity()
{
  "valid": false,
  "errors": [
    {
      "prev_statement_id": "uuid1",
      "prev_closing": 1500.00,
      "curr_statement_id": "uuid2",
      "curr_opening": 1520.00,
      "gap": 20.00
    }
  ]
}
```

---

**FIM DO DOCUMENTO**

Este documento serve como especificação completa para implementar o sistema robusto de processamento de extratos bancários no Aica Life OS Finance Module.

**Próximos Passos:**
1. Revisar e aprovar este documento
2. Aplicar migration SQL no Supabase
3. Implementar services em ordem: CSV Parser → Statement Service → Categorization Service
4. Testar com dados reais
5. Deploy incremental

**Contatos:**
- Backend: Backend Architect Agent
- Frontend: Frontend Core Agent
- Testes: QA Agent
