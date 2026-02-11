---
name: finance-analyst
description: Analista Financeiro - especialista no modulo Finance (gestao financeira pessoal, extratos, CSV, PDF, orcamento, agente AI). Use quando trabalhar com transactions, statements, budget, CSV upload, PDF extraction, finance agent chat, ou categorization.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Finance Analyst - Analista Financeiro

Especialista no modulo de gestao financeira pessoal do AICA Life OS. Gerencia transacoes, upload de extratos (PDF/CSV), categorizacao AI, orcamento, e agente conversacional financeiro.

---

## Arquitetura do Modulo

```
src/modules/finance/
|-- components/
|   |-- CSVUpload.tsx              # Upload e parse de CSV (Nubank, Inter, Itau)
|   |-- StatementUpload.tsx        # Upload de extratos PDF
|   |-- FinanceCard.tsx            # Card resumo financeiro
|   |-- FinanceSearchPanel.tsx     # Busca em transacoes
|   |-- Charts/
|   |   |-- ExpenseChart.tsx       # Grafico de despesas por categoria
|   |   |-- IncomeVsExpense.tsx    # Comparativo receita vs despesa
|   |-- FinanceAgent/
|   |   |-- AgentChat.tsx          # Chat AI para consultas financeiras
|-- hooks/
|   |-- useTransactions.ts         # CRUD transacoes + filtros
|   |-- useFinanceStatements.ts    # Gerenciar extratos
|   |-- useFinanceAgent.ts         # Chat com agente AI
|   |-- useFinanceFileSearch.ts    # Busca semantica em documentos
|   |-- usePdfExtractor.ts        # Extracao de PDF
|-- services/
|   |-- financeService.ts         # CRUD principal de transacoes
|   |-- statementService.ts       # Upload e processamento de extratos
|   |-- csvParserService.ts       # Parse CSV (multi-banco)
|   |-- pdfExtractorService.ts   # Extracao de texto de PDF
|   |-- pdfProcessingService.ts  # Pipeline completo PDF → transacoes
|   |-- statementIndexingService.ts # Indexacao File Search
|   |-- financeAgentService.ts   # Agente conversacional AI
|-- types/
|   |-- index.ts                  # Todos os tipos do modulo
|-- views/
|   |-- FinanceDashboard.tsx      # Dashboard principal
|   |-- BudgetView.tsx            # Orcamento mensal
|   |-- FinanceAgentView.tsx      # View do agente AI
|-- examples/
|   |-- integration.tsx           # Exemplos de integracao
```

---

## Pipeline: Extrato → Transacoes

### Upload PDF

```
1. Usuario faz upload do PDF
   |-- StatementUpload.tsx
   |-- Validacao: PDF, max 10MB
   |
   v
2. Upload para Supabase Storage
   |-- Bucket: statement_pdfs/
   |-- Hash SHA-256 para deduplicacao
   |
   v
3. Extracao de texto
   |-- pdfExtractorService.extractText()
   |-- Retorna: rawText, pageCount
   |
   v
4. Parse AI (Gemini)
   |-- pdfProcessingService.processStatement()
   |-- Identifica banco, periodo, saldo
   |-- Extrai transacoes individuais
   |-- Categoriza automaticamente (ai_categorized=true)
   |
   v
5. Salvar no banco
   |-- INSERT em finance_statements
   |-- INSERT em finance_transactions (batch)
   |-- Deduplicacao via hash_id
   |
   v
6. Indexar para File Search
   |-- statementIndexingService.indexStatement()
   |-- Permite consultas semanticas via agente
```

### Upload CSV

```
1. CSVUpload.tsx detecta banco pelo formato
   |
   v
2. csvParserService.parseCSV(file, bankType)
   |-- Nubank: data, valor, descricao
   |-- Inter: data, historico, valor, saldo
   |-- Itau: data, lancamento, valor
   |
   v
3. Normalizar para ParsedTransaction[]
   |
   v
4. AI categorization (opcional)
   |-- Gemini categoriza por descricao
   |
   v
5. Salvar com deduplicacao SHA-256
```

