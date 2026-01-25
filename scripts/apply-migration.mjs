#!/usr/bin/env node
/**
 * Script para aplicar migration via Supabase API
 * Uso: node scripts/apply-migration.mjs <migration-file>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do Supabase (staging)
const SUPABASE_URL = 'https://uzywajqzbdbrfammshdg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ERRO: Variável SUPABASE_SERVICE_ROLE_KEY não definida');
  console.error('Configure no .env ou execute:');
  console.error('export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ ERRO: Arquivo de migration não especificado');
  console.error('Uso: node scripts/apply-migration.mjs <arquivo.sql>');
  process.exit(1);
}

// Ler arquivo SQL
const migrationPath = resolve(__dirname, '..', migrationFile);
let migrationSQL;
try {
  migrationSQL = readFileSync(migrationPath, 'utf-8');
  console.log(`📄 Lendo migration: ${migrationFile}`);
  console.log(`📏 Tamanho: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error(`❌ ERRO ao ler arquivo: ${error.message}`);
  process.exit(1);
}

// Criar cliente Supabase com service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n🔄 Executando migration no Supabase...\n');

try {
  // Executar SQL via RPC (função customizada) ou diretamente
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: migrationSQL
  });

  if (error) {
    // Se RPC exec_sql não existir, tentar via REST API direto
    console.warn('⚠️  RPC exec_sql não disponível, tentando abordagem alternativa...');

    // Fallback: executar via HTTP POST direto ao PostgREST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ sql_query: migrationSQL })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log('✅ Migration executada com sucesso!');
    console.log('\n📊 Próximos passos:');
    console.log('1. Verificar logs no Supabase Dashboard');
    console.log('2. Validar estrutura criada com VALIDATE_*.sql');
    console.log('3. Executar testes da Fase 4');
  } else {
    console.log('✅ Migration executada com sucesso!');
    if (data) {
      console.log('📋 Resultado:', data);
    }
  }
} catch (error) {
  console.error('\n❌ ERRO ao executar migration:');
  console.error(error.message);
  console.error('\n💡 Dica: Execute manualmente via SQL Editor:');
  console.error(`https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1].split('.')[0]}/sql`);
  process.exit(1);
}

console.log('\n✅ Concluído!');
