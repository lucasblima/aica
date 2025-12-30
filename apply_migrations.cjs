#!/usr/bin/env node
/**
 * Script to apply WhatsApp migrations directly to Supabase via PostgreSQL connection
 */

const fs = require('fs');
const { Client } = require('pg');

// PostgreSQL connection string for Supabase
const connectionString = 'postgresql://postgres.gppebtrshbvuzatmebhr:ADS020192030@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function executeSQLFile(client, filePath) {
  console.log(`📄 Reading: ${filePath}`);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`🔄 Executing SQL (${sql.length} chars)...`);

  try {
    await client.query(sql);
    console.log(`✅ Success!`);
    return true;
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    console.error(`   Detail:`, error.detail || 'No details');
    return false;
  }
}

async function main() {
  console.log('🚀 Starting WhatsApp migrations application\n');

  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    // First, enable extensions
    console.log('📦 Enabling required extensions...');
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      CREATE EXTENSION IF NOT EXISTS pgmq;
      CREATE EXTENSION IF NOT EXISTS vector;
    `);
    console.log('✅ Extensions enabled!\n');

    // Create PGMQ queues
    console.log('📬 Creating PGMQ queues...');
    try {
      await client.query(`SELECT pgmq.create('whatsapp_notifications')`);
      await client.query(`SELECT pgmq.create('whatsapp_media_processing')`);
      console.log('✅ Queues created!\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Queues already exist, skipping...\n');
      } else {
        throw error;
      }
    }

    // Apply migrations
    const migrations = [
      'supabase/migrations/20251230_whatsapp_messages.sql',
      'supabase/migrations/20251230_scheduled_notifications.sql',
      'supabase/migrations/20251230_consent_records.sql',
      'supabase/migrations/20251230_whatsapp_media_bucket.sql'
    ];

    for (const migration of migrations) {
      const success = await executeSQLFile(client, migration);
      if (!success) {
        console.error(`\n❌ Failed to apply: ${migration}`);
        process.exit(1);
      }
      console.log('');
    }

    console.log('✅ All WhatsApp migrations applied successfully!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
