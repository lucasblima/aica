/**
 * XPGainPopup Component
 *
 * Animated popup that displays XP gains with a bounce effect.
 * Automatically dismisses after 2 seconds.
 *
 * Related: WhatsApp Gamification Integration (Issue #16)
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface XPGainPopupProps {
  xpAmount: number;
  onDismiss?: () => void;
}

export const XPGainPopup: React.FC<XPGainPopupProps> = ({ xpAmount, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
          data-testid="xp-gain-popup"
        >
          <div className="ceramic-card px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
            >
              ✨
            </motion.div>
            <span className="text-2xl font-black text-ceramic-accent">
              +{xpAmount} XP
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default XPGainPopup;
