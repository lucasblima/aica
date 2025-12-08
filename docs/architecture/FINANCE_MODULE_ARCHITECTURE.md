# Aica Finance Module - Complete Architecture Plan

**Version**: 1.0
**Created**: December 6, 2025
**Status**: Planning Phase
**Author**: Master Architect Agent

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Frontend Structure](#frontend-structure)
5. [Services Layer](#services-layer)
6. [PDF Processing Strategy](#pdf-processing-strategy)
7. [Financial Agent AI](#financial-agent-ai)
8. [Security & Privacy](#security--privacy)
9. [Gamification Integration](#gamification-integration)
10. [Implementation Plan](#implementation-plan)
11. [Risks & Mitigations](#risks--mitigations)
12. [Technical Recommendations](#technical-recommendations)

---

## Executive Summary

This document outlines the complete architecture for the Aica Finance Module, which enables users to:

1. **Upload bank statement PDFs** - Secure file upload to Supabase Storage
2. **Convert PDF to Markdown** - Extract and structure financial data
3. **Intelligent Financial Agent** - AI-powered analysis and recommendations using Gemini

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PDF Processing | PDF.js (browser) + Gemini AI (extraction) | Browser-based for privacy, AI for intelligent parsing |
| Storage | Supabase Storage (private bucket) | Consistent with existing patterns, RLS support |
| AI Model | Gemini 2.0 Flash | Cost-effective, already integrated in project |
| Data Model | Transactions + Statements + Conversations | Separation of concerns, audit trail |
| Security | Encryption at rest, RLS, no raw text storage | GDPR/LGPD compliance |

---

## System Architecture

### High-Level Architecture Diagram

```
+------------------+      +-------------------+      +------------------+
|                  |      |                   |      |                  |
|  React Frontend  |----->|  Supabase Edge    |----->|  Supabase DB     |
|  (PDF Upload UI) |      |  (RLS Policies)   |      |  (PostgreSQL)    |
|                  |      |                   |      |                  |
+--------+---------+      +-------------------+      +--------+---------+
         |                                                    |
         v                                                    |
+--------+---------+      +-------------------+               |
|                  |      |                   |               |
|  PDF.js          |----->|  Gemini API       |<--------------+
|  (Text Extract)  |      |  (AI Analysis)    |
|                  |      |                   |
+------------------+      +-------------------+
         |                        |
         v                        v
+------------------+      +-------------------+
|                  |      |                   |
|  Supabase        |      |  Finance Agent    |
|  Storage         |      |  (Chat Interface) |
|                  |      |                   |
+------------------+      +-------------------+
```

### Data Flow

```
1. User uploads PDF
   |
   v
2. PDF.js extracts raw text (client-side)
   |
   v
3. Text sent to Gemini for structured extraction
   |
   v
4. Gemini returns structured JSON (transactions, summary)
   |
   v
5. Data stored in finance_transactions table
   |
   v
6. PDF stored in Supabase Storage (optional, encrypted)
   |
   v
7. Markdown summary generated and stored
   |
   v
8. User can chat with Financial Agent (context: transactions)
```

---

## Database Schema

### New Tables

#### 1. `finance_statements` - Statement Upload Metadata

```sql
-- ============================================
-- Finance Statements - PDF Upload Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS public.finance_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_hash TEXT UNIQUE,  -- SHA-256 hash to prevent duplicates
  storage_path TEXT,       -- Supabase Storage path (optional)

  -- Statement metadata
  bank_name TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'credit_card', 'investment', 'other')),
  statement_period_start DATE,
  statement_period_end DATE,
  currency TEXT DEFAULT 'BRL',

  -- Processing status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  processing_error TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,

  -- Extracted summary
  opening_balance NUMERIC(15,2),
  closing_balance NUMERIC(15,2),
  total_credits NUMERIC(15,2),
  total_debits NUMERIC(15,2),
  transaction_count INTEGER DEFAULT 0,

  -- Markdown conversion
  markdown_content TEXT,
  markdown_generated_at TIMESTAMPTZ,

  -- AI analysis
  ai_summary TEXT,
  ai_insights JSONB DEFAULT '[]'::jsonb,
  ai_analyzed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.finance_statements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own statements"
  ON public.finance_statements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statements"
  ON public.finance_statements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statements"
  ON public.finance_statements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own statements"
  ON public.finance_statements FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_finance_statements_user_id ON public.finance_statements(user_id);
CREATE INDEX idx_finance_statements_period ON public.finance_statements(statement_period_start, statement_period_end);
CREATE INDEX idx_finance_statements_status ON public.finance_statements(processing_status);
CREATE INDEX idx_finance_statements_bank ON public.finance_statements(bank_name);

-- Trigger for updated_at
CREATE TRIGGER update_finance_statements_updated_at
  BEFORE UPDATE ON public.finance_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 2. Enhanced `finance_transactions` Table

```sql
-- ============================================
-- Finance Transactions - Enhanced Schema
-- ============================================
-- Note: Table already exists, adding new columns via migration

ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS statement_id UUID REFERENCES public.finance_statements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_description TEXT,
  ADD COLUMN IF NOT EXISTS normalized_description TEXT,
  ADD COLUMN IF NOT EXISTS merchant_name TEXT,
  ADD COLUMN IF NOT EXISTS merchant_category TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS ai_categorized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ADD COLUMN IF NOT EXISTS balance_after NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Additional indexes for new columns
CREATE INDEX IF NOT EXISTS idx_finance_transactions_statement_id ON public.finance_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_merchant ON public.finance_transactions(merchant_name);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_tags ON public.finance_transactions USING GIN(tags);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_finance_transactions_updated_at ON public.finance_transactions;
CREATE TRIGGER update_finance_transactions_updated_at
  BEFORE UPDATE ON public.finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 3. `finance_agent_conversations` - Chat History

```sql
-- ============================================
-- Finance Agent Conversations - Chat History
-- ============================================
CREATE TABLE IF NOT EXISTS public.finance_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conversation metadata
  session_id UUID NOT NULL,  -- Groups messages in a session
  title TEXT,                -- Auto-generated or user-defined

  -- Message data
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Context references
  referenced_transactions UUID[] DEFAULT '{}',
  referenced_statements UUID[] DEFAULT '{}',
  date_range_context JSONB,  -- { start: date, end: date }

  -- AI metadata
  tokens_used INTEGER,
  model_used TEXT DEFAULT 'gemini-2.0-flash-001',
  response_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.finance_agent_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own conversations"
  ON public.finance_agent_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.finance_agent_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.finance_agent_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_finance_agent_conversations_user_id ON public.finance_agent_conversations(user_id);
CREATE INDEX idx_finance_agent_conversations_session_id ON public.finance_agent_conversations(session_id);
CREATE INDEX idx_finance_agent_conversations_created_at ON public.finance_agent_conversations(created_at DESC);
```

#### 4. `finance_categories` - Category Management

```sql
-- ============================================
-- Finance Categories - Transaction Categorization
-- ============================================
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = system default

  -- Category info
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,  -- Emoji or icon name
  color TEXT DEFAULT '#948D82',

  -- Hierarchy
  parent_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,

  -- Type
  category_type TEXT DEFAULT 'expense' CHECK (category_type IN ('income', 'expense', 'transfer', 'investment')),

  -- AI matching
  keywords TEXT[] DEFAULT '{}',  -- Keywords for auto-categorization
  merchant_patterns TEXT[] DEFAULT '{}',  -- Regex patterns for merchant matching

  -- Ordering
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can see system + own categories)
CREATE POLICY "Users can view system and own categories"
  ON public.finance_categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can manage own categories"
  ON public.finance_categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Default categories (seed data)
INSERT INTO public.finance_categories (name, display_name, icon, category_type, keywords) VALUES
  ('housing', 'Moradia', '🏠', 'expense', ARRAY['aluguel', 'condominio', 'iptu', 'agua', 'luz', 'gas', 'internet']),
  ('food', 'Alimentacao', '🍽️', 'expense', ARRAY['mercado', 'supermercado', 'restaurante', 'ifood', 'uber eats', 'rappi']),
  ('transport', 'Transporte', '🚗', 'expense', ARRAY['uber', '99', 'combustivel', 'gasolina', 'estacionamento', 'pedagio', 'metro', 'onibus']),
  ('health', 'Saude', '💊', 'expense', ARRAY['farmacia', 'hospital', 'clinica', 'medico', 'dentista', 'plano de saude', 'unimed']),
  ('education', 'Educacao', '📚', 'expense', ARRAY['escola', 'universidade', 'curso', 'udemy', 'alura', 'livro']),
  ('entertainment', 'Lazer', '🎬', 'expense', ARRAY['netflix', 'spotify', 'amazon prime', 'cinema', 'teatro', 'show']),
  ('shopping', 'Compras', '🛍️', 'expense', ARRAY['amazon', 'mercado livre', 'shopee', 'magazine luiza', 'casas bahia']),
  ('salary', 'Salario', '💰', 'income', ARRAY['salario', 'folha', 'pagamento', 'holerite']),
  ('freelance', 'Freelance', '💼', 'income', ARRAY['pix', 'transferencia', 'recebido']),
  ('investment', 'Investimentos', '📈', 'investment', ARRAY['cdb', 'tesouro', 'acoes', 'fundo', 'dividendo', 'rendimento']),
  ('transfer', 'Transferencias', '↔️', 'transfer', ARRAY['transferencia', 'ted', 'doc', 'pix enviado', 'pix recebido'])
ON CONFLICT DO NOTHING;
```

#### 5. `finance_budgets` - Budget Planning

```sql
-- ============================================
-- Finance Budgets - Monthly Budget Planning
-- ============================================
CREATE TABLE IF NOT EXISTS public.finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Budget period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),

  -- Category budget
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE CASCADE,

  -- Amounts
  planned_amount NUMERIC(15,2) NOT NULL,
  actual_amount NUMERIC(15,2) DEFAULT 0,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, year, month, category_id)
);

-- Enable RLS
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own budgets"
  ON public.finance_budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_finance_budgets_user_period ON public.finance_budgets(user_id, year, month);
```

### Entity Relationship Diagram

```
+-------------------+       +----------------------+       +---------------------+
|  finance_         |       |  finance_            |       |  finance_           |
|  statements       |<------+  transactions        |------>|  categories         |
+-------------------+       +----------------------+       +---------------------+
| id (PK)           |       | id (PK)              |       | id (PK)             |
| user_id (FK)      |       | user_id (FK)         |       | user_id (FK) NULL   |
| file_name         |       | statement_id (FK)    |       | name                |
| bank_name         |       | category (text)      |       | display_name        |
| processing_status |       | merchant_name        |       | icon                |
| markdown_content  |       | amount               |       | keywords[]          |
| ai_summary        |       | type                 |       | category_type       |
+-------------------+       +----------------------+       +---------------------+
        |                           |
        |                           |
        v                           v
+-------------------+       +----------------------+
|  finance_agent_   |       |  finance_            |
|  conversations    |       |  budgets             |
+-------------------+       +----------------------+
| id (PK)           |       | id (PK)              |
| user_id (FK)      |       | user_id (FK)         |
| session_id        |       | category_id (FK)     |
| role              |       | year, month          |
| content           |       | planned_amount       |
| referenced_*      |       | actual_amount        |
+-------------------+       +----------------------+
```

---

## Frontend Structure

### Module Directory Structure

```
src/modules/finance/
├── components/
│   ├── FinanceCard.tsx              # Existing - Dashboard summary card
│   ├── StatementUpload.tsx          # NEW - PDF upload with drag-and-drop
│   ├── StatementUpload.css          # NEW - Styling
│   ├── StatementList.tsx            # NEW - List of uploaded statements
│   ├── StatementDetail.tsx          # NEW - Statement view with transactions
│   ├── TransactionList.tsx          # NEW - Filterable transaction list
│   ├── TransactionItem.tsx          # NEW - Single transaction row
│   ├── TransactionFilters.tsx       # NEW - Filter controls
│   ├── CategoryPicker.tsx           # NEW - Category selection
│   ├── FinanceAgent/
│   │   ├── FinanceAgentChat.tsx     # NEW - Chat interface
│   │   ├── FinanceAgentMessage.tsx  # NEW - Chat message bubble
│   │   ├── FinanceAgentInput.tsx    # NEW - Chat input with suggestions
│   │   └── FinanceAgentContext.tsx  # NEW - Context provider
│   ├── Charts/
│   │   ├── SpendingByCategory.tsx   # NEW - Pie chart
│   │   ├── MonthlyTrend.tsx         # NEW - Line chart
│   │   ├── BurnRateChart.tsx        # NEW - Burn rate visualization
│   │   └── BudgetProgress.tsx       # NEW - Budget vs actual
│   └── BudgetPlanner/
│       ├── BudgetOverview.tsx       # NEW - Monthly budget view
│       ├── BudgetCategoryRow.tsx    # NEW - Single category budget
│       └── BudgetEditor.tsx         # NEW - Edit budget modal
├── views/
│   ├── FinanceDashboard.tsx         # NEW - Main finance view
│   ├── StatementUploadView.tsx      # NEW - Upload workflow
│   ├── TransactionsView.tsx         # NEW - Transaction history
│   └── FinanceAgentView.tsx         # NEW - Full-screen agent chat
├── services/
│   ├── financeService.ts            # Existing - Enhanced with new methods
│   ├── pdfProcessingService.ts      # NEW - PDF extraction logic
│   ├── financeAgentService.ts       # NEW - AI agent communication
│   ├── statementService.ts          # NEW - Statement CRUD
│   └── budgetService.ts             # NEW - Budget management
├── hooks/
│   ├── useFinanceData.ts            # NEW - Data fetching hook
│   ├── useFinanceAgent.ts           # NEW - Agent chat hook
│   ├── useStatementUpload.ts        # NEW - Upload state management
│   └── useBudgets.ts                # NEW - Budget data hook
├── types.ts                         # Existing - Enhanced types
├── constants.ts                     # NEW - Categories, configs
├── utils/
│   ├── transactionParser.ts         # NEW - Parse PDF text
│   ├── markdownGenerator.ts         # NEW - Generate markdown
│   └── categoryMatcher.ts           # NEW - Auto-categorization
├── supabaseClient.ts                # Existing - Re-export
└── examples/
    └── integration.tsx              # Existing - Integration examples
```

### Key Components

#### 1. StatementUpload Component

```typescript
// src/modules/finance/components/StatementUpload.tsx

interface StatementUploadProps {
  userId: string;
  onUploadComplete: (statement: FinanceStatement) => void;
  onError: (error: string) => void;
}

export const StatementUpload: React.FC<StatementUploadProps> = ({
  userId,
  onUploadComplete,
  onError
}) => {
  // Drag-and-drop area
  // File type validation (PDF only)
  // Size limit (10MB)
  // Upload progress indicator
  // Processing status display
};
```

#### 2. FinanceAgentChat Component

```typescript
// src/modules/finance/components/FinanceAgent/FinanceAgentChat.tsx

interface FinanceAgentChatProps {
  userId: string;
  initialContext?: {
    statementId?: string;
    dateRange?: { start: Date; end: Date };
  };
}

export const FinanceAgentChat: React.FC<FinanceAgentChatProps> = ({
  userId,
  initialContext
}) => {
  // Chat message history
  // Real-time streaming responses
  // Quick action buttons (analyze spending, suggest savings, etc.)
  // Context awareness (current statement, date range)
};
```

---

## Services Layer

### PDF Processing Service

```typescript
// src/modules/finance/services/pdfProcessingService.ts

import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI } from '@google/genai';

interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  balance?: number;
}

interface ExtractionResult {
  bankName: string;
  accountType: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  transactions: ExtractedTransaction[];
  rawText: string;
}

export class PDFProcessingService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: import.meta.env.VITE_GEMINI_API_KEY
    });
  }

  /**
   * Extract text from PDF using PDF.js (client-side)
   */
  async extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  }

  /**
   * Use Gemini to structure the extracted text
   */
  async parseStatementWithAI(rawText: string): Promise<ExtractionResult> {
    const prompt = `
      Analyze this bank statement text and extract structured data.

      Return a JSON object with:
      {
        "bankName": "name of the bank",
        "accountType": "checking|savings|credit_card|investment|other",
        "periodStart": "YYYY-MM-DD",
        "periodEnd": "YYYY-MM-DD",
        "openingBalance": number,
        "closingBalance": number,
        "currency": "BRL|USD|EUR",
        "transactions": [
          {
            "date": "YYYY-MM-DD",
            "description": "original description",
            "amount": number (positive for income, negative for expense),
            "type": "income|expense",
            "balance": number (balance after transaction, if available),
            "category": "suggested category"
          }
        ]
      }

      Important:
      - Extract ALL transactions visible in the text
      - Preserve original descriptions
      - Infer transaction type from amount sign or keywords
      - Suggest a category based on description

      Bank statement text:
      ${rawText.substring(0, 30000)} // Limit to avoid token overflow
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    return JSON.parse(response.text || '{}');
  }

  /**
   * Generate markdown summary from statement
   */
  generateMarkdown(data: ExtractionResult): string {
    const lines = [
      `# Extrato Bancario - ${data.bankName}`,
      '',
      `**Periodo:** ${data.periodStart} a ${data.periodEnd}`,
      `**Tipo de Conta:** ${data.accountType}`,
      '',
      '## Resumo',
      '',
      `| Metrica | Valor |`,
      `|---------|-------|`,
      `| Saldo Inicial | R$ ${data.openingBalance.toFixed(2)} |`,
      `| Saldo Final | R$ ${data.closingBalance.toFixed(2)} |`,
      `| Total de Transacoes | ${data.transactions.length} |`,
      '',
      '## Transacoes',
      '',
      '| Data | Descricao | Valor | Tipo |',
      '|------|-----------|-------|------|',
      ...data.transactions.map(t =>
        `| ${t.date} | ${t.description} | R$ ${t.amount.toFixed(2)} | ${t.type} |`
      )
    ];

    return lines.join('\n');
  }
}
```

### Finance Agent Service

```typescript
// src/modules/finance/services/financeAgentService.ts

import { GoogleGenAI } from '@google/genai';
import { supabase } from '../../../services/supabaseClient';
import type { FinanceTransaction } from '../types';

interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AgentContext {
  transactions: FinanceTransaction[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    topCategories: { category: string; amount: number }[];
    periodStart: string;
    periodEnd: string;
  };
}

export class FinanceAgentService {
  private ai: GoogleGenAI;
  private systemPrompt: string;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: import.meta.env.VITE_GEMINI_API_KEY
    });

    this.systemPrompt = `
      Voce e o Aica Finance, um assistente financeiro inteligente.

      Seu papel:
      - Analisar os dados financeiros do usuario
      - Identificar padroes de gastos
      - Sugerir oportunidades de economia
      - Responder perguntas sobre transacoes especificas
      - Dar conselhos financeiros personalizados

      Estilo de comunicacao:
      - Amigavel e acessivel
      - Use emojis com moderacao
      - Seja conciso mas completo
      - Sempre baseie suas respostas nos dados reais
      - Nunca invente transacoes ou valores

      Formato de resposta:
      - Use markdown para formatacao
      - Destaque valores importantes
      - Sugira acoes concretas quando apropriado
    `;
  }

  /**
   * Build context from user's financial data
   */
  async buildContext(
    userId: string,
    dateRange?: { start: string; end: string }
  ): Promise<AgentContext> {
    let query = supabase
      .from('finance_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (dateRange) {
      query = query
        .gte('transaction_date', dateRange.start)
        .lte('transaction_date', dateRange.end);
    } else {
      // Default: last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      query = query.gte('transaction_date', threeMonthsAgo.toISOString());
    }

    const { data: transactions } = await query;

    // Calculate summary
    const income = transactions?.filter(t => t.type === 'income') || [];
    const expenses = transactions?.filter(t => t.type === 'expense') || [];

    const categoryTotals = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    return {
      transactions: transactions || [],
      summary: {
        totalIncome: income.reduce((sum, t) => sum + Number(t.amount), 0),
        totalExpenses: expenses.reduce((sum, t) => sum + Number(t.amount), 0),
        topCategories,
        periodStart: transactions?.[transactions.length - 1]?.transaction_date || '',
        periodEnd: transactions?.[0]?.transaction_date || ''
      }
    };
  }

  /**
   * Send message to agent and get response
   */
  async chat(
    userId: string,
    sessionId: string,
    message: string,
    history: AgentMessage[],
    context: AgentContext
  ): Promise<string> {
    const contextSummary = `
      Contexto financeiro do usuario:
      - Periodo: ${context.summary.periodStart} a ${context.summary.periodEnd}
      - Total de receitas: R$ ${context.summary.totalIncome.toFixed(2)}
      - Total de despesas: R$ ${context.summary.totalExpenses.toFixed(2)}
      - Saldo: R$ ${(context.summary.totalIncome - context.summary.totalExpenses).toFixed(2)}
      - Principais categorias de gasto:
      ${context.summary.topCategories.map(c => `  - ${c.category}: R$ ${c.amount.toFixed(2)}`).join('\n')}
      - Total de transacoes no periodo: ${context.transactions.length}
    `;

    const fullHistory = [
      { role: 'system' as const, content: this.systemPrompt + '\n\n' + contextSummary },
      ...history,
      { role: 'user' as const, content: message }
    ];

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: fullHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }]
      })),
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    });

    const assistantMessage = response.text || 'Desculpe, nao consegui processar sua pergunta.';

    // Save conversation to database
    await supabase.from('finance_agent_conversations').insert([
      { user_id: userId, session_id: sessionId, role: 'user', content: message },
      { user_id: userId, session_id: sessionId, role: 'assistant', content: assistantMessage }
    ]);

    return assistantMessage;
  }

  /**
   * Quick analysis prompts
   */
  async analyzeSpending(userId: string, context: AgentContext): Promise<string> {
    return this.chat(
      userId,
      crypto.randomUUID(),
      'Analise meus gastos dos ultimos meses e me de insights sobre onde posso economizar.',
      [],
      context
    );
  }

  async predictNextMonth(userId: string, context: AgentContext): Promise<string> {
    return this.chat(
      userId,
      crypto.randomUUID(),
      'Com base no meu historico, preveja meus gastos para o proximo mes e sugira um orcamento.',
      [],
      context
    );
  }
}
```

---

## PDF Processing Strategy

### Technical Approach

```
+-------------------+
|   User uploads    |
|   PDF file        |
+---------+---------+
          |
          v
