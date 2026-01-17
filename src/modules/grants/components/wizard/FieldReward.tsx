/**
 * FieldReward Component
 * Issue #100 - Wizard gamificado para cadastro completo de organizacoes
 *
 * Animated XP reward popup when a field is filled.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface FieldRewardProps {
  xp: number;
  show: boolean;
  onComplete?: () => void;
}

export function FieldReward({ xp, show, onComplete }: FieldRewardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute -top-2 right-0 flex items-center gap-1 px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-lg z-10"
          initial={{ opacity: 0, y: 10, scale: 0.5 }}
          animate={{ opacity: 1, y: -20, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.5 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 15,
          }}
        >
          <Sparkles className="w-3 h-3" />
          <span>+{xp} XP</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Floating XP Counter Component
 * Shows total XP earned with animation on increment
 */
interface XPCounterProps {
  total: number;
  className?: string;
}

export function XPCounter({ total, className = '' }: XPCounterProps) {
  const [displayValue, setDisplayValue] = useState(total);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (total !== displayValue) {
      setIsAnimating(true);

      // Animate counting up
      const diff = total - displayValue;
      const steps = Math.min(Math.abs(diff), 10);
      const increment = diff / steps;
      let current = displayValue;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        current += increment;

        if (step >= steps) {
          setDisplayValue(total);
          setIsAnimating(false);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.round(current));
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [total, displayValue]);

  return (
    <motion.div
      className={`flex items-center gap-2 ${className}`}
      animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <Sparkles className="w-5 h-5 text-amber-500" />
      <span className="text-lg font-bold text-amber-600">
        {displayValue} XP
      </span>
    </motion.div>
  );
}

/**
 * Level Up Animation Component
 * Full-screen celebration when user levels up
 */
interface LevelUpCelebrationProps {
  show: boolean;
  levelName: string;
  levelIcon: string;
  levelColor: string;
  onClose: () => void;
}

export function LevelUpCelebration({
  show,
  levelName,
  levelIcon,
  levelColor,
  onClose,
}: LevelUpCelebrationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative p-8 bg-white rounded-3xl shadow-2xl text-center max-w-sm mx-4"
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confetti/Sparkles */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-amber-400 rounded-full"
                  initial={{
                    x: '50%',
                    y: '50%',
                    scale: 0,
                  }}
                  animate={{
                    x: `${Math.random() * 100}%`,
                    y: `${Math.random() * 100}%`,
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  }}
                />
              ))}
            </motion.div>

            {/* Level Icon */}
            <motion.div
              className="text-6xl mb-4"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              {levelIcon}
            </motion.div>

            {/* Title */}
            <motion.h2
              className="text-2xl font-bold text-gray-900 mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Nivel Alcancado!
            </motion.h2>

            {/* Level Name */}
            <motion.p
              className="text-xl font-semibold mb-4"
              style={{ color: levelColor }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {levelName}
            </motion.p>

            {/* Continue Button */}
            <motion.button
              className="px-6 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={onClose}
            >
              Continuar
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FieldReward;
