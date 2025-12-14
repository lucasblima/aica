/**
 * KnowledgeSearch Component
 *
 * Full-text search for notes with filtering by type and tags.
 * Design: Clean search interface with instant results.
 */

import React, { useState, useMemo } from 'react';
import { AcademiaNote, NoteType } from '../types';

interface KnowledgeSearchProps {
  notes: AcademiaNote[];
  onNoteClick?: (note: AcademiaNote) => void;
}

/**
 * Search notes by title and content
 */
const searchNotes = (
  notes: AcademiaNote[],
  query: string,
  noteTypeFilter?: NoteType,
  tagFilter?: string
): AcademiaNote[] => {
  const lowerQuery = query.toLowerCase().trim();

  return notes.filter((note) => {
    // Type filter
    if (noteTypeFilter && note.note_type !== noteTypeFilter) {
      return false;
    }

    // Tag filter
    if (tagFilter && !note.tags.includes(tagFilter)) {
      return false;
    }

    // Text search (if query exists)
    if (lowerQuery) {
      const titleMatch = note.title.toLowerCase().includes(lowerQuery);
      const contentMatch = note.content.toLowerCase().includes(lowerQuery);
      const tagMatch = note.tags.some((tag) =>
        tag.toLowerCase().includes(lowerQuery)
      );

      return titleMatch || contentMatch || tagMatch;
    }

    return true;
  });
};

/**
 * Get snippet around search query
 */
const getSearchSnippet = (content: string, query: string): string => {
  if (!query) return content.substring(0, 150);

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) return content.substring(0, 150);

  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 100);

  let snippet = content.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  return snippet;
};

/**
 * Highlight query in text
 */
const highlightQuery = (text: string, query: string): JSX.Element => {
  if (!query) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 text-stone-900">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

export const KnowledgeSearch: React.FC<KnowledgeSearchProps> = ({
  notes,
  onNoteClick,
}) => {
  const [query, setQuery] = useState('');
  const [noteTypeFilter, setNoteTypeFilter] = useState<NoteType | undefined>();
  const [tagFilter, setTagFilter] = useState<string | undefined>();

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Search results
  const results = useMemo(
    () => searchNotes(notes, query, noteTypeFilter, tagFilter),
    [notes, query, noteTypeFilter, tagFilter]
  );

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg
            className="w-5 h-5 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes by title, content, or tags..."
          className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-sm text-base font-light focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Note Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-light tracking-wide">
            Type:
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setNoteTypeFilter(undefined)}
              className={`
                px-3 py-1 text-xs font-light tracking-wide rounded-sm transition-colors
                ${
                  !noteTypeFilter
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }
              `}
            >
              All
            </button>
            <button
              onClick={() => setNoteTypeFilter('fleeting')}
              className={`
                px-3 py-1 text-xs font-light tracking-wide rounded-sm transition-colors
                ${
                  noteTypeFilter === 'fleeting'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }
              `}
            >
              Fleeting
            </button>
            <button
              onClick={() => setNoteTypeFilter('literature')}
              className={`
                px-3 py-1 text-xs font-light tracking-wide rounded-sm transition-colors
                ${
                  noteTypeFilter === 'literature'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }
              `}
            >
              Literature
            </button>
            <button
              onClick={() => setNoteTypeFilter('permanent')}
              className={`
                px-3 py-1 text-xs font-light tracking-wide rounded-sm transition-colors
                ${
                  noteTypeFilter === 'permanent'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }
              `}
            >
              Permanent
            </button>
          </div>
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-light tracking-wide">
              Tag:
            </span>
            <select
              value={tagFilter || ''}
              onChange={(e) => setTagFilter(e.target.value || undefined)}
              className="px-3 py-1 text-xs font-light border border-stone-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear filters */}
        {(noteTypeFilter || tagFilter) && (
          <button
            onClick={() => {
              setNoteTypeFilter(undefined);
              setTagFilter(undefined);
            }}
            className="text-xs text-stone-500 hover:text-stone-700 font-light underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
        <span className="text-sm text-stone-600 font-light">
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </span>
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-xs text-stone-500 hover:text-stone-700 font-light underline"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {results.length === 0 ? (
          <div className="bg-stone-50 rounded-sm border border-stone-100 p-12 text-center">
            <p className="text-stone-400 text-sm font-light tracking-wide">
              {query
                ? 'No notes found matching your search.'
                : 'No notes match the selected filters.'}
            </p>
          </div>
        ) : (
          results.map((note) => {
            const snippet = getSearchSnippet(note.content, query);

            return (
              <div
                key={note.id}
                onClick={() => onNoteClick?.(note)}
                className="bg-white border border-stone-200 rounded-sm p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-normal text-stone-900">
                    {highlightQuery(note.title, query)}
                  </h3>
                  <span className="text-xs text-stone-400 font-light tracking-wider uppercase flex-shrink-0 ml-3">
                    {note.note_type}
                  </span>
                </div>

                <p className="text-sm text-stone-600 font-light leading-relaxed mb-3">
                  {highlightQuery(snippet, query)}
                </p>

                {note.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`
                          text-xs font-light px-2 py-1 rounded-sm
                          ${
                            tag === tagFilter
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-stone-50 text-stone-600 border border-stone-200'
                          }
                        `}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default KnowledgeSearch;
