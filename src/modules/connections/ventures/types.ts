/**
 * Ventures Archetype - Type Definitions
 *
 * Types for the Ventures archetype: business entities, metrics, milestones, and stakeholders.
 * Ventures is the "Motor de Criação" - cockpit of professional ambition.
 */

// ============================================================================
// ENUMS & UNION TYPES
// ============================================================================

export type EntityType = 'MEI' | 'EIRELI' | 'LTDA' | 'SA' | 'SLU' | 'STARTUP' | 'NONPROFIT';

export type PeriodType = 'monthly' | 'quarterly' | 'yearly';

export type MilestoneCategory = 'produto' | 'financeiro' | 'equipe' | 'legal' | 'mercado' | 'tecnologia';

export type MilestoneStatus = 'pending' | 'in_progress' | 'achieved' | 'missed' | 'cancelled';

export type MilestonePriority = 'low' | 'medium' | 'high' | 'critical';

export type StakeholderType = 'founder' | 'co-founder' | 'investor' | 'advisor' | 'employee' | 'contractor' | 'board';

export type ShareClass = 'common' | 'preferred';

export type VestingSchedule = 'monthly' | 'quarterly' | 'yearly';

export type InvestmentRound = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'bridge';

export type InvestmentInstrument = 'equity' | 'safe' | 'convertible-note';

export type EmploymentType = 'full-time' | 'part-time' | 'contractor' | 'advisor';

// ============================================================================
// MAIN INTERFACES
// ============================================================================

/**
 * Business Entity - Legal structure and company information
 */
export interface VenturesEntity {
  id: string;
  space_id: string;

  // Legal information
  legal_name: string;
  trading_name?: string;
  cnpj?: string;
  entity_type?: EntityType;

  // Contact information
  email?: string;
  phone?: string;
  website?: string;

  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  // Business classification
  founded_at?: string; // ISO date
  sector?: string;
  subsector?: string;

  // Status
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Financial Metrics - KPIs and business health indicators
 */
export interface VenturesMetrics {
  id: string;
  entity_id: string;

  // Period information
  period_type: PeriodType;
  period_start: string; // ISO date
  period_end: string; // ISO date

  // Revenue metrics
  mrr?: number; // Monthly Recurring Revenue
  arr?: number; // Annual Recurring Revenue
  total_revenue?: number;

  // Expense metrics
  total_expenses?: number;
  payroll?: number;
  operational?: number;
  marketing?: number;

  // Cash flow & runway
  burn_rate?: number; // Monthly cash burn
  cash_balance?: number; // Current cash on hand
  runway_months?: number; // Months until cash runs out

  // Profitability
  gross_margin_pct?: number; // Percentage
  net_margin_pct?: number; // Percentage
  ebitda?: number;

  // Customer metrics
  active_customers?: number;
  new_customers?: number;
  churned_customers?: number;
  churn_rate_pct?: number;

  // Unit economics
  cac?: number; // Customer Acquisition Cost
  ltv?: number; // Lifetime Value
  ltv_cac_ratio?: number; // LTV/CAC ratio

  // Team metrics
  employee_count?: number;
  contractor_count?: number;

  // Flags
  is_current: boolean; // Is this the current period?
  is_projected: boolean; // Is this a projection/forecast?

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Milestone - Product, financial, and team goals
 */
export interface VenturesMilestone {
  id: string;
  entity_id: string;

  // Milestone details
  title: string;
  description?: string;
  category?: MilestoneCategory;

  // Target information
  target_date?: string; // ISO date
  target_value?: number; // Numeric target
  target_metric?: string; // What is being measured
  target_unit?: string; // Unit of measurement

  // Progress tracking
  current_value?: number;
  progress_pct: number; // 0-100

  // Status
  status: MilestoneStatus;
  achieved_at?: string; // ISO timestamp

  // Priority
  priority: MilestonePriority;

  // Dependencies
  depends_on_milestone_id?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Stakeholder - Founders, investors, advisors, team members
 */
export interface VenturesStakeholder {
  id: string;
  entity_id: string;
  member_id?: string; // Reference to connection_members

  // Stakeholder type
  stakeholder_type: StakeholderType;
  role_title?: string; // Job title

  // Equity information
  equity_pct?: number; // Percentage of ownership
  shares_count?: number; // Number of shares
  share_class?: ShareClass;

  // Vesting
  vesting_start_date?: string; // ISO date
  vesting_cliff_months?: number; // Months until first vesting
  vesting_period_months?: number; // Total vesting period
  vesting_schedule?: VestingSchedule;

  // Investment information (for investors)
  investment_amount?: number;
  investment_date?: string; // ISO date
  investment_round?: InvestmentRound;
  investment_instrument?: InvestmentInstrument;

  // Employment information
  employment_type?: EmploymentType;
  start_date?: string; // ISO date
  end_date?: string; // ISO date
  salary?: number;

  // Contact & bio
  bio?: string;
  linkedin_url?: string;

