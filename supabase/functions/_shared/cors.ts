/**
 * Shared CORS configuration for all AICA Edge Functions.
 * Import this instead of defining CORS inline.
 */

const ALLOWED_ORIGINS = [
  'https://dev.aica.guru',
  'https://aica.guru',
  'https://aica-staging-5562559893.southamerica-east1.run.app',
  'https://aica-5562559893.southamerica-east1.run.app',
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow any localhost port for local dev (Vite may pick 3000, 3001, 3002, 5173, etc.)
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = isAllowedOrigin(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}
