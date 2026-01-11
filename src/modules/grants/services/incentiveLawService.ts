/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Incentive Law Service
 * Issue #96 - Cadastro de leis de incentivo fiscal
 *
 * Servico para gerenciamento de leis de incentivo fiscal (Rouanet, ProAC, etc.)
 * - CRUD operations (leitura publica, escrita admin)
 * - Filtros por jurisdicao, tipo de imposto, estado
 * - Formatacao para contexto de IA (prompts)
 *
 * @module modules/grants/services/incentiveLawService
 */

import { supabase } from '../../../services/supabaseClient';
import type {
  IncentiveLaw,
  IncentiveLawFilters,
  IncentiveLawSortOptions,
  CreateIncentiveLawDTO,
  UpdateIncentiveLawDTO,
  IncentiveLawSummary,
  toSummary,
} from '../types/incentiveLaws';

// =============================================================================
// READ OPERATIONS (Public)
// =============================================================================

/**
 * Busca todas as leis de incentivo ativas
 *
 * @param filters - Filtros opcionais
 * @param sort - Ordenacao opcional
 * @returns Lista de leis de incentivo
 */
export async function getIncentiveLaws(
  filters?: IncentiveLawFilters,
  sort?: IncentiveLawSortOptions
): Promise<IncentiveLaw[]> {
  try {
    let query = supabase
      .from('incentive_laws')
      .select('*');

    // Aplicar filtros
    if (filters?.jurisdiction) {
      query = query.eq('jurisdiction', filters.jurisdiction);
    }
    if (filters?.tax_type) {
      query = query.eq('tax_type', filters.tax_type);
    }
    if (filters?.state) {
      query = query.eq('state', filters.state);
    }
    if (filters?.city) {
      query = query.eq('city', filters.city);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    } else {
      // Por padrao, retorna apenas leis ativas
      query = query.eq('is_active', true);
    }
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(
        `name.ilike.${searchTerm},short_name.ilike.${searchTerm},description.ilike.${searchTerm}`
      );
    }

    // Aplicar ordenacao
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      // Ordenacao padrao por nome
      query = query.order('name', { ascending: true });
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as IncentiveLaw[];
  } catch (error) {
    console.error('[IncentiveLawService] Erro ao buscar leis:', error);
    throw new Error(`Falha ao buscar leis de incentivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Busca uma lei de incentivo especifica pelo ID
 *
 * @param id - ID da lei
 * @returns Lei de incentivo ou null
 */
export async function getIncentiveLawById(id: string): Promise<IncentiveLaw | null> {
  try {
    const { data, error } = await supabase
      .from('incentive_laws')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return data as IncentiveLaw;
  } catch (error) {
    console.error('[IncentiveLawService] Erro ao buscar lei por ID:', error);
    throw new Error(`Falha ao buscar lei: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Busca uma lei de incentivo pelo short_name (ex: "Rouanet", "ProAC")
 *
 * @param shortName - Nome curto da lei
 * @returns Lei de incentivo ou null
 */
export async function getIncentiveLawByShortName(shortName: string): Promise<IncentiveLaw | null> {
  try {
    const { data, error } = await supabase
      .from('incentive_laws')
      .select('*')
      .ilike('short_name', shortName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as IncentiveLaw;
  } catch (error) {
    console.error('[IncentiveLawService] Erro ao buscar lei por short_name:', error);
    throw new Error(`Falha ao buscar lei: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Busca leis por jurisdicao
 *
 * @param jurisdiction - 'federal' | 'state' | 'municipal'
 * @returns Lista de leis nessa jurisdicao
 */
export async function getIncentiveLawsByJurisdiction(
  jurisdiction: IncentiveLaw['jurisdiction']
): Promise<IncentiveLaw[]> {
  return getIncentiveLaws({ jurisdiction, is_active: true });
}

/**
 * Busca leis por tipo de imposto
 *
 * @param taxType - 'IR' | 'ICMS' | 'ISS' | 'IPTU' | 'mixed'
 * @returns Lista de leis com esse tipo de imposto
 */
export async function getIncentiveLawsByTaxType(
  taxType: IncentiveLaw['tax_type']
): Promise<IncentiveLaw[]> {
  return getIncentiveLaws({ tax_type: taxType, is_active: true });
}

/**
 * Busca leis por estado (para leis estaduais e municipais)
 *
 * @param state - Sigla do estado (ex: "SP", "RJ")
 * @returns Lista de leis nesse estado
 */
export async function getIncentiveLawsByState(state: string): Promise<IncentiveLaw[]> {
  return getIncentiveLaws({ state, is_active: true });
}

/**
 * Retorna lista resumida de leis para uso em selectors/dropdowns
 *
 * @returns Lista de resumos de leis
 */
export async function getIncentiveLawSummaries(): Promise<IncentiveLawSummary[]> {
  try {
    const { data, error } = await supabase
      .from('incentive_laws')
      .select('id, name, short_name, jurisdiction, tax_type, state, city, max_deduction_percentage, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data as IncentiveLawSummary[];
  } catch (error) {
    console.error('[IncentiveLawService] Erro ao buscar resumos:', error);
    throw new Error(`Falha ao buscar resumos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// =============================================================================
// AI CONTEXT (for prompts)
// =============================================================================

/**
 * Busca o contexto formatado de uma lei para uso em prompts de IA
 *
 * Usa a funcao SQL get_incentive_law_ai_context para gerar
 * texto estruturado para inclusao em prompts.
 *
 * @param lawId - ID da lei
 * @returns Texto formatado para contexto de IA
 */
export async function getIncentiveLawAIContext(lawId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_incentive_law_ai_context', { law_id: lawId });

    if (error) throw error;
    return data as string | null;
  } catch (error) {
    console.error('[IncentiveLawService] Erro ao buscar contexto AI:', error);
    // Fallback: buscar a lei e formatar manualmente
    try {
      const law = await getIncentiveLawById(lawId);
      if (!law) return null;
      return formatLawForAIContext(law);
    } catch {
      throw new Error(`Falha ao buscar contexto AI: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}

/**
 * Formata uma lei para contexto de IA (fallback client-side)
 *
 * @param law - Lei de incentivo
 * @returns Texto formatado
 */
export function formatLawForAIContext(law: IncentiveLaw): string {
  const location = law.jurisdiction === 'federal'
    ? 'Federal'
    : law.jurisdiction === 'municipal' && law.city
      ? `${law.city} - ${law.state}`
      : law.state || 'N/A';

  return `=== LEI DE INCENTIVO FISCAL ===
Nome: ${law.name} (${law.short_name})
Lei: ${law.law_number || 'N/A'}
Jurisdicao: ${law.jurisdiction} - ${location}
Tipo de Imposto: ${law.tax_type}
Deducao Maxima: ${law.max_deduction_percentage != null ? `${law.max_deduction_percentage}%` : 'Variavel'}

DESCRICAO:
${law.description || 'Sem descricao disponivel'}

COMO FUNCIONA:
${law.how_it_works || 'Sem informacoes sobre o processo'}

BENEFICIOS PARA PATROCINADORES:
${law.benefits_summary || 'Consulte o site oficial'}

ORGAO RESPONSAVEL: ${law.approval_entity || 'N/A'}
SITE OFICIAL: ${law.official_url || 'N/A'}
=== FIM DA LEI ===`;
}

/**
 * Busca contexto de multiplas leis para uso em prompts
 *
 * @param lawIds - Array de IDs de leis
 * @returns Texto concatenado com todas as leis
 */
export async function getMultipleLawsAIContext(lawIds: string[]): Promise<string> {
  const contexts = await Promise.all(
    lawIds.map(id => getIncentiveLawAIContext(id))
  );

  return contexts
    .filter((ctx): ctx is string => ctx !== null)
    .join('\n\n');
}

// =============================================================================
// WRITE OPERATIONS (Admin Only)
// Estas operacoes requerem role='admin' no user metadata
// =============================================================================

/**
 * Cria uma nova lei de incentivo (admin only)
 *
 * @param dto - Dados da nova lei
 * @returns Lei criada
 */
export async function createIncentiveLaw(dto: CreateIncentiveLawDTO): Promise<IncentiveLaw> {
  try {
    const { data, error } = await supabase
      .from('incentive_laws')
      .insert({
        ...dto,
        eligible_company_types: dto.eligible_company_types || [],
        eligible_project_types: dto.eligible_project_types || [],
        eligible_proponent_types: dto.eligible_proponent_types || [],
        common_questions: dto.common_questions || {},
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as IncentiveLaw;
  } catch (error) {
    console.error('[IncentiveLawService] Erro ao criar lei:', error);
    // Check for unique constraint violation
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw new Error('Já existe uma lei de incentivo com este nome ou abreviação.');
    }
    throw new Error(`Falha ao criar lei: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Atualiza uma lei de incentivo existente (admin only)
 *
 * @param id - ID da lei
 * @param dto - Dados a atualizar
 * @returns Lei atualizada
 */
export async function updateIncentiveLaw(
  id: string,
  dto: UpdateIncentiveLawDTO
): Promise<IncentiveLaw> {
  try {
    // Note: updated_at is handled by database trigger
    const { data, error } = await supabase
      .from('incentive_laws')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as IncentiveLaw;
  } catch (error) {
    console.error('[IncentiveLawService] Erro ao atualizar lei:', error);
    throw new Error(`Falha ao atualizar lei: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Deleta uma lei de incentivo (admin only)
 *
 * @param id - ID da lei
 */
export async function deleteIncentiveLaw(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('incentive_laws')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[IncentiveLawService] Erro ao deletar lei:', error);
    throw new Error(`Falha ao deletar lei: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Ativa/desativa uma lei de incentivo (admin only)
 *
 * @param id - ID da lei
 * @param isActive - Novo status
 * @returns Lei atualizada
 */
export async function toggleIncentiveLawStatus(
  id: string,
  isActive: boolean
): Promise<IncentiveLaw> {
  return updateIncentiveLaw(id, { is_active: isActive });
}

// =============================================================================
// EXPORT DEFAULT OBJECT
// =============================================================================

export const incentiveLawService = {
  // Read (public)
  getAll: getIncentiveLaws,
  getById: getIncentiveLawById,
  getByShortName: getIncentiveLawByShortName,
  getByJurisdiction: getIncentiveLawsByJurisdiction,
  getByTaxType: getIncentiveLawsByTaxType,
  getByState: getIncentiveLawsByState,
  getSummaries: getIncentiveLawSummaries,

  // AI Context
  getForAIContext: getIncentiveLawAIContext,
  formatForAI: formatLawForAIContext,
  getMultipleForAI: getMultipleLawsAIContext,

  // Write (admin only)
  create: createIncentiveLaw,
  update: updateIncentiveLaw,
  delete: deleteIncentiveLaw,
  toggleStatus: toggleIncentiveLawStatus,
};

export default incentiveLawService;
