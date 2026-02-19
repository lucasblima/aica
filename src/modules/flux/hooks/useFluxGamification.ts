/**
 * useFluxGamification Hook
 *
 * Tracks Flux module user activities and awards XP/badges.
 * Integrates with the main gamification system to reward coaching activities.
 *
 * Events tracked:
 * - athlete_created (50 XP)
 * - microcycle_completed (100 XP)
 * - workout_supervised (25 XP)
 * - alert_resolved (30 XP)
 * - feedback_reviewed (15 XP)
 */

import { useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { addXP, awardAchievement, FLUX_XP_REWARDS, BADGES_CATALOG } from '@/services/gamificationService';
import { useXPNotifications } from '@/contexts/XPNotificationContext';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useFluxGamification');

export interface FluxGamificationHook {
  trackAthleteCreated: () => Promise<void>;
  trackMicrocycleCompleted: () => Promise<void>;
  trackWorkoutSupervised: () => Promise<void>;
  trackAlertResolved: () => Promise<void>;
  trackFeedbackReviewed: () => Promise<void>;
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new Error(`Auth error: ${error.message}`);
  if (!user) throw new Error('User not authenticated');
  return user.id;
}

export function useFluxGamification(): FluxGamificationHook {
  const { showXPGain, showBadgeUnlock } = useXPNotifications();

  const trackAthleteCreated = useCallback(async () => {
    try {
      const userId = await getAuthenticatedUserId();

      await addXP(userId, FLUX_XP_REWARDS.athlete_created);
      showXPGain(FLUX_XP_REWARDS.athlete_created);

      // Award "Primeiro Atleta" badge
      const achievement = await awardAchievement(userId, 'first_athlete');
      if (achievement) {
        const badge = BADGES_CATALOG.first_athlete;
        if (badge) showBadgeUnlock(badge as any);
      }

      log.debug('Tracked athlete_created', { xp: FLUX_XP_REWARDS.athlete_created });
    } catch (error) {
      log.error('trackAthleteCreated error:', error);
    }
  }, [showXPGain, showBadgeUnlock]);

  const trackMicrocycleCompleted = useCallback(async () => {
    try {
      const userId = await getAuthenticatedUserId();

      await addXP(userId, FLUX_XP_REWARDS.microcycle_completed);
      showXPGain(FLUX_XP_REWARDS.microcycle_completed);

      // Award "Microciclo Completo" badge
      const achievement = await awardAchievement(userId, 'microcycle_complete');
      if (achievement) {
        const badge = BADGES_CATALOG.microcycle_complete;
        if (badge) showBadgeUnlock(badge as any);
      }

      log.debug('Tracked microcycle_completed', { xp: FLUX_XP_REWARDS.microcycle_completed });
    } catch (error) {
      log.error('trackMicrocycleCompleted error:', error);
    }
  }, [showXPGain, showBadgeUnlock]);

  const trackWorkoutSupervised = useCallback(async () => {
    try {
      const userId = await getAuthenticatedUserId();

      await addXP(userId, FLUX_XP_REWARDS.workout_supervised);
      showXPGain(FLUX_XP_REWARDS.workout_supervised);

      log.debug('Tracked workout_supervised', { xp: FLUX_XP_REWARDS.workout_supervised });
    } catch (error) {
      log.error('trackWorkoutSupervised error:', error);
    }
  }, [showXPGain]);

  const trackAlertResolved = useCallback(async () => {
    try {
      const userId = await getAuthenticatedUserId();

      await addXP(userId, FLUX_XP_REWARDS.alert_resolved);
      showXPGain(FLUX_XP_REWARDS.alert_resolved);

      log.debug('Tracked alert_resolved', { xp: FLUX_XP_REWARDS.alert_resolved });
    } catch (error) {
      log.error('trackAlertResolved error:', error);
    }
  }, [showXPGain]);

  const trackFeedbackReviewed = useCallback(async () => {
    try {
      const userId = await getAuthenticatedUserId();

      await addXP(userId, FLUX_XP_REWARDS.feedback_reviewed);
      showXPGain(FLUX_XP_REWARDS.feedback_reviewed);

      log.debug('Tracked feedback_reviewed', { xp: FLUX_XP_REWARDS.feedback_reviewed });
    } catch (error) {
      log.error('trackFeedbackReviewed error:', error);
    }
  }, [showXPGain]);

  return {
    trackAthleteCreated,
    trackMicrocycleCompleted,
    trackWorkoutSupervised,
    trackAlertResolved,
    trackFeedbackReviewed,
  };
}

export default useFluxGamification;