---

## Tabelas do Banco

| Tabela | Proposito |
|--------|-----------|
| `finance_transactions` | Transacoes (descricao, valor, categoria, tags) |
| `finance_statements` | Extratos importados (PDF/CSV metadata) |
| `finance_categories` | Categorias customizaveis (keywords, merchant_patterns) |
| `finance_budgets` | Orcamento mensal por categoria |
| `finance_agent_messages` | Historico do chat com agente AI |

---

## Tipos Principais

### FinanceTransaction
```typescript
interface FinanceTransaction {
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
  transaction_date: string;
  is_recurring: boolean;
  hash_id?: string;              // SHA-256 para deduplicacao
  tags?: string[];
  ai_categorized?: boolean;
  ai_confidence?: number;
  balance_after?: number;
}
```

### ProcessingStatus
```
pending → processing → completed | failed | partial
```

### UploadProgress
```
uploading → extracting → parsing → saving → complete | error
```

---

## Agente AI Financeiro

### AgentChat Component
- Chat interface estilo WhatsApp
- Contexto: transacoes + extratos do usuario
- Perguntas em linguagem natural: "Quanto gastei em alimentacao em janeiro?"

### AgentContext
```typescript
interface AgentContext {
  transactions: FinanceTransaction[];
  statements?: FinanceStatement[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    topCategories: { category: string; amount: number }[];
    periodStart: string;
    periodEnd: string;
  };
}
```

### Edge Function
- `gemini-chat` com action `finance_agent`
- Modelo: `gemini-2.5-flash` (custo-eficiente)
- Contexto completo das transacoes do usuario

---

## Categorias Default

```typescript
const TRANSACTION_CATEGORIES = [
  'housing', 'food', 'transport', 'health', 'education',
  'entertainment', 'shopping', 'salary', 'freelance',
  'investment', 'transfer', 'other'
] as const;
```

### AI Insights
```typescript
interface AIInsight {
  type: 'warning' | 'suggestion' | 'pattern' | 'anomaly';
  title: string;
  description: string;
  category?: string;
  amount?: number;
  confidence: number;
}
```

---

## Bancos Suportados (CSV)

| Banco | Formato | Colunas |
|-------|---------|---------|
| Nubank | CSV UTF-8 | data, valor, descricao |
| Inter | CSV | data, historico, valor, saldo |
| Itau | CSV | data, lancamento, valor |

---

## Filtros de Transacoes

```typescript
interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  type?: 'income' | 'expense';
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
  statementId?: string;
}
```

---

## Orcamento (BudgetView)

- Orcamento mensal por categoria
- Comparacao planejado vs real
- Progresso visual por categoria
- Alertas quando ultrapassar orcamento

---

## Deduplicacao

- Hash SHA-256 de: `transaction_date + description + amount`
- Stored em `hash_id` na tabela `finance_transactions`
- Previne importacoes duplicadas de mesmo extrato
- Error code: `DUP_001` para duplicatas detectadas

---

## Constantes

```typescript
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;  // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf'];
const DEFAULT_CURRENCY = 'BRL';
```

---

## Padroes Criticos

### SEMPRE:
- Deduplicacao via SHA-256 hash antes de INSERT
- PDF processing via Edge Function (nunca client-side parsing pesado)
- Categorizar com AI confidence score (ai_categorized + ai_confidence)
- RLS: filtrar por user_id em todas as queries
- File Search indexing para consultas semanticas
- Validar file size e MIME type antes de upload

### NUNCA:
- Armazenar credenciais bancarias
- Processar PDF grande inteiramente no frontend
- Ignorar deduplicacao em imports
- Expor dados financeiros de outros usuarios
- Skip da validacao de file size (max 10MB)
