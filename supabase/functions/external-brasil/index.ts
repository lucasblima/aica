/**
 * External Brasil Edge Function — BrasilAPI
 *
 * Unified proxy for Brazilian data APIs (CEP, CNPJ, Banks, DDD).
 * Single function with action-based routing for all BrasilAPI endpoints.
 *
 * @endpoint POST /external-brasil
 * @body { action: 'cep' | 'cnpj' | 'banks' | 'ddd', value?: string }
 * @returns Standard ExternalApiResponse
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { fetchExternalApi } from '../_shared/external-api.ts';
import type { ExternalApiConfig } from '../_shared/external-api.ts';

const TAG = '[external-brasil]';

// ============================================================================
// ACTION CONFIGS
// ============================================================================

type BrasilAction = 'cep' | 'cnpj' | 'banks' | 'ddd';

const ACTION_CONFIGS: Record<BrasilAction, ExternalApiConfig> = {
  cep: {
    name: 'brasilapi-cep',
    baseUrl: 'https://brasilapi.com.br/api/cep/v2',
    cacheTtlSeconds: 604800, // 7 days
    maxRetries: 2,
  },
  cnpj: {
    name: 'brasilapi-cnpj',
    baseUrl: 'https://brasilapi.com.br/api/cnpj/v1',
    cacheTtlSeconds: 86400, // 24 hours
    maxRetries: 2,
  },
  banks: {
    name: 'brasilapi-banks',
    baseUrl: 'https://brasilapi.com.br/api/banks/v1',
    cacheTtlSeconds: 2592000, // 30 days
    maxRetries: 2,
  },
  ddd: {
    name: 'brasilapi-ddd',
    baseUrl: 'https://brasilapi.com.br/api/ddd/v1',
    cacheTtlSeconds: 2592000, // 30 days
    maxRetries: 2,
  },
};

const VALID_ACTIONS = new Set<string>(['cep', 'cnpj', 'banks', 'ddd']);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // 1. Parse request
    const body = await req.json();
    const { action, value } = body;

    if (!action || !VALID_ACTIONS.has(action)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid action: "${action}". Valid actions: cep, cnpj, banks, ddd`,
        }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const typedAction = action as BrasilAction;

    // 2. Validate value (required for all except banks)
    if (typedAction !== 'banks' && !value) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `"value" is required for action "${typedAction}"`,
        }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // 3. Sanitize input — allow only alphanumeric and hyphens
    const sanitized = value ? String(value).replace(/[^0-9a-zA-Z-]/g, '') : '';

    // Additional validation per action
    if (typedAction === 'cep' && sanitized.length !== 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'CEP must be 8 digits (e.g., 01001000)' }),
        { status: 400, headers: jsonHeaders },
      );
    }
    if (typedAction === 'cnpj' && sanitized.length !== 14) {
      return new Response(
        JSON.stringify({ success: false, error: 'CNPJ must be 14 digits' }),
        { status: 400, headers: jsonHeaders },
      );
    }
    if (typedAction === 'ddd' && (sanitized.length < 2 || sanitized.length > 2)) {
      return new Response(
        JSON.stringify({ success: false, error: 'DDD must be 2 digits (e.g., 11, 21)' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // 4. Build path: banks lists all, others use /{value}
    const config = ACTION_CONFIGS[typedAction];
    const path = typedAction === 'banks' ? '' : `/${sanitized}`;

    // 5. Fetch from BrasilAPI
    const apiResult = await fetchExternalApi(config, path);

    if (!apiResult.success) {
      // Map 404 to a friendlier message
      const is404 = apiResult.error?.includes('404');
      const notFoundMessages: Record<BrasilAction, string> = {
        cep: `CEP ${sanitized} nao encontrado`,
        cnpj: `CNPJ ${sanitized} nao encontrado`,
        ddd: `DDD ${sanitized} nao encontrado`,
        banks: 'Lista de bancos indisponivel',
      };

      return new Response(
        JSON.stringify({
          success: false,
          error: is404 ? notFoundMessages[typedAction] : apiResult.error,
          source: apiResult.source,
          cached: false,
          latencyMs: apiResult.latencyMs,
        }),
        { status: is404 ? 404 : 502, headers: jsonHeaders },
      );
    }

    console.log(TAG, `Action "${typedAction}" completed${sanitized ? ` for "${sanitized}"` : ''}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: apiResult.data,
        source: apiResult.source,
        cached: apiResult.cached,
        latencyMs: apiResult.latencyMs,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error(TAG, 'Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
