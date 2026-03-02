import { useMemo } from 'react';
import type { SimulationInput, SimulationOutput, MonthlyRow, UnitEconomics } from './types';
import { INFRA_STEP_UPS } from './simulatorDefaults';

function calculateMonthly(input: SimulationInput): MonthlyRow[] {
  const { pricing, costs, growth, conversion, usage } = input;
  const rows: MonthlyRow[] = [];

  let free = Math.round(growth.initialUsers * 0.80);
  let pro = Math.round(growth.initialUsers * 0.15);
  let teams = Math.round(growth.initialUsers * 0.05);

  for (let m = 1; m <= 24; m++) {
    const seasonIdx = (m - 1) % 12;
    const seasonMul = growth.seasonality[seasonIdx] ?? 1.0;
    const total = free + pro + teams;

    // Growth
    const newUsers = Math.round(total * growth.monthlyGrowthRate * seasonMul);

    // Conversions from free
    const convPro = Math.round(free * conversion.freeToProRate);
    const convTeams = Math.round(free * conversion.freeToTeamsRate);

    // Churn
    const churnPro = Math.round(pro * conversion.proChurnRate);
    const churnTeams = Math.round(teams * conversion.teamsChurnRate);

    // Update cohorts — new users split 80/15/5 across tiers
    free = Math.max(0, free + Math.round(newUsers * 0.80) - convPro - convTeams);
    pro = Math.max(0, pro + Math.round(newUsers * 0.15) + convPro - churnPro);
    teams = Math.max(0, teams + Math.round(newUsers * 0.05) + convTeams - churnTeams);

    const totalEnd = free + pro + teams;

    // Revenue
    const mrr = pro * pricing.priceProBRL + teams * pricing.priceTeamsBRL;

    // Fixed costs
    let supabaseCost = costs.supabaseUSD;
    for (const [threshold, cost] of Object.entries(INFRA_STEP_UPS)) {
      if (totalEnd >= Number(threshold)) supabaseCost = cost;
    }
    const fixedUSD = supabaseCost + costs.cloudRunUSD + (totalEnd > 500 ? Math.ceil(totalEnd / 500) * 5 : 0);
    const fixedBRL = fixedUSD * costs.exchangeRate;

    // AI variable costs
    const totalCreditsConsumed =
      free * pricing.creditsFree * usage.avgCreditUtilization +
      pro * pricing.creditsPro * usage.avgCreditUtilization +
      teams * pricing.creditsTeams * usage.avgCreditUtilization;

    // 1 credit ≈ $0.0002 USD real cost (from COST_AUDIT formula)
    const aiCostUSD = totalCreditsConsumed * 0.0002 / 3; // divide by 3x margin to get real cost
    const aiCostBRL = aiCostUSD * costs.exchangeRate;

    const grossMargin = mrr - fixedBRL - aiCostBRL;
    const marginPct = mrr > 0 ? (grossMargin / mrr) * 100 : 0;

    rows.push({
      month: m,
      totalUsers: totalEnd,
      freeUsers: free,
      proUsers: pro,
      teamsUsers: teams,
      mrrBRL: Math.round(mrr * 100) / 100,
      fixedCostBRL: Math.round(fixedBRL * 100) / 100,
      aiCostBRL: Math.round(aiCostBRL * 100) / 100,
      grossMarginBRL: Math.round(grossMargin * 100) / 100,
      marginPct: Math.round(marginPct * 10) / 10,
    });
  }

  return rows;
}

function calculateUnitEconomics(input: SimulationInput, monthly: MonthlyRow[]): UnitEconomics {
  const { pricing, conversion, acquisition } = input;
  const lastMonth = monthly[monthly.length - 1];

  const ltvPro = conversion.proChurnRate > 0 ? pricing.priceProBRL / conversion.proChurnRate : 0;
  const ltvTeams = conversion.teamsChurnRate > 0 ? pricing.priceTeamsBRL / conversion.teamsChurnRate : 0;

  const payingUsers = lastMonth.proUsers + lastMonth.teamsUsers;
  const blendedLtv = payingUsers > 0
    ? (lastMonth.proUsers * ltvPro + lastMonth.teamsUsers * ltvTeams) / payingUsers
    : 0;

  const cacPayback = acquisition.cacBRL > 0 && pricing.priceProBRL > 0
    ? acquisition.cacBRL / pricing.priceProBRL
    : 0;

  const ltvCacRatio = acquisition.cacBRL > 0 ? blendedLtv / acquisition.cacBRL : 0;
  const mrr = lastMonth.mrrBRL;
  const arpu = payingUsers > 0 ? mrr / payingUsers : 0;

  return {
    ltvPro: Math.round(ltvPro),
    ltvTeams: Math.round(ltvTeams),
    cacPaybackMonths: Math.round(cacPayback * 10) / 10,
    ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
    mrr: Math.round(mrr),
    arr: Math.round(mrr * 12),
    arpu: Math.round(arpu * 100) / 100,
    ndr: 100, // placeholder until upgrade paths exist
    costPerCreditReal: 0.0002 / 3,
    costPerCreditCharged: 0.0002,
    freeSubsidyRatio: pricing.priceProBRL > 0
      ? Math.round(pricing.priceProBRL / (pricing.creditsFree * 0.0002 / 3 * input.costs.exchangeRate))
      : 0,
  };
}

/**
 * Pure function for use outside React components (e.g., inside loops in PricingScenariosTab).
 * Does NOT use hooks — safe to call anywhere.
 */
export function runSimulation(input: SimulationInput): SimulationOutput {
  const monthly = calculateMonthly(input);
  const unitEconomics = calculateUnitEconomics(input, monthly);
  const breakEvenMonth = monthly.find(r => r.grossMarginBRL > 0)?.month ?? null;
  return { monthly, unitEconomics, breakEvenMonth };
}

/**
 * React hook wrapper — memoizes simulation results based on input changes.
 */
export function useSimulation(input: SimulationInput): SimulationOutput {
  return useMemo(() => {
    return runSimulation(input);
  }, [input]);
}
