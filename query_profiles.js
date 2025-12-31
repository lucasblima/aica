import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gppebtrshbvuzatmebhr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTableSchema() {
  // Just get a sample record to see the columns
  const { data: sampleData, error: sampleError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (sampleError) {
    console.error('Error getting sample data:', sampleError);
  } else {
    console.log('Profiles table columns:');
    if (sampleData && sampleData.length > 0) {
      console.log(Object.keys(sampleData[0]));
    } else {
      console.log('No records found - checking with the test user ID...');
      
      // Try to get the test user's profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', 'bb4f6c20-07cf-4f7e-a8b6-141afee10abe')
        .single();
      
      if (userError) {
        console.error('Error getting user profile:', userError);
      } else if (userData) {
        console.log('Test user profile columns:', Object.keys(userData));
      } else {
        console.log('Test user has no profile record');
      }
    }
  }
}

getTableSchema();