+---------+---------+     +-------------------+
|   PDF.js          |     |   File validation |
|   (Client-side)   |<--->|   - Type: PDF     |
|                   |     |   - Size: <10MB   |
+---------+---------+     +-------------------+
          |
          v
+---------+---------+
|   Text extraction |
|   Page by page    |
+---------+---------+
          |
          v
+---------+---------+     +-------------------+
|   Gemini API      |     |   Prompt:         |
|   Structured      |<--->|   - Extract data  |
|   Extraction      |     |   - Identify bank |
|                   |     |   - Parse trans.  |
+---------+---------+     +-------------------+
          |
          v
+---------+---------+
|   Validation &    |
|   Deduplication   |
|   (hash check)    |
+---------+---------+
          |
          v
+---------+---------+
|   Store to        |
|   Supabase        |
+---------+---------+
```

### Library Selection: PDF.js

**Why PDF.js?**

| Factor | PDF.js | pdf-parse | pdf-lib |
|--------|--------|-----------|---------|
| Browser support | Native | Node.js only | Both |
| Text extraction | Excellent | Good | Limited |
| Bundle size | ~2MB | N/A (server) | ~500KB |
| Maintained | Mozilla | Community | Active |
| Privacy | Client-side | Server required | Client-side |

**Decision**: PDF.js for client-side extraction + Gemini AI for intelligent parsing.

### Installation

```bash
npm install pdfjs-dist
```

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist']
        }
      }
    }
  }
});
```

