import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Settings, Users } from 'lucide-react';
import { ConnectionSpace } from '../types';
import { ARCHETYPE_CONFIG } from '../types';

interface SpaceHeaderProps {
  /** Connection space data */
  space: ConnectionSpace;
  /** Number of members in the space */
  memberCount?: number;
  /** Back button handler */
  onBack: () => void;
  /** Settings button handler */
  onSettings?: () => void;
}

/**
 * SpaceHeader - Header component for space detail pages
 *
 * Displays space information with archetype-themed background,
 * navigation controls, and member count.
 *
 * @example
 * ```tsx
 * <SpaceHeader
 *   space={currentSpace}
 *   memberCount={12}
 *   onBack={() => navigate('/connections')}
 *   onSettings={() => setShowSettings(true)}
 * />
 * ```
 */
export function SpaceHeader({
  space,
  memberCount,
  onBack,
  onSettings,
}: SpaceHeaderProps) {
  const config = ARCHETYPE_CONFIG[space.archetype];

  // Get background gradient based on color theme
  const getThemeGradient = () => {
    switch (space.color_theme) {
      case 'earth':
        return 'from-ceramic-info to-ceramic-info/70';
      case 'amber':
        return 'from-ceramic-accent to-ceramic-warning';
      case 'paper':
        return 'from-ceramic-warning to-ceramic-warning/70';
      case 'warm':
        return 'from-ceramic-success to-ceramic-success/70';
      default:
        return 'from-ceramic-accent to-ceramic-warning';
    }
  };

  return (
    <div className={`relative bg-gradient-to-br ${getThemeGradient()} overflow-hidden`}>
      {/* Background pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.05) 10px,
            rgba(255, 255, 255, 0.05) 20px
          )`
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 py-8">
        {/* Top navigation */}
        <div className="flex items-center justify-between mb-6">
          {/* Back button */}
          <motion.button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
            whileTap={{ scale: 0.95 }}
            aria-label="Voltar"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </motion.button>

          {/* Settings button */}
          {onSettings && (
            <motion.button
              onClick={onSettings}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              aria-label="Configurações"
            >
              <Settings className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </div>

        {/* Space info */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <motion.div
            className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <span className="text-5xl">{space.icon}</span>
          </motion.div>

          {/* Text content */}
          <div className="flex-1 min-w-0 pt-2">
            <motion.h1
              className="text-2xl font-black text-white mb-2 drop-shadow-sm"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {space.name}
            </motion.h1>

            {space.description && (
              <motion.p
                className="text-sm text-white/90 mb-3 line-clamp-2 drop-shadow-sm"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {space.description}
              </motion.p>
            )}

            {/* Member count badge */}
            {memberCount !== undefined && (
              <motion.div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Users className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white">
                  {memberCount} {memberCount === 1 ? 'membro' : 'membros'}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Archetype label */}
        <motion.div
          className="mt-4 pt-4 border-t border-white/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
            {config.label} · {config.subtitle}
          </span>
        </motion.div>
      </div>
    </div>
  );
}

export default SpaceHeader;
