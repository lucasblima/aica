/**
 * ContextChip - Compact pill showing context source status
 * Part of the Context Ribbon pattern for compressed headers
 * Follows Digital Ceramic design system
 */

import React from 'react';
import { CheckCircle2, FileText, FolderOpen, Loader2 } from 'lucide-react';

interface ContextChipProps {
  type: 'edital' | 'docs';
  label: string;
  status?: string;
  count?: number;
  charCount?: number;
  isLoading?: boolean;
  onClick: () => void;
}

export const ContextChip: React.FC<ContextChipProps> = ({
  type,
  label,
  status,
  count,
  charCount,
  isLoading,
  onClick
}) => {
  const isAvailable = type === 'edital' ? !!charCount : (count && count > 0);

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="
        group flex items-center gap-2 px-3 py-2 rounded-full
        bg-white/80 border border-white/60
        shadow-sm hover:shadow-md
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:hover:scale-100
        transition-all duration-200
      "
    >
      {/* Icon Well */}
      <div className={`
        w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
        ${type === 'edital'
          ? 'bg-purple-100 text-purple-600'
          : 'bg-blue-100 text-blue-600'}
      `}>
        {isLoading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : type === 'edital' ? (
          <FileText size={12} />
        ) : (
          <FolderOpen size={12} />
        )}
      </div>

      {/* Text Info */}
      <div className="flex flex-col items-start min-w-0">
        <span className="text-[11px] font-bold text-[#5C554B] leading-none truncate">
          {label}
        </span>
        <span className="text-[10px] text-[#948D82] leading-none mt-0.5">
          {type === 'edital'
            ? (charCount ? `${Math.round(charCount / 1000)}k chars` : 'Nao carregado')
            : `${count || 0} arquivo${count !== 1 ? 's' : ''}`
          }
        </span>
      </div>

      {/* Status Indicator */}
      {isAvailable && (
        <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
      )}
    </button>
  );
};

export default ContextChip;
