/**
 * NotesView
 *
 * Browse and search all notes with graph visualization.
 */

import React, { useState } from 'react';
import { useNotes } from '../hooks/useNotes';
import { KnowledgeSearch } from '../components/KnowledgeSearch';
import { NoteGraph } from '../components/NoteGraph';
import { NoteEditor } from '../components/NoteEditor';
import { CreateNotePayload } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('NotesView');

interface NotesViewProps {
  spaceId: string;
}

type ViewMode = 'search' | 'graph';

export const NotesView: React.FC<NotesViewProps> = ({ spaceId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [showEditor, setShowEditor] = useState(false);

  const { notes, createNote } = useNotes({ spaceId });

  const handleCreateNote = async (payload: CreateNotePayload) => {
    try {
      await createNote(payload);
      setShowEditor(false);
    } catch (error) {
      log.error('Error creating note:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-light text-ceramic-text-primary tracking-tight mb-2">
            Knowledge Base
          </h1>
          <p className="text-ceramic-text-secondary text-sm font-light tracking-wide">
            {notes.length} notes in your collection
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex border border-ceramic-border rounded-sm overflow-hidden">
            <button
              onClick={() => setViewMode('search')}
              className={`
                px-4 py-2 text-sm font-light transition-colors
                ${
                  viewMode === 'search'
                    ? 'bg-ceramic-text-primary text-white'
                    : 'bg-ceramic-base text-ceramic-text-secondary hover:bg-ceramic-cool'
                }
              `}
            >
              Search
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`
                px-4 py-2 text-sm font-light transition-colors
                ${
                  viewMode === 'graph'
                    ? 'bg-ceramic-text-primary text-white'
                    : 'bg-ceramic-base text-ceramic-text-secondary hover:bg-ceramic-cool'
                }
              `}
            >
              Graph
            </button>
          </div>

          <button
            onClick={() => setShowEditor(true)}
            className="px-6 py-2 bg-ceramic-success text-white text-sm font-light tracking-wide rounded-sm hover:bg-ceramic-success/90 transition-colors"
          >
            New Note
          </button>
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="mb-8">
          <NoteEditor
            onSave={handleCreateNote}
            onCancel={() => setShowEditor(false)}
          />
        </div>
      )}

      {/* Content */}
      {viewMode === 'search' ? (
        <KnowledgeSearch notes={notes} />
      ) : (
        <NoteGraph notes={notes} />
      )}
    </div>
  );
};

export default NotesView;
