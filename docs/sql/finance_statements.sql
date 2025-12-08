-- =====================================================
-- Finance Statements Table
-- Armazena PDFs de extratos bancários processados
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Tabela para armazenar extratos processados
CREATE TABLE IF NOT EXISTS finance_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Metadados do arquivo
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_hash TEXT NOT NULL,
  mime_type TEXT DEFAULT 'application/pdf',
  
  -- Conteúdo extraído
  markdown_content TEXT,
  raw_text TEXT,
  tables_json JSONB DEFAULT '[]'::jsonb,
  
  -- Metadados da extração
  pages_count INTEGER DEFAULT 0,
  tables_count INTEGER DEFAULT 0,
  
  -- Metadados do PDF (autor, criador, etc)
  pdf_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Status de processamento
  processing_status TEXT DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  
  -- Período do extrato (extraído ou informado)
  statement_period_start DATE,
  statement_period_end DATE,
  bank_name TEXT,
  account_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_finance_statements_user_id ON finance_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_statements_file_hash ON finance_statements(file_hash);
CREATE INDEX IF NOT EXISTS idx_finance_statements_status ON finance_statements(processing_status);
CREATE INDEX IF NOT EXISTS idx_finance_statements_created ON finance_statements(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE finance_statements ENABLE ROW LEVEL SECURITY;

-- Políticas: usuário só vê/edita seus próprios extratos
CREATE POLICY "Users can view own statements" 
  ON finance_statements FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statements" 
  ON finance_statements FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statements" 
  ON finance_statements FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own statements" 
  ON finance_statements FOR DELETE 
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_finance_statements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_finance_statements_updated_at
  BEFORE UPDATE ON finance_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_finance_statements_updated_at();

-- =====================================================
-- Storage Bucket para PDFs originais
-- =====================================================

-- Storage bucket para PDFs originais (opcional)
INSERT INTO storage.buckets (id, name, public)
VALUES ('statements', 'statements', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas do Storage
CREATE POLICY "Users can upload own statements"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'statements' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own statements"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'statements' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own statements"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'statements' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
