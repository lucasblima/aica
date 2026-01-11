/**
 * useOrganizations - Hook para gerenciamento de organizacoes
 *
 * Issue #95 - Criar entidade Organizations
 *
 * @module modules/grants/hooks/useOrganizations
 */

import { useState, useEffect, useCallback } from 'react';
import * as orgService from '../services/organizationService';
import type {
  Organization,
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
} from '../types/organizations';

interface UseOrganizationsOptions {
  autoFetch?: boolean;
}

interface UseOrganizationsReturn {
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  create: (org: CreateOrganizationDTO) => Promise<Organization>;
  update: (id: string, updates: UpdateOrganizationDTO) => Promise<Organization>;
  remove: (id: string) => Promise<void>;
  search: (query: string) => Promise<Organization[]>;
}

/**
 * Hook para gerenciar lista de organizacoes
 *
 * @param options - Opcoes do hook
 * @returns Estado e acoes para gerenciar organizacoes
 *
 * @example
 * ```tsx
 * const { organizations, isLoading, create } = useOrganizations();
 *
 * const handleCreate = async () => {
 *   await create({
 *     name: 'Nova ONG',
 *     organization_type: 'ong',
 *     // ...
 *   });
 * };
 * ```
 */
export function useOrganizations(
  options: UseOrganizationsOptions = {}
): UseOrganizationsReturn {
  const { autoFetch = true } = options;

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await orgService.getOrganizations();
      setOrganizations(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar organizacoes';
      setError(message);
      console.error('[useOrganizations] Erro:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(async (org: CreateOrganizationDTO) => {
    const newOrg = await orgService.createOrganization(org);
    setOrganizations((prev) =>
      [...prev, newOrg].sort((a, b) => a.name.localeCompare(b.name))
    );
    return newOrg;
  }, []);

  const update = useCallback(
    async (id: string, updates: UpdateOrganizationDTO) => {
      const updatedOrg = await orgService.updateOrganization(id, updates);
      setOrganizations((prev) =>
        prev.map((org) => (org.id === id ? updatedOrg : org))
      );
      return updatedOrg;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await orgService.deleteOrganization(id);
    setOrganizations((prev) => prev.filter((org) => org.id !== id));
  }, []);

  const search = useCallback(async (query: string) => {
    return orgService.searchOrganizations(query);
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchOrganizations();
    }
  }, [autoFetch, fetchOrganizations]);

  return {
    organizations,
    isLoading,
    error,
    refresh: fetchOrganizations,
    create,
    update,
    remove,
    search,
  };
}

// =============================================================================
// Hook para uma organizacao especifica
// =============================================================================

interface UseOrganizationReturn {
  organization: Organization | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  update: (updates: UpdateOrganizationDTO) => Promise<Organization>;
}

/**
 * Hook para gerenciar uma organizacao especifica
 *
 * @param id - ID da organizacao (ou null)
 * @returns Estado e acoes para a organizacao
 *
 * @example
 * ```tsx
 * const { organization, isLoading, update } = useOrganization(orgId);
 *
 * if (isLoading) return <Loading />;
 * if (!organization) return <NotFound />;
 *
 * return <OrganizationForm data={organization} onSave={update} />;
 * ```
 */
export function useOrganization(id: string | null): UseOrganizationReturn {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!id) {
      setOrganization(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await orgService.getOrganizationById(id);
      setOrganization(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar organizacao';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const update = useCallback(
    async (updates: UpdateOrganizationDTO) => {
      if (!id) {
        throw new Error('ID da organizacao nao definido');
      }

      const updatedOrg = await orgService.updateOrganization(id, updates);
      setOrganization(updatedOrg);
      return updatedOrg;
    },
    [id]
  );

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    organization,
    isLoading,
    error,
    refresh: fetchOrganization,
    update,
  };
}

// =============================================================================
// Hook para relacionamentos de organizacao
// =============================================================================

interface UseOrganizationRelationshipsReturn {
  relationships: Awaited<
    ReturnType<typeof orgService.getOrganizationRelationships>
  >;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (
    data: Parameters<typeof orgService.createRelationship>[0]
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Hook para gerenciar relacionamentos de uma organizacao
 *
 * @param organizationId - ID da organizacao
 * @returns Estado e acoes para gerenciar relacionamentos
 */
export function useOrganizationRelationships(
  organizationId: string | null
): UseOrganizationRelationshipsReturn {
  const [relationships, setRelationships] = useState<
    Awaited<ReturnType<typeof orgService.getOrganizationRelationships>>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRelationships = useCallback(async () => {
    if (!organizationId) {
      setRelationships([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await orgService.getOrganizationRelationships(organizationId);
      setRelationships(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar relacionamentos';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  const create = useCallback(
    async (data: Parameters<typeof orgService.createRelationship>[0]) => {
      await orgService.createRelationship(data);
      await fetchRelationships();
    },
    [fetchRelationships]
  );

  const remove = useCallback(
    async (id: string) => {
      await orgService.deleteRelationship(id);
      setRelationships((prev) => prev.filter((r) => r.id !== id));
    },
    []
  );

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  return {
    relationships,
    isLoading,
    error,
    refresh: fetchRelationships,
    create,
    remove,
  };
}

// =============================================================================
// Hook para membros de organizacao
// =============================================================================

interface UseOrganizationMembersReturn {
  members: Awaited<ReturnType<typeof orgService.getOrganizationMembers>>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (data: Parameters<typeof orgService.addOrganizationMember>[0]) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Hook para gerenciar membros de uma organizacao
 *
 * @param organizationId - ID da organizacao
 * @returns Estado e acoes para gerenciar membros
 */
export function useOrganizationMembers(
  organizationId: string | null
): UseOrganizationMembersReturn {
  const [members, setMembers] = useState<
    Awaited<ReturnType<typeof orgService.getOrganizationMembers>>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!organizationId) {
      setMembers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await orgService.getOrganizationMembers(organizationId);
      setMembers(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar membros';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  const add = useCallback(
    async (data: Parameters<typeof orgService.addOrganizationMember>[0]) => {
      await orgService.addOrganizationMember(data);
      await fetchMembers();
    },
    [fetchMembers]
  );

  const remove = useCallback(
    async (id: string) => {
      await orgService.removeOrganizationMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    },
    []
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    isLoading,
    error,
    refresh: fetchMembers,
    add,
    remove,
  };
}
