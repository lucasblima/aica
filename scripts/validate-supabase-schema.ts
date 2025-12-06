#!/usr/bin/env tsx

/**
 * Supabase Schema Validator
 *
 * This script validates that the Supabase database schema matches
 * the expected tables and structure documented in backend_architecture.md
 *
 * NOTE: This script outputs SQL commands that should be executed via
 * the Supabase MCP server or directly in the Supabase dashboard.
 *
 * Usage:
 *   npm run validate-schema
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ExpectedTable {
  name: string;
  description: string;
  keyColumns: string[];
  relationships: string[];
}

const EXPECTED_TABLES: ExpectedTable[] = [
  {
    name: 'users',
    description: 'User authentication and profiles',
    keyColumns: ['id', 'email', 'full_name', 'avatar_url', 'created_at'],
    relationships: ['1-N → memories', '1-N → daily_reports', '1-N → activity_log']
  },
  {
    name: 'associations',
    description: 'Groups/organizations user belongs to',
    keyColumns: ['id', 'name', 'description', 'logo_url', 'owner_user_id', 'archived'],
    relationships: ['1-N → modules', '1-N → work_items', 'N-1 → workspaces']
  },
  {
    name: 'association_members',
    description: 'Membership junction table',
    keyColumns: ['id', 'association_id', 'user_id', 'role'],
    relationships: ['N-1 → associations', 'N-1 → users']
  },
  {
    name: 'modules',
    description: 'Life areas (Finanças, Saúde, etc.)',
    keyColumns: ['id', 'name', 'description', 'association_id', 'archived'],
    relationships: ['N-1 → associations']
  },
  {
    name: 'work_items',
    description: 'Tasks displayed in Meu Dia',
    keyColumns: ['id', 'title', 'description', 'due_date', 'priority', 'status', 'association_id'],
    relationships: ['N-1 → associations', 'N-1 → modules']
  },
  {
    name: 'memories',
    description: 'Emotional/contextual event records with embeddings',
    keyColumns: ['id', 'content', 'metadata', 'embedding', 'user_id'],
    relationships: ['N-1 → users']
  },
  {
    name: 'daily_reports',
    description: 'Daily progress and well-being reports',
    keyColumns: [
      'id',
      'user_id',
      'report_date',
      'tasks_completed',
      'tasks_total',
      'productivity_score',
      'mood',
      'mood_score'
    ],
    relationships: ['N-1 → users']
  },
  {
    name: 'activity_log',
    description: 'User action history (pomodoro, messages, etc.)',
    keyColumns: ['id', 'action', 'details', 'user_id', 'created_at'],
    relationships: ['N-1 → users']
  },
  {
    name: 'contact_network',
    description: 'External contacts registry',
    keyColumns: ['id', 'user_id', 'contact_name', 'phone_number', 'last_interaction_date'],
    relationships: ['N-1 → users']
  },
  {
    name: 'podcast_shows',
    description: 'Podcast series/shows management',
    keyColumns: ['id', 'title', 'description', 'user_id', 'archived'],
    relationships: ['1-N → podcast_episodes', 'N-1 → users']
  },
  {
    name: 'podcast_episodes',
    description: 'Individual podcast episodes',
    keyColumns: ['id', 'show_id', 'title', 'description', 'status', 'recording_date'],
    relationships: ['N-1 → podcast_shows']
  },
  {
    name: 'podcast_topics',
    description: 'Episode topics and research',
    keyColumns: ['id', 'episode_id', 'category_id', 'title', 'content'],
    relationships: ['N-1 → podcast_episodes', 'N-1 → podcast_topic_categories']
  },
  {
    name: 'podcast_topic_categories',
    description: 'Topic categorization',
    keyColumns: ['id', 'name', 'description'],
    relationships: ['1-N → podcast_topics']
  },
  {
    name: 'team_members',
    description: 'Podcast team (hosts, guests, producers)',
    keyColumns: ['id', 'name', 'role', 'bio', 'whatsapp'],
    relationships: ['N-N → podcast_episodes via junction table']
  },
  {
    name: 'user_stats',
    description: 'Gamification statistics',
    keyColumns: ['id', 'user_id', 'xp', 'level', 'streak_days'],
    relationships: ['1-1 → users']
  },
  {
    name: 'task_metrics',
    description: 'Task completion metrics',
    keyColumns: ['id', 'user_id', 'completed_count', 'efficiency_score'],
    relationships: ['N-1 → users']
  },
  {
    name: 'workspaces',
    description: 'Workspace organization',
    keyColumns: ['id', 'name', 'slug', 'description'],
    relationships: ['1-N → associations']
  }
];

class SchemaValidator {
  /**
   * Generate SQL query to validate table existence
   */
  generateTableExistenceQuery(): string {
    const tableNames = EXPECTED_TABLES.map(t => `'${t.name}'`).join(', ');

    return `
-- Query to validate all expected tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IN (${tableNames}) THEN '✅ Expected'
    ELSE '⚠️  Unexpected'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check for missing tables
SELECT
  expected_table
FROM unnest(ARRAY[${tableNames}]) AS expected_table
WHERE expected_table NOT IN (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
);
`.trim();
  }

  /**
   * Generate SQL query to validate columns for a specific table
   */
  generateColumnValidationQuery(table: ExpectedTable): string {
    const columns = table.keyColumns.map(c => `'${c}'`).join(', ');

    return `
-- Validate columns for table: ${table.name}
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = '${table.name}'
  AND column_name IN (${columns})
ORDER BY ordinal_position;

-- Check for missing columns
SELECT
  expected_column
FROM unnest(ARRAY[${columns}]) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = '${table.name}'
);
`.trim();
  }

  /**
   * Generate SQL to validate RLS policies exist
   */
  generateRLSValidationQuery(): string {
    return `
-- Validate RLS is enabled on all tables
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (${EXPECTED_TABLES.map(t => `'${t.name}'`).join(', ')})
ORDER BY tablename;

-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
`.trim();
  }

  /**
   * Generate complete validation report
   */
  generateValidationReport(): string {
    const report = [];

    report.push('# Supabase Schema Validation Report');
    report.push('');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');
    report.push('## Instructions');
    report.push('');
    report.push('Execute the SQL queries below using one of these methods:');
    report.push('1. Claude Code Supabase MCP: `mcp__supabase__execute_sql`');
    report.push('2. Supabase Dashboard: SQL Editor');
    report.push('3. Supabase CLI: `supabase db execute`');
    report.push('');
    report.push('---');
    report.push('');
    report.push('## 1. Validate Table Existence');
    report.push('');
    report.push('```sql');
    report.push(this.generateTableExistenceQuery());
    report.push('```');
    report.push('');
    report.push('**Expected Result:** All tables should exist');
    report.push('');
    report.push('---');
    report.push('');
    report.push('## 2. Validate RLS Policies');
    report.push('');
    report.push('```sql');
    report.push(this.generateRLSValidationQuery());
    report.push('```');
    report.push('');
    report.push('**Expected Result:** All tables should have `rowsecurity = true` and at least 2 policies (SELECT, INSERT/UPDATE/DELETE)');
    report.push('');
    report.push('---');
    report.push('');
    report.push('## 3. Validate Key Columns');
    report.push('');

    for (const table of EXPECTED_TABLES) {
      report.push(`### Table: \`${table.name}\``);
      report.push('');
      report.push(`**Description:** ${table.description}`);
      report.push('');
      report.push('```sql');
      report.push(this.generateColumnValidationQuery(table));
      report.push('```');
      report.push('');
    }

    report.push('---');
    report.push('');
    report.push('## 4. Expected Tables Summary');
    report.push('');
    report.push('| Table | Key Columns | Relationships |');
    report.push('|-------|-------------|---------------|');

    for (const table of EXPECTED_TABLES) {
      report.push(
        `| \`${table.name}\` | ${table.keyColumns.length} columns | ${table.relationships.join(', ')} |`
      );
    }

    report.push('');
    report.push('---');
    report.push('');
    report.push('## 5. Validation Checklist');
    report.push('');
    report.push('- [ ] All 17 expected tables exist');
    report.push('- [ ] All tables have RLS enabled (`rowsecurity = true`)');
    report.push('- [ ] All tables have appropriate RLS policies');
    report.push('- [ ] All key columns exist with correct data types');
    report.push('- [ ] Foreign key relationships are properly defined');
    report.push('- [ ] Security Definer functions exist (`is_member_of`, `is_association_admin`, etc.)');
    report.push('- [ ] No infinite recursion in RLS policies (42P17 errors)');
    report.push('');
    report.push('---');
    report.push('');
    report.push('## 6. Quick Health Check');
    report.push('');
    report.push('Run this single query for a quick overview:');
    report.push('');
    report.push('```sql');
    report.push(`
-- Quick health check
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'is_%') as security_definer_functions;
`.trim());
    report.push('```');
    report.push('');
    report.push('**Expected Result:**');
    report.push('- `total_tables`: >= 17');
    report.push('- `tables_with_rls`: >= 17');
    report.push('- `total_policies`: >= 34 (2 per table minimum)');
    report.push('- `security_definer_functions`: >= 3');
    report.push('');

    return report.join('\n');
  }

  /**
   * Run validation and save report
   */
  run() {
    console.log('🔍 Generating Supabase Schema Validation Report...\n');

    const report = this.generateValidationReport();
    const outputPath = join(__dirname, '..', 'docs', 'SCHEMA_VALIDATION_REPORT.md');

    writeFileSync(outputPath, report, 'utf-8');

    console.log(`✅ Report generated: ${outputPath}\n`);
    console.log('📋 Next Steps:');
    console.log('   1. Review the report in docs/SCHEMA_VALIDATION_REPORT.md');
    console.log('   2. Execute SQL queries using Supabase MCP or dashboard');
    console.log('   3. Check validation results against expected values');
    console.log('   4. Fix any schema mismatches found\n');

    // Also output a summary
    console.log('📊 Expected Schema:');
    console.log(`   - Tables: ${EXPECTED_TABLES.length}`);
    console.log(`   - Tables with RLS: ${EXPECTED_TABLES.length}`);
    console.log(`   - Security Definer Functions: >= 3`);
    console.log('');
  }
}

const validator = new SchemaValidator();
validator.run();
