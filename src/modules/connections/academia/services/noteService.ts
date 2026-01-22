import { supabase } from '@/lib/supabase';
import type {
  AcademiaNote,
  CreateNotePayload,
  UpdateNotePayload,
  NoteType,
  NoteSearchResult,
} from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('noteService');

/**
 * Note Service
 *
 * Handles all CRUD operations and business logic for Academia knowledge notes.
 * Supports Zettelkasten methodology with fleeting, literature, and permanent notes.
 */
export const noteService = {
  /**
   * Get all notes for a space
   * Ordered by: most recently updated first
   */
  async getNotes(spaceId: string): Promise<AcademiaNote[]> {
    try {
      const { data, error } = await supabase
        .from('academia_notes')
        .select('*')
        .eq('space_id', spaceId)
        .order('updated_at', { ascending: false });

      if (error) {
        log.error('Error fetching notes:', error);
        throw new Error(`Failed to fetch notes: ${error.message}`);
      }

      return data as AcademiaNote[];
    } catch (error) {
      log.error('Error in getNotes:', error);
      throw error;
    }
  },

  /**
   * Get notes filtered by type (fleeting, literature, permanent)
   */
  async getNotesByType(spaceId: string, noteType: NoteType): Promise<AcademiaNote[]> {
    try {
      const { data, error } = await supabase
        .from('academia_notes')
        .select('*')
        .eq('space_id', spaceId)
        .eq('note_type', noteType)
        .order('updated_at', { ascending: false });

      if (error) {
        log.error('Error fetching notes by type:', error);
        throw new Error(`Failed to fetch ${noteType} notes: ${error.message}`);
      }

      return data as AcademiaNote[];
    } catch (error) {
      log.error('Error in getNotesByType:', error);
      throw error;
    }
  },

  /**
   * Get notes for a specific journey
   */
  async getNotesByJourney(journeyId: string): Promise<AcademiaNote[]> {
    try {
      const { data, error } = await supabase
        .from('academia_notes')
        .select('*')
        .eq('journey_id', journeyId)
        .order('created_at', { ascending: false });

      if (error) {
        log.error('Error fetching notes by journey:', error);
        throw new Error(`Failed to fetch journey notes: ${error.message}`);
      }

      return data as AcademiaNote[];
    } catch (error) {
      log.error('Error in getNotesByJourney:', error);
      throw error;
    }
  },

  /**
   * Get notes by tag
   */
  async getNotesByTag(spaceId: string, tag: string): Promise<AcademiaNote[]> {
    try {
      const { data, error } = await supabase
        .from('academia_notes')
        .select('*')
        .eq('space_id', spaceId)
        .contains('tags', [tag])
        .order('updated_at', { ascending: false });

      if (error) {
        log.error('Error fetching notes by tag:', error);
        throw new Error(`Failed to fetch notes with tag "${tag}": ${error.message}`);
      }

      return data as AcademiaNote[];
    } catch (error) {
      log.error('Error in getNotesByTag:', error);
      throw error;
    }
  },

  /**
   * Get a single note by ID
   */
  async getNoteById(id: string): Promise<AcademiaNote> {
    try {
      const { data, error } = await supabase
        .from('academia_notes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        log.error('Error fetching note:', error);
        throw new Error(`Failed to fetch note: ${error.message}`);
      }

      if (!data) {
        throw new Error('Note not found');
      }

      return data as AcademiaNote;
    } catch (error) {
      log.error('Error in getNoteById:', error);
      throw error;
    }
  },

  /**
   * Get linked notes for a note (bidirectional)
   */
  async getLinkedNotes(noteId: string): Promise<AcademiaNote[]> {
    try {
      const note = await this.getNoteById(noteId);

      if (!note.linked_note_ids || note.linked_note_ids.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('academia_notes')
        .select('*')
        .in('id', note.linked_note_ids);

      if (error) {
        log.error('Error fetching linked notes:', error);
        throw new Error(`Failed to fetch linked notes: ${error.message}`);
      }

      return data as AcademiaNote[];
    } catch (error) {
      log.error('Error in getLinkedNotes:', error);
      throw error;
    }
  },

  /**
   * Get backlinks (notes that link to this note)
   */
  async getBacklinks(noteId: string): Promise<AcademiaNote[]> {
    try {
      const { data, error } = await supabase
        .from('academia_notes')
        .select('*')
        .contains('linked_note_ids', [noteId]);

      if (error) {
        log.error('Error fetching backlinks:', error);
        throw new Error(`Failed to fetch backlinks: ${error.message}`);
      }

      return data as AcademiaNote[];
    } catch (error) {
      log.error('Error in getBacklinks:', error);
      throw error;
    }
  },

  /**
   * Create a new note
   */
  async createNote(spaceId: string, payload: CreateNotePayload): Promise<AcademiaNote> {
    try {
      const noteData = {
        space_id: spaceId,
        ...payload,
        content_type: 'markdown',
        note_type: payload.note_type || 'fleeting',
        tags: payload.tags || [],
        linked_note_ids: [],
      };

      const { data, error } = await supabase
        .from('academia_notes')
        .insert(noteData)
        .select()
        .single();

      if (error) {
        log.error('Error creating note:', error);
        throw new Error(`Failed to create note: ${error.message}`);
      }

      return data as AcademiaNote;
    } catch (error) {
      log.error('Error in createNote:', error);
      throw error;
    }
  },

  /**
   * Update an existing note
   */
  async updateNote(id: string, payload: UpdateNotePayload): Promise<AcademiaNote> {
    try {
      const updateData = {
        ...payload,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('academia_notes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error('Error updating note:', error);
        throw new Error(`Failed to update note: ${error.message}`);
      }

      if (!data) {
        throw new Error('Note not found');
      }

      return data as AcademiaNote;
    } catch (error) {
      log.error('Error in updateNote:', error);
      throw error;
    }
  },

  /**
   * Add a link to another note
   */
  async linkNote(fromNoteId: string, toNoteId: string): Promise<AcademiaNote> {
    try {
      const note = await this.getNoteById(fromNoteId);

      // Avoid duplicate links
      if (!note.linked_note_ids.includes(toNoteId)) {
        const updatedLinks = [...note.linked_note_ids, toNoteId];

        return this.updateNote(fromNoteId, {
          linked_note_ids: updatedLinks,
        });
      }

      return note;
    } catch (error) {
      log.error('Error in linkNote:', error);
      throw error;
    }
  },

  /**
   * Remove a link to another note
   */
  async unlinkNote(fromNoteId: string, toNoteId: string): Promise<AcademiaNote> {
    try {
      const note = await this.getNoteById(fromNoteId);

      const updatedLinks = note.linked_note_ids.filter((id) => id !== toNoteId);

      return this.updateNote(fromNoteId, {
        linked_note_ids: updatedLinks,
      });
    } catch (error) {
      log.error('Error in unlinkNote:', error);
      throw error;
    }
  },

  /**
   * Add a tag to a note
   */
  async addTag(noteId: string, tag: string): Promise<AcademiaNote> {
    try {
      const note = await this.getNoteById(noteId);

      // Avoid duplicate tags
      if (!note.tags.includes(tag)) {
        const updatedTags = [...note.tags, tag];

        return this.updateNote(noteId, {
          tags: updatedTags,
        });
      }

      return note;
    } catch (error) {
      log.error('Error in addTag:', error);
      throw error;
    }
  },

  /**
   * Remove a tag from a note
   */
  async removeTag(noteId: string, tag: string): Promise<AcademiaNote> {
    try {
      const note = await this.getNoteById(noteId);

      const updatedTags = note.tags.filter((t) => t !== tag);

      return this.updateNote(noteId, {
        tags: updatedTags,
      });
    } catch (error) {
      log.error('Error in removeTag:', error);
      throw error;
    }
  },

  /**
   * Full-text search notes
   */
  async searchNotes(
    spaceId: string,
    query: string
  ): Promise<NoteSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('academia_notes')
        .select('*')
        .eq('space_id', spaceId)
        .textSearch('title', query, {
          type: 'websearch',
          config: 'english',
        });

      if (error) {
        log.error('Error searching notes:', error);
        throw new Error(`Failed to search notes: ${error.message}`);
      }

      // Convert to search results with snippets
      const results: NoteSearchResult[] = (data as AcademiaNote[]).map((note, index) => {
        // Create a simple snippet (first 150 chars of content)
        const snippet = note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '');

        return {
          note,
          rank: index + 1,
          snippet,
        };
      });

      return results;
    } catch (error) {
      log.error('Error in searchNotes:', error);
      throw error;
    }
  },

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('academia_notes').delete().eq('id', id);

      if (error) {
        log.error('Error deleting note:', error);
        throw new Error(`Failed to delete note: ${error.message}`);
      }
    } catch (error) {
      log.error('Error in deleteNote:', error);
      throw error;
    }
  },

  /**
   * Get all unique tags in a space
   */
  async getAllTags(spaceId: string): Promise<string[]> {
    try {
      const notes = await this.getNotes(spaceId);

      const allTags = notes.flatMap((note) => note.tags);
      const uniqueTags = Array.from(new Set(allTags)).sort();

      return uniqueTags;
    } catch (error) {
      log.error('Error in getAllTags:', error);
      throw error;
    }
  },

  /**
   * Get note statistics for a space
   */
  async getNoteStats(spaceId: string): Promise<{
    total: number;
    fleeting: number;
    literature: number;
    permanent: number;
    totalLinks: number;
    mostLinkedNote?: AcademiaNote;
  }> {
    try {
      const notes = await this.getNotes(spaceId);

      const totalLinks = notes.reduce((sum, note) => sum + note.linked_note_ids.length, 0);

      // Find most linked note (by backlinks)
      let mostLinkedNote: AcademiaNote | undefined;
      let maxBacklinks = 0;

      for (const note of notes) {
        const backlinks = await this.getBacklinks(note.id);
        if (backlinks.length > maxBacklinks) {
          maxBacklinks = backlinks.length;
          mostLinkedNote = note;
        }
      }

      return {
        total: notes.length,
        fleeting: notes.filter((n) => n.note_type === 'fleeting').length,
        literature: notes.filter((n) => n.note_type === 'literature').length,
        permanent: notes.filter((n) => n.note_type === 'permanent').length,
        totalLinks,
        mostLinkedNote,
      };
    } catch (error) {
      log.error('Error in getNoteStats:', error);
      throw error;
    }
  },
};
