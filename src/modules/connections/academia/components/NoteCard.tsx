/**
 * NoteCard Component
 *
 * Displays a note/zettel with preview and metadata.
 * Design: Paper-like card with elegant typography.
 *
 * @stub - To be implemented
 */

import React from 'react';
import { AcademiaNote, NoteType } from '../types';

interface NoteCardProps {
  note: AcademiaNote;
  onClick?: () => void;
  compact?: boolean;
}

/**
 * Get note type badge color
 */
const getNoteTypeBadge = (type: NoteType): { color: string; label: string } => {
  const badges: Record<NoteType, { color: string; label: string }> = {
    fleeting: { color: 'bg-amber-100 text-amber-800', label: 'Fleeting' },
    literature: { color: 'bg-blue-100 text-blue-800', label: 'Literature' },
    permanent: { color: 'bg-emerald-100 text-emerald-800', label: 'Permanent' },
  };
  return badges[type];
};

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onClick,
  compact = false,
}) => {
  const badge = getNoteTypeBadge(note.note_type);

  // Truncate content for preview
  const previewContent =
    note.content.length > 150
      ? note.content.substring(0, 150) + '...'
      : note.content;

  return (
    <div
      onClick={onClick}
      className={`
        ceramic-card bg-white border border-stone-200 rounded-sm
        hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h4
          className={`
          font-normal text-stone-900 flex-1
          ${compact ? 'text-sm' : 'text-base'}
        `}
        >
          {note.title}
        </h4>
        <span
          className={`
          text-xs font-light tracking-wider uppercase px-2 py-1 rounded-sm ml-2
          ${badge.color}
        `}
        >
          {badge.label}
        </span>
      </div>

      {/* Content Preview */}
      {!compact && (
        <p className="text-sm text-stone-600 font-light leading-relaxed mb-3">
          {previewContent}
        </p>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {note.tags.slice(0, compact ? 2 : 5).map((tag) => (
            <span
              key={tag}
              className="text-xs text-stone-500 font-light bg-stone-100 px-2 py-0.5 rounded-sm"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > (compact ? 2 : 5) && (
            <span className="text-xs text-stone-400 font-light">
              +{note.tags.length - (compact ? 2 : 5)} more
            </span>
          )}
        </div>
      )}

      {/* Linked Notes Indicator */}
      {note.linked_note_ids && note.linked_note_ids.length > 0 && (
        <div className="mt-2 pt-2 border-t border-stone-100">
          <span className="text-xs text-stone-400 font-light">
            {note.linked_note_ids.length} linked note
            {note.linked_note_ids.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default NoteCard;
