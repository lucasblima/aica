/**
 * Goodhart Law Detection Service
 * Sprint 7 — Cross-Module Intelligence
 *
 * "When a measure becomes a target, it ceases to be a good measure."
 * — Goodhart (1984)
 *
 * Detects when Life Score is being gamed — composite score rises while
 * underlying health indicators decline. This is critical to prevent
 * the scoring system from incentivizing hollow optimization.
 *
 * Three detection strategies:
 * 1. Score-health divergence: composite up, but real indicators down
 * 2. Single-domain inflation: one domain carries the score while others stagnate
 * 3. Metric gaming: repetitive low-effort actions to inflate numbers
 */

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';
import type { AicaDomain, ScoreTrend } from './types';

const log = createNamespacedLogger('goodhartDetection');

// ============================================================================
// TYPES
// ============================================================================

export type GoodhartAlertType = 'score_health_divergence' | 'metric_gaming' | 'single_domain_inflation';

export type GoodhartSeverity = 'info' | 'warning' | 'critical';

export interface GoodhartAlert {
  alertType: GoodhartAlertType;
  severity: GoodhartSeverity;
  message: string;
  affectedDomains: AicaDomain[];
  details: Record<string, unknown>;
}

export interface DomainTrend {
  domain: AicaDomain;
  trend: ScoreTrend;
  recentScores: number[];
  currentScore: number;
}

export interface ActivityPattern {
  domain: AicaDomain;
  actionsLast7Days: number;
  uniqueActionTypes: number;
  avgTimeBetweenActions: number; // minutes
}

// ============================================================================
// THRESHOLDS
// ============================================================================

/** Minimum composite increase to trigger divergence check */
const COMPOSITE_INCREASE_THRESHOLD = 0.05;

/** Minimum number of declining domains for divergence alert */
const MIN_DECLINING_FOR_DIVERGENCE = 2;

/** Ratio threshold for single domain inflation (max domain / mean) */
const INFLATION_RATIO_THRESHOLD = 1.8;

/** Minimum actions for gaming detection */
const MIN_ACTIONS_FOR_GAMING = 20;

/** Maximum unique action types before gaming suspicion */
const MAX_UNIQUE_TYPES_FOR_GAMING = 2;

/** Minimum minutes between actions to not be suspicious */
const MIN_AVG_MINUTES_BETWEEN = 1;

// ============================================================================
// 1. SCORE-HEALTH DIVERGENCE
// ============================================================================

/**
 * Detect when Life Score composite is increasing but 2+ domains are declining.
 * This indicates the composite is being propped up by one dominant domain
 * while actual life quality in other areas deteriorates.
 */
export function detectScoreHealthDivergence(
  lifeScoreHistory: { composite: number; computedAt: string }[],
  domainTrends: DomainTrend[]
): GoodhartAlert | null {
  if (lifeScoreHistory.length < 3) return null;

  // Check if composite is increasing
  const recent = lifeScoreHistory.slice(0, 5);
  const oldest = recent[recent.length - 1].composite;
  const newest = recent[0].composite;
  const compositeChange = newest - oldest;

  if (compositeChange < COMPOSITE_INCREASE_THRESHOLD) return null;

  // Check how many domains are declining
  const decliningDomains = domainTrends.filter(d => d.trend === 'declining');

  if (decliningDomains.length < MIN_DECLINING_FOR_DIVERGENCE) return null;

  const affectedDomains = decliningDomains.map(d => d.domain);
  const severity: GoodhartSeverity = decliningDomains.length >= 3 ? 'critical' : 'warning';

  const domainNames = affectedDomains.join(', ');
  const message = severity === 'critical'
    ? `Atenção: seu Life Score subiu, mas ${decliningDomains.length} areas estão em declinio (${domainNames}). O score pode não refletir sua situação real.`
    : `Seu Life Score esta subindo, mas as areas de ${domainNames} estão em declinio. Considere equilibrar sua atenção entre as areas.`;

  return {
    alertType: 'score_health_divergence',
    severity,
    message,
    affectedDomains,
    details: {
      compositeChange: Math.round(compositeChange * 1000) / 1000,
      decliningCount: decliningDomains.length,
      decliningDomains: affectedDomains,
    },
  };
}

// ============================================================================
// 2. SINGLE DOMAIN INFLATION
// ============================================================================

/**
 * Detect when one domain is disproportionately high compared to others.
 * This can indicate gaming — inflating one easy-to-game metric
 * while neglecting the rest.
 */
