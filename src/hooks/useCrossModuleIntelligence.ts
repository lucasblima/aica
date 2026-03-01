/**
 * Cross-Module Intelligence Hook
 * Sprint 7 — Orchestrates correlation analysis, Goodhart detection, sabbatical
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Provides a unified interface for:
 * - Correlation analysis between Life Score domains
 * - Goodhart divergence alerts (score vs. real health)
 * - Digital sabbatical state and suggestions
 *
 * Backend services (correlationAnalysisService, goodhartDetectionService,
 * digitalSabbaticalService) are being created in parallel. This hook uses
 * Supabase directly for now and will be wired to services once they exist.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';

const log = createNamespacedLogger('useCrossModuleIntelligence');

// ============================================================================
// TYPES (matching the backend services being created in parallel)
// ============================================================================

export interface CorrelationResult {
  domainA: string;
  domainB: string;
  coefficient: number;
  sampleSize: number;
  isSignificant: boolean;
  strength: 'strong' | 'moderate' | 'weak' | 'negligible';
  direction: 'positive' | 'negative';
}

export interface GoodhartAlert {
  id: string;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  affectedDomains: string[];
  acknowledged: boolean;
  createdAt: string;
}

export interface SabbaticalState {
  consecutiveActiveDays: number;
  sabbaticalSuggested: boolean;
  isOnSabbatical: boolean;
  sabbaticalEndDate: string | null;
  totalSabbaticalsTaken: number;
}

export interface SabbaticalSuggestion {
  eligible: boolean;
  message: string;
  suggestedDays: number;
  reason: string;
}

export interface CrossModuleIntelligenceReturn {
  /** Domain correlations */
  correlations: CorrelationResult[];
  /** Strongest correlation found */
  strongestCorrelation: CorrelationResult | null;
  /** Goodhart divergence alerts */
  alerts: GoodhartAlert[];
  /** Count of unacknowledged alerts */
  unacknowledgedCount: number;
  /** Acknowledge a Goodhart alert */
  acknowledgeAlert: (alertId: string) => Promise<void>;
  /** Digital sabbatical state */
  sabbatical: SabbaticalState | null;
  /** Sabbatical suggestion text */
  sabbaticalSuggestion: SabbaticalSuggestion | null;
  /** Start a digital sabbatical */
  startSabbatical: (days: number) => Promise<void>;
  /** End a digital sabbatical early */
  endSabbatical: () => Promise<void>;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh all data */
  refresh: () => Promise<void>;
}

// ============================================================================
// DEFAULT STATES
// ============================================================================

