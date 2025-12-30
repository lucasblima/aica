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
  geminiApiKey?: string;
  googleOAuthClientId?: string;

  // Optional services
  pdfExtractorUrl?: string;
  n8nWebhookUrl?: string;
  evolutionInstanceName?: string;
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
    evolutionInstanceName: import.meta.env.VITE_EVOLUTION_INSTANCE_NAME,
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

  if (!config.geminiApiKey) {
    warnings.push(
      'VITE_GEMINI_API_KEY is not configured. ' +
        'AI-powered features will be limited or unavailable.'
    );
  }

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
    console.error(
      '%c[ENV] CRITICAL ERRORS - Application may not function correctly:',
      'color: red; font-weight: bold'
    );
    errors.forEach((err, i) => console.error(`  ${i + 1}. ${err}`));
  }

  if (warnings.length > 0) {
    console.warn(
      '%c[ENV] Warnings - Some features may be limited:',
      'color: orange; font-weight: bold'
    );
    warnings.forEach((warn, i) => console.warn(`  ${i + 1}. ${warn}`));
  }

  if (isValid && warnings.length === 0) {
    console.log(
      '%c[ENV] All environment variables are properly configured.',
      'color: green'
    );
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

  console.log('%c[ENV] Environment Configuration Status:', 'font-weight: bold');
  console.log(`  Mode: ${mode} (${isProd ? 'PRODUCTION' : 'DEVELOPMENT'})`);
  console.log('');
  console.log('  Required Variables:');
  console.log(
    `    VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING'}`
  );
  console.log(
    `    VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'}`
  );
  console.log('');
  console.log('  Optional Variables:');
  console.log(
    `    VITE_GEMINI_API_KEY: ${import.meta.env.VITE_GEMINI_API_KEY ? 'SET' : 'NOT SET'}`
  );
  console.log(
    `    VITE_FRONTEND_URL: ${import.meta.env.VITE_FRONTEND_URL || 'NOT SET'}`
  );
  console.log(
    `    VITE_GOOGLE_OAUTH_CLIENT_ID: ${import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ? 'SET' : 'NOT SET'}`
  );
  console.log(
    `    VITE_PDF_EXTRACTOR_URL: ${import.meta.env.VITE_PDF_EXTRACTOR_URL || 'NOT SET'}`
  );
  console.log(
    `    VITE_N8N_WEBHOOK_URL: ${import.meta.env.VITE_N8N_WEBHOOK_URL ? 'SET' : 'NOT SET'}`
  );
  console.log(
    `    VITE_EVOLUTION_INSTANCE_NAME: ${import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || 'NOT SET'}`
  );
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
