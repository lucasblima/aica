/**
 * OAuth Cookie Cleanup Utility
 *
 * Fixes PKCE authentication errors caused by stale code_verifier cookies
 *
 * Problem:
 * - Multiple code_verifier cookies from different Supabase projects
 * - Stale cookies from failed OAuth attempts
 * - Causes 401 Unauthorized during PKCE token exchange
 *
 * Solution:
 * - Clear ALL auth-related cookies
 * - Force fresh PKCE flow on next login
 */

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('OAuthCleanup');

const AUTH_COOKIE_PATTERNS = [
  /^sb-.*-auth-token.*$/,           // All Supabase auth tokens
  /^sb-.*-code-verifier.*$/,        // PKCE code verifiers
  /^supabase\.auth\.token.*$/,      // Legacy auth tokens
];

/**
 * Delete a cookie by name
 */
function deleteCookie(name: string): void {
  // Delete with all possible path/domain combinations
  const deletionStrategies = [
    `${name}=; Path=/; Max-Age=0`,
    `${name}=; Path=/; Domain=${window.location.hostname}; Max-Age=0`,
    `${name}=; Path=/; Domain=.${window.location.hostname}; Max-Age=0`,
  ];

  deletionStrategies.forEach(strategy => {
    document.cookie = strategy;
  });

  log.debug(`Deleted cookie: ${name}`);
}

/**
 * Get all cookies that match OAuth patterns
 */
function getOAuthCookies(): string[] {
  if (!document.cookie) return [];

  return document.cookie
    .split('; ')
    .map(cookie => {
      const eqIndex = cookie.indexOf('=');
      return eqIndex === -1 ? '' : cookie.substring(0, eqIndex);
    })
    .filter(name => {
      return AUTH_COOKIE_PATTERNS.some(pattern => pattern.test(name));
    });
}

/**
 * Clean up all OAuth-related cookies
 *
 * Usage:
 * ```ts
 * import { cleanupOAuthCookies } from '@/utils/cleanupOAuthCookies';
 * cleanupOAuthCookies();
 * ```
 *
 * Or run in browser console:
 * ```js
 * window.cleanupOAuthCookies();
 * ```
 */
export function cleanupOAuthCookies(): void {
  log.debug('Starting cookie cleanup...');

  const oauthCookies = getOAuthCookies();

  if (oauthCookies.length === 0) {
    log.debug('No OAuth cookies found to clean');
    return;
  }

  log.debug(`Found ${oauthCookies.length} OAuth cookies:`, oauthCookies);

  oauthCookies.forEach(cookieName => {
    deleteCookie(cookieName);
  });

  log.debug('Cleanup complete! Refresh the page and try logging in again.');
  log.debug('TIP: Clear browser cache (Ctrl+Shift+Delete) for best results');
}

/**
 * Get current OAuth cookie status for debugging
 */
export function debugOAuthCookies(): void {
  const allCookies = document.cookie.split('; ').map(c => {
    const eqIndex = c.indexOf('=');
    return eqIndex === -1 ? c : c.substring(0, eqIndex);
  });

  const oauthCookies = getOAuthCookies();

  log.debug('[Cookie Status] Total cookies:', allCookies.length);
  log.debug('[Cookie Status] OAuth cookies:', oauthCookies.length);
  log.debug('[Cookie Status] OAuth cookie names:', oauthCookies);
}

// Expose to window for console debugging
if (typeof window !== 'undefined') {
  (window as any).cleanupOAuthCookies = cleanupOAuthCookies;
  (window as any).debugOAuthCookies = debugOAuthCookies;
}
