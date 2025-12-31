import type { CookieOptions } from '@supabase/ssr';

/**
 * Cookie Storage Adapter for Client-Side (Browser)
 * Permite @supabase/ssr usar cookies no browser, resolvendo problemas de stateless containers
 */

const getDefaultCookieOptions = (): Partial<CookieOptions> => {
  const isProduction = window.location.protocol === 'https:';

  return {
    path: '/',
    sameSite: 'lax',      // Permite OAuth redirects
    secure: isProduction, // true em HTTPS (produção)
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  };
};

function parseCookies(): Record<string, string> {
  return document.cookie.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=');
    if (key && value) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {} as Record<string, string>);
}

function setCookie(name: string, value: string, options: Partial<CookieOptions> = {}): void {
  const opts = { ...getDefaultCookieOptions(), ...options };

  let cookieString = `${name}=${encodeURIComponent(value)}`;

  if (opts.path) cookieString += `; Path=${opts.path}`;
  if (opts.domain) cookieString += `; Domain=${opts.domain}`;
  if (opts.maxAge !== undefined) cookieString += `; Max-Age=${opts.maxAge}`;
  if (opts.sameSite) cookieString += `; SameSite=${opts.sameSite}`;
  if (opts.secure) cookieString += `; Secure`;

  document.cookie = cookieString;
}

function deleteCookie(name: string, options: Partial<CookieOptions> = {}): void {
  setCookie(name, '', { ...options, maxAge: 0 });
}

/**
 * Create cookies getter/setter for @supabase/ssr
 */
export function createCookieHandlers() {
  return {
    get(name: string) {
      const cookies = parseCookies();
      return cookies[name];
    },

    set(name: string, value: string, options: CookieOptions) {
      setCookie(name, value, options);
    },

    remove(name: string, options: CookieOptions) {
      deleteCookie(name, options);
    },
  };
}
