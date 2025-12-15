const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://gppebtrshbvuzatmebhr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcGVidHJzaGJ2dXphdG1lYmhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMyNjM1MywiZXhwIjoyMDc2OTAyMzUzfQ.CJsSwbfh-cHwmfs2R-2y2EADSAxpaVY9TPU6chhbGW4';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSingleStatement(sql) {
  try {
    // Use the admin API to execute raw SQL
    const { data, error, status } = await supabase.rpc('query', {
      query: sql
    }).catch(() => {
      // If RPC query doesn't work, try alternative approach
      return { error: { message: 'RPC not available' }, data: null, status: 404 };
    });

    if (error && error.message.includes('not found')) {
      // Function doesn't exist, try a different approach
      return null;
    }

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    // Check if this is a "already exists" type error
    if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate'))) {
      return { skipped: true };
    }
    throw err;
  }
}

async function applyMigration(name, sqlPath) {
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`\nApplying migration: ${name}`);
    console.log(`SQL length: ${sql.length} bytes`);

    // For now, just output the SQL file content as it needs to be executed
    // in the Supabase dashboard or via CLI
    console.log('Migration SQL loaded successfully');

    return { success: true, requiresManualExecution: true };
  } catch (err) {
    console.error(`✗ Error in migration "${name}": ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function checkDatabase() {
  try {
    console.log('\n=== CHECKING DATABASE ===\n');

    // Try to check if work_items table exists
    const { data, error } = await supabase
      .from('work_items')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('✗ Cannot access work_items table');
      console.log(`  Error: ${error.message}`);
      return false;
    }

    console.log('✓ work_items table exists and is accessible');
    return true;
  } catch (err) {
    console.log(`✗ Error checking database: ${err.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('==== SUPABASE MIGRATION APPLICATOR ====\n');

    // Check database connectivity
    const dbAccessible = await checkDatabase();

    const migrations = [
      { name: 'eisenhower_matrix_fix', path: 'supabase/migrations/20251214_eisenhower_matrix_fix.sql' },
      { name: 'link_work_items_to_connections', path: 'supabase/migrations/20251215_link_work_items_to_connections.sql' },
      { name: 'task_projects', path: 'supabase/migrations/20251215_task_projects_mini_project_manager.sql' }
    ];

    console.log('==== MIGRATION EXECUTION PLAN ====');
    migrations.forEach((m, i) => {
      console.log(`${i + 1}. ${m.name}`);
    });

    console.log('\nStatus: Migrations loaded successfully');
    console.log('\nTo apply these migrations, you have two options:\n');
    console.log('OPTION 1: Use Supabase Dashboard');
    console.log('  1. Go to: https://app.supabase.com/project/gppebtrshbvuzatmebhr');
    console.log('  2. Navigate to: SQL Editor');
    console.log('  3. Create a new query for each migration file');
    console.log('  4. Copy-paste the SQL content and execute\n');

    console.log('OPTION 2: Use Supabase CLI (if installed)');
    console.log('  1. Run: supabase db push');
    console.log('  2. The CLI will automatically apply all migrations in ./supabase/migrations/\n');

    console.log('OPTION 3: Manual PostgreSQL Client');
    console.log('  Note: Direct PostgreSQL connection appears to have timeout issues');
    console.log('  Consider using pgAdmin or DBeaver with the connection string:\n');
    console.log('  postgresql://postgres:[password]@gppebtrshbvuzatmebhr.supabase.co:5432/postgres\n');

    // Output migration file content summary
    console.log('==== MIGRATION FILES ====\n');
    for (const migration of migrations) {
      const sql = fs.readFileSync(migration.path, 'utf8');
      const lines = sql.split('\n').length;
      const statements = sql.split(';').length - 1;
      console.log(`${migration.name}:`);
      console.log(`  Lines: ${lines}`);
      console.log(`  Statements: ~${statements}`);
      console.log(`  Size: ${sql.length} bytes\n`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
