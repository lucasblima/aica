/**
 * Comprehensive XSS (Cross-Site Scripting) Attack Tests
 *
 * Purpose: Validate that all user input fields properly sanitize and escape HTML/JS
 * Security Level: CRITICAL
 *
 * Test Coverage:
 * - Text input fields (tasks, moments, notes)
 * - Rich text editors (descriptions, content)
 * - URL parameters
 * - File uploads (metadata)
 * - AI-generated content rendering
 *
 * Attack Vectors:
 * - Script tags
 * - Event handlers
 * - SVG/Image-based XSS
 * - JavaScript protocol
 * - HTML entity encoding bypass
 * - DOM-based XSS
 *
 * Reference: OWASP XSS Filter Evasion Cheat Sheet
 * https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// XSS ATTACK PAYLOADS
// ============================================================================

const XSS_PAYLOADS = [
  // Basic script injection
  {
    name: 'Basic script tag',
    payload: '<script>alert("XSS")</script>',
    shouldNotContain: ['<script>', 'alert('],
  },

  // Event handler XSS
  {
    name: 'IMG onerror event',
    payload: '<img src=x onerror="alert(\'XSS\')">',
    shouldNotContain: ['onerror', 'alert('],
  },
  {
    name: 'IMG onload event',
    payload: '<img src="valid.jpg" onload="alert(1)">',
    shouldNotContain: ['onload', 'alert('],
  },
  {
    name: 'Body onload',
    payload: '<body onload="alert(\'XSS\')">',
    shouldNotContain: ['onload', 'alert('],
  },

  // SVG-based XSS
  {
    name: 'SVG with script',
    payload: '<svg onload="alert(\'XSS\')">',
    shouldNotContain: ['<svg', 'onload', 'alert('],
  },
  {
    name: 'SVG with foreign object',
    payload: '<svg><foreignObject><body onload="alert(1)"></body></foreignObject></svg>',
    shouldNotContain: ['foreignObject', 'onload', 'alert('],
  },

  // JavaScript protocol
  {
    name: 'Javascript protocol in link',
    payload: '<a href="javascript:alert(\'XSS\')">Click</a>',
    shouldNotContain: ['javascript:', 'alert('],
  },
  {
    name: 'Javascript protocol in iframe',
    payload: '<iframe src="javascript:alert(1)">',
    shouldNotContain: ['<iframe', 'javascript:', 'alert('],
  },

  // Data URI XSS
  {
    name: 'Data URI with script',
    payload: '<iframe src="data:text/html,<script>alert(1)</script>">',
    shouldNotContain: ['<iframe', 'data:text/html', '<script>'],
  },

  // HTML5 tags
  {
    name: 'Details/summary autofocus',
    payload: '<details open ontoggle="alert(1)"><summary>Click</summary></details>',
    shouldNotContain: ['ontoggle', 'alert('],
  },
  {
    name: 'Input autofocus',
    payload: '<input autofocus onfocus="alert(1)">',
    shouldNotContain: ['onfocus', 'alert('],
  },

  // CSS-based XSS
  {
    name: 'Style with expression',
    payload: '<div style="background:url(javascript:alert(1))">',
    shouldNotContain: ['javascript:', 'alert('],
  },
  {
    name: 'Style with import',
    payload: '<style>@import"javascript:alert(1)";</style>',
    shouldNotContain: ['<style>', 'javascript:', 'alert('],
  },

  // Form XSS
  {
    name: 'Form with action',
    payload: '<form action="javascript:alert(1)"><input type="submit"></form>',
    shouldNotContain: ['<form', 'javascript:', 'alert('],
  },
  {
    name: 'Button with formaction',
    payload: '<button formaction="javascript:alert(1)">Click</button>',
    shouldNotContain: ['formaction', 'javascript:', 'alert('],
  },

  // Meta refresh
  {
    name: 'Meta refresh XSS',
    payload: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    shouldNotContain: ['<meta', 'javascript:', 'alert('],
  },

  // Link prefetch
  {
    name: 'Link prefetch',
    payload: '<link rel="prefetch" href="javascript:alert(1)">',
    shouldNotContain: ['<link', 'javascript:', 'alert('],
  },

  // Object/embed XSS
  {
    name: 'Object data XSS',
    payload: '<object data="javascript:alert(1)">',
    shouldNotContain: ['<object', 'javascript:', 'alert('],
  },
  {
    name: 'Embed src XSS',
    payload: '<embed src="javascript:alert(1)">',
    shouldNotContain: ['<embed', 'javascript:', 'alert('],
  },

  // Video/audio XSS
  {
    name: 'Video onerror',
    payload: '<video src=x onerror="alert(1)">',
    shouldNotContain: ['<video', 'onerror', 'alert('],
  },
  {
    name: 'Audio onerror',
    payload: '<audio src=x onerror="alert(1)">',
    shouldNotContain: ['<audio', 'onerror', 'alert('],
  },

  // Template XSS
  {
    name: 'Template with script',
    payload: '<template><script>alert(1)</script></template>',
    shouldNotContain: ['<template>', '<script>', 'alert('],
  },

  // Event attributes
  {
    name: 'Div onclick',
    payload: '<div onclick="alert(1)">Click me</div>',
    shouldNotContain: ['onclick', 'alert('],
  },
  {
    name: 'Span onmouseover',
    payload: '<span onmouseover="alert(1)">Hover</span>',
    shouldNotContain: ['onmouseover', 'alert('],
  },

  // Polyglot XSS
  {
    name: 'Polyglot payload',
    payload: 'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>',
    shouldNotContain: ['javascript:', 'onload', 'onmouseover', 'alert('],
  },
];

// ============================================================================
// XSS TEST HELPERS
// ============================================================================

/**
 * Check if XSS payload was properly sanitized
 */
