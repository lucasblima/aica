/**
 * FeedbackStatusRow — single feedback status indicator
 *
 * Shows a row with status icon (green check or empty square),
 * modality emoji, label, and optional summary. Used in the FeedbackTimeline.
 * Day grouping is handled by the parent — this component no longer shows day labels.
 */

import { Check, ChevronRight, Lock } from 'lucide-react';

export interface FeedbackStatusRowProps {
  type: 'exercise' | 'weekly';
  /** For exercise: slot template name. For weekly: "Feedback Semanal" */
  label: string;
  /** Whether feedback has been submitted */
  isSubmitted: boolean;
  /** Brief summary text (e.g., "RPE 6, 5/8 resp.") */
  summary?: string;
  /** Modality emoji icon (e.g., swimming emoji) */
  modalityIcon?: string;
  /** Date string, e.g., "20/02" */
  dateLabel?: string;
  /** Called when the user taps the row */
  onTap?: () => void;
  /** Whether this slot is in the future and feedback is blocked */
  locked?: boolean;
  /** @deprecated Day grouping is now done at the parent level */
  dayOfWeek?: number;
}

export function FeedbackStatusRow({
  type,
  label,
  isSubmitted,
  summary,
  modalityIcon,
  dateLabel,
  onTap,
  locked,
}: FeedbackStatusRowProps) {

  return (
    <button
      type="button"
      onClick={locked ? undefined : onTap}
      disabled={locked || !onTap}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left
        ${locked ? 'opacity-50 cursor-not-allowed' : onTap ? 'hover:bg-ceramic-cool/60 cursor-pointer' : 'cursor-default'}
        ${type === 'weekly' ? 'bg-ceramic-cool/30' : ''}
      `}
    >
      {/* Status icon */}
      <div className="flex-shrink-0">
        {locked ? (
          <div className="w-5 h-5 rounded bg-ceramic-cool flex items-center justify-center">
            <Lock className="w-3 h-3 text-ceramic-text-secondary/50" />
          </div>
        ) : isSubmitted ? (
          <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded border-2 border-ceramic-border" />
        )}
      </div>

      {/* Modality icon (exercise only) */}
      {type === 'exercise' && modalityIcon && (
        <span className="text-sm flex-shrink-0 leading-none" aria-hidden="true">
          {modalityIcon}
        </span>
      )}

      {/* Main label + summary */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${locked ? 'text-ceramic-text-secondary/60' : isSubmitted ? 'text-ceramic-text-primary' : 'text-ceramic-text-secondary'}`}>
          {label}
        </p>
        {locked && (
          <p className="text-[10px] text-ceramic-text-secondary/50 mt-0.5">
            Disponivel apos o treino
          </p>
        )}
        {!locked && isSubmitted && summary && (
          <p className="text-xs text-ceramic-text-secondary truncate mt-0.5">
            {summary}
          </p>
        )}
        {!locked && isSubmitted && dateLabel && (
          <p className="text-[10px] text-ceramic-text-secondary mt-0.5">
            Enviado {dateLabel}
          </p>
        )}
      </div>

      {/* Action indicator */}
      {!locked && !isSubmitted && onTap && (
        <span className="flex-shrink-0 text-xs font-bold text-amber-500 flex items-center gap-0.5">
          Dar feedback
          <ChevronRight className="w-3 h-3" />
        </span>
      )}
      {!locked && isSubmitted && onTap && (
        <ChevronRight className="w-4 h-4 text-ceramic-text-secondary/40 flex-shrink-0" />
      )}
    </button>
  );
}

export type { FeedbackStatusRowProps as FeedbackStatusRowType };
