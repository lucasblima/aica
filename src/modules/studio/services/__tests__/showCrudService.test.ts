import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/services/supabaseClient';
import { updateShow, deleteShow } from '../workspaceDatabaseService';

describe('Show CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateShow', () => {
    it('updates show name and description', async () => {
      const mockData = { id: 'show-1', name: 'Updated Name', description: 'Updated Desc' };
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      const result = await updateShow('show-1', { name: 'Updated Name', description: 'Updated Desc' });

      expect(supabase.from).toHaveBeenCalledWith('podcast_shows');
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Name', description: 'Updated Desc' });
      expect(mockEq).toHaveBeenCalledWith('id', 'show-1');
      expect(result).toEqual(mockData);
    });

    it('throws on supabase error', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await expect(updateShow('bad-id', { name: 'Test' })).rejects.toThrow('Failed to update show');
    });
  });

  describe('deleteShow', () => {
    it('deletes show by id', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ delete: mockDelete });

      await deleteShow('show-1');

      expect(supabase.from).toHaveBeenCalledWith('podcast_shows');
      expect(mockEq).toHaveBeenCalledWith('id', 'show-1');
    });

    it('throws on supabase error', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: { message: 'FK constraint' } });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ delete: mockDelete });

      await expect(deleteShow('show-1')).rejects.toThrow('Failed to delete show');
    });
  });
});
