/**
 * ConnectionSpaceCard Component
 *
 * Enhanced card component with distinct visual personalities for each archetype.
 * Follows the Ceramic Design System with archetype-specific visual treatments.
 *
 * Each archetype has its own aesthetic language:
 * - HABITAT (🏠): Earthy, grounded, stability-focused
 * - VENTURES (💼): Precise, dashboard-like, metrics-focused
 * - ACADEMIA (🎓): Serene, contemplative, knowledge-focused
 * - TRIBO (👥): Warm, embracing, relationship-focused
 *
 * @example
 * ```tsx
 * <ConnectionSpaceCard
 *   space={mySpace}
 *   onClick={() => navigate(`/connections/${mySpace.id}`)}
 *   onFavoriteToggle={() => toggleFavorite(mySpace.id)}
 *   variant="default"
 * />
 * ```
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  Key,
  Wrench,
  TrendingUp,
  Target,
  Briefcase,
  BookOpen,
  Brain,
  Lightbulb,
  Heart,
  Users,
  Calendar,
  Star,
  ChevronRight,
} from 'lucide-react';
import { ConnectionSpace, ArchetypeType } from '../types';
import { cardElevationVariants, springHover } from '../../../lib/animations/ceramic-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConnectionSpaceCardProps {
  /** Connection space data */
  space: ConnectionSpace;
  /** Click handler for navigation */
  onClick?: () => void;
  /** Toggle favorite handler */
  onFavoriteToggle?: () => void;
  /** Display variant */
  variant?: 'default' | 'compact';
  /** Number of members (optional) */
  memberCount?: number;
  /** Last activity timestamp (optional) */
  lastActivity?: string;
}

/**
 * Archetype-specific color configurations
 * Each archetype has distinct accent colors and visual treatments
 */
const ARCHETYPE_COLORS = {
  habitat: {
    accent: '#8B4513', // warm brown
    accentLight: '#D2691E', // terracotta
    bg: 'bg-ceramic-warning/10',
    text: 'text-ceramic-warning',
    iconBg: 'bg-ceramic-warning/15',
    iconText: 'text-ceramic-warning',
    border: 'border-ceramic-warning/20',
  },
  ventures: {
    accent: '#1E3A8A', // deep blue
    accentLight: '#3B82F6', // bright blue
    bg: 'bg-ceramic-info/10',
    text: 'text-ceramic-info',
    iconBg: 'bg-ceramic-info/15',
    iconText: 'text-ceramic-info',
    border: 'border-ceramic-info/20',
  },
  academia: {
    accent: '#4C1D95', // deep purple
    accentLight: '#8B5CF6', // bright purple
    bg: 'bg-ceramic-accent/10',
    text: 'text-ceramic-accent',
    iconBg: 'bg-ceramic-accent/15',
    iconText: 'text-ceramic-accent',
    border: 'border-ceramic-accent/20',
  },
  tribo: {
    accent: '#D97706', // amber
    accentLight: '#F59E0B', // bright amber
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    border: 'border-amber-200',
  },
} as const;

/**
 * Archetype-specific decorative icons
 * These appear as subtle background elements
 */
const ARCHETYPE_DECORATIONS = {
  habitat: [Home, Key, Wrench],
  ventures: [TrendingUp, Target, Briefcase],
  academia: [BookOpen, Brain, Lightbulb],
  tribo: [Heart, Users, Calendar],
} as const;

/**
 * Get archetype visual identity
 */
function getArchetypeIdentity(archetype: ArchetypeType) {
  const colors = ARCHETYPE_COLORS[archetype];
  const decorations = ARCHETYPE_DECORATIONS[archetype];

  return { colors, decorations };
}

/**
 * Format last activity timestamp
 */
function formatLastActivity(timestamp?: string): string | null {
  if (!timestamp) return null;

  try {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return null;
  }
}

/**
 * ConnectionSpaceCard - Enhanced card with archetype-specific visual personality
 */
