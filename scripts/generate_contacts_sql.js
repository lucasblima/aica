#!/usr/bin/env node
/**
 * Generate SQL to insert WhatsApp contacts into contact_network table
 * Run: node scripts/generate_contacts_sql.js > insert_contacts.sql
 */

const https = require('https');
const http = require('http');

const userId = '3d88f68e-87a5-4d45-93d1-5a28dfacaf86';
const evolutionApiUrl = 'https://evolution-evolution-api.w9jo16.easypanel.host';
const evolutionApiKey = '429683C4C977415CAAFCCE10F7D57E11';
const instanceName = 'aica_3d88f68e';

async function fetchContacts() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${evolutionApiUrl}/chat/findContacts/${instanceName}`);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write('{}');
    req.end();
  });
}

function escapeSQL(str) {
  if (!str) return null;
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

async function main() {
  console.error('Fetching contacts from Evolution API...');
  const contacts = await fetchContacts();
  console.error(`Found ${contacts.length} contacts`);

  console.log(`-- Insert ${contacts.length} WhatsApp contacts for user ${userId}`);
  console.log(`-- Generated at ${new Date().toISOString()}`);
  console.log('');

  console.log(`INSERT INTO contact_network (
  user_id, name, phone_number, whatsapp_phone, whatsapp_id,
  whatsapp_name, whatsapp_profile_pic_url, whatsapp_sync_enabled,
  whatsapp_synced_at, sync_source, last_synced_at
) VALUES`);

  const values = contacts.map((c, i) => {
    const remoteJid = c.remoteJid || c.id;
    const phoneMatch = remoteJid.match(/^(\d+)@/);
    const phone = phoneMatch ? phoneMatch[1] : null;
    const name = escapeSQL(c.pushName || c.name || `WhatsApp ${phone || 'Contact'}`);
    const pushName = escapeSQL(c.pushName);
    const profilePic = c.profilePicUrl ? escapeSQL(c.profilePicUrl) : null;

    return `(
  '${userId}',
  '${name}',
  ${phone ? `'+${phone}'` : 'NULL'},
  ${phone ? `'${phone}'` : 'NULL'},
  '${remoteJid}',
  ${pushName ? `'${pushName}'` : 'NULL'},
  ${profilePic ? `'${profilePic}'` : 'NULL'},
  true,
  NOW(),
  'whatsapp',
  NOW()
)`;
  });

  console.log(values.join(',\n'));

  console.log(`ON CONFLICT (user_id, whatsapp_id) DO UPDATE SET
  name = EXCLUDED.name,
  whatsapp_name = EXCLUDED.whatsapp_name,
  whatsapp_profile_pic_url = EXCLUDED.whatsapp_profile_pic_url,
  whatsapp_synced_at = NOW(),
  last_synced_at = NOW();`);

  console.log('');
  console.log(`-- Update session sync stats`);
  console.log(`UPDATE whatsapp_sessions
SET last_sync_at = NOW(), contacts_count = ${contacts.length}
WHERE instance_name = '${instanceName}';`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