---

## Financial Agent AI

### System Prompt Design

```typescript
const FINANCE_AGENT_SYSTEM_PROMPT = `
# Aica Finance Agent

Voce e o Aica Finance, um assistente financeiro pessoal inteligente integrado ao Aica Life OS.

## Personalidade
- Amigavel e acessivel, mas profissional
- Proativo em identificar oportunidades de melhoria
- Empatico com desafios financeiros
- Nunca julgue os habitos de gasto do usuario

## Capacidades
1. **Analise de Gastos**: Identificar padroes, anomalias e tendencias
2. **Sugestoes de Economia**: Recomendar cortes especificos baseados em dados
3. **Previsao de Fluxo de Caixa**: Projetar gastos futuros
4. **Categorizacao**: Ajudar a organizar transacoes
5. **Metas Financeiras**: Auxiliar no planejamento de objetivos

## Restricoes
- Nunca invente dados ou transacoes
- Sempre baseie respostas nos dados fornecidos
- Nao de conselhos de investimento especificos
- Encaminhe para profissional se necessario
- Mantenha privacidade: nao mencione nomes de terceiros

## Formato de Resposta
- Use markdown para formatacao
- Inclua valores em R$ quando relevante
- Sugira acoes concretas
- Seja conciso (max 300 palavras)
`;
```

