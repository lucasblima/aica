/**
 * External Turnstile Verify Edge Function — Cloudflare Turnstile
 *
 * Verifies Cloudflare Turnstile CAPTCHA tokens server-side.
 * Uses fail-open design: if verification throws an exception, returns
 * success=true with fallback=true (never blocks login due to infra failure).
 *
 * @endpoint POST /external-turnstile-verify
 * @auth Not required (used during login/signup)
 * @body { token: string }
 * @returns { success, data: { verified, hostname?, action?, fallback? } }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const TAG = '[external-turnstile-verify]';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // 1. Parse request
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'token is required' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // 2. Get secret from env
    const secret = Deno.env.get('CLOUDFLARE_TURNSTILE_SECRET');
    if (!secret) {
      console.error(TAG, 'CLOUDFLARE_TURNSTILE_SECRET not configured');
      // Fail-open: missing config should not block users
      return new Response(
        JSON.stringify({
          success: true,
          data: { verified: true, fallback: true, reason: 'secret_not_configured' },
        }),
        { status: 200, headers: jsonHeaders },
      );
    }

    // 3. Get client IP
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : '';

    // 4. Verify with Cloudflare
    try {
      const formData = new URLSearchParams();
      formData.set('secret', secret);
      formData.set('response', token);
      if (clientIp) formData.set('remoteip', clientIp);

      const verifyResponse = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!verifyResponse.ok) {
        console.error(TAG, `Turnstile API returned ${verifyResponse.status}`);
        // Fail-open on API error
        return new Response(
          JSON.stringify({
            success: true,
            data: { verified: true, fallback: true, reason: 'api_error' },
          }),
          { status: 200, headers: jsonHeaders },
        );
      }

      const result: TurnstileResponse = await verifyResponse.json();

      if (result.success) {
        console.log(TAG, `Token verified successfully for ${result.hostname || 'unknown'}`);
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              verified: true,
              hostname: result.hostname,
              action: result.action,
            },
          }),
          { status: 200, headers: jsonHeaders },
        );
      }

      // Token verification failed — this is a legitimate rejection (not infra failure)
      console.warn(TAG, `Token verification failed: ${result['error-codes']?.join(', ')}`);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            verified: false,
            errorCodes: result['error-codes'] || [],
          },
        }),
        { status: 200, headers: jsonHeaders },
      );
    } catch (verifyError) {
      // Fail-open: network/parsing errors should not block users
      console.error(TAG, `Verification exception (fail-open): ${verifyError}`);
      return new Response(
        JSON.stringify({
          success: true,
          data: { verified: true, fallback: true, reason: 'exception' },
        }),
        { status: 200, headers: jsonHeaders },
      );
    }
  } catch (error) {
    console.error(TAG, 'Error:', error);
    // Even top-level errors fail-open
    return new Response(
      JSON.stringify({
        success: true,
        data: { verified: true, fallback: true, reason: 'top_level_exception' },
      }),
      { status: 200, headers: jsonHeaders },
    );
  }
});
