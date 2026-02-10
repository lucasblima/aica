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
        group flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full
        bg-ceramic-base/80 border border-white/60
        shadow-sm hover:shadow-md
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:hover:scale-100
        transition-all duration-200
      "
    >
      {/* Icon Well */}
      <div className={`
        w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0
        ${type === 'edital'
          ? 'bg-ceramic-accent/15 text-ceramic-accent'
          : 'bg-ceramic-info-bg text-ceramic-info'}
      `}>
        {isLoading ? (
          <Loader2 size={10} className="animate-spin sm:w-3 sm:h-3" />
        ) : type === 'edital' ? (
          <FileText size={10} className="sm:w-3 sm:h-3" />
        ) : (
          <FolderOpen size={10} className="sm:w-3 sm:h-3" />
        )}
      </div>

      {/* Text Info - Hidden on mobile, visible on sm+ */}
      <div className="hidden sm:flex flex-col items-start min-w-0">
        <span className="text-[10px] sm:text-[11px] font-bold text-[#5C554B] leading-none truncate">
          {label}
        </span>
        <span className="text-[9px] sm:text-[10px] text-[#948D82] leading-none mt-0.5">
          {type === 'edital'
            ? (charCount ? `${Math.round(charCount / 1000)}k` : '-')
            : `${count || 0}`
          }
        </span>
      </div>

      {/* Status Indicator */}
      {isAvailable && (
        <CheckCircle2 size={10} className="text-ceramic-success flex-shrink-0 sm:w-3 sm:h-3" />
      )}
    </button>
  );
};

export default ContextChip;
