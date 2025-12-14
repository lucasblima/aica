/**
 * useNotes Hook
 *
 * Manages Zettelkasten-style knowledge notes with linking and search.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { noteService } from '../services/noteService';
import type { AcademiaNote, CreateNotePayload, UpdateNotePayload, NoteType } from '../types';

interface UseNotesOptions {
  spaceId: string;
  journeyId?: string;
  noteType?: NoteType;
  autoFetch?: boolean;
}

interface UseNotesReturn {
  notes: AcademiaNote[];
  loading: boolean;
  error: Error | null;
  createNote: (payload: CreateNotePayload) => Promise<AcademiaNote>;
  updateNote: (id: string, payload: UpdateNotePayload) => Promise<AcademiaNote>;
  linkNote: (fromId: string, toId: string) => Promise<AcademiaNote>;
  unlinkNote: (fromId: string, toId: string) => Promise<AcademiaNote>;
  addTag: (id: string, tag: string) => Promise<AcademiaNote>;
  removeTag: (id: string, tag: string) => Promise<AcademiaNote>;
  searchNotes: (query: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing Academia knowledge notes
 *
 * @example
 * ```tsx
 * const { notes, loading, createNote, linkNote } = useNotes({
 *   spaceId: 'space-123',
 *   noteType: 'permanent'
 * });
 *
 * // Create a new note
 * await createNote({
 *   title: 'Key Concepts in React',
 *   content: '# React Fundamentals...',
 *   note_type: 'permanent',
 *   tags: ['react', 'programming']
 * });
 *
 * // Link notes (Zettelkasten)
 * await linkNote(note1Id, note2Id);
 * ```
 */
export function useNotes(options: UseNotesOptions): UseNotesReturn {
  const { user } = useAuth();
  const { spaceId, journeyId, noteType, autoFetch = true } = options;

  const [notes, setNotes] = useState<AcademiaNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    if (!user?.id || !spaceId) return;

    try {
      setLoading(true);
      setError(null);

      let data: AcademiaNote[];

      if (journeyId) {
        data = await noteService.getNotesByJourney(journeyId);
      } else if (noteType) {
        data = await noteService.getNotesByType(spaceId, noteType);
      } else {
        data = await noteService.getNotes(spaceId);
      }

      setNotes(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, spaceId, journeyId, noteType]);

  // Create new note
  const createNote = useCallback(
    async (payload: CreateNotePayload): Promise<AcademiaNote> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const newNote = await noteService.createNote(spaceId, payload);

        // Add to list if it matches current filter
        const matchesFilter =
          (!journeyId || newNote.journey_id === journeyId) &&
          (!noteType || newNote.note_type === noteType);

        if (matchesFilter) {
          setNotes((prev) => [newNote, ...prev]);
        }

        return newNote;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, spaceId, journeyId, noteType]
  );

  // Update note
  const updateNote = useCallback(
    async (id: string, payload: UpdateNotePayload): Promise<AcademiaNote> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updatedNote = await noteService.updateNote(id, payload);

        setNotes((prev) =>
          prev.map((note) => (note.id === id ? updatedNote : note))
        );

        return updatedNote;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Link note to another note
  const linkNote = useCallback(
    async (fromId: string, toId: string): Promise<AcademiaNote> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const updatedNote = await noteService.linkNote(fromId, toId);

        setNotes((prev) =>
          prev.map((note) => (note.id === fromId ? updatedNote : note))
        );

        return updatedNote;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [user?.id]
  );

  // Unlink note from another note
  const unlinkNote = useCallback(
    async (fromId: string, toId: string): Promise<AcademiaNote> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const updatedNote = await noteService.unlinkNote(fromId, toId);

        setNotes((prev) =>
          prev.map((note) => (note.id === fromId ? updatedNote : note))
        );

        return updatedNote;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [user?.id]
  );

  // Add tag
  const addTag = useCallback(
    async (id: string, tag: string): Promise<AcademiaNote> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const updatedNote = await noteService.addTag(id, tag);

        setNotes((prev) =>
          prev.map((note) => (note.id === id ? updatedNote : note))
        );

        return updatedNote;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [user?.id]
  );

  // Remove tag
  const removeTag = useCallback(
    async (id: string, tag: string): Promise<AcademiaNote> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const updatedNote = await noteService.removeTag(id, tag);

        setNotes((prev) =>
          prev.map((note) => (note.id === id ? updatedNote : note))
        );

        return updatedNote;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [user?.id]
  );

  // Search notes
  const searchNotes = useCallback(
    async (query: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const results = await noteService.searchNotes(spaceId, query);
        setNotes(results.map((r) => r.note));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, spaceId]
  );

  // Delete note
  const deleteNote = useCallback(
    async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        await noteService.deleteNote(id);

        setNotes((prev) => prev.filter((note) => note.id !== id));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Refresh notes
  const refresh = useCallback(async () => {
    await fetchNotes();
  }, [fetchNotes]);

  // Auto-fetch on mount and dependencies change
  useEffect(() => {
    if (autoFetch && user?.id && spaceId) {
      fetchNotes();
    }
  }, [autoFetch, user?.id, spaceId, fetchNotes]);

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    linkNote,
    unlinkNote,
    addTag,
    removeTag,
    searchNotes,
    deleteNote,
    refresh,
  };
}

export default useNotes;
