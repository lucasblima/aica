/**
 * Script para aplicar stored procedures no Supabase
 * Executa a migração de funções para contagem de documentos
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gppebtrshbvuzatmebhr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ VITE_SUPABASE_SERVICE_ROLE_KEY não encontrada no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const sql = `
-- Function to increment document count in a corpus
CREATE OR REPLACE FUNCTION increment_corpus_document_count(corpus_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.file_search_corpora
  SET document_count = COALESCE(document_count, 0) + 1,
      updated_at = NOW()
  WHERE id = corpus_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement document count in a corpus
CREATE OR REPLACE FUNCTION decrement_corpus_document_count(corpus_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.file_search_corpora
  SET document_count = GREATEST(COALESCE(document_count, 0) - 1, 0),
      updated_at = NOW()
  WHERE id = corpus_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate document count for a corpus
CREATE OR REPLACE FUNCTION recalculate_corpus_document_count(corpus_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  actual_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO actual_count
  FROM public.file_search_documents
  WHERE corpus_id = corpus_uuid;

  UPDATE public.file_search_corpora
  SET document_count = actual_count,
      updated_at = NOW()
  WHERE id = corpus_uuid;

  RETURN actual_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_corpus_document_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_corpus_document_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_corpus_document_count(UUID) TO authenticated;

COMMENT ON FUNCTION increment_corpus_document_count IS 'Increments the document count for a file search corpus. Called when a document is indexed.';
COMMENT ON FUNCTION decrement_corpus_document_count IS 'Decrements the document count for a file search corpus. Called when a document is deleted.';
COMMENT ON FUNCTION recalculate_corpus_document_count IS 'Recalculates the actual document count for a corpus. Use for data integrity checks.';
`;

async function applyMigration() {
  console.log('🔄 Aplicando stored procedures...\n');
  console.log('SQL a ser executado:');
  console.log('─'.repeat(80));
  console.log(sql);
  console.log('─'.repeat(80));
  console.log('');

  try {
    // Supabase client não executa SQL direto via JS client
    // Precisamos usar a REST API diretamente
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro ao executar SQL:', error);
      console.log('\n⚠️  Falha na execução automática.');
      console.log('\n📋 INSTRUÇÕES MANUAIS:');
      console.log('1. Acesse: https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr/sql/new');
      console.log('2. Cole o SQL acima');
      console.log('3. Clique em "Run"');
      console.log('\nOu execute via CLI:');
      console.log('npx supabase db push (se as migrações estiverem resolvidas)');
      process.exit(1);
    }

    console.log('✅ Stored procedures aplicadas com sucesso!');
    console.log('\nFunções criadas:');
    console.log('  • increment_corpus_document_count(UUID)');
    console.log('  • decrement_corpus_document_count(UUID)');
    console.log('  • recalculate_corpus_document_count(UUID)');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\n⚠️  Falha na execução automática.');
    console.log('\n📋 INSTRUÇÕES MANUAIS:');
    console.log('1. Acesse: https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr/sql/new');
    console.log('2. Cole o SQL do arquivo: supabase/migrations/20251230_file_search_corpus_helpers.sql');
    console.log('3. Clique em "Run"');
    process.exit(1);
  }
}

applyMigration();
