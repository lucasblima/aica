import React from 'react';
import { X } from 'lucide-react';

export interface TimeBlockSlotProps {
  title: string;
  startTime: string;
  duration: number;         // minutes
  color?: string;
  source: string;           // 'work_item' | 'calendar_google' | 'flux' etc.
  isReadOnly?: boolean;
  onRemove?: () => void;    // unschedule callback
}

/**
 * Visual representation of a scheduled time block on the daily timeline.
 *
 * Styling varies by source:
 * - work_item: solid amber left border (user's own tasks)
 * - calendar_*: dashed border (external calendar events)
 * - flux: solid blue left border (workout blocks)
 * - default: ceramic border
 *
 * Height is proportional to duration (1px per minute, minimum 24px).
 * Non-read-only items show a remove button on hover.
 */
export const TimeBlockSlot: React.FC<TimeBlockSlotProps> = ({
  title,
  startTime,
  duration,
  color,
  source,
  isReadOnly = false,
  onRemove,
}) => {
  const height = Math.max(duration, 24); // 1px per minute, minimum 24px

  const bgClass = source === 'work_item'
    ? 'bg-amber-50 border-l-4 border-amber-500'
    : source.startsWith('calendar_')
      ? 'border border-dashed border-ceramic-border bg-ceramic-cool'
      : source === 'flux'
        ? 'bg-blue-50 border-l-4 border-blue-500'
        : 'bg-ceramic-cool border-l-4 border-ceramic-border';

  const formatTime = (iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`rounded-lg px-2 py-1 text-sm overflow-hidden ${bgClass}`}
      style={{
        height: `${height}px`,
        ...(color ? { backgroundColor: color } : {}),
      }}
      title={`${title} - ${formatTime(startTime)} (${duration}min)`}
    >
      <div className="flex items-start justify-between">
        <span className="font-medium text-ceramic-text-primary truncate text-xs">
          {title}
        </span>
        {!isReadOnly && onRemove && (
          <button
            onClick={onRemove}
            className="text-ceramic-text-secondary hover:text-ceramic-error ml-1 flex-shrink-0"
            aria-label={`Remover ${title} da agenda`}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <span className="text-xs text-ceramic-text-secondary">{duration}min</span>
    </div>
  );
};