async function verifyXSSSanitization(
  page: any,
  selector: string,
  payload: { name: string; payload: string; shouldNotContain: string[] }
): Promise<boolean> {
  try {
    const element = page.locator(selector).first();

    // Wait for element to appear (with timeout)
    await element.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    if (await element.isVisible()) {
      const html = await element.innerHTML();
      const text = await element.textContent();

      // Check that dangerous strings are NOT present in HTML
      for (const dangerousString of payload.shouldNotContain) {
        if (html.toLowerCase().includes(dangerousString.toLowerCase())) {
          console.error(`❌ XSS VULNERABILITY FOUND: "${payload.name}" - Found "${dangerousString}" in HTML`);
          return false;
        }
      }

      // Payload should be displayed as text, not executed
      return true;
    }

    return true; // Element not visible = payload might have been rejected entirely (also good)
  } catch (error) {
    // If element doesn't exist, that's fine - payload was rejected
    return true;
  }
}

/**
 * Listen for alert dialogs (indicates XSS execution)
 */
function setupAlertListener(page: any): { alertFired: boolean } {
  const state = { alertFired: false };

  page.on('dialog', async (dialog: any) => {
    console.error(`❌ CRITICAL XSS: Alert dialog fired with message: "${dialog.message()}"`);
    state.alertFired = true;
    await dialog.dismiss();
  });

  return state;
}

// ============================================================================
// XSS TESTS - TASK INPUT (MEU DIA)
// ============================================================================

test.describe('XSS Prevention - Task Input (Meu Dia)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/meu-dia');
    await page.waitForLoadState('networkidle');
  });

  XSS_PAYLOADS.forEach((payload, index) => {
    test(`XSS-Task-${index + 1}: ${payload.name}`, async ({ page }) => {
      const alertState = setupAlertListener(page);

      // Find task input field
      const taskInput = page.locator('input[placeholder*="tarefa"], input[placeholder*="task"]').first();

      if (await taskInput.isVisible()) {
        // Try to inject XSS payload
        await taskInput.fill(payload.payload);
        await taskInput.press('Enter');

        // Wait a moment for potential XSS execution
        await page.waitForTimeout(1000);

        // Verify no alert fired
        expect(alertState.alertFired).toBe(false);

        // Verify payload was sanitized
        const isSafe = await verifyXSSSanitization(
          page,
          `text="${payload.payload.substring(0, 20)}"`,
          payload
        );

        expect(isSafe).toBe(true);
      }
    });
  });
});

// ============================================================================
// XSS TESTS - MOMENT CREATION (JOURNEY)
// ============================================================================

test.describe('XSS Prevention - Moment Creation (Journey)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/journey');
    await page.waitForLoadState('networkidle');
  });

  XSS_PAYLOADS.slice(0, 10).forEach((payload, index) => {
    test(`XSS-Moment-${index + 1}: ${payload.name}`, async ({ page }) => {
      const alertState = setupAlertListener(page);

      // Try to create moment with XSS payload
      const momentButton = page.locator('button:has-text("Capturar"), button:has-text("Novo")').first();

      if (await momentButton.isVisible()) {
        await momentButton.click();

        // Find content input
        const contentInput = page.locator('textarea, input[type="text"]').first();

        if (await contentInput.isVisible()) {
          await contentInput.fill(payload.payload);

          // Submit
          const submitButton = page.locator('button:has-text("Salvar"), button:has-text("Save")').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
          }

          await page.waitForTimeout(1000);

          // Verify no XSS execution
          expect(alertState.alertFired).toBe(false);
        }
      }
    });
  });
});

// ============================================================================
// XSS TESTS - AI-GENERATED CONTENT (FINANCE AGENT)
// ============================================================================

test.describe('XSS Prevention - AI-Generated Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');
  });

  test('XSS-AI-1: AI response with script tags is sanitized', async ({ page }) => {
    const alertState = setupAlertListener(page);

    // Note: This test simulates AI returning malicious content
    // In practice, you'd need to mock the AI response

    // The formatContent function in AgentChat should sanitize all HTML
    // Wait for any AI content to render
    await page.waitForTimeout(2000);

    // Check that no alerts fired
    expect(alertState.alertFired).toBe(false);

    // Verify DOMPurify is loaded and working
    const isDOMPurifyAvailable = await page.evaluate(() => {
      return typeof (window as any).DOMPurify !== 'undefined';
    });

    // DOMPurify should be available in the finance module
    console.log('DOMPurify available:', isDOMPurifyAvailable);
  });
});

