/**
 * NoteEditor Component
 *
 * Markdown editor for creating and editing Zettelkasten notes.
 * Design: Clean, distraction-free writing experience with preview mode.
 */

import React, { useState, useEffect } from 'react';
import { AcademiaNote, NoteType, CreateNotePayload, UpdateNotePayload } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('NoteEditor');

interface NoteEditorProps {
  note?: AcademiaNote;
  onSave: (payload: CreateNotePayload | UpdateNotePayload) => Promise<void>;
  onCancel?: () => void;
  journeyId?: string;
}

const NOTE_TYPE_OPTIONS: { value: NoteType; label: string; description: string }[] = [
  {
    value: 'fleeting',
    label: 'Fleeting',
    description: 'Quick thoughts and temporary notes',
  },
  {
    value: 'literature',
    label: 'Literature',
    description: 'Notes from books, articles, or courses',
  },
  {
    value: 'permanent',
    label: 'Permanent',
    description: 'Synthesized knowledge in your own words',
  },
];

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onCancel,
  journeyId,
}) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [noteType, setNoteType] = useState<NoteType>(note?.note_type || 'fleeting');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [sourceReference, setSourceReference] = useState(note?.source_reference || '');
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!note) {
      const draft = { title, content, noteType, tags, sourceReference };
      localStorage.setItem('academia-note-draft', JSON.stringify(draft));
    }
  }, [title, content, noteType, tags, sourceReference, note]);

  // Load draft on mount (if creating new note)
  useEffect(() => {
    if (!note) {
      const draftStr = localStorage.getItem('academia-note-draft');
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          setTitle(draft.title || '');
          setContent(draft.content || '');
          setNoteType(draft.noteType || 'fleeting');
          setTags(draft.tags || []);
          setSourceReference(draft.sourceReference || '');
        } catch (error) {
          log.error('Error loading draft:', error);
        }
      }
    }
  }, [note]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      setIsSaving(true);

      const payload: CreateNotePayload | UpdateNotePayload = {
        title: title.trim(),
        content: content.trim(),
        note_type: noteType,
        source_reference: sourceReference.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        journey_id: journeyId,
      };

      await onSave(payload);

      // Clear draft on successful save
      if (!note) {
        localStorage.removeItem('academia-note-draft');
      }
    } catch (error) {
      log.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="bg-ceramic-base border border-ceramic-border rounded-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-ceramic-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-light text-ceramic-text-primary">
            {note ? 'Edit Note' : 'New Note'}
          </h2>

          {/* Preview Toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary font-light tracking-wide transition-colors"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full text-2xl font-light text-ceramic-text-primary placeholder-ceramic-text-tertiary border-none outline-none focus:ring-0 p-0"
        />

        {/* Note Type Selector */}
        <div className="flex gap-2 mt-4">
          {NOTE_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setNoteType(option.value)}
              className={`
                px-3 py-1 text-xs font-light tracking-wide rounded-sm transition-colors
                ${
                  noteType === option.value
                    ? 'bg-ceramic-success/15 text-ceramic-success border border-ceramic-success/20'
                    : 'bg-ceramic-cool text-ceramic-text-secondary border border-ceramic-border hover:bg-ceramic-cool'
                }
              `}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {showPreview ? (
          /* Preview Mode */
          <div className="prose max-w-none">
            <div className="text-ceramic-text-primary font-light leading-relaxed whitespace-pre-wrap">
              {content || 'Nothing to preview...'}
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your note... (Markdown supported)"
            className="w-full min-h-[400px] text-base font-light text-ceramic-text-primary placeholder-ceramic-text-tertiary border-none outline-none focus:ring-0 p-0 resize-none leading-relaxed"
          />
        )}
      </div>

      {/* Metadata Section */}
      <div className="border-t border-ceramic-border p-6 space-y-4 bg-ceramic-cool">
        {/* Source Reference */}
        <div>
          <label className="block text-xs text-ceramic-text-secondary font-light tracking-wide mb-2">
            Source Reference (optional)
          </label>
          <input
            type="text"
            value={sourceReference}
            onChange={(e) => setSourceReference(e.target.value)}
            placeholder="Book, article, URL, etc."
            className="w-full px-3 py-2 border border-ceramic-border rounded-sm text-sm font-light focus:outline-none focus:ring-2 focus:ring-ceramic-success focus:border-transparent bg-ceramic-base"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs text-ceramic-text-secondary font-light tracking-wide mb-2">
            Tags
          </label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-ceramic-base border border-ceramic-border rounded-sm text-xs font-light text-ceramic-text-primary"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-ceramic-text-tertiary hover:text-ceramic-text-secondary"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag..."
              className="flex-1 px-3 py-2 border border-ceramic-border rounded-sm text-sm font-light focus:outline-none focus:ring-2 focus:ring-ceramic-success focus:border-transparent bg-ceramic-base"
            />
            <button
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              className="px-4 py-2 bg-ceramic-base border border-ceramic-border text-sm font-light text-ceramic-text-primary rounded-sm hover:bg-ceramic-cool disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-ceramic-border p-6 flex justify-end gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-light text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className="px-6 py-2 bg-ceramic-success text-white text-sm font-light tracking-wide rounded-sm hover:bg-ceramic-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : note ? 'Update Note' : 'Create Note'}
        </button>
      </div>

      {/* Character count */}
      <div className="px-6 pb-4 flex justify-between text-xs text-ceramic-text-tertiary font-light">
        <span>{content.length} characters</span>
        <span>{content.split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  );
};

export default NoteEditor;
