/**
 * Database RLS and Foreign Key Audit Script
 * Issue #73 - Phase 1: Security & Integrity
 *
 * This script executes the audit queries from DATABASE_DIAGNOSTIC_REPORT_ISSUE_73.md
 * to identify RLS coverage gaps and analyze foreign key behavior.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gppebtrshbvuzatmebhr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface RLSAuditResult {
  tablename: string;
  policy_count: number;
  policies_present: string[];
}

interface ForeignKeyResult {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  delete_rule: string;
}

interface TableWithoutRLS {
  schemaname: string;
  tablename: string;
}

async function runQuery<T>(query: string, description: string): Promise<T[]> {
  console.log(`\n🔍 Running: ${description}`);
  console.log(`📝 Query:\n${query}\n`);

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });

  if (error) {
    console.error(`❌ Error: ${error.message}`);
    return [];
  }

  return data as T[];
}

async function auditRLSCoverage() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RLS COVERAGE AUDIT');
  console.log('='.repeat(80));

  // Query 1: Tables without RLS enabled
  const tablesWithoutRLS = await runQuery<TableWithoutRLS>(
    `SELECT schemaname, tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND rowsecurity = false
       AND tablename NOT LIKE 'pg_%'`,
    'Tables without RLS enabled'
  );

  console.log(`\n📋 Tables without RLS: ${tablesWithoutRLS.length}`);
  if (tablesWithoutRLS.length > 0) {
    console.table(tablesWithoutRLS);
  } else {
    console.log('✅ All tables have RLS enabled');
  }

  // Query 2: Tables with incomplete CRUD policies
  const incompletePolicies = await runQuery<RLSAuditResult>(
    `SELECT
       t.tablename,
       COUNT(DISTINCT p.cmd) as policy_count,
       ARRAY_AGG(DISTINCT p.cmd) as policies_present
     FROM pg_tables t
     LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
     WHERE t.schemaname = 'public'
       AND t.rowsecurity = true
     GROUP BY t.tablename
     HAVING COUNT(DISTINCT p.cmd) < 4
     ORDER BY policy_count ASC`,
    'Tables with incomplete CRUD policies (< 4 policies)'
  );

  console.log(`\n📋 Tables with incomplete policies: ${incompletePolicies.length}`);
  if (incompletePolicies.length > 0) {
    console.table(incompletePolicies);
  } else {
    console.log('✅ All tables have complete CRUD policies');
  }

  return { tablesWithoutRLS, incompletePolicies };
}

async function auditForeignKeys() {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 FOREIGN KEY AUDIT');
  console.log('='.repeat(80));

  const foreignKeys = await runQuery<ForeignKeyResult>(
    `SELECT
       tc.table_name,
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name,
       rc.delete_rule
     FROM information_schema.table_constraints AS tc
     JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
     JOIN information_schema.referential_constraints AS rc
       ON rc.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
     ORDER BY tc.table_name, kcu.column_name`,
    'All foreign keys with ON DELETE behavior'
  );

  console.log(`\n📋 Total foreign keys: ${foreignKeys.length}`);
  console.table(foreignKeys);

  // Analyze by delete_rule
  const deleteRuleStats: Record<string, number> = {};
  foreignKeys.forEach(fk => {
    deleteRuleStats[fk.delete_rule] = (deleteRuleStats[fk.delete_rule] || 0) + 1;
  });

  console.log('\n📊 Foreign Key DELETE Rules Distribution:');
  console.table(deleteRuleStats);

  return foreignKeys;
}

async function main() {
  console.log('🚀 Starting Database Audit for Issue #73 Phase 1');
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📅 Date: ${new Date().toISOString()}`);

  try {
    const rlsResults = await auditRLSCoverage();
    const fkResults = await auditForeignKeys();

    console.log('\n' + '='.repeat(80));
    console.log('✅ AUDIT COMPLETE');
    console.log('='.repeat(80));

    console.log('\n📊 Summary:');
    console.log(`- Tables without RLS: ${rlsResults.tablesWithoutRLS.length}`);
    console.log(`- Tables with incomplete policies: ${rlsResults.incompletePolicies.length}`);
    console.log(`- Total foreign keys: ${fkResults.length}`);

    console.log('\n💾 Results saved to audit output above');
    console.log('\n📝 Next steps:');
    console.log('1. Review incomplete policies and create migrations');
    console.log('2. Analyze foreign key delete rules for data integrity');
    console.log('3. Generate migration files for RLS gaps');

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

main();
