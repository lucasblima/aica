import React from 'react';
import { ChevronLeft, Settings, UserPlus, Calendar, Users } from 'lucide-react';
import { ConnectionSpace } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SpaceDetailsHeaderProps {
  space: ConnectionSpace;
  memberCount: number;
  onSettingsClick?: () => void;
  onInviteClick?: () => void;
  onBackClick?: () => void;
}

// Archetype color mappings
const ARCHETYPE_COLORS = {
  habitat: 'amber-600',
  ventures: 'slate-600',
  academia: 'blue-700',
  tribo: 'emerald-600',
} as const;

export const SpaceDetailsHeader: React.FC<SpaceDetailsHeaderProps> = ({
  space,
  memberCount,
  onSettingsClick,
  onInviteClick,
  onBackClick,
}) => {
  const accentColor = ARCHETYPE_COLORS[space.archetype];
  const formattedDate = format(new Date(space.created_at), "d 'de' MMMM, yyyy", {
    locale: ptBR,
  });

  return (
    <div className="w-full">
      {/* Back Button Row */}
      {onBackClick && (
        <button
          onClick={onBackClick}
          className="flex items-center gap-2 mb-4 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Voltar</span>
        </button>
      )}

      {/* Archetype Accent Band */}
      <div className={`w-full h-1.5 bg-${accentColor} rounded-full mb-6`} />

      {/* Main Header Content */}
      <div className="flex items-start gap-6 mb-6">
        {/* Space Icon */}
        <div className="ceramic-concave p-6 rounded-2xl flex-shrink-0">
          <span className="text-5xl" role="img" aria-label={space.archetype}>
            {space.icon || '📁'}
          </span>
        </div>

        {/* Title and Description */}
        <div className="flex-1 min-w-0">
          <h1 className="text-etched text-2xl font-bold mb-2 break-words">
            {space.name}
          </h1>

          {space.subtitle && (
            <p className="text-ceramic-text-secondary text-sm mb-3 font-medium">
              {space.subtitle}
            </p>
          )}

          {space.description && (
            <p className="text-ceramic-text-secondary text-base leading-relaxed">
              {space.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 mb-6 text-sm">
        <div className="flex items-center gap-2 text-ceramic-text-secondary">
          <Users className="w-4 h-4" />
          <span>
            {memberCount} {memberCount === 1 ? 'membro' : 'membros'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-ceramic-text-secondary">
          <Calendar className="w-4 h-4" />
          <span>Criado em {formattedDate}</span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-3">
        {onInviteClick && (
          <button
            onClick={onInviteClick}
            className="ceramic-card px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium text-ceramic-text-primary hover:ceramic-card-hover transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Convidar</span>
          </button>
        )}

        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="ceramic-card px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium text-ceramic-text-primary hover:ceramic-card-hover transition-all active:scale-95"
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </button>
        )}
      </div>
    </div>
  );
};
