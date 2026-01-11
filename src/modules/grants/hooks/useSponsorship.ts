/**
 * Sponsorship Hooks
 * Issue #97 - Sistema de cotas de patrocinio para projetos aprovados
 *
 * React hooks para gerenciamento de cotas, contrapartidas e patrocinadores
 *
 * @module modules/grants/hooks/useSponsorship
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  SponsorshipTier,
  TierDeliverable,
  ProjectSponsor,
  CreateSponsorshipTierDTO,
  UpdateSponsorshipTierDTO,
  CreateTierDeliverableDTO,
  UpdateTierDeliverableDTO,
  CreateProjectSponsorDTO,
  UpdateProjectSponsorDTO,
  CaptureProgress,
  TierAvailability,
  SponsorStatus,
} from '../types/sponsorship';
import { SPONSOR_PIPELINE_ORDER } from '../types/sponsorship';
import * as sponsorshipService from '../services/sponsorshipService';

// =============================================================================
// useSponsorshipTiers - Gerenciar cotas de um projeto
// =============================================================================

interface UseSponsorshipTiersReturn {
  tiers: SponsorshipTier[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (dto: Omit<CreateSponsorshipTierDTO, 'project_id'>) => Promise<SponsorshipTier>;
  update: (tierId: string, dto: UpdateSponsorshipTierDTO) => Promise<SponsorshipTier>;
  remove: (tierId: string) => Promise<void>;
  reorder: (tierIds: string[]) => Promise<void>;
  availability: TierAvailability[];
}

export function useSponsorshipTiers(projectId: string | null): UseSponsorshipTiersReturn {
  const [tiers, setTiers] = useState<SponsorshipTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setTiers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await sponsorshipService.getProjectTiers(projectId);
      setTiers(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tiers'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (dto: Omit<CreateSponsorshipTierDTO, 'project_id'>): Promise<SponsorshipTier> => {
      if (!projectId) throw new Error('Project ID is required');

      const tier = await sponsorshipService.createTier({
        ...dto,
        project_id: projectId,
      });

      setTiers(prev => [...prev, tier]);
      return tier;
    },
    [projectId]
  );

  const update = useCallback(
    async (tierId: string, dto: UpdateSponsorshipTierDTO): Promise<SponsorshipTier> => {
      const updated = await sponsorshipService.updateTier(tierId, dto);

      setTiers(prev =>
        prev.map(t => (t.id === tierId ? { ...t, ...updated } : t))
      );

      return updated;
    },
    []
  );

  const remove = useCallback(async (tierId: string): Promise<void> => {
    await sponsorshipService.deleteTier(tierId);
    setTiers(prev => prev.filter(t => t.id !== tierId));
  }, []);

  const reorder = useCallback(
    async (tierIds: string[]): Promise<void> => {
      if (!projectId) return;

      await sponsorshipService.reorderTiers(projectId, tierIds);

      // Reordenar localmente
      setTiers(prev => {
        const tierMap = new Map(prev.map(t => [t.id, t]));
        return tierIds
          .map((id, index) => {
            const tier = tierMap.get(id);
            return tier ? { ...tier, display_order: index + 1 } : null;
          })
          .filter((t): t is SponsorshipTier => t !== null);
      });
    },
    [projectId]
  );

  const availability = useMemo((): TierAvailability[] => {
    return tiers
      .filter(t => t.is_active)
      .map(tier => ({
        tier_id: tier.id,
        tier_name: tier.name,
        value: tier.value,
        quantity_total: tier.quantity_total,
        quantity_sold: tier.quantity_sold,
        quantity_available: tier.quantity_total - tier.quantity_sold,
        is_available: tier.quantity_sold < tier.quantity_total,
        total_value: tier.quantity_total * tier.value,
        sold_value: tier.quantity_sold * tier.value,
        available_value: (tier.quantity_total - tier.quantity_sold) * tier.value,
      }));
  }, [tiers]);

  return {
    tiers,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    reorder,
    availability,
  };
}

// =============================================================================
// useTierDeliverables - Gerenciar contrapartidas de uma cota
// =============================================================================

interface UseTierDeliverablesReturn {
  deliverables: TierDeliverable[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  add: (dto: Omit<CreateTierDeliverableDTO, 'tier_id'>) => Promise<TierDeliverable>;
  update: (deliverableId: string, dto: UpdateTierDeliverableDTO) => Promise<TierDeliverable>;
  remove: (deliverableId: string) => Promise<void>;
  bulkAdd: (deliverables: Omit<CreateTierDeliverableDTO, 'tier_id'>[]) => Promise<TierDeliverable[]>;
}

export function useTierDeliverables(tierId: string | null): UseTierDeliverablesReturn {
  const [deliverables, setDeliverables] = useState<TierDeliverable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!tierId) {
      setDeliverables([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await sponsorshipService.getTierDeliverables(tierId);
      setDeliverables(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load deliverables'));
    } finally {
      setLoading(false);
    }
  }, [tierId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (dto: Omit<CreateTierDeliverableDTO, 'tier_id'>): Promise<TierDeliverable> => {
      if (!tierId) throw new Error('Tier ID is required');

      const deliverable = await sponsorshipService.addDeliverable({
        ...dto,
        tier_id: tierId,
      });

      setDeliverables(prev => [...prev, deliverable]);
      return deliverable;
    },
    [tierId]
  );

  const update = useCallback(
    async (deliverableId: string, dto: UpdateTierDeliverableDTO): Promise<TierDeliverable> => {
      const updated = await sponsorshipService.updateDeliverable(deliverableId, dto);

      setDeliverables(prev =>
        prev.map(d => (d.id === deliverableId ? { ...d, ...updated } : d))
      );

      return updated;
    },
    []
  );

  const remove = useCallback(async (deliverableId: string): Promise<void> => {
    await sponsorshipService.deleteDeliverable(deliverableId);
    setDeliverables(prev => prev.filter(d => d.id !== deliverableId));
  }, []);

  const bulkAdd = useCallback(
    async (items: Omit<CreateTierDeliverableDTO, 'tier_id'>[]): Promise<TierDeliverable[]> => {
      if (!tierId) throw new Error('Tier ID is required');

      const added = await sponsorshipService.bulkAddDeliverables(tierId, items);
      setDeliverables(prev => [...prev, ...added]);
      return added;
    },
    [tierId]
  );

  return {
    deliverables,
    loading,
    error,
    refresh,
    add,
    update,
    remove,
    bulkAdd,
  };
}

// =============================================================================
// useProjectSponsors - Gerenciar patrocinadores de um projeto
// =============================================================================

interface UseProjectSponsorsReturn {
  sponsors: ProjectSponsor[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  add: (dto: Omit<CreateProjectSponsorDTO, 'project_id'>) => Promise<ProjectSponsor>;
  update: (sponsorId: string, dto: UpdateProjectSponsorDTO) => Promise<ProjectSponsor>;
  updateStatus: (
    sponsorId: string,
    status: SponsorStatus,
    nextAction?: string,
    nextActionDate?: string
  ) => Promise<ProjectSponsor>;
  remove: (sponsorId: string) => Promise<void>;
  recordPayment: (sponsorId: string, amount: number) => Promise<ProjectSponsor>;
  // Helpers para Kanban
  sponsorsByStatus: Record<SponsorStatus, ProjectSponsor[]>;
  getByStatus: (status: SponsorStatus) => ProjectSponsor[];
  moveSponsor: (sponsorId: string, newStatus: SponsorStatus) => Promise<void>;
}

export function useProjectSponsors(projectId: string | null): UseProjectSponsorsReturn {
  const [sponsors, setSponsors] = useState<ProjectSponsor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setSponsors([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await sponsorshipService.getProjectSponsors(projectId);
      setSponsors(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load sponsors'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (dto: Omit<CreateProjectSponsorDTO, 'project_id'>): Promise<ProjectSponsor> => {
      if (!projectId) throw new Error('Project ID is required');

      const sponsor = await sponsorshipService.addSponsor({
        ...dto,
        project_id: projectId,
      });

      setSponsors(prev => [sponsor, ...prev]);
      return sponsor;
    },
    [projectId]
  );

  const update = useCallback(
    async (sponsorId: string, dto: UpdateProjectSponsorDTO): Promise<ProjectSponsor> => {
      const updated = await sponsorshipService.updateSponsor(sponsorId, dto);

      setSponsors(prev =>
        prev.map(s => (s.id === sponsorId ? { ...s, ...updated } : s))
      );

      return updated;
    },
    []
  );

  const updateStatus = useCallback(
    async (
      sponsorId: string,
      status: SponsorStatus,
      nextAction?: string,
      nextActionDate?: string
    ): Promise<ProjectSponsor> => {
      const updated = await sponsorshipService.updateSponsorStatus(
        sponsorId,
        status,
        nextAction,
        nextActionDate
      );

      setSponsors(prev =>
        prev.map(s => (s.id === sponsorId ? { ...s, ...updated } : s))
      );

      return updated;
    },
    []
  );

  const remove = useCallback(async (sponsorId: string): Promise<void> => {
    await sponsorshipService.deleteSponsor(sponsorId);
    setSponsors(prev => prev.filter(s => s.id !== sponsorId));
  }, []);

  const recordPayment = useCallback(
    async (sponsorId: string, amount: number): Promise<ProjectSponsor> => {
      const updated = await sponsorshipService.recordPayment(sponsorId, amount);

      setSponsors(prev =>
        prev.map(s => (s.id === sponsorId ? { ...s, ...updated } : s))
      );

      return updated;
    },
    []
  );

  // Agrupar patrocinadores por status para Kanban
  const sponsorsByStatus = useMemo((): Record<SponsorStatus, ProjectSponsor[]> => {
    const grouped: Record<SponsorStatus, ProjectSponsor[]> = {} as Record<
      SponsorStatus,
      ProjectSponsor[]
    >;

    // Inicializar todos os status do pipeline
    for (const status of SPONSOR_PIPELINE_ORDER) {
      grouped[status] = [];
    }

    // Adicionar status que nao estao no pipeline (declined, churned)
    grouped.declined = [];
    grouped.churned = [];

    // Agrupar patrocinadores
    for (const sponsor of sponsors) {
      const status = sponsor.status as SponsorStatus;
      if (grouped[status]) {
        grouped[status].push(sponsor);
      }
    }

    return grouped;
  }, [sponsors]);

  const getByStatus = useCallback(
    (status: SponsorStatus): ProjectSponsor[] => {
      return sponsors.filter(s => s.status === status);
    },
    [sponsors]
  );

  const moveSponsor = useCallback(
    async (sponsorId: string, newStatus: SponsorStatus): Promise<void> => {
      await updateStatus(sponsorId, newStatus);
    },
    [updateStatus]
  );

  return {
    sponsors,
    loading,
    error,
    refresh,
    add,
    update,
    updateStatus,
    remove,
    recordPayment,
    sponsorsByStatus,
    getByStatus,
    moveSponsor,
  };
}

// =============================================================================
// useCaptureProgress - Progresso de captacao de um projeto
// =============================================================================

interface UseCaptureProgressReturn {
  progress: CaptureProgress | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCaptureProgress(projectId: string | null): UseCaptureProgressReturn {
  const [progress, setProgress] = useState<CaptureProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setProgress(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await sponsorshipService.getCaptureProgress(projectId);
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load capture progress'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    progress,
    loading,
    error,
    refresh,
  };
}
