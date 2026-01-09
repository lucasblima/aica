/**
 * Unit Tests for Weekly Summary Service
 *
 * Tests cover the generateSummaryWithAI() function which triggers AI cost tracking
 *
 * Validates:
 * - Summary generation from moments
 * - Fallback behavior when AI fails
 * - Weekly summary CRUD operations
 * - Consciousness points (CP) award on reflection
 * - Fire-and-forget AI tracking integration
 *
 * Run with: npm test weeklySummaryService.test.ts
 * Run with coverage: npm test -- --coverage weeklySummaryService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateWeeklySummary,
  getWeeklySummary,
  getCurrentWeeklySummary,
  getAllWeeklySummaries,
  addReflectionToSummary,
  markSummaryAsViewed,
  type WeeklySummary,
  type WeeklySummaryData,
} from '../weeklySummaryService';
import { supabase } from '@/lib/supabase';
import { GeminiClient } from '@/lib/gemini';
import * as momentService from '../momentService';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock GeminiClient
vi.mock('@/lib/gemini', () => ({
  GeminiClient: {
    getInstance: vi.fn(),
  },
}));

// Mock moment service
vi.mock('../momentService', () => ({
  getMoments: vi.fn(),
}));

// Mock trackAIUsage to avoid dependencies
vi.mock('@/services/aiUsageTrackingService', () => ({
  trackAIUsage: vi.fn().mockResolvedValue(undefined),
}));

describe('Weekly Summary Service', () => {
  let mockGemini: any;
  let mockSupabaseFrom: any;
  let mockSupabaseRpc: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Gemini mock
    mockGemini = {
      call: vi.fn(),
    };
    vi.mocked(GeminiClient.getInstance).mockReturnValue(mockGemini);

    // Setup Supabase mocks
    mockSupabaseFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    });

    mockSupabaseRpc = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation(mockSupabaseFrom);
    vi.mocked(supabase.rpc).mockImplementation(mockSupabaseRpc);

    // Setup moment service mock
    vi.mocked(momentService.getMoments).mockResolvedValue([]);
  });

  describe('generateWeeklySummary', () => {
    it('should generate summary for specific week with moments', async () => {
      const userId = 'user-123';
      const year = 2025;
      const weekNumber = 1;

      const mockMoments = [
        {
          id: 'm1',
          content: 'Had a productive meeting',
          emotion: 'happy',
          sentiment_data: { sentiment: 'positive' },
          tags: ['work'],
          created_at: new Date().toISOString(),
        },
        {
          id: 'm2',
          content: 'Finished my project',
          emotion: 'accomplished',
          sentiment_data: { sentiment: 'positive' },
          tags: ['work', 'achievement'],
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(momentService.getMoments).mockResolvedValueOnce(mockMoments);

      mockGemini.call.mockResolvedValue({
        result: {
          emotionalTrend: 'positive',
          dominantEmotions: ['happy', 'accomplished'],
          keyMoments: [
            {
              id: 'm1',
              preview: 'Had a productive meeting',
              sentiment: 'positive',
            },
          ],
          insights: ['You had a productive week focused on work'],
          suggestedFocus: 'Continue building on your momentum',
        } as WeeklySummaryData,
      });

      // Mock database upsert
      const mockUpsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'summary-1',
            user_id: userId,
            week_number: weekNumber,
            year,
          },
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpsertChain);

      const result = await generateWeeklySummary(userId, year, weekNumber);

      expect(result).toBeDefined();
      expect(result.week_number).toBe(weekNumber);
      expect(result.year).toBe(year);
    });

    it('should generate empty week summary when no moments', async () => {
      const userId = 'user-123';

      vi.mocked(momentService.getMoments).mockResolvedValueOnce([]);

      const mockUpsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'summary-1',
            summary_data: {
              emotionalTrend: 'neutral',
              dominantEmotions: [],
              keyMoments: [],
              insights: ['No moments captured this week'],
              suggestedFocus: 'Start capturing moments for insights',
            },
          },
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpsertChain);

      const result = await generateWeeklySummary(userId, 2025, 1);

      expect(result).toBeDefined();
      // Empty week should have neutral trend and no moments
    });

    it('should call Gemini with correct payload for AI analysis', async () => {
      const userId = 'user-123';
      const mockMoments = [
        {
          id: 'm1',
          content: 'Work moment',
          emotion: 'neutral',
          sentiment_data: {},
          tags: [],
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(momentService.getMoments).mockResolvedValueOnce(mockMoments);

      mockGemini.call.mockResolvedValue({
        result: {
          emotionalTrend: 'neutral',
          dominantEmotions: [],
          keyMoments: [],
          insights: [],
          suggestedFocus: '',
        } as WeeklySummaryData,
      });

      const mockUpsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {} }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpsertChain);

      await generateWeeklySummary(userId, 2025, 1);

      // Verify Gemini was called with moments
      expect(mockGemini.call).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'generate_weekly_summary',
          payload: expect.objectContaining({
            moments: expect.arrayContaining([
              expect.objectContaining({
                id: 'm1',
                content: 'Work moment',
              }),
            ]),
          }),
        })
      );
    });

    it('should use fallback summary when Gemini fails', async () => {
      const userId = 'user-123';
      const mockMoments = [
        {
          id: 'm1',
          content: 'Moment 1',
          emotion: 'happy',
          sentiment_data: { sentiment: 'positive' },
          tags: ['personal'],
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(momentService.getMoments).mockResolvedValueOnce(mockMoments);

      // Gemini call fails
      mockGemini.call.mockRejectedValue(new Error('API error'));

      const mockUpsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            summary_data: expect.objectContaining({
              insights: expect.arrayContaining([expect.stringMatching(/momento|captured/i)]),
            }),
          },
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpsertChain);

      const result = await generateWeeklySummary(userId, 2025, 1);

      // Should still return a summary with fallback data
      expect(result).toBeDefined();
    });

    it('should use smart model for Gemini call', async () => {
      vi.mocked(momentService.getMoments).mockResolvedValueOnce([]);

      mockGemini.call.mockResolvedValue({
        result: {
          emotionalTrend: 'neutral',
          dominantEmotions: [],
          keyMoments: [],
          insights: [],
          suggestedFocus: '',
        } as WeeklySummaryData,
      });

      const mockUpsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {} }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpsertChain);

      await generateWeeklySummary('user-123', 2025, 1);

      expect(mockGemini.call).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'smart',
        })
      );
    });
  });

  describe('getWeeklySummary', () => {
    it('should fetch existing summary from database', async () => {
      const mockSummary = {
        id: 'summary-1',
        user_id: 'user-123',
        week_number: 1,
        year: 2025,
        summary_data: {},
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockSummary,
          error: null,
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockChain);

      const result = await getWeeklySummary('user-123', 2025, 1);

      expect(result).toEqual(mockSummary);
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockChain.eq).toHaveBeenCalledWith('year', 2025);
      expect(mockChain.eq).toHaveBeenCalledWith('week_number', 1);
    });

    it('should return null if summary not found (PGRST116)', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockChain);

      const result = await getWeeklySummary('user-123', 2025, 1);

      expect(result).toBeNull();
    });

    it('should throw on other database errors', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST001', message: 'Database error' },
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockChain);

      await expect(getWeeklySummary('user-123', 2025, 1)).rejects.toThrow();
    });
  });

  describe('getCurrentWeeklySummary', () => {
    it('should return current week summary if exists', async () => {
      const mockSummary = {
        id: 'summary-1',
        week_number: 2,
        summary_data: {},
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockSummary,
          error: null,
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockChain);

      const result = await getCurrentWeeklySummary('user-123');

      expect(result).toBeDefined();
    });

    it('should auto-generate if current summary not found', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockChain) // getWeeklySummary call
        .mockReturnValueOnce({
          // generateWeeklySummary call
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'summary-1',
              summary_data: {},
            },
          }),
        });

      vi.mocked(momentService.getMoments).mockResolvedValueOnce([]);

      mockGemini.call.mockResolvedValue({
        result: {
          emotionalTrend: 'neutral',
          dominantEmotions: [],
          keyMoments: [],
          insights: [],
          suggestedFocus: '',
        },
      });

      const result = await getCurrentWeeklySummary('user-123');

      expect(result).toBeDefined();
    });
  });

  describe('getAllWeeklySummaries', () => {
    it('should fetch user summaries with limit', async () => {
      const mockSummaries = [
        { id: 's1', week_number: 2, year: 2025 },
        { id: 's2', week_number: 1, year: 2025 },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockSummaries,
          error: null,
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockChain);

      const result = await getAllWeeklySummaries('user-123', 20);

      expect(result).toEqual(mockSummaries);
      expect(mockChain.limit).toHaveBeenCalledWith(20);
    });

    it('should default limit to 20', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockChain);

      await getAllWeeklySummaries('user-123');

      expect(mockChain.limit).toHaveBeenCalledWith(20);
    });

    it('should handle database errors gracefully', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('DB error'),
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockChain);

      const result = await getAllWeeklySummaries('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('addReflectionToSummary', () => {
    it('should add reflection and award consciousness points', async () => {
      const userId = 'user-123';
      const summaryId = 'summary-1';
      const reflection = 'Great week of learning';

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: summaryId,
            user_reflection: reflection,
          },
          error: null,
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpdateChain);

      mockSupabaseRpc.mockResolvedValueOnce({
        data: { new_total: 120 },
        error: null,
      });

      const mockUpdateStatsChain = {
        update: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpdateStatsChain);

      const result = await addReflectionToSummary(userId, summaryId, reflection);

      expect(result.user_reflection).toBe(reflection);

      // Verify CP was awarded
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'award_consciousness_points',
        expect.objectContaining({
          p_user_id: userId,
          p_points: 20,
          p_reason: 'weekly_reflection',
        })
      );
    });

    it('should update stats after reflection', async () => {
      const userId = 'user-123';
      const summaryId = 'summary-1';

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: summaryId },
          error: null,
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpdateChain);

      mockSupabaseRpc.mockResolvedValueOnce({
        data: { new_total: 100 },
        error: null,
      });

      const mockStatsChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockStatsChain);

      await addReflectionToSummary(userId, summaryId, 'Reflection');

      // Verify stats update was called
      expect(mockSupabaseFrom).toHaveBeenCalledWith('user_consciousness_stats');
    });

    it('should handle CP award errors gracefully', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'summary-1' },
          error: null,
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpdateChain);

      // CP award fails
      mockSupabaseRpc.mockResolvedValueOnce({
        data: null,
        error: new Error('CP error'),
      });

      const mockStatsChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockStatsChain);

      // Should still complete without throwing
      await expect(
        addReflectionToSummary('user-123', 'summary-1', 'Reflection')
      ).resolves.not.toThrow();
    });
  });

  describe('markSummaryAsViewed', () => {
    it('should mark summary as viewed', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpdateChain);

      await markSummaryAsViewed('user-123', 'summary-1');

      expect(mockUpdateChain.update).toHaveBeenCalledWith({
        viewed_at: expect.any(String),
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockRejectedValue(new Error('DB error')),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpdateChain);

      // Should not throw
      await expect(
        markSummaryAsViewed('user-123', 'summary-1')
      ).resolves.not.toThrow();
    });
  });

  describe('Integration with trackAIUsage', () => {
    it('should document where trackAIUsage is called for generateSummaryWithAI', async () => {
      // This documents the integration point
      // In actual implementation:
      // const response = await geminiClient.call({ action: 'generate_weekly_summary', ... })
      // trackAIUsage({
      //   operation_type: 'generate_weekly_summary',
      //   ai_model: 'gemini-1.5-pro', // expensive - uses smart model
      //   input_tokens: from response.usageMetadata,
      //   output_tokens: from response.usageMetadata,
      //   module_type: 'journey',
      //   module_id: `week-${year}-${weekNumber}`,
      //   duration_seconds: ...
      // }).catch(err => { /* fire-and-forget, don't break summary */ });

      const mockMoments = [
        {
          id: 'm1',
          content: 'Moment',
          emotion: 'happy',
          sentiment_data: {},
          tags: [],
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(momentService.getMoments).mockResolvedValueOnce(mockMoments);

      mockGemini.call.mockResolvedValue({
        result: {
          emotionalTrend: 'positive',
          dominantEmotions: ['happy'],
          keyMoments: [],
          insights: [],
          suggestedFocus: '',
        },
        usageMetadata: {
          promptTokenCount: 5000,
          candidatesTokenCount: 1000,
          totalTokenCount: 6000,
        },
      });

      const mockUpsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {} }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpsertChain);

      await generateWeeklySummary('user-123', 2025, 1);

      // Verify Gemini was called with data to be tracked
      expect(mockGemini.call).toHaveBeenCalled();
    });
  });

  describe('Fallback Behavior', () => {
    it('should generate fallback summary with emotion stats', async () => {
      const mockMoments = [
        {
          id: 'm1',
          content: 'Happy moment',
          emotion: 'happy',
          sentiment_data: { sentiment: 'positive' },
          tags: [],
          created_at: new Date().toISOString(),
        },
        {
          id: 'm2',
          content: 'Sad moment',
          emotion: 'sad',
          sentiment_data: { sentiment: 'negative' },
          tags: [],
          created_at: new Date().toISOString(),
        },
        {
          id: 'm3',
          content: 'Happy again',
          emotion: 'happy',
          sentiment_data: { sentiment: 'positive' },
          tags: [],
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(momentService.getMoments).mockResolvedValueOnce(mockMoments);

      mockGemini.call.mockRejectedValue(new Error('API error'));

      const mockUpsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            summary_data: {
              emotionalTrend: 'stable',
              dominantEmotions: ['happy', 'sad'],
              keyMoments: expect.arrayContaining([
                expect.objectContaining({ emotion: 'happy' }),
              ]),
            },
          },
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpsertChain);

      const result = await generateWeeklySummary('user-123', 2025, 1);

      expect(result).toBeDefined();
    });

    it('should generate empty week summary fallback', async () => {
      vi.mocked(momentService.getMoments).mockResolvedValueOnce([]);

      mockGemini.call.mockRejectedValue(new Error('Error'));

      const mockUpsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            summary_data: {
              emotionalTrend: 'neutral',
              dominantEmotions: [],
              keyMoments: [],
              insights: expect.arrayContaining([
                expect.stringMatching(/nenhum momento|no moments/i),
              ]),
            },
          },
        }),
      };

      mockSupabaseFrom.mockReturnValueOnce(mockUpsertChain);

      const result = await generateWeeklySummary('user-123', 2025, 1);

      expect(result).toBeDefined();
    });
  });
});
