/**
 * BadgeUnlockModal Component
 *
 * Full-screen celebration modal for badge unlocks with confetti effect.
 * Features dramatic entrance animation and rarity-based confetti colors.
 *
 * Related: WhatsApp Gamification Integration (Issue #16)
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export interface BadgeUnlockModalProps {
  badge: {
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    xp_reward: number;
  };
  onClose: () => void;
}

export const BadgeUnlockModal: React.FC<BadgeUnlockModalProps> = ({ badge, onClose }) => {
  // Trigger confetti on mount
  useEffect(() => {
    const colors = {
      common: ['#6B7B5C', '#D4AF37'],
      rare: ['#4B9CD3', '#9B7EBE'],
      epic: ['#D97706', '#DC2626'],
      legendary: ['#FFD700', '#FF6B35']
    };

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors[badge.rarity]
    });
  }, [badge.rarity]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
      data-testid="badge-unlock-modal"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
        onClick={(e) => e.stopPropagation()}
        className="ceramic-card p-12 rounded-3xl max-w-md text-center"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-9xl mb-6"
        >
          {badge.icon}
        </motion.div>

        <h2 className="text-3xl font-black text-ceramic-text-primary mb-2">
          Badge Desbloqueado!
        </h2>
        <h3 className="text-2xl font-bold text-ceramic-accent mb-4">
          {badge.name}
        </h3>
        <p className="text-ceramic-text-secondary mb-6">
          {badge.description}
        </p>
        <p className="text-lg font-bold text-ceramic-positive">
          +{badge.xp_reward} XP
        </p>

        <button
          onClick={onClose}
          className="mt-8 ceramic-card px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
        >
          Continuar
        </button>
      </motion.div>
    </motion.div>
  );
};

export default BadgeUnlockModal;