### Conversation Flow

```
User: "Quanto eu gastei em restaurantes esse mes?"
                |
                v
+-------------------------------+
| 1. Parse intent:              |
|    - Entity: restaurantes     |
|    - Period: este mes         |
|    - Action: sum expenses     |
+-------------------------------+
                |
                v
+-------------------------------+
| 2. Query transactions:        |
|    - category = 'food'        |
|    - merchant LIKE '%rest%'   |
|    - date = current month     |
+-------------------------------+
                |
                v
+-------------------------------+
| 3. Build context:             |
|    - Total: R$ 847.50         |
|    - Transactions: 12         |
|    - Top merchants: [...]     |
+-------------------------------+
                |
                v
+-------------------------------+
| 4. Generate response:         |
|    "Voce gastou R$ 847.50     |
|    em restaurantes este mes,  |
|    em 12 transacoes..."       |
+-------------------------------+
```

---

## Security & Privacy

### Privacy-First Design

```
+-----------------------------------+
|         SECURITY LAYERS           |
+-----------------------------------+
|                                   |
|  1. Client-Side Processing        |
|     - PDF text extraction local   |
|     - No raw PDFs sent to server  |
|     - Structured data only        |
|                                   |
+-----------------------------------+
|                                   |
|  2. Supabase RLS                  |
|     - User can only see own data  |
|     - Policies on all tables      |
|     - No cross-user access        |
|                                   |
+-----------------------------------+
|                                   |
|  3. Data Minimization             |
|     - Store only necessary fields |
|     - Hash for deduplication      |
|     - Optional PDF retention      |
|                                   |
+-----------------------------------+
|                                   |
|  4. Encryption                    |
|     - AES-256 at rest (Supabase)  |
|     - TLS 1.3 in transit          |
|     - Storage bucket: private     |
|                                   |
+-----------------------------------+
```

