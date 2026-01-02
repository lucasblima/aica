import type { CookieOptions } from '@supabase/ssr';

/**
 * Cookie Storage Adapter for Client-Side (Browser)
 *
 * This adapter properly handles:
 * - Cookie chunking for large tokens (required for PKCE/JWT)
 * - Cross-domain OAuth redirects
 * - Stateless container deployments (Cloud Run)
 *
 * IMPORTANT: Supabase stores large JSON payloads that may exceed cookie size limits.
 * This adapter automatically chunks values across multiple cookies.
 */

const CHUNK_SIZE = 3500; // Safe size under 4096 byte cookie limit (leaving room for name + metadata)
const CHUNK_SEPARATOR = '.';

const getDefaultCookieOptions = (): Partial<CookieOptions> => {
  const isProduction = window.location.protocol === 'https:';

  return {
    path: '/',
    sameSite: 'lax',      // Required for OAuth redirects
    secure: isProduction, // true in HTTPS (production)
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
};

function parseCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};

  return document.cookie.split('; ').reduce((acc, cookie) => {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex > 0) {
      const key = cookie.substring(0, separatorIndex);
      const value = cookie.substring(separatorIndex + 1);
      if (key && value) {
        try {
          acc[key] = decodeURIComponent(value);
        } catch {
          acc[key] = value;
        }
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
}

function deleteCookie(name: string, options: Partial<CookieOptions> = {}): void {
  setCookie(name, '', { ...options, maxAge: 0 });
}

/**
 * Chunks a large value into multiple cookie-safe pieces
 */
function chunkValue(value: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.substring(i, i + CHUNK_SIZE));
  }
  return chunks;
}

/**
 * Gets all chunk cookie names for a base name
 */
function getChunkNames(baseName: string, cookies: Record<string, string>): string[] {
  const names: string[] = [];
  let i = 0;
  while (cookies[`${baseName}${CHUNK_SEPARATOR}${i}`] !== undefined) {
    names.push(`${baseName}${CHUNK_SEPARATOR}${i}`);
    i++;
  }
  return names;
}

/**
 * Create cookies getter/setter for @supabase/ssr with chunking support
 *
 * This is critical for PKCE flow where:
 * 1. code_verifier is stored before OAuth redirect
 * 2. After callback, code_verifier is retrieved to exchange for tokens
 * 3. Large session tokens are stored after successful auth
 */
export function createCookieHandlers() {
  return {
    /**
     * Get a cookie value, reassembling chunks if necessary
     */
    get(name: string): string | undefined {
      const cookies = parseCookies();

      // Check for single cookie first
      if (cookies[name] !== undefined) {
        return cookies[name];
      }

      // Check for chunked cookies
      const chunkNames = getChunkNames(name, cookies);
      if (chunkNames.length > 0) {
        // Reassemble chunks
        return chunkNames.map(chunkName => cookies[chunkName]).join('');
      }

      return undefined;
    },

    /**
     * Set a cookie value, chunking if necessary
     */
    set(name: string, value: string, options: CookieOptions): void {
      const cookies = parseCookies();

      // First, remove any existing chunks for this cookie
      const existingChunks = getChunkNames(name, cookies);
      existingChunks.forEach(chunkName => deleteCookie(chunkName, options));

      // Also remove the base cookie if it exists
      if (cookies[name] !== undefined) {
        deleteCookie(name, options);
      }

      // If value is small enough, store directly
      if (value.length <= CHUNK_SIZE) {
        setCookie(name, value, options);
        return;
      }

      // Otherwise, chunk the value
      const chunks = chunkValue(value);
      chunks.forEach((chunk, index) => {
        setCookie(`${name}${CHUNK_SEPARATOR}${index}`, chunk, options);
      });
    },

    /**
     * Remove a cookie and all its chunks
     */
    remove(name: string, options: CookieOptions): void {
      const cookies = parseCookies();

      // Remove base cookie
      deleteCookie(name, options);

      // Remove all chunks
      const chunkNames = getChunkNames(name, cookies);
      chunkNames.forEach(chunkName => deleteCookie(chunkName, options));
    },
  };
}
