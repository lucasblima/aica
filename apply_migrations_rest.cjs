const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://gppebtrshbvuzatmebhr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcGVidHJzaGJ2dXphdG1lYmhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMyNjM1MywiZXhwIjoyMDc2OTAyMzUzfQ.CJsSwbfh-cHwmfs2R-2y2EADSAxpaVY9TPU6chhbGW4';

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`);

    const data = JSON.stringify({
      query: sql
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function applyMigration(name, sqlPath) {
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`\nApplying migration: ${name}`);
    console.log(`SQL length: ${sql.length} bytes`);

    // Try to execute the entire migration
    try {
      const result = await executeSQL(sql);
      console.log(`✓ Migration "${name}" executed successfully`);
      console.log(`Response: ${result.status}`);
      return true;
    } catch (err) {
      if (err.message.includes('execute_sql')) {
        console.log('Note: Direct SQL execution not available via RPC');
        console.log('Will need to split and execute statements individually');

        // Split and execute statements one by one
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`Found ${statements.length} SQL statements`);

        let executedCount = 0;
        for (let j = 0; j < statements.length; j++) {
          try {
            await executeSQL(statements[j]);
            executedCount++;
          } catch (err) {
            if (!err.message.includes('already exists') && !err.message.includes('duplicate') && !err.message.includes('exists')) {
              console.error(`  Statement ${j + 1} failed: ${err.message}`);
              throw err;
            }
            console.log(`  Statement ${j + 1}: object already exists, skipping`);
          }
        }
        console.log(`✓ Migration "${name}" completed: ${executedCount}/${statements.length} statements executed`);
        return true;
      }
      throw err;
    }
  } catch (err) {
    console.error(`✗ Error in migration "${name}": ${err.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('Testing Supabase API connection...');
    try {
      const result = await executeSQL('SELECT 1');
      console.log('✓ Connected to Supabase REST API');
    } catch (err) {
      console.log('Note: RPC execute_sql not available, trying alternative approach...');
    }

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

    console.log('\n==== MIGRATION RESULTS ====');
    results.forEach((r, i) => {
      const status = r.success ? '✓' : '✗';
      console.log(`${i + 1}. ${r.name}: ${status}`);
    });

    process.exit(allSuccess ? 0 : 1);
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
