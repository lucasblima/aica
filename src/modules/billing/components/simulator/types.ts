export interface PricingVars {
  priceProBRL: number;
  priceTeamsBRL: number;
  creditsFree: number;
  creditsPro: number;
  creditsTeams: number;
}

export interface CostVars {
  supabaseUSD: number;
  cloudRunUSD: number;
  geminiFlashInputPer1M: number;
  geminiFlashOutputPer1M: number;
  geminiProInputPer1M: number;
  geminiProOutputPer1M: number;
  exchangeRate: number; // BRL per USD
}

export interface GrowthVars {
  initialUsers: number;
  monthlyGrowthRate: number; // 0.10 = 10%
  seasonality: number[]; // 12 multipliers, index 0 = January
}

export interface ConversionVars {
  freeToProRate: number;
  freeToTeamsRate: number;
  proChurnRate: number;
  teamsChurnRate: number;
}

export interface UsageVars {
  avgCreditUtilization: number; // 0.50 = 50%
  flashVsProMix: number; // 0.85 = 85% Flash
  avgTokensPerInteraction: number;
}

export interface AcquisitionVars {
  cacBRL: number;
  organicPct: number; // 0.70 = 70% organic
}

export interface SimulationInput {
  pricing: PricingVars;
  costs: CostVars;
  growth: GrowthVars;
  conversion: ConversionVars;
  usage: UsageVars;
  acquisition: AcquisitionVars;
}

export interface MonthlyRow {
  month: number;
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  teamsUsers: number;
  mrrBRL: number;
  fixedCostBRL: number;
  aiCostBRL: number;
  grossMarginBRL: number;
  marginPct: number;
}

export interface UnitEconomics {
  ltvPro: number;
  ltvTeams: number;
  cacPaybackMonths: number;
  ltvCacRatio: number;
  mrr: number;
  arr: number;
  arpu: number;
  ndr: number;
  costPerCreditReal: number;
  costPerCreditCharged: number;
  freeSubsidyRatio: number;
}

export interface Scenario {
  name: string;
  priceProBRL: number;
  creditsProMonthly: number;
  priceTeamsBRL: number;
  creditsTeamsMonthly: number;
  mrrMonth12: number;
  mrrMonth24: number;
  breakEvenMonth: number | null;
  marginMonth24: number;
  ltvCacRatio: number;
  mrrTimeline: number[]; // 24 values
}

export interface SimulationOutput {
  monthly: MonthlyRow[];
  unitEconomics: UnitEconomics;
  breakEvenMonth: number | null;
}
