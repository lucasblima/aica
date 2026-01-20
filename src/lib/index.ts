/**
 * Library barrel exports
 * ======================
 * Central export point for all utility modules.
 */

// Logger
export { logger, createNamespacedLogger, setLogLevel } from './logger';
export type { Logger, LogLevel } from './logger';

// Environment validation
export { validateEnv, logEnvStatus, isProductionReady } from './envCheck';
export type { EnvConfig, EnvValidationResult } from './envCheck';

// Animations
export * from './animations';

// Haptics
export * from './haptics';

// Supabase utilities
export * from './supabase';