  // Status
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DTOs (DATA TRANSFER OBJECTS / PAYLOADS)
// ============================================================================

/**
 * Payload for creating a new ventures entity
 */
export interface CreateEntityPayload {
  space_id: string;
  legal_name: string;
  trading_name?: string;
  cnpj?: string;
  entity_type?: EntityType;
  email?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  founded_at?: string; // ISO date
  sector?: string;
  subsector?: string;
}

/**
 * Payload for updating a ventures entity
 */
export interface UpdateEntityPayload {
  legal_name?: string;
  trading_name?: string;
  cnpj?: string;
  entity_type?: EntityType;
  email?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  founded_at?: string; // ISO date
  sector?: string;
  subsector?: string;
  is_active?: boolean;
}

/**
 * Payload for creating metrics
 */
export interface CreateMetricsPayload {
  entity_id: string;
  period_type: PeriodType;
  period_start: string; // ISO date
  period_end: string; // ISO date
  mrr?: number;
  arr?: number;
  total_revenue?: number;
  total_expenses?: number;
  payroll?: number;
  operational?: number;
  marketing?: number;
  burn_rate?: number;
  cash_balance?: number;
  runway_months?: number;
  gross_margin_pct?: number;
  net_margin_pct?: number;
  ebitda?: number;
  active_customers?: number;
  new_customers?: number;
  churned_customers?: number;
  churn_rate_pct?: number;
  cac?: number;
  ltv?: number;
  ltv_cac_ratio?: number;
  employee_count?: number;
  contractor_count?: number;
  is_current?: boolean;
  is_projected?: boolean;
}

/**
 * Payload for updating metrics
 */
export interface UpdateMetricsPayload {
  mrr?: number;
  arr?: number;
  total_revenue?: number;
  total_expenses?: number;
  payroll?: number;
  operational?: number;
  marketing?: number;
  burn_rate?: number;
  cash_balance?: number;
  runway_months?: number;
  gross_margin_pct?: number;
  net_margin_pct?: number;
  ebitda?: number;
  active_customers?: number;
  new_customers?: number;
  churned_customers?: number;
  churn_rate_pct?: number;
  cac?: number;
  ltv?: number;
  ltv_cac_ratio?: number;
  employee_count?: number;
  contractor_count?: number;
  is_current?: boolean;
  is_projected?: boolean;
}

/**
 * Payload for creating a milestone
 */
export interface CreateMilestonePayload {
  entity_id: string;
  title: string;
  description?: string;
  category?: MilestoneCategory;
  target_date?: string; // ISO date
  target_value?: number;
  target_metric?: string;
  target_unit?: string;
  current_value?: number;
  progress_pct?: number;
  status?: MilestoneStatus;
  priority?: MilestonePriority;
  depends_on_milestone_id?: string;
}

/**
 * Payload for updating a milestone
 */
export interface UpdateMilestonePayload {
  title?: string;
  description?: string;
  category?: MilestoneCategory;
  target_date?: string; // ISO date
  target_value?: number;
  target_metric?: string;
  target_unit?: string;
  current_value?: number;
  progress_pct?: number;
  status?: MilestoneStatus;
  achieved_at?: string; // ISO timestamp
  priority?: MilestonePriority;
  depends_on_milestone_id?: string;
}

/**
 * Payload for creating a stakeholder
 */
export interface CreateStakeholderPayload {
  entity_id: string;
  member_id?: string;
  stakeholder_type: StakeholderType;
  role_title?: string;
  equity_pct?: number;
  shares_count?: number;
  share_class?: ShareClass;
  vesting_start_date?: string; // ISO date
  vesting_cliff_months?: number;
  vesting_period_months?: number;
  vesting_schedule?: VestingSchedule;
  investment_amount?: number;
  investment_date?: string; // ISO date
  investment_round?: InvestmentRound;
  investment_instrument?: InvestmentInstrument;
  employment_type?: EmploymentType;
  start_date?: string; // ISO date
  end_date?: string; // ISO date
  salary?: number;
  bio?: string;
  linkedin_url?: string;
}

/**
 * Payload for updating a stakeholder
 */
export interface UpdateStakeholderPayload {
  stakeholder_type?: StakeholderType;
  role_title?: string;
  equity_pct?: number;
  shares_count?: number;
  share_class?: ShareClass;
  vesting_start_date?: string; // ISO date
  vesting_cliff_months?: number;
  vesting_period_months?: number;
  vesting_schedule?: VestingSchedule;
  investment_amount?: number;
  investment_date?: string; // ISO date
  investment_round?: InvestmentRound;
  investment_instrument?: InvestmentInstrument;
  employment_type?: EmploymentType;
  start_date?: string; // ISO date
  end_date?: string; // ISO date
  salary?: number;
  bio?: string;
  linkedin_url?: string;
  is_active?: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Business health status based on runway and burn rate
 */
export type HealthStatus = 'healthy' | 'warning' | 'critical';

/**
 * Helper function to calculate health status
 */
export function calculateHealthStatus(runwayMonths?: number): HealthStatus {
  if (!runwayMonths) return 'warning';
  if (runwayMonths >= 12) return 'healthy';
  if (runwayMonths >= 6) return 'warning';
  return 'critical';
}

/**
 * Format currency for display
 */
export function formatCurrency(value?: number, currency: string = 'BRL'): string {
  if (value === undefined || value === null) return '-';

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return formatter.format(value);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value?: number): string {
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(1)}%`;
}

/**
 * Format number with abbreviation (K, M, B)
 */
export function formatNumberAbbreviated(value?: number): string {
  if (value === undefined || value === null) return '-';

  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}
