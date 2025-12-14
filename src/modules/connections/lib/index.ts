/**
 * Connections Library
 *
 * Utilitários, configurações e helpers para o módulo de Connections
 */

// Query configuration & caching
export {
  connectionQueryConfig,
  createPrefetchHelpers,
  createInvalidationHelpers,
} from './queryConfig';
export type { QueryConfig, PrefetchHelpers } from './queryConfig';

// Performance monitoring (DEV ONLY)
export {
  performanceMonitor,
  useRenderCount,
  useMountTime,
  useWhyDidYouUpdate,
  useEffectTime,
  reportWebVitals,
} from './performanceMonitor';
