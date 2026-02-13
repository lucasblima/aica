/**
 * Environment Variable Validation for Production Builds
 * =====================================================
 *
 * This module provides runtime checks for environment variables and helpful
 * error messages to diagnose configuration issues in production.
 *
 * WHY THIS EXISTS:
 * Vite replaces import.meta.env.VITE_* at compile time. If these variables
 * are not set during the build process (npm run build), they become undefined
 * in the production bundle, causing runtime failures.
 *
 * USAGE:
 * Import and call validateEnv() early in your app initialization (e.g., main.tsx)
 */

export interface EnvConfig {
  // Required - without these, core functionality breaks
  supabaseUrl: string;
  supabaseAnonKey: string;

  // Optional but recommended
  frontendUrl?: string;
  /** @deprecated VITE_GEMINI_API_KEY is no longer used. All Gemini API calls now go through Edge Functions. */
  geminiApiKey?: string;
  googleOAuthClientId?: string;

  // Optional services
  pdfExtractorUrl?: string;
  n8nWebhookUrl?: string;
  apiUrl?: string;
}

export interface EnvValidationResult {
  isValid: boolean;
  config: EnvConfig;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that required environment variables are set.
 * Logs errors/warnings to console and returns validation result.
 */
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('EnvCheck');

export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const config: EnvConfig = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    frontendUrl: import.meta.env.VITE_FRONTEND_URL,
    geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
    googleOAuthClientId: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
    pdfExtractorUrl: import.meta.env.VITE_PDF_EXTRACTOR_URL,
    n8nWebhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL,
    apiUrl: import.meta.env.VITE_API_URL,
  };

  // =========================================================================
  // REQUIRED VARIABLES - These cause critical failures if missing
  // =========================================================================

  if (!config.supabaseUrl) {
    errors.push(
      'VITE_SUPABASE_URL is not configured. ' +
        'Authentication and database operations will fail. ' +
        'Ensure this is set in cloudbuild.yaml substitutions.'
    );
  } else if (!config.supabaseUrl.startsWith('https://')) {
    warnings.push(
      'VITE_SUPABASE_URL should start with https:// for security. ' +
        `Current value: ${config.supabaseUrl}`
    );
  }

  if (!config.supabaseAnonKey) {
    errors.push(
      'VITE_SUPABASE_ANON_KEY is not configured. ' +
        'Authentication will fail with 401 errors. ' +
        'Ensure this is set in cloudbuild.yaml substitutions.'
    );
  }

  // =========================================================================
  // RECOMMENDED VARIABLES - Features may be limited without these
  // =========================================================================

  // NOTE: VITE_GEMINI_API_KEY is DEPRECATED - All Gemini API calls now use Edge Functions
  // The API key is stored securely in Supabase Edge Function secrets, not in the frontend.
  // No warning is needed for missing VITE_GEMINI_API_KEY as it's no longer required.

  if (!config.frontendUrl && import.meta.env.PROD) {
    warnings.push(
      'VITE_FRONTEND_URL is not configured in production. ' +
        'OAuth redirects may not work correctly.'
    );
  }

  // =========================================================================
  // LOG RESULTS
  // =========================================================================

  const isValid = errors.length === 0;

  if (errors.length > 0) {
    log.error('CRITICAL ERRORS - Application may not function correctly:');
    errors.forEach((err, i) => log.error(`  ${i + 1}. ${err}`));
  }

  if (warnings.length > 0) {
    log.warn('Warnings - Some features may be limited:');
    warnings.forEach((warn, i) => log.warn(`  ${i + 1}. ${warn}`));
  }

  if (isValid && warnings.length === 0) {
    log.info('All environment variables are properly configured.');
  }

  return {
    isValid,
    config,
    errors,
    warnings,
  };
}

/**
 * Logs the current environment configuration status.
 * Useful for debugging deployment issues.
 *
 * NOTE: This masks sensitive values by only showing if they are set or not.
 */
export function logEnvStatus(): void {
  const mode = import.meta.env.MODE;
  const isProd = import.meta.env.PROD;

  log.info('Environment Configuration Status:');
  log.info(`  Mode: ${mode} (${isProd ? 'PRODUCTION' : 'DEVELOPMENT'})`);
  log.info('  Required Variables:');
  log.info(`    VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING'}`);
  log.info(`    VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'}`);
  log.info('  Optional Variables:');
  log.info(`    VITE_GEMINI_API_KEY: ${import.meta.env.VITE_GEMINI_API_KEY ? 'SET (DEPRECATED)' : 'NOT SET (OK - uses Edge Functions)'}`);
  log.info(`    VITE_FRONTEND_URL: ${import.meta.env.VITE_FRONTEND_URL || 'NOT SET'}`);
  log.info(`    VITE_GOOGLE_OAUTH_CLIENT_ID: ${import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ? 'SET' : 'NOT SET'}`);
  log.info(`    VITE_PDF_EXTRACTOR_URL: ${import.meta.env.VITE_PDF_EXTRACTOR_URL || 'NOT SET'}`);
  log.info(`    VITE_N8N_WEBHOOK_URL: ${import.meta.env.VITE_N8N_WEBHOOK_URL ? 'SET' : 'NOT SET'}`);
}

/**
 * Quick check if the app is properly configured for production.
 * Returns true if all required variables are set.
 */
export function isProductionReady(): boolean {
  return !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}
