import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

// Self-initializing module: Sentry.init() runs on first import.
// This is a top-level side effect so the bundler cannot tree-shake it.
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.PROD ? 'production' : 'development',
    enabled: import.meta.env.PROD,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5,
    beforeSend(event) {
      // Strip PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(bc => {
          if (bc.data?.url) {
            try {
              const url = new URL(bc.data.url);
              url.searchParams.delete('code');
              url.searchParams.delete('token');
              bc.data.url = url.toString();
            } catch { /* ignore invalid URLs */ }
          }
          return bc;
        });
      }
      return event;
    },
  });
} else if (import.meta.env.DEV) {
  console.debug('[Sentry] No DSN configured, skipping initialization');
}

/**
 * Sentry.ErrorBoundary — use this to wrap route-level components.
 * Captures React render errors automatically with full context.
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

export { Sentry };
