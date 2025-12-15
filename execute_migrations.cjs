const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://gppebtrshbvuzatmebhr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcGVidHJzaGJ2dXphdG1lYmhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMyNjM1MywiZXhwIjoyMDc2OTAyMzUzfQ.CJsSwbfh-cHwmfs2R-2y2EADSAxpaVY9TPU6chhbGW4';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  }
});

// Split SQL into individual statements, handling multiline statements
function parseSqlStatements(sql) {
  const lines = sql.split('\n');
  let currentStatement = '';
  const statements = [];

  for (const line of lines) {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed === '') {
      continue;
    }

    currentStatement += ' ' + line;

    // Check if line ends with semicolon (end of statement)
    if (trimmed.endsWith(';')) {
      const cleanStatement = currentStatement
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, -1); // Remove trailing semicolon

      if (cleanStatement.length > 0) {
        statements.push(cleanStatement);
      }
      currentStatement = '';
    }
  }

  return statements;
}

async function applyMigration(name, sqlPath) {
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`\n=== Applying migration: ${name} ===`);
    console.log(`File size: ${sql.length} bytes`);

    const statements = parseSqlStatements(sql);
    console.log(`Parsed ${statements.length} SQL statements`);

    let successCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip very short or trivial statements
      if (stmt.length < 5) {
        skippedCount++;
        continue;
      }

      try {
        // Use rpc to execute raw SQL through a custom function
        // Since Supabase doesn't expose raw SQL execution via JS client,
        // we'll try using the postgres function if available
        console.log(`  [${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 60)}...`);

        // Try using the query function if available
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_string: stmt
        }).catch(async (err) => {
          // If exec_sql doesn't exist, try alternative RPC names
          if (err.message.includes('not found')) {
            return await supabase.rpc('query', {
              query: stmt
            }).catch(() => ({ error: err, data: null }));
          }
          return { error: err, data: null };
        });

        if (error) {
          // Check if it's an "already exists" type error
          const errorMsg = error.message || JSON.stringify(error);
          if (
            errorMsg.includes('already exists') ||
            errorMsg.includes('duplicate') ||
            errorMsg.includes('exists') ||
            errorMsg.includes('conflict')
          ) {
            console.log(`    ✓ (Skipped - already exists)`);
            skippedCount++;
          } else {
            console.error(`    ✗ Failed: ${errorMsg}`);
            errors.push({ statement: stmt.substring(0, 50), error: errorMsg });
          }
        } else {
          console.log(`    ✓ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`    ✗ Error: ${err.message}`);
        errors.push({ statement: stmt.substring(0, 50), error: err.message });
      }
    }

    console.log(`\nMigration result:`);
    console.log(`  Success: ${successCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`  Errors: ${errors.length}`);

    if (errors.length > 0 && errors.length < 5) {
      console.log('\nErrors encountered:');
      errors.forEach(e => {
        console.log(`  - ${e.statement}: ${e.error}`);
      });
    }

    return errors.length === 0;
  } catch (err) {
    console.error(`✗ Error reading migration "${name}": ${err.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('==== SUPABASE SQL MIGRATION EXECUTOR ====\n');

    // First verify connectivity
    console.log('Verifying Supabase connectivity...');
    try {
      const result = await supabase
        .from('work_items')
        .select('count', { count: 'exact', head: true });

      if (result.error) {
        console.error('✗ Cannot connect to Supabase:', result.error.message);
        process.exit(1);
      }

      console.log('✓ Connected to Supabase\n');
    } catch (connError) {
      console.error('✗ Connection error:', connError.message);
      process.exit(1);
    }

    const migrations = [
      {
        name: 'eisenhower_matrix_fix',
        path: 'supabase/migrations/20251214_eisenhower_matrix_fix.sql',
        description: 'Add is_urgent and is_important columns to work_items'
      },
      {
        name: 'link_work_items_to_connections',
        path: 'supabase/migrations/20251215_link_work_items_to_connections.sql',
        description: 'Add connection_space_id and archetype references to work_items'
      },
      {
        name: 'task_projects',
        path: 'supabase/migrations/20251215_task_projects_mini_project_manager.sql',
        description: 'Create task_projects table and add project_id to work_items'
      }
    ];

    console.log('==== MIGRATION PLAN ====');
    migrations.forEach((m, i) => {
      console.log(`${i + 1}. ${m.name}`);
      console.log(`   ${m.description}\n`);
    });

    const results = [];
    for (const migration of migrations) {
      const success = await applyMigration(migration.name, migration.path);
      results.push({ name: migration.name, success });
    }

    console.log('\n==== SUMMARY ====');
    results.forEach((r, i) => {
      const status = r.success ? '✓' : '✗';
      console.log(`${i + 1}. ${r.name}: ${status}`);
    });

    const allSuccess = results.every(r => r.success);
    console.log(`\nOverall: ${allSuccess ? 'SUCCESS' : 'SOME MIGRATIONS FAILED'}`);

    process.exit(allSuccess ? 0 : 1);
  } catch (err) {
    console.error('Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
