import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Users, Star } from 'lucide-react';
import { ConnectionSpace } from '../types';
import { ARCHETYPE_CONFIG } from '../types';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SpaceCardProps {
  /** Connection space data */
  space: ConnectionSpace;
  /** Click handler for the card */
  onClick?: () => void;
  /** Display variant */
  variant?: 'compact' | 'full';
  /** Show favorite toggle */
  showFavorite?: boolean;
  /** Toggle favorite handler */
  onToggleFavorite?: () => void;
  /** Number of members (optional) */
  memberCount?: number;
}

/**
 * SpaceCard - Card for displaying a connection space
 *
 * Displays space information with archetype-based theming and interactive states.
 * Supports both compact (list) and full (detail) variants.
 *
 * @example
 * ```tsx
 * <SpaceCard
 *   space={mySpace}
 *   variant="full"
 *   showFavorite
 *   memberCount={5}
 *   onClick={() => navigate(`/connections/${mySpace.id}`)}
 *   onToggleFavorite={() => toggleFavorite(mySpace.id)}
 * />
 * ```
 */
export function SpaceCard({
  space,
  onClick,
  variant = 'full',
  showFavorite = false,
  onToggleFavorite,
  memberCount,
}: SpaceCardProps) {
  const config = ARCHETYPE_CONFIG[space.archetype];

  // Get color theme class based on archetype
  const getThemeColors = () => {
    switch (space.color_theme) {
      case 'earth':
        return 'bg-ceramic-info/10 text-ceramic-info';
      case 'amber':
        return 'bg-amber-50 text-amber-600';
      case 'paper':
        return 'bg-ceramic-warning/10 text-ceramic-warning';
      case 'warm':
        return 'bg-ceramic-success/10 text-ceramic-success';
      default:
        return 'bg-ceramic-accent/10 text-ceramic-accent';
    }
  };

  const themeColors = getThemeColors();

  // Format last accessed time
  const getLastAccessedText = () => {
    if (!space.last_accessed_at) return null;

    try {
      const distance = formatDistanceToNow(new Date(space.last_accessed_at), {
        addSuffix: true,
        locale: ptBR,
      });
      return `Acessado ${distance}`;
    } catch {
      return null;
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  if (variant === 'compact') {
    return (
      <motion.button
        className="ceramic-card w-full p-4 flex items-center gap-3 cursor-pointer text-left"
        variants={cardElevationVariants}
        initial="rest"
        whileHover="hover"
        whileTap="pressed"
        onClick={onClick}
      >
        {/* Icon */}
        <div className={`ceramic-inset w-12 h-12 flex items-center justify-center ${themeColors} flex-shrink-0`}>
          <span className="text-2xl">{space.icon}</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ceramic-text-primary truncate">
            {space.name}
          </h3>
          {space.subtitle && (
            <p className="text-xs text-ceramic-text-secondary truncate">
              {space.subtitle}
            </p>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight className="w-5 h-5 text-ceramic-text-secondary flex-shrink-0" />
      </motion.button>
    );
  }

  // Full variant
  return (
    <motion.div
      className="ceramic-card p-5 cursor-pointer relative overflow-hidden"
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
      onClick={onClick}
    >
      {/* Favorite button */}
      {showFavorite && (
        <button
          onClick={handleFavoriteClick}
          className="absolute top-4 right-4 z-10 ceramic-concave w-8 h-8 flex items-center justify-center hover:scale-95 active:scale-90 transition-transform"
          aria-label={space.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Star
            className={`w-4 h-4 ${
              space.is_favorite
                ? 'fill-ceramic-accent text-ceramic-accent'
                : 'text-ceramic-text-secondary'
            }`}
          />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Icon */}
        <div className={`ceramic-inset w-14 h-14 flex items-center justify-center ${themeColors} flex-shrink-0`}>
          <span className="text-3xl">{space.icon}</span>
        </div>

        {/* Title and subtitle */}
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-base font-bold text-ceramic-text-primary mb-1 line-clamp-1">
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
        <p className="text-xs text-ceramic-text-secondary line-clamp-2 mb-4">
          {space.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-ceramic-text-secondary/10">
        {/* Members badge */}
        {memberCount !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className={`ceramic-inset w-6 h-6 flex items-center justify-center ${themeColors}`}>
              <Users className="w-3 h-3" />
            </div>
            <span className="text-xs font-medium text-ceramic-text-secondary">
              {memberCount} {memberCount === 1 ? 'membro' : 'membros'}
            </span>
          </div>
        )}

        {/* Last accessed */}
        {getLastAccessedText() && (
          <span className="text-[10px] text-ceramic-text-secondary/60 uppercase tracking-wider">
            {getLastAccessedText()}
          </span>
        )}

        {/* Archetype label if no members */}
        {memberCount === undefined && (
          <span className="text-[10px] text-ceramic-text-secondary/60 uppercase tracking-wider">
            {config.label}
          </span>
        )}

        {/* Chevron */}
        <ChevronRight className="w-4 h-4 text-ceramic-text-secondary opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
      </div>
    </motion.div>
  );
}

export default SpaceCard;
