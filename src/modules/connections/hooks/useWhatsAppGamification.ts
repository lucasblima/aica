/**
 * useWhatsAppGamification Hook
 *
 * Tracks WhatsApp-related user activities and awards XP/badges.
 * Integrates with the main gamification system to reward emotional awareness
 * and privacy-conscious behavior.
 *
 * Related: WhatsApp + Gamification Integration
 */

import { useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { addXP, awardAchievement, WHATSAPP_XP_REWARDS, BADGES_CATALOG } from '@/services/gamificationService';
import { notificationService } from '@/services/notificationService';
import { useXPNotifications } from '@/contexts/XPNotificationContext';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('useWhatsAppGamification');

// ============================================================================
// TYPES
// ============================================================================

export interface WhatsAppGamificationHook {
  trackConnection: () => Promise<void>;
  trackConsentGrant: (consentType: string) => Promise<void>;
  trackAnalyticsView: () => Promise<void>;
  trackContactAnalysis: (contactHash: string) => Promise<void>;
  trackAnomalyCheck: () => Promise<void>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get authenticated user ID
 */
async function getAuthenticatedUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`[useWhatsAppGamification] Auth error: ${error.message}`);
  }

  if (!user) {
    throw new Error('[useWhatsAppGamification] User not authenticated');
  }

  return user.id;
}

/**
 * Insert activity tracking record
 */
