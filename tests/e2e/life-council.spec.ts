import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Life Council E2E Tests
 *
 * Validates the universal Life Council feature:
 * - Dynamic persona activation based on available module data
 * - Financial Advisor persona when finance data exists
 * - Proper synthesis with multi-module context
 *
 * Prerequisites:
 * - TEST_EMAIL and TEST_PASSWORD in .env.local
 * - Supabase service role key for test data seeding
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uzywajqzbdbrfammshdg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Test data IDs for cleanup
let testTransactionId: string | null = null;
let testUserId: string | null = null;

test.describe('Life Council — Universal Module Support', () => {
  let serviceClient: ReturnType<typeof createClient>;

  test.beforeAll(async () => {
    if (!SUPABASE_SERVICE_KEY) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not set — cannot seed test data');
      return;
    }

    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get test user ID via admin API
    const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
    const { data } = await serviceClient.auth.admin.listUsers();
    const user = data?.users?.find(u => u.email === TEST_EMAIL);
    testUserId = user?.id || null;

    if (!testUserId) {
      console.warn('Test user not found — Life Council tests will skip data-dependent assertions');
      return;
    }

    // Seed a finance transaction so the council has finance data
    const hashId = `e2e_test_${Date.now()}`;
    const { data: txn, error } = await serviceClient
      .from('finance_transactions')
      .insert({
        user_id: testUserId,
        description: 'E2E Test Transaction — Life Council',
        amount: 150.00,
        type: 'expense',
        category: 'Teste',
        transaction_date: new Date().toISOString().split('T')[0],
        hash_id: hashId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to seed finance transaction:', error);
    } else {
      testTransactionId = txn?.id || null;
      console.log('Seeded test transaction:', testTransactionId);
    }
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (testTransactionId && serviceClient) {
      await serviceClient
        .from('finance_transactions')
        .delete()
        .eq('id', testTransactionId);
      console.log('Cleaned up test transaction:', testTransactionId);
    }
  });

  test('RPC get_council_context returns available_modules with finance', async () => {
    if (!testUserId || !serviceClient) {
      test.skip(true, 'No test user or service client');
      return;
    }

    const { data: context, error } = await serviceClient
      .rpc('get_council_context', { p_user_id: testUserId });

    expect(error).toBeNull();
    expect(context).toBeDefined();
    expect(context.available_modules).toBeDefined();
    expect(Array.isArray(context.available_modules)).toBe(true);

    // Finance should be available since we seeded a transaction
    expect(context.available_modules).toContain('finance');

    // Finance data should have transaction_count > 0
    expect(Number(context.finance?.transaction_count)).toBeGreaterThan(0);

    console.log('Available modules:', context.available_modules);
    console.log('Finance data:', context.finance);
  });

  test('RPC returns all 7 module fields in response', async () => {
    if (!testUserId || !serviceClient) {
      test.skip(true, 'No test user or service client');
      return;
    }

    const { data: context, error } = await serviceClient
      .rpc('get_council_context', { p_user_id: testUserId });

    expect(error).toBeNull();

    // All module fields should exist in the response
    expect(context).toHaveProperty('moments');
    expect(context).toHaveProperty('tasks');
    expect(context).toHaveProperty('finance');
    expect(context).toHaveProperty('connections');
    expect(context).toHaveProperty('flux');
    expect(context).toHaveProperty('studio');
    expect(context).toHaveProperty('grants');
    expect(context).toHaveProperty('available_modules');
    expect(context).toHaveProperty('moments_count');
    expect(context).toHaveProperty('tasks_count');
  });

  test('Edge Function run-life-council requires auth or userId', async () => {
    // Call without auth header AND without userId — should get 401
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/run-life-council`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({}),
      }
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('Edge Function returns insights for authenticated user with data', async () => {
    if (!testUserId || !SUPABASE_SERVICE_KEY) {
      test.skip(true, 'No test user or service key');
      return;
    }

    // Sign in to get a valid JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
    const TEST_PASSWORD = process.env.TEST_PASSWORD || 'REDACTED_TEST_PASSWORD';

    const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (authError || !authData.session) {
      test.skip(true, `Auth failed: ${authError?.message}`);
      return;
    }

    console.log('Auth successful, user:', authData.user.id);
    console.log('Token (first 30 chars):', authData.session.access_token.substring(0, 30));

    // Call Edge Function with JWT + userId in body (mirrors frontend behavior)
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/run-life-council`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId: authData.user.id }),
      }
    );

    const body = await response.json();
    console.log('Life Council response status:', response.status);
    console.log('Life Council response body:', JSON.stringify(body, null, 2));

    // The response should either succeed with insights or return insufficient_data
    if (response.status !== 200) {
      console.error('Unexpected status:', response.status, body);
    }
    expect(response.status).toBe(200);

    if (body.success) {
      // If we have data, verify the response structure
      expect(body.insight).toBeDefined();
      expect(body.insight.headline).toBeTruthy();
      expect(body.insight.synthesis).toBeTruthy();
      expect(body.insight.overall_status).toMatch(/thriving|balanced|strained|burnout_risk/);
      expect(body.insight.personas).toBeDefined();

      // Metadata should include available_modules
      expect(body.metadata.available_modules).toBeDefined();
      expect(body.metadata.persona_count).toBeGreaterThan(0);

      // If finance data exists, financial_advisor persona should be present
      if (body.metadata.available_modules?.includes('finance')) {
        expect(body.insight.personas.financial_advisor).toBeDefined();
      }
    } else {
      // insufficient_data is acceptable if the test transaction wasn't picked up
      expect(body.error).toBe('insufficient_data');
      console.log('No sufficient data for council — this is OK for test environment');
    }
  });
});
