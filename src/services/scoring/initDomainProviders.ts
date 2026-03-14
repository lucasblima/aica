/**
 * Domain Provider Registration — called once on app init.
 * Registers all module scoring providers with the scoring engine.
 */
import { registerFluxDomainProvider } from '@/modules/flux/services/fluxScoring'
import { registerJourneyDomainProvider } from '@/modules/journey/services/journeyScoring'
import { registerStudioDomainProvider } from '@/modules/studio/services/studioScoring'
import { registerGrantsDomainProvider } from '@/modules/grants/services/grantsScoring'

let initialized = false

export function initDomainProviders(): void {
  if (initialized) return
  registerFluxDomainProvider()
  registerJourneyDomainProvider()
  registerStudioDomainProvider()
  registerGrantsDomainProvider()
  // TODO: Atlas, Connections, Finance scoring providers not yet implemented (4/7 domains active)
  initialized = true
}
