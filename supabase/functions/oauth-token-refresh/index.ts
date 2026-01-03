import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshRequest {
  refresh_token: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Validate request
    const { refresh_token }: RefreshRequest = await req.json();
    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: 'refresh_token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get secrets from environment
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('OAuth credentials not configured in environment');
      throw new Error('OAuth credentials not configured');
    }

    console.log('[oauth-token-refresh] Attempting token refresh with Google');

    // 3. Call Google OAuth token endpoint
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[oauth-token-refresh] Google OAuth error:', error);
      return new Response(
        JSON.stringify({
          error: 'Token refresh failed',
          details: error,
          status: response.status
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Return new tokens
    const tokens: GoogleTokenResponse = await response.json();

    console.log('[oauth-token-refresh] Token refresh successful');

    return new Response(
      JSON.stringify({
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[oauth-token-refresh] Edge function error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
