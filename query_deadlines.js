import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeadlines() {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('Not authenticated');
    return;
  }

  console.log('Checking deadlines for user:', user.id);

  // Get all opportunities
  const { data: allOpps, error: allError } = await supabase
    .from('grant_opportunities')
    .select('id, title, submission_deadline, status')
    .eq('user_id', user.id);

  console.log('\nAll opportunities:');
  console.log(JSON.stringify(allOpps, null, 2));

  // Get opportunities with specific filters
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 30);

  const { data: filteredOpps, error: filteredError } = await supabase
    .from('grant_opportunities')
    .select('id, title, submission_deadline, status')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .gte('submission_deadline', today.toISOString())
    .lte('submission_deadline', futureDate.toISOString());

  console.log('\nFiltered opportunities (status=open, deadline next 30 days):');
  console.log(JSON.stringify(filteredOpps, null, 2));
}

checkDeadlines().catch(console.error);
