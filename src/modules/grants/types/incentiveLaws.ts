/**
 * Incentive Laws - TypeScript Types
 * Issue #96 - Cadastro de leis de incentivo fiscal
 *
 * @module modules/grants/types/incentiveLaws
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Jurisdicao da lei de incentivo */
export type Jurisdiction = 'federal' | 'state' | 'municipal';

/** Tipo de imposto */
export type TaxType = 'IR' | 'ICMS' | 'ISS' | 'IPTU' | 'mixed';

/** Labels para jurisdicao */
export const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
  federal: 'Federal',
  state: 'Estadual',
  municipal: 'Municipal',
};

/** Labels para tipo de imposto */
export const TAX_TYPE_LABELS: Record<TaxType, string> = {
  IR: 'Imposto de Renda',
  ICMS: 'ICMS',
  ISS: 'ISS',
  IPTU: 'IPTU',
  mixed: 'Misto',
};

/** Cores por jurisdicao para UI */
export const JURISDICTION_COLORS: Record<Jurisdiction, string> = {
  federal: '#2563eb', // blue-600
  state: '#7c3aed', // violet-600
  municipal: '#059669', // emerald-600
};

/** Cores por tipo de imposto para UI */
export const TAX_TYPE_COLORS: Record<TaxType, string> = {
  IR: '#dc2626', // red-600
  ICMS: '#ea580c', // orange-600
  ISS: '#0891b2', // cyan-600
  IPTU: '#16a34a', // green-600
  mixed: '#6b7280', // gray-500
};

// =============================================================================
// MAIN ENTITY
// =============================================================================

/**
 * Lei de Incentivo Fiscal
 *
 * Representa uma lei de incentivo fiscal (Rouanet, ProAC, ISS-RJ, etc.)
 */
export interface IncentiveLaw {
  id: string;

  // Identificacao
  name: string;
  short_name: string;
  official_name: string | null;
  law_number: string | null;

  // Jurisdicao
  jurisdiction: Jurisdiction;
  state: string | null;
  city: string | null;

  // Beneficios Fiscais
  tax_type: TaxType;
  max_deduction_percentage: number | null;
  max_project_value: number | null;
  min_counterpart_percentage: number | null;

  // Elegibilidade
  eligible_company_types: string[];
  eligible_project_types: string[];
  eligible_proponent_types: string[];

  // Processo
  approval_entity: string | null;
  approval_process_description: string | null;
  average_approval_days: number | null;

  // Datas importantes
  fiscal_year_deadline: string | null;

  // Conteudo para IA
  description: string | null;
  benefits_summary: string | null;
  how_it_works: string | null;
  common_questions: Record<string, string>;

  // Links e referencias
  official_url: string | null;
  regulation_url: string | null;

  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/**
 * Filtros para busca de leis de incentivo
 */
export interface IncentiveLawFilters {
  jurisdiction?: Jurisdiction;
  tax_type?: TaxType;
  state?: string;
  city?: string;
  is_active?: boolean;
  search?: string;
}

/**
 * Opcoes de ordenacao
 */
export type IncentiveLawSortField =
  | 'name'
  | 'short_name'
  | 'jurisdiction'
  | 'tax_type'
  | 'max_deduction_percentage'
  | 'created_at';

export interface IncentiveLawSortOptions {
  field: IncentiveLawSortField;
  direction: 'asc' | 'desc';
}

// =============================================================================
// DTO TYPES
// =============================================================================

/**
 * Payload para criar uma lei de incentivo (admin only)
 */
export interface CreateIncentiveLawDTO {
  name: string;
  short_name: string;
  official_name?: string;
  law_number?: string;
  jurisdiction: Jurisdiction;
  state?: string;
  city?: string;
  tax_type: TaxType;
  max_deduction_percentage?: number;
  max_project_value?: number;
  min_counterpart_percentage?: number;
  eligible_company_types?: string[];
  eligible_project_types?: string[];
  eligible_proponent_types?: string[];
  approval_entity?: string;
  approval_process_description?: string;
  average_approval_days?: number;
  fiscal_year_deadline?: string;
  description?: string;
  benefits_summary?: string;
  how_it_works?: string;
  common_questions?: Record<string, string>;
  official_url?: string;
  regulation_url?: string;
  is_active?: boolean;
}

/**
 * Payload para atualizar uma lei de incentivo (admin only)
 */
export type UpdateIncentiveLawDTO = Partial<CreateIncentiveLawDTO>;

// =============================================================================
// VIEW MODELS (para UI)
// =============================================================================

/**
 * Resumo de lei para listas e selectors
 */
export interface IncentiveLawSummary {
  id: string;
  name: string;
  short_name: string;
  jurisdiction: Jurisdiction;
  tax_type: TaxType;
  state: string | null;
  city: string | null;
  max_deduction_percentage: number | null;
  is_active: boolean;
}

/**
 * Lei formatada para exibicao em card
 */
export interface IncentiveLawCardData {
  id: string;
  short_name: string;
  name: string;
  law_number: string | null;
  jurisdiction: Jurisdiction;
  jurisdictionLabel: string;
  location: string; // "Federal" | "SP" | "Rio de Janeiro - RJ"
  tax_type: TaxType;
  taxTypeLabel: string;
  deductionLabel: string; // "Ate 4% do IR" | "Variavel"
  benefits_summary: string | null;
  official_url: string | null;
  jurisdictionColor: string;
  taxTypeColor: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Formata a localizacao da lei para exibicao
 */
export function formatLawLocation(law: Pick<IncentiveLaw, 'jurisdiction' | 'state' | 'city'>): string {
  if (law.jurisdiction === 'federal') {
    return 'Federal';
  }
  if (law.jurisdiction === 'municipal' && law.city && law.state) {
    return `${law.city} - ${law.state}`;
  }
  if (law.jurisdiction === 'state' && law.state) {
    return law.state;
  }
  return JURISDICTION_LABELS[law.jurisdiction];
}

/**
 * Formata o percentual de deducao para exibicao
 */
export function formatDeductionPercentage(
  law: Pick<IncentiveLaw, 'max_deduction_percentage' | 'tax_type'>
): string {
  if (law.max_deduction_percentage == null) {
    return 'Variavel';
  }
  return `Ate ${law.max_deduction_percentage}% do ${law.tax_type}`;
}

/**
 * Converte IncentiveLaw para IncentiveLawCardData
 */
export function toCardData(law: IncentiveLaw): IncentiveLawCardData {
  return {
    id: law.id,
    short_name: law.short_name,
    name: law.name,
    law_number: law.law_number,
    jurisdiction: law.jurisdiction,
    jurisdictionLabel: JURISDICTION_LABELS[law.jurisdiction],
    location: formatLawLocation(law),
    tax_type: law.tax_type,
    taxTypeLabel: TAX_TYPE_LABELS[law.tax_type],
    deductionLabel: formatDeductionPercentage(law),
    benefits_summary: law.benefits_summary,
    official_url: law.official_url,
    jurisdictionColor: JURISDICTION_COLORS[law.jurisdiction],
    taxTypeColor: TAX_TYPE_COLORS[law.tax_type],
  };
}

/**
 * Converte IncentiveLaw para IncentiveLawSummary
 */
export function toSummary(law: IncentiveLaw): IncentiveLawSummary {
  return {
    id: law.id,
    name: law.name,
    short_name: law.short_name,
    jurisdiction: law.jurisdiction,
    tax_type: law.tax_type,
    state: law.state,
    city: law.city,
    max_deduction_percentage: law.max_deduction_percentage,
    is_active: law.is_active,
  };
}