export function detectSingleDomainInflation(
  domainScores: Record<AicaDomain, number>
): GoodhartAlert | null {
  const entries = Object.entries(domainScores) as [AicaDomain, number][];
  if (entries.length < 3) return null;

  const scores = entries.map(([, v]) => v);
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;

  if (mean === 0) return null;

  // Find inflated domains
  const inflated = entries.filter(([, score]) => score / mean >= INFLATION_RATIO_THRESHOLD);

  if (inflated.length === 0) return null;

  // Find stagnant/low domains
  const lowDomains = entries.filter(([, score]) => score < mean * 0.6);

  if (lowDomains.length < 2) return null;

  const inflatedName = inflated[0][0];
  const inflatedScore = inflated[0][1];
  const severity: GoodhartSeverity = inflatedScore / mean >= 2.5 ? 'warning' : 'info';

  const lowNames = lowDomains.map(([d]) => d).join(', ');
  const message = `A area "${inflatedName}" esta muito acima da media (${(inflatedScore * 100).toFixed(0)}%), enquanto ${lowNames} estão abaixo. Tente distribuir sua atenção de forma mais equilibrada.`;

  return {
    alertType: 'single_domain_inflation',
    severity,
    message,
    affectedDomains: [inflatedName, ...lowDomains.map(([d]) => d)],
    details: {
      inflatedDomain: inflatedName,
      inflatedScore,
      meanScore: Math.round(mean * 1000) / 1000,
      ratio: Math.round((inflatedScore / mean) * 100) / 100,
      lowDomains: lowDomains.map(([d, s]) => ({ domain: d, score: s })),
    },
  };
}

// ============================================================================
// 3. METRIC GAMING DETECTION
// ============================================================================

/**
 * Detect repetitive low-effort actions that inflate scores without real value.
 * Example: creating 50 trivial tasks and marking them done immediately.
 *
 * Signals:
 * - High action count with very few unique action types
 * - Very short time between actions (automated/batch behavior)
 */
export function detectMetricGaming(
  activityPatterns: ActivityPattern[]
): GoodhartAlert | null {
  const suspiciousDomains: ActivityPattern[] = [];

  for (const pattern of activityPatterns) {
    const isSuspicious =
      pattern.actionsLast7Days >= MIN_ACTIONS_FOR_GAMING &&
      pattern.uniqueActionTypes <= MAX_UNIQUE_TYPES_FOR_GAMING &&
      pattern.avgTimeBetweenActions < MIN_AVG_MINUTES_BETWEEN;

    if (isSuspicious) {
      suspiciousDomains.push(pattern);
    }
  }

  if (suspiciousDomains.length === 0) return null;

  const affectedDomains = suspiciousDomains.map(p => p.domain);
  const severity: GoodhartSeverity = suspiciousDomains.length >= 2 ? 'warning' : 'info';

  const domainNames = affectedDomains.join(', ');
  const message = `Detectamos um padrão de ações repetitivas em ${domainNames}. Ações rapidas e repetitivas podem inflar o score sem beneficio real. Tente focar em atividades mais significativas.`;

  return {
    alertType: 'metric_gaming',
    severity,
    message,
    affectedDomains,
    details: {
      suspiciousPatterns: suspiciousDomains.map(p => ({
        domain: p.domain,
        actions: p.actionsLast7Days,
        uniqueTypes: p.uniqueActionTypes,
        avgMinutes: Math.round(p.avgTimeBetweenActions * 10) / 10,
      })),
    },
  };
}

// ============================================================================
// AGGREGATE DETECTION
// ============================================================================

/**
 * Run all Goodhart detection strategies and return any alerts found.
 */
export function generateGoodhartAlerts(
  lifeScoreHistory: { composite: number; computedAt: string }[],
  domainTrends: DomainTrend[],
  domainScores: Record<AicaDomain, number>,
  activityPatterns: ActivityPattern[] = []
): GoodhartAlert[] {
  const alerts: GoodhartAlert[] = [];

  const divergenceAlert = detectScoreHealthDivergence(lifeScoreHistory, domainTrends);
  if (divergenceAlert) alerts.push(divergenceAlert);

  const inflationAlert = detectSingleDomainInflation(domainScores);
  if (inflationAlert) alerts.push(inflationAlert);

  const gamingAlert = detectMetricGaming(activityPatterns);
  if (gamingAlert) alerts.push(gamingAlert);

  return alerts;
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Store a Goodhart alert in the database.
 */
export async function storeGoodhartAlert(alert: GoodhartAlert): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('goodhart_alerts')
      .insert({
        user_id: user.id,
        alert_type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        affected_domains: alert.affectedDomains,
        details: alert.details,
      });

    if (error) throw error;
    log.info('Alerta Goodhart armazenado', { type: alert.alertType, severity: alert.severity });
  } catch (err) {
    log.error('Erro ao armazenar alerta Goodhart:', err);
    throw err;
  }
}

/**
 * Fetch unacknowledged Goodhart alerts for the current user.
 */
export async function getUnacknowledgedAlerts(): Promise<GoodhartAlert[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('goodhart_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('acknowledged', false)
      .order('created_at', { ascending: false });

    if (error) return [];

    return (data || []).map(d => ({
      alertType: d.alert_type as GoodhartAlertType,
      severity: d.severity as GoodhartSeverity,
      message: d.message,
      affectedDomains: (d.affected_domains || []) as AicaDomain[],
      details: d.details || {},
    }));
  } catch (err) {
    log.error('Erro ao buscar alertas Goodhart:', err);
    return [];
  }
}

/**
 * Mark a Goodhart alert as acknowledged.
 */
export async function acknowledgeAlert(alertId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('goodhart_alerts')
      .update({ acknowledged: true })
      .eq('id', alertId);

    if (error) throw error;
    log.info('Alerta Goodhart reconhecido', { alertId });
  } catch (err) {
    log.error('Erro ao reconhecer alerta Goodhart:', err);
    throw err;
  }
}
