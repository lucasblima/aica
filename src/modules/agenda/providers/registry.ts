import type { TimelineProvider } from './types';

const providers: TimelineProvider[] = [];

export function registerTimelineProvider(provider: TimelineProvider): void {
  const existing = providers.findIndex(p => p.source === provider.source);
  if (existing >= 0) providers[existing] = provider;
  else providers.push(provider);
}

export function getTimelineProviders(): TimelineProvider[] {
  return [...providers];
}
