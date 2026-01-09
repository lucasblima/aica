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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">OAuth Diagnostics</h2>

      <div className="space-y-4">
        {/* Issue Description */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold text-yellow-800 mb-2">Common OAuth Errors</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
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
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Debug OAuth Cookies (Check Console)
          </button>

          <button
            onClick={handleCleanup}
            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            disabled={cleaned}
          >
            {cleaned ? '✅ Cleaned! Refreshing...' : 'Clean OAuth Cookies & Refresh'}
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded">
          <h3 className="font-semibold text-gray-800 mb-2">Manual Steps</h3>
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
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
              <code className="bg-gray-200 px-1 rounded text-xs">
                {window.location.origin}
              </code>{' '}
              is in Supabase Dashboard → Authentication → URL Configuration
            </li>
          </ol>
        </div>

        {/* Current Environment */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Current Environment</h3>
          <div className="text-sm text-blue-700 space-y-1 font-mono">
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
