// Quick test to verify Supabase anon key is valid
// Run with: node test-supabase-key.js

const SUPABASE_URL = 'https://uzywajqzbdbrfammshdg.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6eXdhanF6YmRicmZhbW1zaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTE0MjEsImV4cCI6MjA4MzMyNzQyMX0.cQHqHZtIlIzX2hucb5n53PDvGYHb43ra6G5cCTlvblM';

async function testAnonKey() {
  console.log('🔍 Testing Supabase anon key...\n');
  console.log('Project:', SUPABASE_URL);
  console.log('Key (first 50 chars):', ANON_KEY.substring(0, 50) + '...\n');

  try {
    // Decode JWT to check expiration
    const [, payload] = ANON_KEY.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());

    console.log('📋 JWT Payload:');
    console.log('  Issuer:', decoded.iss);
    console.log('  Project Ref:', decoded.ref);
    console.log('  Role:', decoded.role);
    console.log('  Issued At:', new Date(decoded.iat * 1000).toISOString());
    console.log('  Expires At:', new Date(decoded.exp * 1000).toISOString());
    console.log('  Is Expired?', Date.now() > decoded.exp * 1000 ? '❌ YES' : '✅ NO');
    console.log();

    // Test API call
    console.log('🚀 Testing API call to /rest/v1/...\n');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });

    console.log('Response Status:', response.status, response.statusText);

    if (response.status === 200) {
      console.log('✅ SUCCESS! Anon key is VALID');
    } else if (response.status === 401) {
      console.log('❌ FAILED! Anon key is INVALID or EXPIRED');
      console.log('\n🔧 How to fix:');
      console.log('1. Go to: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/settings/api');
      console.log('2. Copy the "anon" key from "Project API keys"');
      console.log('3. Update VITE_SUPABASE_ANON_KEY in .env.local');
      console.log('4. Restart dev server: npm run dev');
    } else {
      console.log('⚠️ Unexpected status:', response.status);
      const text = await response.text();
      console.log('Response:', text);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAnonKey();
