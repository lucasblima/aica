/**
 * E2E Test Setup and Helpers
 */

import { test as base, expect } from '@playwright/test'
import { Page } from '@playwright/test'

// Test user credentials
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

/**
 * Extended test with authenticated page fixture
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Fill login form
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await emailInput.fill(TEST_USER_EMAIL)
    await passwordInput.fill(TEST_USER_PASSWORD)

    // Submit login
    const loginButton = page.locator('button[type="submit"]').first()
    await loginButton.click()

    // Wait for redirect after login
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {
      // Might already be on home page
    })

    // Wait for authentication to complete
    await page.waitForTimeout(2000)

    // Use the authenticated page
    await use(page)

    // Cleanup: logout after test
    // (optional, depends on your app's logout implementation)
  },
})

export { expect }

/**
 * Helper: Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Helper: Wait for element and get text
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector)
  await element.waitFor({ state: 'visible' })
  return (await element.textContent()) || ''
}

/**
 * Helper: Check if API key is exposed in network
 */
export async function checkNoApiKeyInNetwork(page: Page): Promise<boolean> {
  const requests: string[] = []

  page.on('request', request => {
    requests.push(request.url())
  })

  await page.waitForTimeout(1000)

  // Check if any request contains API key patterns
  const hasApiKey = requests.some(url =>
    url.includes('AIza') ||
    url.includes('GEMINI_API_KEY') ||
    url.includes('key=AIza')
  )

  return !hasApiKey
}

/**
 * Helper: Measure execution time
 */
export async function measureTime(fn: () => Promise<void>): Promise<number> {
  const start = Date.now()
  await fn()
  return Date.now() - start
}
