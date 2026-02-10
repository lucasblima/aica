/**
 * PostCaptureInsight Component
 * Shows immediate value after capturing a moment
 *
 * Features:
 * - Instant insight about the moment
 * - Connection to similar moments
 * - Actionable next steps
 * - Celebration animation
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  LightBulbIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';

interface PostCaptureInsightProps {
  insight: {
    message: string;
    relatedMoments: number;
    theme?: string;
    action?: 'view_similar' | 'view_patterns';
  };
  pointsEarned: number;
  onViewSimilar?: () => void;
  onViewPatterns?: () => void;
  onClose: () => void;
}

export function PostCaptureInsight({
  insight,
  pointsEarned,
  onViewSimilar,
  onViewPatterns,
  onClose,
}: PostCaptureInsightProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', duration: 0.4 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="ceramic-card max-w-lg w-full overflow-hidden"
      >
        {/* Success Header with Gradient */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="flex items-center justify-center mb-3"
          >
            <div className="ceramic-convex w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircleIcon className="w-10 h-10" />
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-center mb-2"
          >
            Momento Salvo! ✨
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <p className="text-white/90 text-sm">
              Você ganhou <strong>+{pointsEarned} CP</strong>
            </p>
          </motion.div>
        </div>

        {/* Insight Content */}
        <div className="p-6 space-y-4">
          {/* Main Insight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="ceramic-tray rounded-lg p-4 border-2 border-amber-500/20 bg-amber-500/5"
          >
            <div className="flex items-start gap-3">
              <LightBulbIcon className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-ceramic-text-primary mb-1">
                  💡 Insight Descoberto
                </h3>
                <p className="text-sm text-ceramic-text-secondary">
                  {insight.message}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Theme Badge (if detected) */}
          {insight.theme && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs text-ceramic-text-tertiary">Tema identificado:</span>
              <div className="ceramic-concave px-3 py-1 rounded-full">
                <span className="text-xs font-bold text-amber-600">
                  {insight.theme}
                </span>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex gap-3"
          >
            {insight.relatedMoments > 0 && onViewSimilar && (
              <button
                onClick={() => {
                  onViewSimilar();
                  onClose();
                }}
                className="flex-1 ceramic-concave p-3 hover:scale-[0.98] transition-transform text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <MagnifyingGlassIcon className="w-4 h-4 text-ceramic-info" />
                  <span className="text-xs font-bold text-ceramic-text-primary">
                    Ver momentos similares
                  </span>
                </div>
                <p className="text-xs text-ceramic-text-tertiary">
                  {insight.relatedMoments} momento{insight.relatedMoments !== 1 ? 's' : ''}{' '}
                  relacionado{insight.relatedMoments !== 1 ? 's' : ''}
                </p>
              </button>
            )}

            {onViewPatterns && (
              <button
                onClick={() => {
                  onViewPatterns();
                  onClose();
                }}
                className="flex-1 ceramic-concave p-3 hover:scale-[0.98] transition-transform text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <ChartBarIcon className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-ceramic-text-primary">
                    Ver padrões
                  </span>
                </div>
                <p className="text-xs text-ceramic-text-tertiary">
                  Descubra seus temas principais
                </p>
              </button>
            )}
          </motion.div>

          {/* Tip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-2 p-3 bg-ceramic-warm rounded-lg"
          >
            <SparklesIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-ceramic-text-primary">
              Continue registrando momentos para descobrir mais padrões e insights sobre sua
              jornada
            </p>
          </motion.div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full ceramic-convex px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all"
          >
            Continuar
          </button>
        </div>
      </motion.div>

      {/* Confetti Effect (optional) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, times: [0, 0.5, 1] }}
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
        }}
      />
    </motion.div>
  );
}
