import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.debug('[Sentry] No DSN configured, skipping initialization');
    }
    return;
  }

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
}

export { Sentry };
