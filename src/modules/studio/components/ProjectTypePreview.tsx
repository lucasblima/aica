import React from 'react';
import { Mic2, Video, FileText, Mail, Scissors, Clock } from 'lucide-react';
import type { ProjectTypeConfig } from '../types/studio';

// Map iconName string to actual Lucide component
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Mic2: Mic2,
  Video: Video,
  FileText: FileText,
  Mail: Mail,
  Scissors: Scissors,
};

interface ProjectTypePreviewProps {
  config: ProjectTypeConfig;
  disabled?: boolean;
  onClick?: () => void;
}

export const ProjectTypePreview: React.FC<ProjectTypePreviewProps> = ({
  config,
  disabled = false,
  onClick,
}) => {
  const Icon = ICON_MAP[config.iconName] || FileText;

  // Color mapping for bg/text
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-200' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
  };
  const colors = colorMap[config.color] || colorMap.amber;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`ceramic-card p-4 text-left rounded-2xl w-full transition-all duration-300 ${
        disabled
          ? 'opacity-60 cursor-default'
          : 'hover:scale-[1.02] cursor-pointer'
      }`}
    >
      <div className={`${colors.bg} rounded-xl p-4 mb-3 flex items-center justify-center`}>
        <Icon className={`w-8 h-8 ${colors.text}`} />
      </div>
      <h3 className="text-sm font-bold text-ceramic-text-primary mb-1">
        {config.label}
      </h3>
      <p className="text-xs text-ceramic-text-secondary line-clamp-2 mb-2">
        {config.description}
      </p>
      {config.comingSoon && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-ceramic-cool text-ceramic-text-secondary">
          <Clock className="w-3 h-3" />
          Em breve
        </span>
      )}
      {!config.comingSoon && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.bg} ${colors.text}`}>
          Disponivel
        </span>
      )}
    </button>
  );
};