### Supabase Storage Configuration

```typescript
// Storage bucket for PDF files
const BUCKET_NAME = 'finance-statements';

// Bucket configuration
const bucketConfig = {
  public: false,  // PRIVATE bucket
  fileSizeLimit: 10 * 1024 * 1024,  // 10MB
  allowedMimeTypes: ['application/pdf']
};

// RLS Policy for storage
/*
CREATE POLICY "Users can manage own finance statements"
ON storage.objects FOR ALL
USING (
  bucket_id = 'finance-statements' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
*/
```

### Data Retention Policy

```typescript
interface RetentionPolicy {
  transactions: {
    default: '5 years',
    configurable: true,
    minRetention: '1 year'
  };
  statements: {
    pdf: 'optional (user choice)',
    markdown: '5 years',
    metadata: '5 years'
  };
  conversations: {
    default: '1 year',
    configurable: true
  };
}
```

### GDPR/LGPD Compliance

| Requirement | Implementation |
|-------------|----------------|
| Right to Access | Export all financial data as JSON/CSV |
| Right to Erasure | Cascade delete all finance_* tables |
| Data Minimization | Only store structured transactions |
| Purpose Limitation | Data used only for financial analysis |
| Consent | Explicit consent before PDF upload |

---

## Gamification Integration

### XP Rewards

