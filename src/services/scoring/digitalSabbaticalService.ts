/**
 * Digital Sabbatical Service
 * Sprint 7 — Cross-Module Intelligence
 *
 * Enforces healthy engagement patterns by suggesting breaks after prolonged
 * consecutive usage. Inspired by Newport (2019) "Digital Minimalism" and
 * engagement sustainability research.
 *
 * Rules:
 * - After 30 consecutive active days: suggest 2-3 day break
 * - After 60 days: stronger suggestion
 * - During sabbatical: reduce gamification pressure (no streak loss, no alerts)
 * - Track total sabbaticals taken for engagement health metrics
 *
 * CONTESTED: Specific thresholds (30 days, 2-3 day break) are practical
 * heuristics, not from controlled studies.
 */

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';

const log = createNamespacedLogger('digitalSabbatical');

// ============================================================================
// TYPES
// ============================================================================

export interface SabbaticalState {
  consecutiveActiveDays: number;
  lastActiveDate: string | null;
  sabbaticalSuggestedAt: string | null;
  sabbaticalAccepted: boolean | null;
  sabbaticalStartDate: string | null;
  sabbaticalEndDate: string | null;
  totalSabbaticalsTaken: number;
  isOnSabbatical: boolean;
}

export interface SabbaticalSuggestion {
  eligible: boolean;
  message: string;
  suggestedDays: number;
  urgency: 'gentle' | 'moderate' | 'strong';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Days of consecutive activity before suggesting a sabbatical */
const GENTLE_THRESHOLD = 30;

/** Days of consecutive activity for a stronger suggestion */
const MODERATE_THRESHOLD = 45;

/** Days of consecutive activity for a strong suggestion */
const STRONG_THRESHOLD = 60;

/** Default sabbatical duration (days) */
const DEFAULT_SABBATICAL_DAYS = 2;

/** Strong sabbatical duration (days) */
const STRONG_SABBATICAL_DAYS = 3;

// ============================================================================
// DAILY ACTIVITY TRACKING
// ============================================================================

/**
 * Record daily activity for the current user.
 * Increments consecutive days counter or resets if there was a gap.
 * Returns the updated state and any sabbatical suggestion.
 */
export async function recordDailyActivity(): Promise<{
  state: SabbaticalState;
  suggestion: SabbaticalSuggestion | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get current state
    const currentState = await getSabbaticalState();

    // If on sabbatical, don't count activity
    if (currentState.isOnSabbatical) {
      log.info('Usuario em sabbatico, atividade nao contabilizada');
      return { state: currentState, suggestion: null };
    }

    // Already recorded today
    if (currentState.lastActiveDate === today) {
      const suggestion = checkSabbaticalEligibility(currentState);
      return { state: currentState, suggestion };
    }

    // Check if consecutive or gap
    let newConsecutiveDays: number;
    if (currentState.lastActiveDate) {
      const lastDate = new Date(currentState.lastActiveDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);

      if (diffDays === 1) {
        // Consecutive day
        newConsecutiveDays = currentState.consecutiveActiveDays + 1;
      } else if (diffDays === 0) {
        // Same day (shouldn't reach here due to check above)
        newConsecutiveDays = currentState.consecutiveActiveDays;
      } else {
        // Gap detected — reset counter
        newConsecutiveDays = 1;
      }
    } else {
      // First activity ever
      newConsecutiveDays = 1;
    }

    // Upsert state
    const { error } = await supabase
      .from('digital_sabbatical_state')
      .upsert({
        user_id: user.id,
        consecutive_active_days: newConsecutiveDays,
        last_active_date: today,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      log.error('Erro ao atualizar estado de atividade:', error.message);
      throw error;
    }

    const updatedState: SabbaticalState = {
      ...currentState,
      consecutiveActiveDays: newConsecutiveDays,
      lastActiveDate: today,
    };

    const suggestion = checkSabbaticalEligibility(updatedState);

    // If a suggestion is generated and not yet recorded, record it
    if (suggestion?.eligible && !currentState.sabbaticalSuggestedAt) {
      await supabase
        .from('digital_sabbatical_state')
        .update({ sabbatical_suggested_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }

    log.info('Atividade diaria registrada', {
      consecutiveDays: newConsecutiveDays,
      eligible: suggestion?.eligible ?? false,
    });

    return { state: updatedState, suggestion };
  } catch (err) {
    log.error('Erro ao registrar atividade diaria:', err);
    throw err;
  }
}

// ============================================================================
// SABBATICAL ELIGIBILITY
// ============================================================================

/**
 * Check if the user is eligible for a sabbatical suggestion.
 * Returns a suggestion with urgency level and PT-BR message.
 */
export function checkSabbaticalEligibility(state: SabbaticalState): SabbaticalSuggestion | null {
  if (state.isOnSabbatical) return null;
  if (state.consecutiveActiveDays < GENTLE_THRESHOLD) return null;

  const days = state.consecutiveActiveDays;

  if (days >= STRONG_THRESHOLD) {
    return {
      eligible: true,
      message: `Voce esta ativo ha ${days} dias consecutivos! Isso e impressionante, mas descansar e essencial. Sugerimos uma pausa de ${STRONG_SABBATICAL_DAYS} dias para recarregar. Durante a pausa, suas sequencias ficam protegidas.`,
      suggestedDays: STRONG_SABBATICAL_DAYS,
      urgency: 'strong',
    };
  }

  if (days >= MODERATE_THRESHOLD) {
    return {
      eligible: true,
      message: `${days} dias consecutivos de uso! Considere uma pausa de ${DEFAULT_SABBATICAL_DAYS}-${STRONG_SABBATICAL_DAYS} dias. Pesquisas mostram que pausas periodicas melhoram o engajamento a longo prazo.`,
      suggestedDays: DEFAULT_SABBATICAL_DAYS,
      urgency: 'moderate',
    };
  }

  // GENTLE_THRESHOLD <= days < MODERATE_THRESHOLD
  return {
    eligible: true,
    message: `Voce esta usando o AICA ha ${days} dias seguidos. Que tal uma pausa de ${DEFAULT_SABBATICAL_DAYS} dias? Suas sequencias e pontuacoes ficam protegidas durante o descanso.`,
    suggestedDays: DEFAULT_SABBATICAL_DAYS,
    urgency: 'gentle',
  };
}

// ============================================================================
// SABBATICAL LIFECYCLE
// ============================================================================

/**
 * Start a sabbatical period.
 * During sabbatical: no streak loss, no Goodhart alerts, no gamification pressure.
 *
 * @param days - Duration of sabbatical (2-7 days)
 */
export async function startSabbatical(days: number = DEFAULT_SABBATICAL_DAYS): Promise<SabbaticalState> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const clampedDays = Math.max(2, Math.min(days, 7));
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + clampedDays * 86400000).toISOString().split('T')[0];

    const { error } = await supabase
      .from('digital_sabbatical_state')
      .upsert({
        user_id: user.id,
        sabbatical_accepted: true,
        sabbatical_start_date: startDate,
        sabbatical_end_date: endDate,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;

    log.info('Sabbatico digital iniciado', { startDate, endDate, days: clampedDays });
    return getSabbaticalState();
  } catch (err) {
    log.error('Erro ao iniciar sabbatico:', err);
    throw err;
  }
}

/**
 * End the current sabbatical.
 * Resets consecutive active days counter and increments total sabbaticals.
 */
export async function endSabbatical(): Promise<SabbaticalState> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const currentState = await getSabbaticalState();

    const { error } = await supabase
      .from('digital_sabbatical_state')
      .update({
        consecutive_active_days: 0,
        sabbatical_accepted: null,
        sabbatical_start_date: null,
        sabbatical_end_date: null,
        sabbatical_suggested_at: null,
        total_sabbaticals_taken: currentState.totalSabbaticalsTaken + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;

    log.info('Sabbatico digital encerrado', {
      totalSabbaticals: currentState.totalSabbaticalsTaken + 1,
    });

    return getSabbaticalState();
  } catch (err) {
    log.error('Erro ao encerrar sabbatico:', err);
    throw err;
  }
}

// ============================================================================
// STATE RETRIEVAL
// ============================================================================

/**
 * Get current sabbatical state for the authenticated user.
 */
export async function getSabbaticalState(): Promise<SabbaticalState> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return getDefaultState();
    }

