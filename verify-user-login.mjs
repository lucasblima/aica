import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uzywajqzbdbrfammshdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6eXdhanF6YmRicmZhbW1zaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTE0MjEsImV4cCI6MjA4MzMyNzQyMX0.cQHqHZtIlIzX2hucb5n53PDvGYHb43ra6G5cCTlvblM';

async function testLogin() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('🔐 Testing login with usuario_teste@gmail.com...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'usuario_teste@gmail.com',
      password: 'SenhaSegura123!'
    });
    
    if (error) {
      console.error('❌ Login failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Status:', error.status);
    } else {
      console.log('✅ Login successful!');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Access Token:', data.session.access_token.substring(0, 30) + '...');
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

testLogin();