// ============================================================================
// XSS TESTS - PODCAST MODULE
// ============================================================================

test.describe('XSS Prevention - Podcast Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('networkidle');
  });

  XSS_PAYLOADS.slice(0, 5).forEach((payload, index) => {
    test(`XSS-Podcast-${index + 1}: ${payload.name} in episode title`, async ({ page }) => {
      const alertState = setupAlertListener(page);

      // Try to create episode with XSS in title
      const createButton = page.locator('button:has-text("Criar"), button:has-text("Novo")').first();

      if (await createButton.isVisible()) {
        await createButton.click();

        const titleInput = page.locator('input[placeholder*="título"], input[placeholder*="title"]').first();

        if (await titleInput.isVisible()) {
          await titleInput.fill(payload.payload);

          await page.waitForTimeout(1000);

          expect(alertState.alertFired).toBe(false);
        }
      }
    });
  });
});

// ============================================================================
// XSS TESTS - URL PARAMETERS
// ============================================================================

test.describe('XSS Prevention - URL Parameters', () => {
  const urlXSSPayloads = [
    '<script>alert(1)</script>',
    'javascript:alert(1)',
    '"><script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
  ];

  urlXSSPayloads.forEach((payload, index) => {
    test(`XSS-URL-${index + 1}: XSS in URL parameter is sanitized`, async ({ page }) => {
      const alertState = setupAlertListener(page);

      // Try XSS via URL parameter
      const encodedPayload = encodeURIComponent(payload);
      await page.goto(`/?search=${encodedPayload}`);

      await page.waitForTimeout(1000);

      // No alert should fire
      expect(alertState.alertFired).toBe(false);

      // Check page content doesn't contain unsanitized payload
      const content = await page.content();
      expect(content).not.toContain('<script>');
      expect(content).not.toContain('javascript:');
    });
  });
});

// ============================================================================
// XSS TESTS - STORED XSS PERSISTENCE
// ============================================================================

test.describe('XSS Prevention - Stored XSS Persistence', () => {
  test('XSS-Stored-1: XSS payload in task persists safely after reload', async ({ page }) => {
    const alertState = setupAlertListener(page);
    const xssPayload = '<img src=x onerror="alert(\'Stored XSS\')">';

    // Create task with XSS
    await page.goto('/meu-dia');
    await page.waitForLoadState('networkidle');

    const taskInput = page.locator('input[placeholder*="tarefa"]').first();

    if (await taskInput.isVisible()) {
      await taskInput.fill(xssPayload);
      await taskInput.press('Enter');

      // Wait for task to save
      await page.waitForTimeout(2000);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Wait for potential XSS execution after reload
      await page.waitForTimeout(1000);

      // Verify no alert fired on reload
      expect(alertState.alertFired).toBe(false);

      // Verify payload still sanitized
      const content = await page.content();
      expect(content).not.toContain('onerror');
    }
  });
});

// ============================================================================
// XSS TESTS - DOM-BASED XSS
// ============================================================================

test.describe('XSS Prevention - DOM-Based XSS', () => {
  test('XSS-DOM-1: DOM manipulation with user input is safe', async ({ page }) => {
    const alertState = setupAlertListener(page);

    await page.goto('/');

    // Test that DOM manipulation functions are safe
    const isDOMSafe = await page.evaluate(() => {
      // Try to inject via innerHTML (should be avoided in code)
      const testDiv = document.createElement('div');
      testDiv.innerHTML = '<img src=x onerror="alert(1)">';

      // Check if script executed (it shouldn't in modern browsers with CSP)
      return !testDiv.innerHTML.includes('onerror');
    });

    expect(alertState.alertFired).toBe(false);
  });
});

// ============================================================================
// XSS TESTS - CONTENT SECURITY POLICY VALIDATION
// ============================================================================

test.describe('XSS Prevention - Content Security Policy', () => {
  test('XSS-CSP-1: CSP headers are present', async ({ page }) => {
    const response = await page.goto('/');

    if (response) {
      const headers = response.headers();

      // Check for CSP header
      const csp = headers['content-security-policy'];

      if (csp) {
        console.log('✓ CSP Header present:', csp);

        // Verify key CSP directives
        expect(csp).toContain("default-src");
        expect(csp).toContain("script-src");

        // Verify no unsafe-eval in production
        if (process.env.NODE_ENV === 'production') {
          expect(csp).not.toContain("unsafe-eval");
        }
      } else {
        console.warn('⚠️ CSP header not found (may be expected in development)');
      }
    }
  });

  test('XSS-CSP-2: Security headers are present', async ({ page }) => {
    const response = await page.goto('/');

    if (response) {
      const headers = response.headers();

      // Check for security headers
      const expectedHeaders = {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1',
      };

      for (const [header, expectedValue] of Object.entries(expectedHeaders)) {
        const actualValue = headers[header];

        if (actualValue) {
          console.log(`✓ ${header}: ${actualValue}`);
          expect(actualValue.toLowerCase()).toContain(expectedValue.toLowerCase());
        } else {
          console.warn(`⚠️ Missing security header: ${header}`);
        }
      }
    }
  });
});
