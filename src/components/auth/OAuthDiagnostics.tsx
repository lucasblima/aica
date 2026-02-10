import { useState } from 'react';
import { cleanupOAuthCookies, debugOAuthCookies } from '@/utils/cleanupOAuthCookies';

/**
 * OAuth Diagnostics Component
 *
 * Helps diagnose and fix OAuth PKCE authentication errors
 *
 * Usage:
 * - Add to a settings page or admin panel
 * - Or access via /diagnostics route
 */
export function OAuthDiagnostics() {
  const [cleaned, setCleaned] = useState(false);

  const handleCleanup = () => {
    cleanupOAuthCookies();
    setCleaned(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const handleDebug = () => {
    debugOAuthCookies();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-ceramic-base rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">OAuth Diagnostics</h2>

      <div className="space-y-4">
        {/* Issue Description */}
        <div className="p-4 bg-ceramic-warning/10 border border-ceramic-warning/20 rounded">
          <h3 className="font-semibold text-ceramic-warning mb-2">Common OAuth Errors</h3>
          <ul className="list-disc list-inside text-sm text-ceramic-warning/80 space-y-1">
            <li>401 Unauthorized during Google login</li>
            <li>PKCE code_verifier mismatch</li>
            <li>Stale authentication cookies</li>
            <li>Multiple Supabase project cookies conflicting</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleDebug}
            className="w-full px-4 py-2 bg-ceramic-info text-white rounded hover:bg-ceramic-info/90 transition"
          >
            Debug OAuth Cookies (Check Console)
          </button>

          <button
            onClick={handleCleanup}
            className="w-full px-4 py-2 bg-ceramic-error text-white rounded hover:bg-ceramic-error/90 transition"
            disabled={cleaned}
          >
            {cleaned ? 'Cleaned! Refreshing...' : 'Clean OAuth Cookies & Refresh'}
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-ceramic-cool border border-ceramic-border rounded">
          <h3 className="font-semibold text-ceramic-text-primary mb-2">Manual Steps</h3>
          <ol className="list-decimal list-inside text-sm text-ceramic-text-secondary space-y-2">
            <li>
              <strong>Clear browser cookies</strong>: Ctrl+Shift+Delete → Cookies and site data
            </li>
            <li>
              <strong>Hard refresh</strong>: Ctrl+Shift+R (Chrome) or Ctrl+F5 (Firefox)
            </li>
            <li>
              <strong>Try incognito mode</strong>: Ctrl+Shift+N to test without cache
            </li>
            <li>
              <strong>Check redirect URI</strong>: Ensure{' '}
              <code className="bg-ceramic-cool px-1 rounded text-xs">
                {window.location.origin}
              </code>{' '}
              is in Supabase Dashboard → Authentication → URL Configuration
            </li>
          </ol>
        </div>

        {/* Current Environment */}
        <div className="p-4 bg-ceramic-info/10 border border-ceramic-info/20 rounded">
          <h3 className="font-semibold text-ceramic-info mb-2">Current Environment</h3>
          <div className="text-sm text-ceramic-info/80 space-y-1 font-mono">
            <div>
              <strong>Origin:</strong> {window.location.origin}
            </div>
            <div>
              <strong>Supabase URL:</strong>{' '}
              {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}
            </div>
            <div>
              <strong>OAuth Client ID:</strong>{' '}
              {import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID
                ? '✅ Configured'
                : '❌ Missing'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
