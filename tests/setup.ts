/**
 * Test Setup and Configuration
 *
 * Configuração global para testes de integração e E2E
 */

import { beforeAll, afterAll, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import '@testing-library/jest-dom/vitest'

// Environment variables para testes
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-key'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

// Global Supabase client for tests
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Global test user session
let testSession: any = null

/**
 * Setup antes de todos os testes
 */
beforeAll(async () => {
  console.log('🧪 Setting up test environment...')

  // Try to login test user
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    })

    if (error) {
      console.warn('⚠️  No test user found. Some tests may be skipped.')
      console.warn('   Create test user with:')
      console.warn(`   Email: ${TEST_USER_EMAIL}`)
      console.warn(`   Password: ${TEST_USER_PASSWORD}`)
    } else {
      testSession = data.session
      console.log('✅ Test user authenticated')
    }
  } catch (error) {
    console.warn('⚠️  Could not authenticate test user:', error)
  }

  // Verify backend services are reachable
  const pythonServerUrl = process.env.VITE_LLM_API_URL || 'http://localhost:8001'

  try {
    const response = await fetch(`${pythonServerUrl}/health`)
    if (response.ok) {
      console.log('✅ Python server reachable')
    } else {
      console.warn('⚠️  Python server not healthy')
    }
  } catch (error) {
    console.warn('⚠️  Python server not reachable at', pythonServerUrl)
    console.warn('   Start server with: python scripts/aica_llm_server.py')
  }

  // Verify Edge Functions are reachable
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'health' })
    })

    if (response.status === 401) {
      console.log('✅ Edge Functions reachable (auth required)')
    } else {
      console.log('✅ Edge Functions reachable')
    }
  } catch (error) {
    console.warn('⚠️  Edge Functions not reachable')
    console.warn('   Start Supabase with: npx supabase start')
  }

  console.log('🧪 Test environment ready\n')
})

/**
 * Cleanup após cada teste
 */
afterEach(async () => {
  // Clean up any test data created
  // (implement if needed)
})

/**
 * Cleanup após todos os testes
 */
afterAll(async () => {
  console.log('\n🧹 Cleaning up test environment...')

  // Sign out test user
  if (testSession) {
    await supabase.auth.signOut()
    console.log('✅ Test user signed out')
  }

  console.log('✅ Test environment cleaned up')
})

/**
 * Helper: Get test user auth token
 */
export async function getTestAuthToken(): Promise<string | null> {
  if (!testSession) {
    // Try to get fresh session
    const { data } = await supabase.auth.getSession()
    testSession = data.session
  }

  return testSession?.access_token || null
}

/**
 * Helper: Create test user if doesn't exist
 */
export async function createTestUser() {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    })

    if (error) {
      console.error('Failed to create test user:', error)
      return null
    }

    return data.user
  } catch (error) {
    console.error('Error creating test user:', error)
    return null
  }
}

/**
 * Helper: Wait for condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const result = await condition()
    if (result) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}

/**
 * Helper: Mock successful LLM response
 */
export function mockLLMResponse(result: any, cached = false) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      result,
      cached,
      latencyMs: cached ? 50 : 1500,
      tokensUsed: cached ? undefined : { input: 100, output: 200 }
    })
  }
}

/**
 * Helper: Mock error response
 */
export function mockErrorResponse(status: number, error: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error })
  }
}
