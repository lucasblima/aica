/**
 * Register All Domain Score Providers
 *
 * Called once during app initialization to wire all module scoring
 * providers into the scoring engine.
 */

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('registerAllProviders');

let registered = false;

export function registerAllDomainProviders(): void {
  if (registered) return;
  registered = true;

  log.info('Registering domain score providers...');

  try {
    // Import and register each module's provider.
    // Using dynamic imports to avoid circular dependencies.
    // Each import has its own .catch() so one missing module doesn't block the rest.
    import('@/modules/journey/services/journeyScoring').then((m) => {
      m.registerJourneyDomainProvider();
      log.debug('Journey provider registered');
    }).catch((err) => {
      log.warn('Journey provider not available:', err);
    });

    import('@/modules/atlas/services/atlasScoring').then((m) => {
      m.registerAtlasDomainProvider();
      log.debug('Atlas provider registered');
    }).catch((err) => {
      log.warn('Atlas provider not available:', err);
    });

    import('@/modules/finance/services/financialHealthScoring').then((m) => {
      m.registerFinanceDomainProvider();
      log.debug('Finance provider registered');
    }).catch((err) => {
      log.warn('Finance provider not available:', err);
    });

    import('@/modules/flux/services/fluxScoring').then((m) => {
      m.registerFluxDomainProvider();
      log.debug('Flux provider registered');
    }).catch((err) => {
      log.warn('Flux provider not available:', err);
    });

    log.info('All domain providers registration initiated');
  } catch (err) {
    log.error('Failed to register domain providers:', err);
  }
}
