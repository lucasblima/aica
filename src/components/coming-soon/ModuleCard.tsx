/**
 * ModuleCard — Unified card with variants for Module Hub
 * CS-004: Module Hub Page
 *
 * Variants:
 * - live: stats + link to module
 * - preview: badge + mini preview
 * - teaser: headline + waitlist
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Construction, Sparkles, Calendar } from 'lucide-react';
import type { ModuleRegistryEntry } from '@/hooks/useModuleRegistry';
import { WaitlistButton } from './WaitlistButton';
import { WaitlistCounter } from './WaitlistCounter';

interface ModuleCardProps {
  module: ModuleRegistryEntry;
  isOnWaitlist?: boolean;
  onJoinWaitlist?: () => Promise<boolean>;
  onLeaveWaitlist?: () => Promise<boolean>;
  onNavigate?: () => void;
}

export function ModuleCard({
  module,
  isOnWaitlist = false,
  onJoinWaitlist,
  onLeaveWaitlist,
  onNavigate,
}: ModuleCardProps) {
  const colorPrimary = module.color_primary || '#F59E0B';

  // LIVE variant
  if (module.status === 'live') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNavigate}
        className="relative overflow-hidden rounded-2xl bg-ceramic-base shadow-ceramic-emboss cursor-pointer group"
      >
        <div
          className="h-1 w-full"
          style={{ backgroundColor: colorPrimary }}
        />
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: `${colorPrimary}15` }}
            >
              {module.icon_emoji || '📦'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-ceramic-text-primary truncate">
                {module.name}
              </h3>
              <p className="text-xs text-ceramic-text-secondary truncate">
                {module.description}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-ceramic-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </motion.div>
    );
  }

  // PREVIEW variant
  if (module.status === 'preview') {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="relative overflow-hidden rounded-2xl bg-ceramic-base shadow-ceramic-emboss"
      >
        <div
          className="h-1 w-full opacity-50"
          style={{ backgroundColor: colorPrimary }}
        />
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: `${colorPrimary}15` }}
            >
              {module.icon_emoji || '📦'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-ceramic-text-primary truncate">
                {module.name}
              </h3>
              <p className="text-xs text-ceramic-text-secondary truncate">
                {module.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ceramic-warning/10 text-ceramic-warning text-xs font-semibold">
            <Construction className="w-3 h-3" />
            Preview
          </div>
        </div>
      </motion.div>
    );
  }

  // TEASER / BETA variant
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="relative overflow-hidden rounded-2xl bg-ceramic-base shadow-ceramic-emboss"
    >
      {/* Gradient accent */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          background: `linear-gradient(135deg, ${colorPrimary} 0%, ${module.color_secondary || colorPrimary} 100%)`,
        }}
      />

      <div className="relative z-10 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: `${colorPrimary}15` }}
          >
            {module.icon_emoji || '📦'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-ceramic-text-primary truncate">
              {module.name}
            </h3>
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5"
              style={{ backgroundColor: `${colorPrimary}15`, color: colorPrimary }}
            >
              <Sparkles className="w-2.5 h-2.5" />
              {module.status === 'beta' ? 'Beta' : 'Em Breve'}
            </div>
          </div>
        </div>

        {module.teaser_headline && (
          <p className="text-xs text-ceramic-text-secondary leading-relaxed">
            {module.teaser_headline}
          </p>
        )}

        {/* Waitlist */}
        {onJoinWaitlist && onLeaveWaitlist && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <WaitlistButton
              isOnWaitlist={isOnWaitlist}
              onJoin={onJoinWaitlist}
              onLeave={onLeaveWaitlist}
              colorPrimary={colorPrimary}
            />
            <WaitlistCounter count={module.waitlist_count} />
          </div>
        )}

        {module.estimated_launch && (
          <div className="flex items-center gap-1 text-[11px] text-ceramic-text-secondary">
            <Calendar className="w-3 h-3" />
            {module.estimated_launch}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ModuleCard;