async function insertActivity(
  userId: string,
  activityType: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('whatsapp_user_activity').insert({
      user_id: userId,
      activity_type: activityType,
      metadata: metadata || {},
    });
  } catch (error) {
    log.error('[useWhatsAppGamification] Error inserting activity:', error);
    // Don't throw - activity tracking is nice-to-have, not critical
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook for tracking WhatsApp gamification activities
 */
export function useWhatsAppGamification(): WhatsAppGamificationHook {
  const { showXPGain, showBadgeUnlock } = useXPNotifications();

  /**
   * Track WhatsApp connection (award badge + XP)
   */
  const trackConnection = useCallback(async () => {
    try {
      const userId = await getAuthenticatedUserId();

      // Award XP for connection
      await addXP(userId, WHATSAPP_XP_REWARDS.connection);
      showXPGain(WHATSAPP_XP_REWARDS.connection);

      // Insert activity
      await insertActivity(userId, 'connection');

      // Award badge
      await awardAchievement(userId, 'first_whatsapp_connect');

      // Show badge unlock modal
      const badge = BADGES_CATALOG.first_whatsapp_connect;
      if (badge) {
        showBadgeUnlock(badge as any);
      }

      log.debug('[useWhatsAppGamification] Connection tracked:', {
        xp: WHATSAPP_XP_REWARDS.connection,
        badge: 'first_whatsapp_connect',
      });
    } catch (error) {
      log.error('[useWhatsAppGamification] trackConnection error:', error);
    }
  }, [showXPGain, showBadgeUnlock]);

  /**
   * Track consent grant (award XP + check for all consents badge)
   */
  const trackConsentGrant = useCallback(async (consentType: string) => {
    try {
      const userId = await getAuthenticatedUserId();

      // Award XP for consent grant
      await addXP(userId, WHATSAPP_XP_REWARDS.consent_grant);
      showXPGain(WHATSAPP_XP_REWARDS.consent_grant);

      // Insert activity
      await insertActivity(userId, 'consent_grant', { consent_type: consentType });

      // Check if all 5 consents are granted
      const { data: allGranted } = await supabase.rpc('check_all_whatsapp_consents_granted', {
        p_user_id: userId,
      });

      if (allGranted) {
        await awardAchievement(userId, 'consent_champion');

        // Show badge unlock modal
        const badge = BADGES_CATALOG.consent_champion;
        if (badge) {
          showBadgeUnlock(badge as any);
        }

        log.debug('[useWhatsAppGamification] Consent Champion badge unlocked!');
      }

      log.debug('[useWhatsAppGamification] Consent grant tracked:', {
        consentType,
        xp: WHATSAPP_XP_REWARDS.consent_grant,
        allGranted,
      });
    } catch (error) {
      log.error('[useWhatsAppGamification] trackConsentGrant error:', error);
    }
  }, [showXPGain, showBadgeUnlock]);

  /**
   * Track analytics view (award XP + check for view milestone badges)
   */
  const trackAnalyticsView = useCallback(async () => {
    try {
      const userId = await getAuthenticatedUserId();

      // Award XP for viewing analytics
      await addXP(userId, WHATSAPP_XP_REWARDS.analytics_view);
      showXPGain(WHATSAPP_XP_REWARDS.analytics_view);

      // Insert activity
      await insertActivity(userId, 'analytics_view');

      // Get total view count
      const { data: viewCount } = await supabase.rpc('count_whatsapp_analytics_views', {
        p_user_id: userId,
      });

      // Check milestone badges
      if (viewCount === 5) {
        await awardAchievement(userId, 'emotional_awareness_beginner');

        // Show badge unlock modal
        const badge = BADGES_CATALOG.emotional_awareness_beginner;
        if (badge) {
          showBadgeUnlock(badge as any);
        }

        log.debug('[useWhatsAppGamification] Emotional Awareness (Beginner) badge unlocked!');
      } else if (viewCount === 20) {
        await awardAchievement(userId, 'emotional_awareness_master');

        // Show badge unlock modal
        const badge = BADGES_CATALOG.emotional_awareness_master;
        if (badge) {
          showBadgeUnlock(badge as any);
        }

        log.debug('[useWhatsAppGamification] Emotional Awareness (Master) badge unlocked!');
      }

      log.debug('[useWhatsAppGamification] Analytics view tracked:', {
        xp: WHATSAPP_XP_REWARDS.analytics_view,
        viewCount,
      });
    } catch (error) {
      log.error('[useWhatsAppGamification] trackAnalyticsView error:', error);
    }
  }, [showXPGain, showBadgeUnlock]);

  /**
   * Track contact analysis (award XP + check for unique contacts badge)
   */
  const trackContactAnalysis = useCallback(async (contactHash: string) => {
    try {
      const userId = await getAuthenticatedUserId();

      // Award XP for analyzing contact
      await addXP(userId, WHATSAPP_XP_REWARDS.contact_analysis);
      showXPGain(WHATSAPP_XP_REWARDS.contact_analysis);

      // Insert activity
      await insertActivity(userId, 'contact_analysis', { contact_hash: contactHash });

      // Get unique contacts count
      const { data: uniqueCount } = await supabase.rpc('count_unique_contacts_analyzed', {
        p_user_id: userId,
      });

      // Check milestone badge
      if (uniqueCount === 10) {
        await awardAchievement(userId, 'sentiment_explorer');

        // Show badge unlock modal
        const badge = BADGES_CATALOG.sentiment_explorer;
        if (badge) {
          showBadgeUnlock(badge as any);
        }

        log.debug('[useWhatsAppGamification] Sentiment Explorer badge unlocked!');
      }

      log.debug('[useWhatsAppGamification] Contact analysis tracked:', {
        contactHash: contactHash.substring(0, 8) + '...',
        xp: WHATSAPP_XP_REWARDS.contact_analysis,
        uniqueCount,
      });
    } catch (error) {
      log.error('[useWhatsAppGamification] trackContactAnalysis error:', error);
    }
  }, [showXPGain, showBadgeUnlock]);

  /**
   * Track anomaly check (small XP reward for engagement)
   */
  const trackAnomalyCheck = useCallback(async () => {
    try {
      const userId = await getAuthenticatedUserId();

      // Award small XP for checking anomalies
      await addXP(userId, WHATSAPP_XP_REWARDS.anomaly_check);
      showXPGain(WHATSAPP_XP_REWARDS.anomaly_check);

      // Insert activity
      await insertActivity(userId, 'anomaly_check');

      log.debug('[useWhatsAppGamification] Anomaly check tracked:', {
        xp: WHATSAPP_XP_REWARDS.anomaly_check,
      });
    } catch (error) {
      log.error('[useWhatsAppGamification] trackAnomalyCheck error:', error);
    }
  }, [showXPGain]);

  return {
    trackConnection,
    trackConsentGrant,
    trackAnalyticsView,
    trackContactAnalysis,
    trackAnomalyCheck,
  };
}

export default useWhatsAppGamification;
