/**
 * Shared Google Token Manager
 *
 * Fetches and refreshes Google OAuth tokens for any user+scope.
 * Used by gmail-proxy, drive-proxy, and any future Google API Edge Functions.
 *
 * Usage:
 *   import { getGoogleTokenForUser } from '../_shared/google-token-manager.ts';
 *   const { accessToken, error } = await getGoogleTokenForUser(userId, 'gmail.readonly', supabaseClient);
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Scope short names → full Google scope URLs
const SCOPE_MAP: Record<string, string> = {
  'gmail.readonly': 'https://www.googleapis.com/auth/gmail.readonly',
  'drive.readonly': 'https://www.googleapis.com/auth/drive.readonly',
  'calendar.readonly': 'https://www.googleapis.com/auth/calendar.readonly',
  'calendar.events': 'https://www.googleapis.com/auth/calendar.events',
};

interface TokenResult {
  accessToken: string;
  error?: undefined;
}

interface TokenError {
  accessToken?: undefined;
  error: string;
}

export async function getGoogleTokenForUser(
  userId: string,
  requiredScope: string,
  supabaseClient: SupabaseClient
): Promise<TokenResult | TokenError> {
  const TAG = '[google-token-manager]';

  try {
    // 1. Fetch token record (use service role client to bypass RLS)
    const { data: tokenRecord, error: fetchError } = await supabaseClient
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_connected', true)
      .single();

    if (fetchError || !tokenRecord) {
      console.error(TAG, 'No connected Google account for user', userId);
      return { error: 'Google account not connected. Please connect your Google account first.' };
    }

    // 2. Check if required scope is granted
    const fullScope = SCOPE_MAP[requiredScope] || requiredScope;
    const scopes: string[] = tokenRecord.scopes || [];

    if (!scopes.includes(fullScope)) {
      console.warn(TAG, `Scope ${fullScope} not granted for user ${userId}. Has: ${scopes.join(', ')}`);
      return { error: `Google scope "${requiredScope}" not granted. Please grant additional permissions.` };
    }

    // 3. Check if token is still valid (>60s remaining)
    const expiry = tokenRecord.token_expiry ? new Date(tokenRecord.token_expiry) : null;
    const now = new Date();
    const secondsUntilExpiry = expiry ? (expiry.getTime() - now.getTime()) / 1000 : 0;

    if (expiry && secondsUntilExpiry > 60) {
      // Token still valid
      return { accessToken: tokenRecord.access_token };
    }

    // 4. Token expired or expiring soon — refresh it
    console.log(TAG, `Token expiring in ${Math.round(secondsUntilExpiry)}s, refreshing for user ${userId}`);

    if (!tokenRecord.refresh_token) {
      return { error: 'No refresh token available. Please reconnect your Google account.' };
    }

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error(TAG, 'GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET not configured');
      return { error: 'OAuth credentials not configured on server.' };
    }

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenRecord.refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!refreshResponse.ok) {
      const errBody = await refreshResponse.json().catch(() => ({}));
      console.error(TAG, 'Google token refresh failed:', refreshResponse.status, errBody);

      // If refresh token is revoked, mark account as disconnected
      if (refreshResponse.status === 400 && errBody?.error === 'invalid_grant') {
        await supabaseClient
          .from('google_calendar_tokens')
          .update({ is_connected: false })
          .eq('user_id', userId);
        return { error: 'Google account access revoked. Please reconnect your Google account.' };
      }

      return { error: `Token refresh failed: ${errBody?.error_description || refreshResponse.statusText}` };
    }

    const tokens = await refreshResponse.json();
    const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    // 5. Save refreshed token
    const { error: updateError } = await supabaseClient
      .from('google_calendar_tokens')
      .update({
        access_token: tokens.access_token,
        token_expiry: newExpiry.toISOString(),
        last_refresh: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(TAG, 'Failed to save refreshed token:', updateError);
      // Still return the token — it's valid even if we couldn't persist it
    }

    console.log(TAG, `Token refreshed successfully for user ${userId}, expires ${newExpiry.toISOString()}`);
    return { accessToken: tokens.access_token };

  } catch (err) {
    console.error(TAG, 'Unexpected error:', err);
    return { error: err instanceof Error ? err.message : 'Unexpected error getting Google token' };
  }
}
