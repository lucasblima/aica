import type { SimulationInput } from './types';

export const DEFAULT_SIMULATION: SimulationInput = {
  pricing: {
    priceProBRL: 39.90,
    priceTeamsBRL: 149.00,
    creditsFree: 500,
    creditsPro: 5000,
    creditsTeams: 20000,
  },
  costs: {
    supabaseUSD: 20,
    cloudRunUSD: 5,
    geminiFlashInputPer1M: 0.10,
    geminiFlashOutputPer1M: 0.40,
    geminiProInputPer1M: 1.25,
    geminiProOutputPer1M: 5.00,
    exchangeRate: 5.50,
  },
  growth: {
    initialUsers: 10,
    monthlyGrowthRate: 0.10,
    // Jan=1.0, Feb=0.9, ..., Dec=0.7 (holiday slowdown)
    seasonality: [1.0, 0.9, 1.0, 1.0, 1.1, 1.0, 0.8, 1.0, 1.0, 1.1, 1.0, 0.7],
  },
  conversion: {
    freeToProRate: 0.03,   // 3% of free users convert to Pro per month
    freeToTeamsRate: 0.01, // 1% to Teams
    proChurnRate: 0.05,    // 5% monthly
    teamsChurnRate: 0.03,  // 3% monthly
  },
  usage: {
    avgCreditUtilization: 0.50,
    flashVsProMix: 0.85,
    avgTokensPerInteraction: 1200,
  },
  acquisition: {
    cacBRL: 50,
    organicPct: 0.70,
  },
};

// Supabase tier step-ups: { userThreshold: monthlyUSD }
export const INFRA_STEP_UPS: Record<number, number> = {
  1000: 599, // Supabase Pro -> Team
  5000: 999, // Supabase Team -> Enterprise (estimated)
};
