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

  console.log(`[OAuth Cleanup] Deleted cookie: ${name}`);
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
  console.log('[OAuth Cleanup] Starting cookie cleanup...');

  const oauthCookies = getOAuthCookies();

  if (oauthCookies.length === 0) {
    console.log('[OAuth Cleanup] No OAuth cookies found to clean');
    return;
  }

  console.log(`[OAuth Cleanup] Found ${oauthCookies.length} OAuth cookies:`, oauthCookies);

  oauthCookies.forEach(cookieName => {
    deleteCookie(cookieName);
  });

  console.log('[OAuth Cleanup] ✅ Cleanup complete! Refresh the page and try logging in again.');
  console.log('[OAuth Cleanup] TIP: Clear browser cache (Ctrl+Shift+Delete) for best results');
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

  console.group('[OAuth Debug] Cookie Status');
  console.log('Total cookies:', allCookies.length);
  console.log('OAuth cookies:', oauthCookies.length);
  console.table(
    oauthCookies.map(name => ({
      name,
      length: document.cookie.match(new RegExp(`${name}=([^;]*)`))??[1]?.length ?? 0,
    }))
  );
  console.groupEnd();
}

// Expose to window for console debugging
if (typeof window !== 'undefined') {
  (window as any).cleanupOAuthCookies = cleanupOAuthCookies;
  (window as any).debugOAuthCookies = debugOAuthCookies;
}
