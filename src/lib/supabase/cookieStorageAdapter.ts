import type { CookieOptions } from '@supabase/ssr';
import { stringFromBase64URL } from '@supabase/ssr';

/**
 * Cookie Storage Adapter for Client-Side (Browser)
 *
 * This adapter properly handles:
 * - Cookie chunking for large tokens (required for PKCE/JWT > 4KB)
 * - Cross-domain OAuth redirects
 * - Stateless container deployments (Cloud Run)
 * - Base64 values with '=' characters (PKCE code_verifier)
 *
 * PKCE Flow:
 * 1. signInWithOAuth() gera code_verifier e armazena em cookie
 * 2. Browser redireciona para Google OAuth
 * 3. Google redireciona de volta com authorization code
 * 4. Cookie com code_verifier é lido para completar o exchange
 *
 * IMPORTANT: Supabase stores large JSON payloads that may exceed cookie size limits.
 * This adapter automatically chunks values across multiple cookies.
 */

// TEMPORARY: Always enable debug logs in production to diagnose OAuth issue
const DEBUG = true; // import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true';
const CHUNK_SIZE = 3500; // Safe size under 4096 byte cookie limit (leaving room for name + metadata)
const CHUNK_SEPARATOR = '.';
const BASE64_PREFIX = 'base64-';

function log(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[CookieAdapter] ${message}`, data ?? '');
  }
}

/**
 * Decode cookie value that may be base64url-encoded by @supabase/ssr
 *
 * @supabase/ssr stores values with "base64-" prefix when cookieEncoding="base64url" (default)
 * The storage process is: JSON.stringify → base64url encode → add "base64-" prefix
 * So we must: strip prefix → base64url decode → JSON.parse
 *
 * This matches @supabase/ssr/src/cookies.ts:208-212 algorithm
 *
 * @param value - Raw cookie value (may have "base64-" prefix)
 * @returns Decoded and parsed value or original value if not encoded
 */
function decodeCookieValue(value: string): string {
  if (value.startsWith(BASE64_PREFIX)) {
    try {
      // Step 1: Strip "base64-" prefix
      const encoded = value.substring(BASE64_PREFIX.length);

      // Step 2: Decode from base64url
      const decoded = stringFromBase64URL(encoded);

      // REMOVED JSON.parse: @supabase/ssr expects string values, not parsed objects
      // The decoded base64url string is the final value that Supabase needs
      // Attempting to JSON.parse could return an object, breaking the string contract

      log('Decoded base64url cookie value', {
        originalLength: value.length,
        decodedLength: decoded.length,
        decodedValue: decoded.substring(0, 50) + '...' // Log first 50 chars for debugging
      });

      return decoded; // Return the decoded string directly
    } catch (error) {
      log('Base64url decode failed, using raw value', { error });
      return value; // Graceful fallback
    }
  }
  return value; // No prefix, return as-is
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
     * Get all cookies (NEW INTERFACE - required by @supabase/ssr v0.8.0+)
     * This is the preferred method over get/set/remove
     */
    getAll(): Array<{ name: string; value: string }> {
      const cookies = parseCookies();
      const result: Array<{ name: string; value: string }> = [];
      const processedChunks = new Set<string>();

      for (const [name, value] of Object.entries(cookies)) {
        // Skip if already processed as part of a chunk
        if (processedChunks.has(name)) continue;

        // Check if this is a chunk (ends with .0, .1, etc)
        const chunkMatch = name.match(/^(.+)\.(\d+)$/);
        if (chunkMatch) {
          const baseName = chunkMatch[1];

          // Skip if we already processed this base name
          if (processedChunks.has(baseName)) continue;

          // Get all chunks for this base name
          const chunkNames = getChunkNames(baseName, cookies);
          if (chunkNames.length > 0) {
            const rawReassembled = chunkNames.map(cn => cookies[cn]).join('');
            const decodedValue = decodeCookieValue(rawReassembled);
            result.push({ name: baseName, value: decodedValue });

            // Mark all chunks and base name as processed
            chunkNames.forEach(cn => processedChunks.add(cn));
            processedChunks.add(baseName);
            continue;
          }
        }

        // Regular cookie (not chunked)
        const decodedValue = decodeCookieValue(value);
        result.push({ name, value: decodedValue });
        processedChunks.add(name);
      }

      log(`GET ALL cookies`, { count: result.length, names: result.map(c => c.name) });
      return result;
    },

    /**
     * Set all cookies (NEW INTERFACE - required by @supabase/ssr v0.8.0+)
     * This is the preferred method over get/set/remove
     */
    setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>): void {
      log(`SET ALL cookies`, { count: cookiesToSet.length, names: cookiesToSet.map(c => c.name) });

      for (const { name, value, options } of cookiesToSet) {
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
          log(`SET cookie: ${name}`, { type: 'single', valueLength: value.length });
          setCookie(name, value, options);
        } else {
          // Otherwise, chunk the value
          const chunks = chunkValue(value);
          log(`SET cookie: ${name}`, { type: 'chunked', chunks: chunks.length, totalLength: value.length });
          chunks.forEach((chunk, index) => {
            setCookie(`${name}${CHUNK_SEPARATOR}${index}`, chunk, options);
          });
        }
      }
    },

    // OLD INTERFACE (get/set/remove) COMPLETELY REMOVED
    //
    // Why: @supabase/ssr v0.8.0 was preferring the deprecated get/set/remove methods
    // over the new getAll/setAll interface, even when both were present.
    //
    // By removing the old methods entirely, we FORCE Supabase to use getAll/setAll,
    // which is the correct interface for v0.8.0+.
    //
    // This should finally make our cookie handlers work correctly!
  };
}