    const { data, error } = await supabase
      .from('digital_sabbatical_state')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return getDefaultState();
    }

    const today = new Date().toISOString().split('T')[0];
    const isOnSabbatical = !!(
      data.sabbatical_accepted &&
      data.sabbatical_start_date &&
      data.sabbatical_end_date &&
      data.sabbatical_start_date <= today &&
      data.sabbatical_end_date >= today
    );

    // Auto-end expired sabbaticals
    if (
      data.sabbatical_accepted &&
      data.sabbatical_end_date &&
      data.sabbatical_end_date < today
    ) {
      // Sabbatical expired — end it automatically
      await endSabbaticalSilently(user.id, data.total_sabbaticals_taken ?? 0);
      return {
        ...getDefaultState(),
        totalSabbaticalsTaken: (data.total_sabbaticals_taken ?? 0) + 1,
      };
    }

    return {
      consecutiveActiveDays: data.consecutive_active_days ?? 0,
      lastActiveDate: data.last_active_date,
      sabbaticalSuggestedAt: data.sabbatical_suggested_at,
      sabbaticalAccepted: data.sabbatical_accepted,
      sabbaticalStartDate: data.sabbatical_start_date,
      sabbaticalEndDate: data.sabbatical_end_date,
      totalSabbaticalsTaken: data.total_sabbaticals_taken ?? 0,
      isOnSabbatical,
    };
  } catch (err) {
    log.error('Erro ao buscar estado de sabbatico:', err);
    return getDefaultState();
  }
}

/**
 * Get a sabbatical suggestion message if the user is eligible.
 * Returns null if not eligible.
 */
export async function getSabbaticalSuggestion(): Promise<SabbaticalSuggestion | null> {
  const state = await getSabbaticalState();
  return checkSabbaticalEligibility(state);
}

// ============================================================================
// HELPERS
// ============================================================================

function getDefaultState(): SabbaticalState {
  return {
    consecutiveActiveDays: 0,
    lastActiveDate: null,
    sabbaticalSuggestedAt: null,
    sabbaticalAccepted: null,
    sabbaticalStartDate: null,
    sabbaticalEndDate: null,
    totalSabbaticalsTaken: 0,
    isOnSabbatical: false,
  };
}

/**
 * Silently end an expired sabbatical without triggering the full flow.
 */
async function endSabbaticalSilently(userId: string, currentTotal: number): Promise<void> {
  try {
    await supabase
      .from('digital_sabbatical_state')
      .update({
        consecutive_active_days: 0,
        sabbatical_accepted: null,
        sabbatical_start_date: null,
        sabbatical_end_date: null,
        sabbatical_suggested_at: null,
        total_sabbaticals_taken: currentTotal + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } catch {
    // Silent — don't break the read flow
  }
}
