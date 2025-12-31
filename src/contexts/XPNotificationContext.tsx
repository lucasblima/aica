/**
 * XPNotificationContext
 *
 * Global context for managing XP and badge unlock notifications.
 * Renders XPGainPopup and BadgeUnlockModal components.
 *
 * Usage:
 * ```tsx
 * const { showXPGain, showBadgeUnlock } = useXPNotifications();
 * showXPGain(50);
 * showBadgeUnlock(badge);
 * ```
 *
 * Related: WhatsApp Gamification Integration (Issue #16)
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { XPGainPopup } from '@/components/gamification/XPGainPopup';
import { BadgeUnlockModal } from '@/components/gamification/BadgeUnlockModal';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  unlock_condition: string;
}

export interface XPNotificationContextValue {
  showXPGain: (amount: number) => void;
  showBadgeUnlock: (badge: Badge) => void;
}

const XPNotificationContext = createContext<XPNotificationContextValue | null>(null);

export const XPNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [xpAmount, setXpAmount] = useState<number | null>(null);
  const [badgeToShow, setBadgeToShow] = useState<Badge | null>(null);

  const showXPGain = useCallback((amount: number) => {
    setXpAmount(amount);
  }, []);

  const showBadgeUnlock = useCallback((badge: Badge) => {
    setBadgeToShow(badge);
  }, []);

  return (
    <XPNotificationContext.Provider value={{ showXPGain, showBadgeUnlock }}>
      {children}

      {xpAmount && (
        <XPGainPopup
          xpAmount={xpAmount}
          onDismiss={() => setXpAmount(null)}
        />
      )}

      {badgeToShow && (
        <BadgeUnlockModal
          badge={badgeToShow}
          onClose={() => setBadgeToShow(null)}
        />
      )}
    </XPNotificationContext.Provider>
  );
};

export const useXPNotifications = () => {
  const context = useContext(XPNotificationContext);
  if (!context) {
    throw new Error('useXPNotifications must be used within XPNotificationProvider');
  }
  return context;
};

export default XPNotificationProvider;
