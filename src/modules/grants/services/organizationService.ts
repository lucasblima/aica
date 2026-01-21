/**
 * Organization Service - Modulo Grants
 *
 * Servico de CRUD para gerenciar organizacoes (ONGs, empresas, institutos, etc.),
 * seus relacionamentos e membros.
 *
 * Issue #95 - Criar entidade Organizations
 *
 * @module modules/grants/services/organizationService
 */

import { supabase } from '../../../services/supabaseClient';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Organizationservice');
import type {
  Organization,
  OrganizationRelationship,
  OrganizationMember,
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
  CreateRelationshipDTO,
  CreateMemberDTO,
} from '../types/organizations';

// =============================================================================
// Organizations CRUD
// =============================================================================

/**
 * Lista todas as organizacoes do usuario
 *
 * @returns Lista de organizacoes ativas
 * @throws Error se a consulta falhar
 */
export async function getOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca uma organizacao especifica pelo ID
 *
 * @param id - ID da organizacao
 * @returns Organizacao encontrada ou null
 * @throws Error se ocorrer erro na consulta
 */
export async function getOrganizationById(id: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    log.error('Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Cria uma nova organizacao
 *
 * @param org - Dados da organizacao
 * @returns Organizacao criada
 * @throws Error se a criacao falhar
 */
export async function createOrganization(
  org: CreateOrganizationDTO
): Promise<Organization> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario nao autenticado');
  }

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      ...org,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Atualiza uma organizacao existente
 *
 * @param id - ID da organizacao
 * @param updates - Campos a atualizar
 * @returns Organizacao atualizada
 * @throws Error se a atualizacao falhar
 */
export async function updateOrganization(
  id: string,
  updates: UpdateOrganizationDTO
): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Desativa uma organizacao (soft delete)
 *
 * @param id - ID da organizacao
 * @throws Error se a operacao falhar
 */
export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    log.error('Erro:', error);
    throw error;
  }
}

// =============================================================================
// Organization Relationships
// =============================================================================

/**
 * Busca todos os relacionamentos de uma organizacao
 *
 * @param organizationId - ID da organizacao
 * @returns Lista de relacionamentos com dados das organizacoes relacionadas
 * @throws Error se a consulta falhar
 */
export async function getOrganizationRelationships(
  organizationId: string
): Promise<OrganizationRelationship[]> {
  const { data, error } = await supabase
    .from('organization_relationships')
    .select(
      `
      *,
      organization_a:organization_a_id(id, name, organization_type, logo_url),
      organization_b:organization_b_id(id, name, organization_type, logo_url)
    `
    )
    .or(
      `organization_a_id.eq.${organizationId},organization_b_id.eq.${organizationId}`
    )
    .eq('is_active', true);

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data || [];
}

/**
 * Cria um novo relacionamento entre organizacoes
 *
 * @param relationship - Dados do relacionamento
 * @returns Relacionamento criado
 * @throws Error se a criacao falhar
 */
export async function createRelationship(
  relationship: CreateRelationshipDTO
): Promise<OrganizationRelationship> {
  const { data, error } = await supabase
    .from('organization_relationships')
    .insert(relationship)
    .select()
    .single();

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Atualiza um relacionamento existente
 *
 * @param id - ID do relacionamento
 * @param updates - Campos a atualizar
 * @returns Relacionamento atualizado
 * @throws Error se a atualizacao falhar
 */
export async function updateRelationship(
  id: string,
  updates: Partial<CreateRelationshipDTO>
): Promise<OrganizationRelationship> {
  const { data, error } = await supabase
    .from('organization_relationships')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Desativa um relacionamento (soft delete)
 *
 * @param id - ID do relacionamento
 * @throws Error se a operacao falhar
 */
export async function deleteRelationship(id: string): Promise<void> {
  const { error } = await supabase
    .from('organization_relationships')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    log.error('Erro:', error);
    throw error;
  }
}

// =============================================================================
// Organization Members
// =============================================================================

/**
 * Busca todos os membros de uma organizacao
 *
 * @param organizationId - ID da organizacao
 * @returns Lista de membros com dados dos contatos
 * @throws Error se a consulta falhar
 */
export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select(
      `
      *,
      contact:contact_id(id, contact_name, contact_phone)
    `
    )
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data || [];
}

