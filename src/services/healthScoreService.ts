/**
 * Health Score Service
 * Issue #144: [WhatsApp AI] feat: Automated Relationship Health Score Calculation
 *
 * Frontend service for health score operations:
 * - Calculate health scores (single contact or batch)
 * - Get health score history
 * - Get contacts at risk
 * - Get health score statistics
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { consciousnessPointsService } from '@/services/consciousnessPointsService';
import type {
  HealthScoreHistory,
  ContactAtRisk,
  ContactWithHealthScore,
  SingleCalculateResponse,
  HealthScoreStats,
  HealthScoreAlert,
  HealthScoreTrend,
} from '@/types/healthScore';

const log = createNamespacedLogger('HealthScoreService');

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 50;

// ============================================================================
// CALCULATE HEALTH SCORES
// ============================================================================

/**
 * Calculate health score for a single contact
 * Calls the Edge Function to recalculate and update the contact's health score
 */
export async function calculateHealthScore(
  contactId: string
): Promise<SingleCalculateResponse> {
  log.info('Calculating health score for contact:', contactId);

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  const response = await supabase.functions.invoke('calculate-health-scores', {
    body: { contactId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.error) {
    log.error('Calculate health score error:', response.error);
    throw new Error(response.error.message || 'Failed to calculate health score');
  }

  const result = response.data as SingleCalculateResponse;

  if (!result.success) {
    throw new Error(result.error || 'Failed to calculate health score');
  }

  log.info('Health score calculated:', {
    contactId,
    score: result.healthScore,
    trend: result.trend,
  });

  return result;
}

// ============================================================================
// GET HEALTH SCORE HISTORY
// ============================================================================

/**
 * Get health score history for a contact
 */
export async function getHealthScoreHistory(
  contactId: string,
  limit = 30
): Promise<HealthScoreHistory[]> {
  const { data, error } = await supabase
    .from('contact_health_history')
    .select('*')
    .eq('contact_id', contactId)
    .order('calculated_at', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('Get health score history error:', error);
    throw error;
  }

  return data as HealthScoreHistory[];
}

/**
 * Get recent health score alerts for the current user
 */
export async function getHealthScoreAlerts(
  limit = 20,
  onlyUnacknowledged = true
): Promise<HealthScoreAlert[]> {
  let query = supabase
    .from('contact_health_history')
    .select(`
      id,
      contact_id,
      alert_type,
      score,
      previous_score,
      score_delta,
      calculated_at,
      contact_network!inner (
        name,
        whatsapp_name,
        phone_number
      )
    `)
    .eq('alert_generated', true)
    .order('calculated_at', { ascending: false })
    .limit(limit);

  if (onlyUnacknowledged) {
    // For now, show all alerts since we don't have acknowledged field in history
    // This could be enhanced later with a separate alerts table
  }

  const { data, error } = await query;

  if (error) {
    log.error('Get health score alerts error:', error);
    throw error;
  }

  // Transform the data to match HealthScoreAlert interface
  return (data || []).map((item: any) => ({
    id: item.id,
    contact_id: item.contact_id,
    contact_name: item.contact_network?.name || item.contact_network?.whatsapp_name || item.contact_network?.phone_number || 'Unknown',
    alert_type: item.alert_type,
    score: item.score,
    previous_score: item.previous_score,
    score_delta: item.score_delta,
    created_at: item.calculated_at,
    acknowledged: false,
    acknowledged_at: null,
  }));
}

// ============================================================================
// GET CONTACTS AT RISK
// ============================================================================

/**
 * Get contacts at risk (health_score < 40)
 * Uses the v_contacts_at_risk view
 */
export async function getContactsAtRisk(
  limit = DEFAULT_PAGE_SIZE
): Promise<ContactAtRisk[]> {
  const { data, error } = await supabase
    .from('v_contacts_at_risk')
    .select('*')
    .limit(limit);

  if (error) {
    log.error('Get contacts at risk error:', error);
    throw error;
  }

  return data as ContactAtRisk[];
}

/**
 * Get contacts at risk count
 */
export async function getContactsAtRiskCount(): Promise<number> {
  const { count, error } = await supabase
    .from('v_contacts_at_risk')
    .select('*', { count: 'exact', head: true });

  if (error) {
    log.error('Get contacts at risk count error:', error);
    throw error;
  }

  return count || 0;
}

/**
 * Record that user cared for an at-risk contact
 * Awards +8 CP (Gamification 2.0: Connection category)
 *
 * Call this when:
 * - User initiates a message to an at-risk contact
 * - User acknowledges an alert and takes action
 * - User schedules a follow-up with an at-risk contact
 */
export async function recordRelationshipCare(
  contactId: string,
  contactName: string
): Promise<{
  success: boolean;
  cpAwarded: number;
  message?: string;
}> {
  try {
    log.info('Recording relationship care', { contactId, contactName });

    // Award CP for relationship care
    const cpResult = await consciousnessPointsService.awardRelationshipCareCP(
      (await supabase.auth.getUser()).data.user?.id || '',
      contactId,
      contactName
    );

    if (cpResult.success) {
      log.info('CP awarded for relationship care', {
        contactId,
        contactName,
        cpAwarded: cpResult.awarded,
      });
    }

    return {
      success: cpResult.success,
      cpAwarded: cpResult.awarded,
      message: cpResult.success
        ? `+${cpResult.awarded} CP por cuidar de ${contactName}`
        : undefined,
    };
  } catch (error) {
    log.error('Error recording relationship care', { contactId, error });
    return {
      success: false,
      cpAwarded: 0,
      message: 'Erro ao registrar cuidado relacional',
    };
  }
}

/**
 * Mark an at-risk alert as acknowledged and optionally record care action
 */
export async function acknowledgeHealthAlert(
  alertId: string,
  options: {
    contactId?: string;
    contactName?: string;
    recordCare?: boolean;
  } = {}
): Promise<{
  success: boolean;
  cpAwarded?: number;
}> {
  try {
    // For now, we don't have a separate alerts table with acknowledged field
    // This is a placeholder for future implementation
    log.info('Acknowledging health alert', { alertId, options });

    // If recordCare is true and we have contact info, award CP
    if (options.recordCare && options.contactId && options.contactName) {
      const careResult = await recordRelationshipCare(
        options.contactId,
        options.contactName
      );
      return {
        success: true,
        cpAwarded: careResult.cpAwarded,
      };
    }

    return { success: true };
  } catch (error) {
    log.error('Error acknowledging health alert', { alertId, error });
    return { success: false };
  }
}

// ============================================================================
// GET CONTACTS WITH HEALTH SCORES
// ============================================================================

/**
 * Get all contacts with their health scores
 */
export async function getContactsWithHealthScores(
  options: {
    limit?: number;
    offset?: number;
    sortBy?: 'health_score' | 'last_contact_at' | 'name';
    sortOrder?: 'asc' | 'desc';
    minScore?: number;
    maxScore?: number;
    trend?: HealthScoreTrend;
  } = {}
): Promise<{ data: ContactWithHealthScore[]; count: number }> {
  const {
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
    sortBy = 'health_score',
    sortOrder = 'asc',
    minScore,
    maxScore,
    trend,
  } = options;

  let query = supabase
    .from('contact_network')
    .select(`
      id,
      user_id,
      name,
      phone_number,
      profile_picture_url,
      relationship_type,
      health_score,
      health_score_components,
      health_score_trend,
      health_score_updated_at,
      last_contact_at
    `, { count: 'exact' })
    .is('deleted_at', null)
    .not('health_score', 'is', null);

  // Apply filters
  if (minScore !== undefined) {
    query = query.gte('health_score', minScore);
  }
  if (maxScore !== undefined) {
    query = query.lte('health_score', maxScore);
  }
  if (trend) {
    query = query.eq('health_score_trend', trend);
  }

  // Apply sorting
  const ascending = sortOrder === 'asc';
  if (sortBy === 'health_score') {
    query = query.order('health_score', { ascending, nullsFirst: false });
  } else if (sortBy === 'last_contact_at') {
    query = query.order('last_contact_at', { ascending, nullsFirst: false });
  } else if (sortBy === 'name') {
    query = query.order('name', { ascending, nullsFirst: false });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    log.error('Get contacts with health scores error:', error);
    throw error;
  }

  return {
    data: data as ContactWithHealthScore[],
    count: count || 0,
  };
}

/**
 * Get a single contact with health score
 */
export async function getContactHealthScore(
  contactId: string
): Promise<ContactWithHealthScore | null> {
  const { data, error } = await supabase
    .from('contact_network')
    .select(`
      id,
      user_id,
      name,
      phone_number,
      profile_picture_url,
      relationship_type,
      health_score,
      health_score_components,
      health_score_trend,
      health_score_updated_at,
      last_contact_at
    `)
    .eq('id', contactId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    log.error('Get contact health score error:', error);
    throw error;
  }

  return data as ContactWithHealthScore;
}

// ============================================================================
// HEALTH SCORE STATISTICS
// ============================================================================

/**
 * Get health score statistics for the current user
 */
export async function getHealthScoreStats(): Promise<HealthScoreStats> {
  const { data, error } = await supabase
    .from('contact_network')
    .select('health_score, health_score_trend, health_score_updated_at')
    .is('deleted_at', null)
    .not('health_score', 'is', null);

  if (error) {
    log.error('Get health score stats error:', error);
    throw error;
  }

  const contacts = data || [];
  const totalContacts = contacts.length;

  if (totalContacts === 0) {
    return {
      totalContacts: 0,
      healthyContacts: 0,
      atRiskContacts: 0,
      criticalContacts: 0,
      averageScore: 0,
      improvedContacts: 0,
      decliningContacts: 0,
      lastCalculatedAt: null,
    };
  }

  const healthyContacts = contacts.filter(c => c.health_score >= 60).length;
  const atRiskContacts = contacts.filter(c => c.health_score >= 20 && c.health_score < 40).length;
  const criticalContacts = contacts.filter(c => c.health_score < 20).length;
  const averageScore = Math.round(
    contacts.reduce((sum, c) => sum + c.health_score, 0) / totalContacts
  );
  const improvedContacts = contacts.filter(c => c.health_score_trend === 'improving').length;
  const decliningContacts = contacts.filter(c => c.health_score_trend === 'declining').length;

  // Find the most recent calculation timestamp
  const timestamps = contacts
    .map(c => c.health_score_updated_at)
    .filter(Boolean)
    .sort()
    .reverse();
  const lastCalculatedAt = timestamps[0] || null;

  return {
    totalContacts,
    healthyContacts,
    atRiskContacts,
    criticalContacts,
    averageScore,
    improvedContacts,
    decliningContacts,
    lastCalculatedAt,
  };
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  calculateHealthScore,
  getHealthScoreHistory,
  getHealthScoreAlerts,
  getContactsAtRisk,
  getContactsAtRiskCount,
  recordRelationshipCare, // Gamification 2.0: Awards +8 CP
  acknowledgeHealthAlert, // Gamification 2.0: Awards CP on acknowledge
  getContactsWithHealthScores,
  getContactHealthScore,
  getHealthScoreStats,
};