export function ConnectionSpaceCard({
  space,
  onClick,
  onFavoriteToggle,
  variant = 'default',
  memberCount,
  lastActivity,
}: ConnectionSpaceCardProps) {
  const { colors, decorations } = getArchetypeIdentity(space.archetype);
  const lastActivityText = formatLastActivity(lastActivity || space.last_accessed_at);

  // Select decorative icons (use first 2 for default, first 1 for compact)
  const [DecorIcon1, DecorIcon2] = decorations;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.();
  };

  // ========================================
  // COMPACT VARIANT
  // ========================================
  if (variant === 'compact') {
    return (
      <motion.button
        className="ceramic-card w-full p-3 flex items-center gap-3 cursor-pointer text-left relative overflow-hidden"
        variants={cardElevationVariants}
        initial="rest"
        whileHover="hover"
        whileTap="pressed"
        onClick={onClick}
      >
        {/* Background decorative icon (single, subtle) */}
        <div className="absolute -right-3 -bottom-3 w-24 h-24 icon-engraved">
          <DecorIcon1 className={`w-full h-full ${colors.iconText}`} />
        </div>

        {/* Space icon */}
        <div className={`ceramic-inset ${colors.iconBg} w-10 h-10 flex items-center justify-center flex-shrink-0 relative z-10`}>
          <span className="text-xl">{space.icon || '🔗'}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 relative z-10">
          <h3 className={`text-sm font-bold ${colors.text} truncate`}>
            {space.name}
          </h3>
          {space.subtitle && (
            <p className="text-xs text-ceramic-text-secondary truncate">
              {space.subtitle}
            </p>
          )}
        </div>

        {/* Favorite star */}
        {space.is_favorite && (
          <motion.div
            className="flex-shrink-0 relative z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springHover}
          >
            <Star className={`w-4 h-4 ${colors.iconText} fill-current`} />
          </motion.div>
        )}

        {/* Chevron */}
        <ChevronRight className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0 relative z-10" />
      </motion.button>
    );
  }

  // ========================================
  // DEFAULT VARIANT
  // ========================================
  return (
    <motion.div
      className="ceramic-card p-5 cursor-pointer relative overflow-hidden min-h-[200px] flex flex-col"
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
      onClick={onClick}
    >
      {/* Background decorative icons with engraved effect */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 icon-engraved">
        <DecorIcon1 className={`w-full h-full ${colors.iconText}`} />
      </div>
      <div className="absolute -right-2 -top-4 w-20 h-20 icon-engraved opacity-50">
        <DecorIcon2 className={`w-full h-full ${colors.iconText}`} />
      </div>

      {/* Favorite toggle button */}
      {onFavoriteToggle && (
        <motion.button
          onClick={handleFavoriteClick}
          className="absolute top-4 right-4 z-20 ceramic-concave w-9 h-9 flex items-center justify-center group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={springHover}
          aria-label={space.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <motion.div
            animate={space.is_favorite ? {
              scale: [1, 1.2, 1],
            } : {}}
            transition={{
              duration: 0.3,
              ease: 'easeInOut',
            }}
          >
            <Star
              className={`w-4 h-4 transition-colors ${
                space.is_favorite
                  ? `${colors.iconText} fill-current`
                  : 'text-ceramic-text-secondary group-hover:text-ceramic-accent'
              }`}
            />
          </motion.div>
        </motion.button>
      )}

      {/* Card content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header: Icon + Title */}
        <div className="flex items-start gap-3 mb-3">
          {/* Archetype icon with accent background */}
          <div
            className={`ceramic-inset ${colors.iconBg} w-14 h-14 flex items-center justify-center flex-shrink-0`}
            style={{
              boxShadow: `inset 4px 4px 8px rgba(163, 158, 145, 0.35), inset -4px -4px 8px rgba(255, 255, 255, 1.0), 0 0 0 1px ${colors.accent}20`,
            }}
          >
            <span className="text-3xl">{space.icon || '🔗'}</span>
          </div>

          {/* Title and subtitle */}
          <div className="flex-1 min-w-0 pt-1 pr-8">
            <h3 className={`text-base font-bold ${colors.text} line-clamp-1 mb-0.5`}>
              {space.name}
            </h3>
            {space.subtitle && (
              <p className="text-xs text-ceramic-text-secondary line-clamp-1">
                {space.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {space.description && (
          <p className="text-xs text-ceramic-text-secondary line-clamp-2 mb-4 leading-relaxed">
            {space.description}
          </p>
        )}

        {/* Spacer to push footer to bottom */}
        <div className="flex-1 min-h-[20px]"></div>

        {/* Footer: Stats and metadata */}
        <div className="space-y-3 pt-3 border-t border-ceramic-text-secondary/10">
          {/* Stats row */}
          <div className="flex items-center gap-3">
            {/* Member count */}
            {memberCount !== undefined && memberCount > 0 && (
              <div className={`ceramic-inset ${colors.iconBg} px-2.5 py-1 flex items-center gap-1.5`}>
                <Users className={`w-3.5 h-3.5 ${colors.iconText}`} />
                <span className={`text-xs font-bold ${colors.text}`}>
                  {memberCount}
                </span>
              </div>
            )}

            {/* Activity indicator (if recent) */}
            {lastActivityText && (
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${colors.iconBg}`}></div>
                <span className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
                  {lastActivityText}
                </span>
              </div>
            )}
          </div>

          {/* Archetype label */}
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: colors.accent }}
            >
              {space.archetype}
            </span>

            {/* CTA indicator (appears on hover) */}
            <motion.div
              className="flex items-center gap-1 opacity-0 group-hover:opacity-100"
              initial={{ opacity: 0, x: -5 }}
              whileHover={{ opacity: 1, x: 0 }}
              transition={springHover}
            >
              <span className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Abrir
              </span>
              <ChevronRight className="w-3 h-3 text-ceramic-text-secondary" />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ConnectionSpaceCard;
