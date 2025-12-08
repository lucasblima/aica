# Como Aplicar a Migration finance_statements

## Problema Identificado

Os erros no console ocorrem porque a tabela `finance_statements` **não existe ou está incompleta** no banco de dados Supabase. O código frontend está tentando usar colunas que não foram criadas:

```
PGRST204: Could not find the 'storage_path' column of 'finance_statements' in the schema cache
PGRST204: Could not find the 'account_type' column of 'finance_statements' in the schema cache
```

## Solução: Aplicar Migration Completa

### Passo 1: Acessar o Supabase SQL Editor

1. Acesse https://supabase.com/dashboard
2. Selecione o projeto: **xkucppuvrkxowqbblhrc**
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar o SQL da Migration

Copie **TODO O CONTEÚDO** do arquivo:
```
supabase/migrations/20251206_finance_statements_complete.sql
```

Cole no SQL Editor e clique em **Run** (ou pressione Ctrl+Enter)

### Passo 3: Verificar que a Tabela foi Criada

Execute este SQL de verificação:

```sql
-- Verificar se tabela existe
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'finance_statements'
) as table_exists;

-- Listar todas as colunas (deve mostrar 31 colunas)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'finance_statements'
ORDER BY ordinal_position;
```

**Resultado esperado:** 31 colunas incluindo `storage_path` e `account_type`

### Passo 4: Verificar RLS Policies

Execute:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'finance_statements';
```

**Resultado esperado:** 4 policies (SELECT, INSERT, UPDATE, DELETE)

### Passo 5: Verificar Storage Bucket

No Supabase Dashboard, vá para **Storage** e verifique se existe um bucket chamado `finance-statements`

Se não existir, execute:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-statements', 'finance-statements', false)
ON CONFLICT (id) DO NOTHING;
```

### Passo 6: Testar no Frontend

1. Recarregue a aplicação (Ctrl+Shift+R para hard reload)
2. Tente fazer upload de um PDF de extrato bancário
3. Verifique o console - **NÃO DEVE HAVER MAIS ERROS PGRST204**

## Colunas Criadas

A migration cria **31 colunas** necessárias para o código TypeScript:

### Identificação
- `id` - UUID primary key
- `user_id` - FK para auth.users

### Arquivo
- `file_name` - Nome do arquivo
- `file_size_bytes` - Tamanho em bytes
- `file_hash` - Hash SHA256 (prevenir duplicatas)
- `storage_path` - **[FIX]** Caminho no Supabase Storage
- `mime_type` - Tipo MIME (default: application/pdf)

### Metadados Bancários
- `bank_name` - Nome do banco
- `account_type` - **[FIX]** Tipo de conta (checking, savings, credit_card, investment, other)
- `statement_period_start` - Início do período
- `statement_period_end` - Fim do período
- `currency` - **[FIX]** Moeda (default: BRL)

### Status de Processamento
- `processing_status` - Status (pending, processing, completed, failed, partial)
- `processing_error` - Mensagem de erro se falhou
- `processing_started_at` - **[FIX]** Timestamp de início
- `processing_completed_at` - **[FIX]** Timestamp de conclusão

### Resumo Financeiro
- `opening_balance` - **[FIX]** Saldo inicial
- `closing_balance` - **[FIX]** Saldo final
- `total_credits` - **[FIX]** Total de créditos
- `total_debits` - **[FIX]** Total de débitos
- `transaction_count` - **[FIX]** Quantidade de transações

### Conteúdo Extraído
- `markdown_content` - Conteúdo em markdown
- `markdown_generated_at` - **[FIX]** Timestamp da geração
- `raw_text` - Texto bruto extraído
- `tables_json` - Tabelas em formato JSON

### Metadados PDF
- `pages_count` - Número de páginas
- `tables_count` - Número de tabelas
- `pdf_metadata` - Metadados do PDF (JSON)

### Análise AI
- `ai_summary` - **[FIX]** Resumo gerado por IA
- `ai_insights` - **[FIX]** Insights gerados por IA (JSON)
- `ai_analyzed_at` - **[FIX]** Timestamp da análise

### Timestamps
- `created_at` - Data de criação
- `updated_at` - Data de atualização (auto-atualizado por trigger)

## Troubleshooting

### Se ainda der erro após aplicar

1. **Limpar cache do PostgREST:**
   - No Supabase Dashboard → Settings → API
   - Clique em "Restart API Server"

2. **Verificar se migration foi aplicada:**
   ```sql
   SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'finance_statements';
   ```
   Deve retornar **31**

3. **Verificar se RLS está habilitado:**
   ```sql
   SELECT relname, relrowsecurity
   FROM pg_class
   WHERE relname = 'finance_statements';
   ```
   `relrowsecurity` deve ser `true`

## Rollback (se necessário)

Se precisar reverter a migration:

```sql
DROP TABLE IF EXISTS finance_statements CASCADE;
```

**⚠️ ATENÇÃO:** Isso deletará TODOS os dados da tabela!