```typescript
// src/services/gamificationService.ts - New badges

const FINANCE_BADGES = {
  'first_upload': {
    id: 'first_upload',
    name: 'Primeiro Extrato',
    description: 'Envie seu primeiro extrato bancario',
    icon: '📄',
    rarity: 'common',
    xp_reward: 50
  },
  'budget_master': {
    id: 'budget_master',
    name: 'Mestre do Orcamento',
    description: 'Crie um orcamento mensal completo',
    icon: '💰',
    rarity: 'rare',
    xp_reward: 200
  },
  'saver_streak': {
    id: 'saver_streak',
    name: 'Poupador Consistente',
    description: 'Fique abaixo do orcamento por 3 meses seguidos',
    icon: '🏆',
    rarity: 'epic',
    xp_reward: 500
  },
  'financial_analyst': {
    id: 'financial_analyst',
    name: 'Analista Financeiro',
    description: 'Tenha 12 meses de historico de transacoes',
    icon: '📊',
    rarity: 'legendary',
    xp_reward: 1000
  }
};

// XP Rewards for actions
const FINANCE_XP_REWARDS = {
  upload_statement: 25,
  categorize_transaction: 5,
  complete_budget: 50,
  chat_with_agent: 10,
  achieve_budget_goal: 100
};
```

### Integration with Atlas Tasks

```typescript
// Auto-create financial tasks based on insights

interface FinanceTask {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  module: 'finance';
  dueDate?: Date;
}

const generateFinanceTasks = async (userId: string): Promise<FinanceTask[]> => {
  const tasks: FinanceTask[] = [];

  // Check for budget overruns
  const overruns = await checkBudgetOverruns(userId);
  if (overruns.length > 0) {
    tasks.push({
      title: 'Revisar gastos excessivos',
      description: `Categorias acima do orcamento: ${overruns.join(', ')}`,
      priority: 'high',
      module: 'finance'
    });
  }

  // Check for recurring charges to review
  const unusedSubscriptions = await identifyUnusedSubscriptions(userId);
  if (unusedSubscriptions.length > 0) {
    tasks.push({
      title: 'Revisar assinaturas',
      description: `${unusedSubscriptions.length} assinaturas sem uso recente`,
      priority: 'medium',
      module: 'finance'
    });
  }

  return tasks;
};
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

| Task | Owner | Priority | Dependencies |
|------|-------|----------|--------------|
| Create database schema (migrations) | Backend Architect | P0 | - |
| Set up Supabase Storage bucket | Backend Architect | P0 | - |
| Implement RLS policies | Backend Architect | P0 | Schema |
| Create types.ts with new interfaces | Frontend Core | P0 | Schema |
| Implement financeService.ts enhancements | Frontend Core | P0 | Types |

### Phase 2: PDF Processing (Week 2-3)

| Task | Owner | Priority | Dependencies |
|------|-------|----------|--------------|
| Install and configure PDF.js | Frontend Core | P0 | - |
| Create pdfProcessingService.ts | AI Integration | P0 | PDF.js |
| Implement StatementUpload component | Frontend Core | P0 | Service |
| Create extraction prompts for Gemini | AI Integration | P0 | - |
| Implement markdown generation | Frontend Core | P1 | Extraction |
| Add deduplication logic (hash) | Backend Architect | P1 | Schema |

### Phase 3: Financial Agent (Week 3-4)

| Task | Owner | Priority | Dependencies |
|------|-------|----------|--------------|
| Create financeAgentService.ts | AI Integration | P0 | - |
| Implement FinanceAgentChat UI | Frontend Core | P0 | Service |
| Design system prompt | AI Integration | P0 | - |
| Implement context building | AI Integration | P0 | Data |
| Add conversation persistence | Backend Architect | P1 | Schema |
| Create quick action buttons | Frontend Core | P1 | Agent |

### Phase 4: Dashboard & Visualization (Week 4-5)

| Task | Owner | Priority | Dependencies |
|------|-------|----------|--------------|
| Create FinanceDashboard view | Frontend Core | P0 | Data |
| Implement spending charts | Frontend Core | P1 | Data |
| Create TransactionList with filters | Frontend Core | P1 | Data |
| Add category management UI | Frontend Core | P2 | Schema |
| Implement budget planner | Frontend Core | P2 | Schema |

### Phase 5: Gamification & Polish (Week 5-6)

| Task | Owner | Priority | Dependencies |
|------|-------|----------|--------------|
| Add finance badges to gamification | Gamification Agent | P1 | Finance data |
| Implement XP rewards for actions | Gamification Agent | P1 | Actions |
| Create Atlas task integration | Atlas Task Agent | P2 | Insights |
| Security audit | Security Agent | P0 | All |
| E2E tests | Testing Agent | P1 | All |

### Milestone Checklist

- [ ] **M1**: Database schema deployed and tested
- [ ] **M2**: PDF upload and extraction working
- [ ] **M3**: Financial Agent responding to queries
- [ ] **M4**: Dashboard with visualizations
- [ ] **M5**: Gamification integrated
- [ ] **M6**: Security audit passed
- [ ] **M7**: E2E tests passing

---

## Risks & Mitigations

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| PDF extraction accuracy varies by bank | High | High | Use Gemini AI for intelligent parsing; allow manual corrections |
| Gemini API costs escalate | Medium | Medium | Implement caching; limit context window; use Flash model |
| Large PDFs cause browser slowdown | Medium | Medium | Process in chunks; show progress; set size limits |
| PDF.js bundle increases app size | Low | High | Code splitting; lazy loading |
| Bank format changes break parsing | Medium | Low | Store raw text; AI-based parsing is resilient |

### Security Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Financial data exposure | Critical | Low | RLS, encryption, audit logs |
| Malicious PDF upload | High | Low | Validate file type; scan with antivirus |
| AI hallucination of transactions | Medium | Medium | Always show source data; validation |
| Conversation data leakage | High | Low | Session-based isolation; RLS |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Users don't trust with financial data | High | Medium | Clear privacy policy; local processing emphasis |
| Feature complexity overwhelms users | Medium | Medium | Progressive disclosure; onboarding |
| Low adoption | Medium | Medium | Gamification incentives; clear value proposition |

---

## Technical Recommendations

### Performance Optimizations

```typescript
// 1. Lazy load PDF.js
const PDFViewer = lazy(() => import('./components/PDFViewer'));