/**
 * Adiciona um membro a uma organizacao
 *
 * @param member - Dados do membro
 * @returns Membro adicionado
 * @throws Error se a operacao falhar
 */
export async function addOrganizationMember(
  member: CreateMemberDTO
): Promise<OrganizationMember> {
  const { data, error } = await supabase
    .from('organization_members')
    .insert(member)
    .select()
    .single();

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Atualiza um membro existente
 *
 * @param id - ID do membro
 * @param updates - Campos a atualizar
 * @returns Membro atualizado
 * @throws Error se a atualizacao falhar
 */
export async function updateOrganizationMember(
  id: string,
  updates: Partial<CreateMemberDTO>
): Promise<OrganizationMember> {
  const { data, error } = await supabase
    .from('organization_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Remove um membro de uma organizacao (soft delete)
 *
 * @param id - ID do membro
 * @throws Error se a operacao falhar
 */
export async function removeOrganizationMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('organization_members')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    log.error('Erro:', error);
    throw error;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Busca organizacoes por texto (nome, razao social ou CNPJ)
 *
 * @param query - Texto de busca
 * @param options - Opcoes de filtro
 * @returns Lista de organizacoes encontradas
 * @throws Error se a consulta falhar
 */
export async function searchOrganizations(
  query: string,
  options?: {
    type?: string;
    state?: string;
    limit?: number;
  }
): Promise<Organization[]> {
  let queryBuilder = supabase
    .from('organizations')
    .select('*')
    .eq('is_active', true)
    .or(
      `name.ilike.%${query}%,legal_name.ilike.%${query}%,document_number.ilike.%${query}%`
    );

  if (options?.type) {
    queryBuilder = queryBuilder.eq('organization_type', options.type);
  }

  if (options?.state) {
    queryBuilder = queryBuilder.eq('address_state', options.state);
  }

  if (options?.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  const { data, error } = await queryBuilder.order('name');

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca organizacoes por area de atuacao
 *
 * @param area - Area de atuacao (ex: 'cultura', 'educacao')
 * @returns Lista de organizacoes na area
 * @throws Error se a consulta falhar
 */
export async function getOrganizationsByArea(area: string): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('is_active', true)
    .contains('areas_of_activity', [area])
    .order('name');

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca organizacoes por tipo
 *
 * @param type - Tipo de organizacao (ex: 'ong', 'empresa')
 * @returns Lista de organizacoes do tipo
 * @throws Error se a consulta falhar
 */
export async function getOrganizationsByType(type: string): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('is_active', true)
    .eq('organization_type', type)
    .order('name');

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return data || [];
}

/**
 * Conta o numero de organizacoes ativas do usuario
 *
 * @returns Numero de organizacoes
 * @throws Error se a consulta falhar
 */
export async function countOrganizations(): Promise<number> {
  const { count, error } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return count || 0;
}

/**
 * Verifica se um CNPJ ja esta cadastrado
 *
 * @param documentNumber - CNPJ a verificar
 * @param excludeId - ID de organizacao a excluir da verificacao (para updates)
 * @returns true se o CNPJ ja existe
 * @throws Error se a consulta falhar
 */
export async function checkDuplicateDocument(
  documentNumber: string,
  excludeId?: string
): Promise<boolean> {
  let queryBuilder = supabase
    .from('organizations')
    .select('id')
    .eq('document_number', documentNumber)
    .eq('is_active', true);

  if (excludeId) {
    queryBuilder = queryBuilder.neq('id', excludeId);
  }

  const { data, error } = await queryBuilder.limit(1);

  if (error) {
    log.error('Erro:', error);
    throw error;
  }

  return (data?.length || 0) > 0;
}
