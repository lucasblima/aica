const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'gppebtrshbvuzatmebhr.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Aica2024',
  ssl: true
});

async function applyMigration(name, sqlPath) {
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`\nApplying migration: ${name}`);
    console.log(`SQL length: ${sql.length} bytes`);

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements`);

    let executedCount = 0;
    for (let j = 0; j < statements.length; j++) {
      try {
        await client.query(statements[j]);
        executedCount++;
      } catch (err) {
        console.error(`  Statement ${j + 1} failed: ${err.message}`);
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          throw err;
        }
        console.log(`  Continuing (object already exists)...`);
      }
    }

    console.log(`✓ Migration "${name}" completed: ${executedCount}/${statements.length} statements executed`);
    return true;
  } catch (err) {
    console.error(`✗ Error in migration "${name}": ${err.message}`);
    return false;
  }
}

async function main() {
  let connected = false;
  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    connected = true;
    console.log('✓ Connected to Supabase PostgreSQL');

    const migrations = [
      { name: 'eisenhower_matrix_fix', path: 'supabase/migrations/20251214_eisenhower_matrix_fix.sql' },
      { name: 'link_work_items_to_connections', path: 'supabase/migrations/20251215_link_work_items_to_connections.sql' },
      { name: 'task_projects', path: 'supabase/migrations/20251215_task_projects_mini_project_manager.sql' }
    ];

    console.log('\n==== MIGRATION EXECUTION PLAN ====');
    migrations.forEach((m, i) => {
      console.log(`${i + 1}. ${m.name}`);
    });

    let allSuccess = true;
    const results = [];
    for (const migration of migrations) {
      const success = await applyMigration(migration.name, migration.path);
      results.push({ name: migration.name, success });
      if (!success) allSuccess = false;
    }

    await client.end();
    console.log('\n✓ Disconnected from Supabase');

    console.log('\n==== MIGRATION RESULTS ====');
    results.forEach((r, i) => {
      const status = r.success ? '✓' : '✗';
      console.log(`${i + 1}. ${r.name}: ${status}`);
    });

    process.exit(allSuccess ? 0 : 1);
  } catch (err) {
    console.error('Fatal error:', err.message);
    console.error('Stack:', err.stack);
    if (connected) {
      try {
        await client.end();
      } catch (e) {
        // ignore
      }
    }
    process.exit(1);
  }
}

main();
