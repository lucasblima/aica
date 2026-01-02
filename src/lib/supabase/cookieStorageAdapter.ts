import type { CookieOptions } from '@supabase/ssr';

/**
 * Cookie Storage Adapter for Client-Side (Browser)
 *
 * Permite @supabase/ssr usar cookies no browser, resolvendo problemas de
 * stateless containers no Cloud Run onde localStorage não persiste entre requests.
 *
 * PKCE Flow:
 * 1. signInWithOAuth() gera code_verifier e armazena em cookie
 * 2. Browser redireciona para Google OAuth
 * 3. Google redireciona de volta com authorization code
 * 4. Cookie com code_verifier é lido para completar o exchange
 *
 * FIX: Corrigido parsing de cookies com valores base64 (contêm '=')
 */

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true';

function log(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[CookieAdapter] ${message}`, data ?? '');
  }
}

const getDefaultCookieOptions = (): Partial<CookieOptions> => {
  const isProduction = window.location.protocol === 'https:';

  return {
    path: '/',
    sameSite: 'lax',      // Permite OAuth redirects (top-level navigation)
    secure: isProduction, // true em HTTPS (produção)
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  };
};

/**
 * Parse cookies from document.cookie string
 * FIX: Usa indexOf para encontrar primeiro '=' e preservar '=' no valor (base64)
 */
function parseCookies(): Record<string, string> {
  if (!document.cookie) {
    return {};
  }

  return document.cookie.split('; ').reduce((acc, cookie) => {
    // FIX: Encontra o primeiro '=' para separar nome do valor
    // Isso preserva '=' em valores base64 como o code_verifier
    const eqIndex = cookie.indexOf('=');
    if (eqIndex === -1) return acc;

    const key = cookie.substring(0, eqIndex);
    const value = cookie.substring(eqIndex + 1);

    if (key && value !== undefined) {
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        // Se falhar decode, usa valor original
        acc[key] = value;
      }
    }
    return acc;
  }, {} as Record<string, string>);
}

function setCookie(name: string, value: string, options: Partial<CookieOptions> = {}): void {
  if (typeof document === 'undefined') return;

  const opts = { ...getDefaultCookieOptions(), ...options };

  let cookieString = `${name}=${encodeURIComponent(value)}`;

  if (opts.path) cookieString += `; Path=${opts.path}`;
  if (opts.domain) cookieString += `; Domain=${opts.domain}`;
  if (opts.maxAge !== undefined) cookieString += `; Max-Age=${opts.maxAge}`;
  if (opts.sameSite) cookieString += `; SameSite=${opts.sameSite}`;
  if (opts.secure) cookieString += `; Secure`;

  document.cookie = cookieString;
  log(`SET cookie: ${name}`, { valueLength: value.length, options: opts });
}

function deleteCookie(name: string, options: Partial<CookieOptions> = {}): void {
  log(`DELETE cookie: ${name}`);
  // Para deletar, precisamos setar com Max-Age=0 e mesmo path/domain
  const opts = { ...getDefaultCookieOptions(), ...options, maxAge: 0 };
  let cookieString = `${name}=`;

  if (opts.path) cookieString += `; Path=${opts.path}`;
  if (opts.domain) cookieString += `; Domain=${opts.domain}`;
  cookieString += `; Max-Age=0`;
  if (opts.sameSite) cookieString += `; SameSite=${opts.sameSite}`;
  if (opts.secure) cookieString += `; Secure`;

  document.cookie = cookieString;
}

/**
 * Create cookies getter/setter for @supabase/ssr
 *
 * Implementa a interface CookieMethods esperada pelo createBrowserClient:
 * - get(name): Retorna valor do cookie ou undefined
 * - getAll(): Retorna array de {name, value} para todos os cookies
 * - set(name, value, options): Define um cookie
 * - remove(name, options): Remove um cookie
 */
export function createCookieHandlers() {
  return {
    get(name: string): string | undefined {
      const cookies = parseCookies();
      const value = cookies[name];
      log(`GET cookie: ${name}`, { found: !!value, valueLength: value?.length });
      return value;
    },

    getAll(): Array<{ name: string; value: string }> {
      const cookies = parseCookies();
      const result = Object.entries(cookies).map(([name, value]) => ({ name, value }));
      log(`GET ALL cookies`, { count: result.length, names: result.map(c => c.name) });
      return result;
    },

    set(name: string, value: string, options: CookieOptions): void {
      setCookie(name, value, options);
    },

    remove(name: string, options: CookieOptions): void {
      deleteCookie(name, options);
    },
  };
}