// 2. Cache transaction queries
const useTransactions = (userId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['transactions', userId, dateRange],
    queryFn: () => fetchTransactions(userId, dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000 // 30 minutes
  });
};

// 3. Pagination for large datasets
const PAGE_SIZE = 50;
const fetchTransactions = async (userId: string, page: number) => {
  const { data } = await supabase
    .from('finance_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  return data;
};
```

### Error Handling Strategy

```typescript
// Centralized error handling for finance module
class FinanceError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string
  ) {
    super(message);
    this.name = 'FinanceError';
  }
}

const FINANCE_ERRORS = {
  PDF_EXTRACTION_FAILED: new FinanceError(
    'PDF text extraction failed',
    'PDF_001',
    'Nao foi possivel ler o PDF. Verifique se o arquivo nao esta corrompido.'
  ),
  AI_PARSING_FAILED: new FinanceError(
    'AI parsing returned invalid data',
    'AI_001',
    'Nao conseguimos identificar as transacoes automaticamente. Tente outro arquivo.'
  ),
  DUPLICATE_STATEMENT: new FinanceError(
    'Statement already uploaded',
    'DUP_001',
    'Este extrato ja foi enviado anteriormente.'
  )
};
```

### Testing Strategy

```typescript
// E2E test example
test('should upload PDF and extract transactions', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');

  // Navigate to finance
  await page.click('[data-testid="nav-finance"]');

  // Upload PDF
  const fileInput = page.locator('[data-testid="pdf-upload"]');
  await fileInput.setInputFiles('./fixtures/sample-statement.pdf');

  // Wait for processing
  await expect(page.locator('[data-testid="processing-status"]'))
    .toHaveText('Processando...', { timeout: 5000 });

  await expect(page.locator('[data-testid="processing-status"]'))
    .toHaveText('Concluido', { timeout: 30000 });

  // Verify transactions appeared
  await expect(page.locator('[data-testid="transaction-list"]'))
    .toBeVisible();

  const transactionCount = await page.locator('[data-testid="transaction-item"]').count();
  expect(transactionCount).toBeGreaterThan(0);
});
```

---

## Appendix A: SQL Migration Script

```sql
-- Migration: 20251206_create_finance_module_tables.sql
-- Description: Create all tables for Aica Finance Module

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create finance_statements table
CREATE TABLE IF NOT EXISTS public.finance_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_hash TEXT UNIQUE,
  storage_path TEXT,
  bank_name TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'credit_card', 'investment', 'other')),
  statement_period_start DATE,
  statement_period_end DATE,
  currency TEXT DEFAULT 'BRL',
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  processing_error TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  opening_balance NUMERIC(15,2),
  closing_balance NUMERIC(15,2),
  total_credits NUMERIC(15,2),
  total_debits NUMERIC(15,2),
  transaction_count INTEGER DEFAULT 0,
  markdown_content TEXT,
  markdown_generated_at TIMESTAMPTZ,
  ai_summary TEXT,
  ai_insights JSONB DEFAULT '[]'::jsonb,
  ai_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enhance finance_transactions table
ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS statement_id UUID REFERENCES public.finance_statements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_description TEXT,
  ADD COLUMN IF NOT EXISTS normalized_description TEXT,
  ADD COLUMN IF NOT EXISTS merchant_name TEXT,
  ADD COLUMN IF NOT EXISTS merchant_category TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS ai_categorized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ADD COLUMN IF NOT EXISTS balance_after NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create finance_agent_conversations table
CREATE TABLE IF NOT EXISTS public.finance_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  title TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  referenced_transactions UUID[] DEFAULT '{}',
  referenced_statements UUID[] DEFAULT '{}',
  date_range_context JSONB,
  tokens_used INTEGER,
  model_used TEXT DEFAULT 'gemini-2.0-flash-001',
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create finance_categories table
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#948D82',
  parent_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  category_type TEXT DEFAULT 'expense' CHECK (category_type IN ('income', 'expense', 'transfer', 'investment')),
  keywords TEXT[] DEFAULT '{}',
  merchant_patterns TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create finance_budgets table
CREATE TABLE IF NOT EXISTS public.finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE CASCADE,
  planned_amount NUMERIC(15,2) NOT NULL,
  actual_amount NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month, category_id)
);

-- Enable RLS on all tables
ALTER TABLE public.finance_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- finance_statements
CREATE POLICY "Users can manage own statements" ON public.finance_statements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- finance_agent_conversations
CREATE POLICY "Users can manage own conversations" ON public.finance_agent_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- finance_categories (users see system + own)
CREATE POLICY "Users can view system and own categories" ON public.finance_categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can manage own categories" ON public.finance_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- finance_budgets
CREATE POLICY "Users can manage own budgets" ON public.finance_budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_finance_statements_user_id ON public.finance_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_statements_period ON public.finance_statements(statement_period_start, statement_period_end);
CREATE INDEX IF NOT EXISTS idx_finance_statements_status ON public.finance_statements(processing_status);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_statement_id ON public.finance_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_merchant ON public.finance_transactions(merchant_name);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_tags ON public.finance_transactions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_finance_agent_conversations_user_id ON public.finance_agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_agent_conversations_session_id ON public.finance_agent_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_finance_budgets_user_period ON public.finance_budgets(user_id, year, month);

