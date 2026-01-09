import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uzywajqzbdbrfammshdg.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6eXdhanF6YmRicmZhbW1zaGRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc1MTQyMSwiZXhwIjoyMDgzMzI3NDIxfQ.5FYg7cllKPpgPVIAyOPGXYEhegFa8S701kfGNwQuNr8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTestUser() {
  console.log('🔧 Creating test user in new staging project...');
  console.log('Project: uzywajqzbdbrfammshdg');
  console.log('');

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'usuario_teste@gmail.com',
      password: 'SenhaSegura123!',
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ User already exists in the project - OK!');
        return;
      }
      console.error('❌ Error creating user:', error.message);
      return;
    }

    console.log('✅ Test user created successfully!');
    console.log('Email: usuario_teste@gmail.com');
    console.log('Password: SenhaSegura123!');
    console.log('User ID:', data.user.id);
    console.log('');
    console.log('Ready to run E2E tests!');
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

createTestUser();