const DEFAULT_SABBATICAL: SabbaticalState = {
  consecutiveActiveDays: 0,
  sabbaticalSuggested: false,
  isOnSabbatical: false,
  sabbaticalEndDate: null,
  totalSabbaticalsTaken: 0,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCrossModuleIntelligence(options: {
  autoFetch?: boolean;
} = {}): CrossModuleIntelligenceReturn {
  const { autoFetch = true } = options;

  // Correlations state
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([]);

  // Goodhart alerts state
  const [alerts, setAlerts] = useState<GoodhartAlert[]>([]);

  // Sabbatical state
  const [sabbatical, setSabbatical] = useState<SabbaticalState | null>(null);
  const [sabbaticalSuggestion, setSabbaticalSuggestion] = useState<SabbaticalSuggestion | null>(null);

  // General state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // FETCH CORRELATIONS
  // ============================================================================

  const fetchCorrelations = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .rpc('get_stored_correlations');

      if (dbError) {
        log.warn('Correlations fetch failed (RPC may not exist yet):', dbError.message);
        return;
      }

      if (data && Array.isArray(data)) {
        const results: CorrelationResult[] = data.map((row: Record<string, unknown>) => ({
          domainA: row.domain_a as string,
          domainB: row.domain_b as string,
          coefficient: row.coefficient as number,
          sampleSize: row.sample_size as number,
          isSignificant: row.is_significant as boolean,
          strength: row.strength as CorrelationResult['strength'],
          direction: row.direction as CorrelationResult['direction'],
        }));
        setCorrelations(results);
      }
    } catch (err) {
      log.warn('Correlations fetch error:', err);
    }
  }, []);

  // ============================================================================
  // FETCH GOODHART ALERTS
  // ============================================================================

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('goodhart_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (dbError) {
        log.warn('Goodhart alerts fetch failed (table may not exist yet):', dbError.message);
        return;
      }

      if (data && Array.isArray(data)) {
        const mapped: GoodhartAlert[] = data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          alertType: row.alert_type as string,
          severity: row.severity as GoodhartAlert['severity'],
          message: row.message as string,
          affectedDomains: (row.affected_domains as string[]) ?? [],
          acknowledged: row.acknowledged as boolean,
          createdAt: row.created_at as string,
        }));
        setAlerts(mapped);
      }
    } catch (err) {
      log.warn('Goodhart alerts fetch error:', err);
    }
  }, []);

  // ============================================================================
  // FETCH SABBATICAL STATE
  // ============================================================================

  const fetchSabbatical = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .rpc('get_sabbatical_state');

      if (dbError) {
        log.warn('Sabbatical state fetch failed (RPC may not exist yet):', dbError.message);
        setSabbatical({ ...DEFAULT_SABBATICAL });
        return;
      }

      if (data && typeof data === 'object') {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          setSabbatical({
            consecutiveActiveDays: (row.consecutive_active_days as number) ?? 0,
            sabbaticalSuggested: (row.sabbatical_suggested as boolean) ?? false,
            isOnSabbatical: (row.is_on_sabbatical as boolean) ?? false,
            sabbaticalEndDate: (row.sabbatical_end_date as string) ?? null,
            totalSabbaticalsTaken: (row.total_sabbaticals_taken as number) ?? 0,
          });

          // Generate suggestion if eligible
          const activeDays = (row.consecutive_active_days as number) ?? 0;
          if (activeDays >= 30 && !(row.is_on_sabbatical as boolean)) {
            setSabbaticalSuggestion({
              eligible: true,
              message: `Você está ativo há ${activeDays} dias consecutivos. Considere uma pausa para recarregar.`,
              suggestedDays: activeDays >= 60 ? 3 : 2,
              reason: 'Uso contínuo prolongado pode levar a fadiga de métricas e redução do bem-estar.',
            });
          } else {
            setSabbaticalSuggestion(null);
          }
        } else {
          setSabbatical({ ...DEFAULT_SABBATICAL });
        }
      } else {
        setSabbatical({ ...DEFAULT_SABBATICAL });
      }
    } catch (err) {
      log.warn('Sabbatical state fetch error:', err);
      setSabbatical({ ...DEFAULT_SABBATICAL });
    }
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const { error: dbError } = await supabase
        .from('goodhart_alerts')
        .update({ acknowledged: true })
        .eq('id', alertId);

      if (dbError) {
        log.error('Failed to acknowledge alert:', dbError.message);
        throw new Error(dbError.message);
      }

      setAlerts(prev => prev.filter(a => a.id !== alertId));
      log.info('Goodhart alert acknowledged:', alertId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao reconhecer alerta';
      setError(msg);
      log.error('Acknowledge alert error:', msg);
    }
  }, []);

  const startSabbatical = useCallback(async (days: number) => {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const { error: dbError } = await supabase
        .rpc('start_sabbatical', { p_days: days });

      if (dbError) {
        log.error('Failed to start sabbatical:', dbError.message);
        throw new Error(dbError.message);
      }

      setSabbatical(prev => prev ? {
        ...prev,
        isOnSabbatical: true,
        sabbaticalEndDate: endDate.toISOString(),
        totalSabbaticalsTaken: prev.totalSabbaticalsTaken + 1,
      } : null);

      setSabbaticalSuggestion(null);
      log.info('Sabbatical started:', { days });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao iniciar sabbatical';
      setError(msg);
      log.error('Start sabbatical error:', msg);
    }
  }, []);

  const endSabbatical = useCallback(async () => {
    try {
      const { error: dbError } = await supabase
        .rpc('end_sabbatical');

      if (dbError) {
        log.error('Failed to end sabbatical:', dbError.message);
        throw new Error(dbError.message);
      }

      setSabbatical(prev => prev ? {
        ...prev,
        isOnSabbatical: false,
        sabbaticalEndDate: null,
        consecutiveActiveDays: 0,
      } : null);

      log.info('Sabbatical ended');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao encerrar sabbatical';
      setError(msg);
      log.error('End sabbatical error:', msg);
    }
  }, []);

  // ============================================================================
  // REFRESH ALL
  // ============================================================================

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.allSettled([
        fetchCorrelations(),
        fetchAlerts(),
        fetchSabbatical(),
      ]);

      log.info('Cross-module intelligence refreshed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar dados';
      setError(msg);
      log.error('Refresh error:', msg);
    } finally {
      setLoading(false);
    }
  }, [fetchCorrelations, fetchAlerts, fetchSabbatical]);

  // ============================================================================
  // AUTO-FETCH ON MOUNT
  // ============================================================================

  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const strongestCorrelation = useMemo(() => {
    if (correlations.length === 0) return null;
    return correlations.reduce((strongest, current) =>
      Math.abs(current.coefficient) > Math.abs(strongest.coefficient) ? current : strongest
    );
  }, [correlations]);

  const unacknowledgedCount = useMemo(() => {
    return alerts.filter(a => !a.acknowledged).length;
  }, [alerts]);

  // ============================================================================
  // RETURN
  // ============================================================================

  const returnValue = useMemo(() => ({
    correlations,
    strongestCorrelation,
    alerts,
    unacknowledgedCount,
    acknowledgeAlert,
    sabbatical,
    sabbaticalSuggestion,
    startSabbatical,
    endSabbatical,
    loading,
    error,
    refresh,
  }), [
    correlations,
    strongestCorrelation,
    alerts,
    unacknowledgedCount,
    acknowledgeAlert,
    sabbatical,
    sabbaticalSuggestion,
    startSabbatical,
    endSabbatical,
    loading,
    error,
    refresh,
  ]);

  return returnValue;
}

export default useCrossModuleIntelligence;