-- Seed default categories
INSERT INTO public.finance_categories (name, display_name, icon, category_type, keywords) VALUES
  ('housing', 'Moradia', '🏠', 'expense', ARRAY['aluguel', 'condominio', 'iptu', 'agua', 'luz', 'gas', 'internet']),
  ('food', 'Alimentacao', '🍽️', 'expense', ARRAY['mercado', 'supermercado', 'restaurante', 'ifood', 'uber eats', 'rappi']),
  ('transport', 'Transporte', '🚗', 'expense', ARRAY['uber', '99', 'combustivel', 'gasolina', 'estacionamento', 'pedagio', 'metro', 'onibus']),
  ('health', 'Saude', '💊', 'expense', ARRAY['farmacia', 'hospital', 'clinica', 'medico', 'dentista', 'plano de saude', 'unimed']),
  ('education', 'Educacao', '📚', 'expense', ARRAY['escola', 'universidade', 'curso', 'udemy', 'alura', 'livro']),
  ('entertainment', 'Lazer', '🎬', 'expense', ARRAY['netflix', 'spotify', 'amazon prime', 'cinema', 'teatro', 'show']),
  ('shopping', 'Compras', '🛍️', 'expense', ARRAY['amazon', 'mercado livre', 'shopee', 'magazine luiza', 'casas bahia']),
  ('salary', 'Salario', '💰', 'income', ARRAY['salario', 'folha', 'pagamento', 'holerite']),
  ('freelance', 'Freelance', '💼', 'income', ARRAY['pix', 'transferencia', 'recebido']),
  ('investment', 'Investimentos', '📈', 'investment', ARRAY['cdb', 'tesouro', 'acoes', 'fundo', 'dividendo', 'rendimento']),
  ('transfer', 'Transferencias', '↔️', 'transfer', ARRAY['transferencia', 'ted', 'doc', 'pix enviado', 'pix recebido'])
ON CONFLICT DO NOTHING;

-- Create update trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_finance_statements_updated_at ON public.finance_statements;
CREATE TRIGGER update_finance_statements_updated_at
  BEFORE UPDATE ON public.finance_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_transactions_updated_at ON public.finance_transactions;
CREATE TRIGGER update_finance_transactions_updated_at
  BEFORE UPDATE ON public.finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_categories_updated_at ON public.finance_categories;
CREATE TRIGGER update_finance_categories_updated_at
  BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_budgets_updated_at ON public.finance_budgets;
CREATE TRIGGER update_finance_budgets_updated_at
  BEFORE UPDATE ON public.finance_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Appendix B: Type Definitions

```typescript
// src/modules/finance/types.ts

// =====================================================
// Finance Module Types - Enhanced
// =====================================================

// Existing types (keep as-is)
export interface FinanceTransaction {
  id: string;
  user_id: string;
  statement_id?: string;
  description: string;
  original_description?: string;
  normalized_description?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  merchant_name?: string;
  merchant_category?: string;
  transaction_date: string;
  is_recurring: boolean;
  hash_id: string;
  tags?: string[];
  notes?: string;
  ai_categorized?: boolean;
  ai_confidence?: number;
  balance_after?: number;
  reference_number?: string;
  created_at: string;
  updated_at?: string;
}

// New types
export interface FinanceStatement {
  id: string;
  user_id: string;
  file_name: string;
  file_size_bytes?: number;
  file_hash?: string;
  storage_path?: string;
  bank_name?: string;
  account_type?: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other';
  statement_period_start?: string;
  statement_period_end?: string;
  currency: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  processing_error?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  opening_balance?: number;
  closing_balance?: number;
  total_credits?: number;
  total_debits?: number;
  transaction_count: number;
  markdown_content?: string;
  markdown_generated_at?: string;
  ai_summary?: string;
  ai_insights?: AIInsight[];
  ai_analyzed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AIInsight {
  type: 'warning' | 'suggestion' | 'pattern' | 'anomaly';
  title: string;
  description: string;
  category?: string;
  amount?: number;
  confidence: number;
}

export interface FinanceAgentMessage {
  id: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  referenced_transactions?: string[];
  referenced_statements?: string[];
  date_range_context?: {
    start: string;
    end: string;
  };
  tokens_used?: number;
  model_used?: string;
  response_time_ms?: number;
  created_at: string;
}

export interface FinanceCategory {
  id: string;
  user_id?: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color: string;
  parent_id?: string;
  category_type: 'income' | 'expense' | 'transfer' | 'investment';
  keywords: string[];
  merchant_patterns: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceBudget {
  id: string;
  user_id: string;
  year: number;
  month: number;
  category_id: string;
  planned_amount: number;
  actual_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Keep existing summary types
export interface FinanceSummary {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
}

export interface BurnRateData {
  averageMonthlyExpense: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentageChange: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

// PDF Processing types
export interface PDFExtractionResult {
  rawText: string;
  pageCount: number;
  extractedAt: string;
}

export interface ParsedStatement {
  bankName: string;
  accountType: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  transactions: ParsedTransaction[];
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  balance?: number;
  suggestedCategory?: string;
}

// Agent types
export interface AgentContext {
  transactions: FinanceTransaction[];
  statements?: FinanceStatement[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    topCategories: { category: string; amount: number }[];
    periodStart: string;
    periodEnd: string;
    transactionCount: number;
  };
}

export interface AgentSession {
  id: string;
  userId: string;
  title?: string;
  messages: FinanceAgentMessage[];
  context?: AgentContext;
  createdAt: string;
  lastMessageAt: string;
}
```

---

**Document Status**: Complete
**Next Steps**: Begin Phase 1 implementation
**Review Date**: After each phase completion
