/**
 * ComingSoonModule — Full-page teaser facade for upcoming modules
 * CS-002: ComingSoonModule UI
 *
 * Features:
 * - Background gradient with module color
 * - Large icon
 * - Shimmer "Em Breve" badge
 * - Headline + description from module_registry
 * - Feature chips
 * - WaitlistButton + WaitlistCounter
 * - Estimated launch date
 * - Fade + slide up entrance animation
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';
import type { ModuleRegistryEntry } from '@/hooks/useModuleRegistry';
import { WaitlistButton } from './WaitlistButton';
import { WaitlistCounter } from './WaitlistCounter';

interface ComingSoonModuleProps {
  module: ModuleRegistryEntry;
  isOnWaitlist: boolean;
  onJoinWaitlist: () => Promise<boolean>;
  onLeaveWaitlist: () => Promise<boolean>;
  onOpenAIPreview?: () => void;
}

export function ComingSoonModule({
  module,
  isOnWaitlist,
  onJoinWaitlist,
  onLeaveWaitlist,
  onOpenAIPreview,
}: ComingSoonModuleProps) {
  const colorPrimary = module.color_primary || '#F59E0B';
  const colorSecondary = module.color_secondary || '#FBBF24';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl bg-ceramic-base shadow-ceramic-emboss"
    >
      {/* Gradient background accent */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          background: `linear-gradient(135deg, ${colorPrimary} 0%, ${colorSecondary} 100%)`,
        }}
      />

      <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center text-center gap-5">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-ceramic-emboss"
          style={{
            background: `linear-gradient(135deg, ${colorPrimary}20, ${colorSecondary}20)`,
          }}
        >
          {module.icon_emoji || '🚀'}
        </motion.div>

        {/* Shimmer "Em Breve" badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider overflow-hidden"
          style={{ backgroundColor: `${colorPrimary}15`, color: colorPrimary }}
        >
          <Sparkles className="w-3 h-3" />
          <span>Em Breve</span>
          {/* Shimmer animation */}
          <div
            className="absolute inset-0 animate-shimmer"
            style={{
              background: `linear-gradient(90deg, transparent, ${colorPrimary}20, transparent)`,
              backgroundSize: '200% 100%',
            }}
          />
        </motion.div>

        {/* Headline */}
        {module.teaser_headline && (
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl sm:text-2xl font-bold text-ceramic-text-primary leading-tight"
          >
            {module.teaser_headline}
          </motion.h2>
        )}

        {/* Description */}
        {module.teaser_description && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-sm text-ceramic-text-secondary leading-relaxed max-w-md"
          >
            {module.teaser_description}
          </motion.p>
        )}

        {/* Feature chips */}
        {module.teaser_features.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {module.teaser_features.map((feature, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-xs font-medium bg-ceramic-cool text-ceramic-text-secondary"
              >
                {feature}
              </span>
            ))}
          </motion.div>
        )}

        {/* AI Preview button */}
        {module.ai_preview_enabled && onOpenAIPreview && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            onClick={onOpenAIPreview}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: `${colorPrimary}10`,
              color: colorPrimary,
            }}
          >
            <Sparkles className="w-4 h-4" />
            Experimentar com IA
          </motion.button>
        )}

        {/* Waitlist CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-3"
        >
          <WaitlistButton
            isOnWaitlist={isOnWaitlist}
            onJoin={onJoinWaitlist}
            onLeave={onLeaveWaitlist}
            colorPrimary={colorPrimary}
          />
          <WaitlistCounter count={module.waitlist_count} />
        </motion.div>

        {/* Estimated launch */}
        {module.estimated_launch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="flex items-center gap-1.5 text-xs text-ceramic-text-secondary"
          >
            <Calendar className="w-3 h-3" />
            <span>Lancamento estimado: {module.estimated_launch}</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default ComingSoonModule;
