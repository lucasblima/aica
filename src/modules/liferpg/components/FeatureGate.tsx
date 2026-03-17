/**
 * FeatureGate Component
 *
 * Wraps content that requires a certain level to access.
 * If the user's level is high enough, renders children.
 * If locked, renders a beautiful lock card showing progress.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { useConsciousnessPoints } from '@/modules/journey/hooks/useConsciousnessPoints';
import {
  isFeatureUnlocked,
  getFeatureDisplayName,
  getFeatureUnlockLevel,
} from '../services/featureUnlockService';
import { getProgressToNextLevel, CP_LEVELS, type CPLevel } from '@/modules/journey/types/consciousnessPoints';

interface FeatureGateProps {
  featureId: string;
  children: React.ReactNode;
  className?: string;
}

export function FeatureGate({ featureId, children, className = '' }: FeatureGateProps) {
  const { stats, isLoading } = useConsciousnessPoints();

  // While loading, show a subtle skeleton placeholder
  if (isLoading) {
    return (
      <div className={`animate-pulse bg-ceramic-cool rounded-xl h-32 ${className}`} />
    );
  }

  const currentLevel = stats?.level ?? 1;
  const currentPoints = stats?.total_points ?? 0;

  // If feature is unlocked, render children directly
  if (isFeatureUnlocked(currentLevel, featureId)) {
    return <>{children}</>;
  }

  // Feature is locked — render lock card
  const displayName = getFeatureDisplayName(featureId);
  const unlockLevel = getFeatureUnlockLevel(featureId);

  // Calculate progress toward the unlock level
  const progress = getProgressToNextLevel(currentPoints);
  const targetLevelData = CP_LEVELS.find(l => l.level === Math.min(unlockLevel, 5) as CPLevel);
  const targetXP = targetLevelData?.min_points ?? unlockLevel * 1000;
  const xpRemaining = Math.max(0, targetXP - currentPoints);
  const progressPercent = targetXP > 0 ? Math.min(100, (currentPoints / targetXP) * 100) : 0;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-ceramic-border bg-ceramic-cool p-6 ${className}`}>
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-2 right-2 w-24 h-24 rounded-full bg-ceramic-text-secondary" />
        <div className="absolute bottom-2 left-2 w-16 h-16 rounded-full bg-ceramic-text-secondary" />
      </div>

      <div className="relative flex flex-col items-center text-center space-y-3">
        {/* Animated lock icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-12 h-12 rounded-full bg-ceramic-border flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          >
            <LockClosedIcon className="h-6 w-6 text-ceramic-text-secondary" />
          </motion.div>
        </motion.div>

        {/* Feature name */}
        <h4 className="text-sm font-semibold text-ceramic-text-primary">
          {displayName}
        </h4>

        {/* Progress info */}
        <p className="text-xs text-ceramic-text-secondary">
          Você tem <span className="font-semibold text-amber-600">{currentPoints.toLocaleString()} CP</span> — precisa de{' '}
          <span className="font-semibold">{targetXP.toLocaleString()}</span> para o Nivel {unlockLevel}
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-[220px]">
          <div className="w-full h-2 bg-ceramic-border rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] text-ceramic-text-secondary mt-1.5">
            Faltam {xpRemaining.toLocaleString()} CP
          </p>
        </div>

        {/* Explanation and tips */}
        <div className="w-full pt-2 border-t border-ceramic-border/50 space-y-1.5">
          <p className="text-[11px] text-ceramic-text-secondary leading-relaxed">
            Ganhe Pontos de Consciência (CP) para desbloquear! Registre momentos, responda perguntas diarias e use o chat.
          </p>
        </div>
      </div>
    </div>
  );
}
