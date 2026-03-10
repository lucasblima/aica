/**
 * Timeline Provider Registration
 *
 * Import this module at app startup to register all cross-module
 * timeline providers (Flux, Finance, Studio) with the agenda registry.
 * This enables useTimeline to aggregate events from all modules.
 */

import { registerTimelineProvider } from './registry';
import { fluxProvider } from './fluxProvider';
import { financeProvider } from './financeProvider';
import { studioProvider } from './studioProvider';

registerTimelineProvider(fluxProvider);
registerTimelineProvider(financeProvider);
registerTimelineProvider(studioProvider);
