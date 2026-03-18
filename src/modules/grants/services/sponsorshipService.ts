/**
 * Sponsorship Service
 * Issue #97 - Sistema de cotas de patrocinio para projetos aprovados
 *
 * @module modules/grants/services/sponsorshipService
 */

import { supabase } from '@/services/supabaseClient';
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
  UpdateProjectApprovalDTO,
  CaptureProgress,
  TierAvailability,
  ProjectSponsorshipContext,
  SponsorStatus,
  CaptureStatus,
} from '../types/sponsorship';
import { CONFIRMED_SPONSOR_STATUSES } from '../types/sponsorship';

// =============================================================================
// SPONSORSHIP TIERS CRUD
// =============================================================================

/**
 * Buscar todas as cotas de um projeto
 */
export async function getProjectTiers(projectId: string): Promise<SponsorshipTier[]> {
  const { data, error } = await supabase
    .from('sponsorship_tiers')
    .select(`
      *,
      deliverables:tier_deliverables(*)
    `)
    .eq('project_id', projectId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Buscar uma cota por ID
 */
export async function getTierById(tierId: string): Promise<SponsorshipTier | null> {
  const { data, error } = await supabase
    .from('sponsorship_tiers')
    .select(`
      *,
      deliverables:tier_deliverables(*)
    `)
    .eq('id', tierId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Criar uma nova cota de patrocinio
 */
export async function createTier(dto: CreateSponsorshipTierDTO): Promise<SponsorshipTier> {
  // Obter o maior display_order atual
  const { data: existingTiers } = await supabase
    .from('sponsorship_tiers')
    .select('display_order')
    .eq('project_id', dto.project_id)
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = dto.display_order ?? ((existingTiers?.[0]?.display_order ?? 0) + 1);

  const { data, error } = await supabase
    .from('sponsorship_tiers')
    .insert({
      ...dto,
      display_order: nextOrder,
      quantity_sold: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualizar uma cota de patrocinio
 */
export async function updateTier(
  tierId: string,
  dto: UpdateSponsorshipTierDTO
): Promise<SponsorshipTier> {
  const { data, error } = await supabase
    .from('sponsorship_tiers')
    .update(dto)
    .eq('id', tierId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletar uma cota de patrocinio
 */
export async function deleteTier(tierId: string): Promise<void> {
  const { error } = await supabase
    .from('sponsorship_tiers')
    .delete()
    .eq('id', tierId);

  if (error) throw error;
}

/**
 * Reordenar cotas de um projeto
 */
export async function reorderTiers(
  projectId: string,
  tierIds: string[]
): Promise<void> {
  const updates = tierIds.map((id, index) => ({
    id,
    display_order: index + 1,
  }));

  // Atualizar cada tier individualmente (Supabase não suporta upsert em batch facilmente)
  for (const update of updates) {
    const { error } = await supabase
      .from('sponsorship_tiers')
      .update({ display_order: update.display_order })
      .eq('id', update.id)
      .eq('project_id', projectId);

    if (error) throw error;
  }
}

// =============================================================================
// TIER DELIVERABLES CRUD
// =============================================================================

/**
 * Buscar contrapartidas de uma cota
 */
export async function getTierDeliverables(tierId: string): Promise<TierDeliverable[]> {
  const { data, error } = await supabase
    .from('tier_deliverables')
    .select('*')
    .eq('tier_id', tierId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Adicionar contrapartida a uma cota
 */
export async function addDeliverable(
  dto: CreateTierDeliverableDTO
): Promise<TierDeliverable> {
  // Obter o maior display_order atual
  const { data: existing } = await supabase
    .from('tier_deliverables')
    .select('display_order')
    .eq('tier_id', dto.tier_id)
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = dto.display_order ?? ((existing?.[0]?.display_order ?? 0) + 1);

  const { data, error } = await supabase
    .from('tier_deliverables')
    .insert({
      ...dto,
      display_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualizar contrapartida
 */
export async function updateDeliverable(
  deliverableId: string,
  dto: UpdateTierDeliverableDTO
): Promise<TierDeliverable> {
  const { data, error } = await supabase
    .from('tier_deliverables')
    .update(dto)
    .eq('id', deliverableId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletar contrapartida
 */
export async function deleteDeliverable(deliverableId: string): Promise<void> {
  const { error } = await supabase
    .from('tier_deliverables')
    .delete()
    .eq('id', deliverableId);

  if (error) throw error;
}

/**
 * Adicionar multiplas contrapartidas de uma vez
 */
export async function bulkAddDeliverables(
  tierId: string,
  deliverables: Omit<CreateTierDeliverableDTO, 'tier_id'>[]
): Promise<TierDeliverable[]> {
  const { data: existing } = await supabase
    .from('tier_deliverables')
    .select('display_order')
    .eq('tier_id', tierId)
    .order('display_order', { ascending: false })
    .limit(1);

  const startOrder = (existing?.[0]?.display_order ?? 0) + 1;

  const inserts = deliverables.map((d, index) => ({
    ...d,
    tier_id: tierId,
    display_order: d.display_order ?? startOrder + index,
  }));

  const { data, error } = await supabase
    .from('tier_deliverables')
    .insert(inserts)
    .select();

  if (error) throw error;
  return data || [];
}

// =============================================================================
// PROJECT SPONSORS CRUD
// =============================================================================

/**
 * Buscar todos os patrocinadores de um projeto
 */
export async function getProjectSponsors(projectId: string): Promise<ProjectSponsor[]> {
  const { data, error } = await supabase
    .from('project_sponsors')
    .select(`
      *,
      tier:sponsorship_tiers(id, name, value, color),
      organization:organizations(id, name, logo_url)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Buscar patrocinadores por status
 */
export async function getSponsorsByStatus(
  projectId: string,
  status: SponsorStatus
): Promise<ProjectSponsor[]> {
  const { data, error } = await supabase
    .from('project_sponsors')
    .select(`
      *,
      tier:sponsorship_tiers(id, name, value, color),
      organization:organizations(id, name, logo_url)
    `)
    .eq('project_id', projectId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Buscar um patrocinador por ID
 */
export async function getSponsorById(sponsorId: string): Promise<ProjectSponsor | null> {
  const { data, error } = await supabase
    .from('project_sponsors')
    .select(`
      *,
      tier:sponsorship_tiers(id, name, value, color),
      organization:organizations(id, name, logo_url)
    `)
    .eq('id', sponsorId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Adicionar um novo patrocinador
 */
export async function addSponsor(dto: CreateProjectSponsorDTO): Promise<ProjectSponsor> {
  const { data, error } = await supabase
    .from('project_sponsors')
    .insert({
      ...dto,
      status: dto.status ?? 'lead',
      paid_value: 0,
      status_changed_at: new Date().toISOString(),
    })
    .select(`
      *,
      tier:sponsorship_tiers(id, name, value, color),
      organization:organizations(id, name, logo_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualizar um patrocinador
 */
export async function updateSponsor(
  sponsorId: string,
  dto: UpdateProjectSponsorDTO
): Promise<ProjectSponsor> {
  const { data, error } = await supabase
    .from('project_sponsors')
    .update(dto)
    .eq('id', sponsorId)
    .select(`
      *,
      tier:sponsorship_tiers(id, name, value, color),
      organization:organizations(id, name, logo_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualizar status do patrocinador (com timestamp)
 */
export async function updateSponsorStatus(
  sponsorId: string,
  status: SponsorStatus,
  nextAction?: string,
  nextActionDate?: string
): Promise<ProjectSponsor> {
  const { data, error } = await supabase
    .from('project_sponsors')
    .update({
      status,
      status_changed_at: new Date().toISOString(),
      next_action: nextAction ?? null,
      next_action_date: nextActionDate ?? null,
    })
    .eq('id', sponsorId)
    .select(`
      *,
      tier:sponsorship_tiers(id, name, value, color),
      organization:organizations(id, name, logo_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletar um patrocinador
 */
export async function deleteSponsor(sponsorId: string): Promise<void> {
  const { error } = await supabase
    .from('project_sponsors')
    .delete()
    .eq('id', sponsorId);

  if (error) throw error;
}

/**
 * Registrar pagamento de um patrocinador
 */
export async function recordPayment(
  sponsorId: string,
  amount: number
): Promise<ProjectSponsor> {
  // Buscar patrocinador atual
  const { data: current, error: fetchError } = await supabase
    .from('project_sponsors')
    .select('paid_value, negotiated_value, tier:sponsorship_tiers(value)')
    .eq('id', sponsorId)
    .single();

  if (fetchError) throw fetchError;

  const newPaidValue = (current.paid_value || 0) + amount;
  const tier = Array.isArray(current.tier) ? current.tier[0] : current.tier;
  const targetValue = current.negotiated_value || tier?.value || 0;

  // Determinar novo status baseado no pagamento
  let newStatus: SponsorStatus = 'payment_partial';
  if (newPaidValue >= targetValue) {
    newStatus = 'payment_complete';
  }

  const { data, error } = await supabase
    .from('project_sponsors')
    .update({
      paid_value: newPaidValue,
      status: newStatus,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', sponsorId)
    .select(`
      *,
      tier:sponsorship_tiers(id, name, value, color),
      organization:organizations(id, name, logo_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// PROJECT APPROVAL FIELDS
// =============================================================================

/**
 * Atualizar campos de aprovacao do projeto
 */
export async function updateProjectApproval(
  projectId: string,
  dto: UpdateProjectApprovalDTO
): Promise<void> {
  const { error } = await supabase
    .from('grant_projects')
    .update(dto)
    .eq('id', projectId);

  if (error) throw error;
}

// =============================================================================
// ANALYTICS & PROGRESS
// =============================================================================

/**
 * Obter progresso de captacao de um projeto
 */
export async function getCaptureProgress(projectId: string): Promise<CaptureProgress> {
  // Buscar dados do projeto
  const { data: project, error: projectError } = await supabase
    .from('grant_projects')
    .select(`
      id,
      capture_status,
      capture_goal,
      captured_value,
      capture_deadline
    `)
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  // Buscar cotas
  const { data: tiers, error: tiersError } = await supabase
    .from('sponsorship_tiers')
    .select('id, value, quantity_total, quantity_sold, is_active')
    .eq('project_id', projectId);

  if (tiersError) throw tiersError;

  // Buscar patrocinadores
  const { data: sponsors, error: sponsorsError } = await supabase
    .from('project_sponsors')
    .select('id, status')
    .eq('project_id', projectId);

  if (sponsorsError) throw sponsorsError;

  // Calcular métricas
  const capturedValue = project.captured_value || 0;
  const captureGoal = project.capture_goal || 0;
  const capturePercentage = captureGoal > 0 ? (capturedValue / captureGoal) * 100 : 0;

  const daysRemaining = project.capture_deadline
    ? Math.ceil((new Date(project.capture_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const activeTiers = tiers?.filter(t => t.is_active) || [];
  const soldOutTiers = activeTiers.filter(t => t.quantity_sold >= t.quantity_total).length;
  const availableValue = activeTiers.reduce(
    (sum, t) => sum + (t.quantity_total - t.quantity_sold) * t.value,
    0
  );

  const sponsorsList = sponsors || [];
  const confirmed = sponsorsList.filter(s =>
    CONFIRMED_SPONSOR_STATUSES.includes(s.status as SponsorStatus)
  ).length;
  const pendingPayment = sponsorsList.filter(s =>
    s.status === 'payment_pending' || s.status === 'payment_partial'
  ).length;
  const leads = sponsorsList.filter(s => s.status === 'lead').length;

  return {
    project_id: projectId,
    capture_status: project.capture_status || 'not_started',
    capture_goal: captureGoal,
    captured_value: capturedValue,
    capture_percentage: Math.min(capturePercentage, 100),
    days_remaining: daysRemaining,
    tiers_summary: {
      total_tiers: activeTiers.length,
      sold_out_tiers: soldOutTiers,
      available_value: availableValue,
    },
    sponsors_summary: {
      total: sponsorsList.length,
      confirmed,
      pending_payment: pendingPayment,
      leads,
    },
  };
}

/**
 * Obter disponibilidade de cotas de um projeto
 */
export async function getTiersAvailability(projectId: string): Promise<TierAvailability[]> {
  const { data: tiers, error } = await supabase
    .from('sponsorship_tiers')
    .select('id, name, value, quantity_total, quantity_sold, is_active')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;

  return (tiers || []).map(tier => ({
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
}

/**
 * Obter contexto completo de captacao para IA
 */
export async function getProjectSponsorshipContext(
  projectId: string
): Promise<ProjectSponsorshipContext | null> {
  // Buscar projeto com relacoes
  const { data: project, error: projectError } = await supabase
    .from('grant_projects')
    .select(`
      id,
      project_name,
      approved_value,
      approval_date,
      approval_number,
      validity_start,
      validity_end,
      capture_status,
      capture_goal,
      capture_deadline,
      captured_value,
      incentive_law:incentive_laws(id, name, short_name, tax_type),
      proponent:organizations!proponent_organization_id(id, name, document_number),
      executor:organizations!executor_organization_id(id, name, document_number)
    `)
    .eq('id', projectId)
    .single();

  if (projectError) {
    if (projectError.code === 'PGRST116') return null;
    throw projectError;
  }

  // Buscar cotas com contrapartidas
  const { data: tiers, error: tiersError } = await supabase
    .from('sponsorship_tiers')
    .select(`
      id,
      name,
      value,
      quantity_total,
      quantity_sold,
      deliverables:tier_deliverables(title)
    `)
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (tiersError) throw tiersError;

  // Buscar patrocinadores e agrupar por status
  const { data: sponsors, error: sponsorsError } = await supabase
    .from('project_sponsors')
    .select('status, negotiated_value, tier:sponsorship_tiers(value)')
    .eq('project_id', projectId);

  if (sponsorsError) throw sponsorsError;

  // Calcular métricas de patrocinadores
  const sponsorsByStatus: Record<SponsorStatus, number> = {} as Record<SponsorStatus, number>;
  let confirmedSponsors = 0;
  let confirmedValue = 0;

  for (const sponsor of sponsors || []) {
    const status = sponsor.status as SponsorStatus;
    sponsorsByStatus[status] = (sponsorsByStatus[status] || 0) + 1;

    if (CONFIRMED_SPONSOR_STATUSES.includes(status)) {
      confirmedSponsors++;
      const sTier = Array.isArray(sponsor.tier) ? sponsor.tier[0] : sponsor.tier;
      confirmedValue += sponsor.negotiated_value || sTier?.value || 0;
    }
  }

  const capturedValue = project.captured_value || 0;
  const captureGoal = project.capture_goal || 0;
  const capturePercentage = captureGoal > 0 ? (capturedValue / captureGoal) * 100 : 0;

  const incentiveLaw = Array.isArray(project.incentive_law) ? project.incentive_law[0] : project.incentive_law;
  const proponent = Array.isArray(project.proponent) ? project.proponent[0] : project.proponent;
  const executor = Array.isArray(project.executor) ? project.executor[0] : project.executor;

  return {
    project_id: project.id,
    project_name: project.project_name,
    approved_value: project.approved_value,
    approval_date: project.approval_date,
    approval_number: project.approval_number,
    validity_start: project.validity_start,
    validity_end: project.validity_end,
    incentive_law: incentiveLaw ?? null,
    proponent: proponent ?? null,
    executor: executor ?? null,
    capture_status: project.capture_status || 'not_started',
    capture_goal: captureGoal,
    capture_deadline: project.capture_deadline,
    captured_value: capturedValue,
    capture_percentage: Math.min(capturePercentage, 100),
    tiers: (tiers || []).map(tier => ({
      id: tier.id,
      name: tier.name,
      value: tier.value,
      quantity_total: tier.quantity_total,
      quantity_sold: tier.quantity_sold,
      quantity_available: tier.quantity_total - tier.quantity_sold,
      total_potential_value: tier.quantity_total * tier.value,
      deliverables: (tier.deliverables || []).map((d: { title: string }) => d.title),
    })),
    sponsors_by_status: sponsorsByStatus,
    total_sponsors: sponsors?.length || 0,
    confirmed_sponsors: confirmedSponsors,
    confirmed_value: confirmedValue,
  };
}

/**
 * Obter valor captado por status
 */
export async function getCapturedByStatus(
  projectId: string
): Promise<Record<SponsorStatus, number>> {
  const { data: sponsors, error } = await supabase
    .from('project_sponsors')
    .select('status, negotiated_value, paid_value, tier:sponsorship_tiers(value)')
    .eq('project_id', projectId);

  if (error) throw error;

  const byStatus: Record<SponsorStatus, number> = {} as Record<SponsorStatus, number>;

  for (const sponsor of sponsors || []) {
    const status = sponsor.status as SponsorStatus;
    const sTier = Array.isArray(sponsor.tier) ? sponsor.tier[0] : sponsor.tier;
    const value = sponsor.negotiated_value || sTier?.value || 0;
    byStatus[status] = (byStatus[status] || 0) + value;
  }

  return byStatus;
}

/**
 * Buscar patrocinadores com pagamentos proximos
 */
export async function getSponsorsWithUpcomingPayments(
  projectId: string,
  daysAhead: number = 30
): Promise<ProjectSponsor[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('project_sponsors')
    .select(`
      *,
      tier:sponsorship_tiers(id, name, value, color),
      organization:organizations(id, name, logo_url)
    `)
    .eq('project_id', projectId)
    .in('status', ['payment_pending', 'payment_partial'])
    .lte('payment_due_date', futureDate.toISOString())
    .order('payment_due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Duplicar estrutura de cotas de um projeto para outro
 */
export async function duplicateTiersStructure(
  sourceProjectId: string,
  targetProjectId: string
): Promise<SponsorshipTier[]> {
  // Buscar cotas do projeto fonte
  const sourceTiers = await getProjectTiers(sourceProjectId);

  const newTiers: SponsorshipTier[] = [];

  for (const tier of sourceTiers) {
    // Criar cota no projeto destino
    const newTier = await createTier({
      project_id: targetProjectId,
      name: tier.name,
      description: tier.description ?? undefined,
      value: tier.value,
      quantity_total: tier.quantity_total,
      display_order: tier.display_order,
      color: tier.color ?? undefined,
      icon: tier.icon ?? undefined,
      is_active: tier.is_active,
      is_highlighted: tier.is_highlighted,
    });

    // Duplicar contrapartidas
    if (tier.deliverables && tier.deliverables.length > 0) {
      await bulkAddDeliverables(
        newTier.id,
        tier.deliverables.map(d => ({
          category: d.category,
          title: d.title,
          description: d.description ?? undefined,
          quantity: d.quantity ?? undefined,
          display_order: d.display_order,
        }))
      );
    }

    newTiers.push(newTier);
  }

  return newTiers;
}
