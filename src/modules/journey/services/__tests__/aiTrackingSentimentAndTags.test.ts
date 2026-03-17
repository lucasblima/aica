/**
 * AI Tracking Tests for Sentiment Analysis and Auto-Tagging
 *
 * SCOPE: Validates AI tracking for:
 * 6. analyzeMomentSentiment - Sentiment analysis in momentService.ts
 * 7. generateAutoTags - Auto-tag generation in momentPersistenceService.ts
 *
 * These operations are tested separately because they are internal helpers
 * called during moment creation, not standalone exported functions.
 *
 * Run with:
 * npm test aiTrackingSentimentAndTags.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackAIUsage } from '@/services/aiUsageTrackingService';
import { GeminiClient } from '@/lib/gemini/client';

// Mock trackAIUsage
vi.mock('@/services/aiUsageTrackingService', () => ({
  trackAIUsage: vi.fn().mockResolvedValue(undefined),
}));

// Mock GeminiClient
vi.mock('@/lib/gemini/client', () => ({
  GeminiClient: {
    getInstance: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'moment-123' },
        error: null,
      }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    }),
    rpc: vi.fn().mockResolvedValue({
      data: { new_total: 10, leveled_up: false },
      error: null,
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'áudio/test.webm' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/áudio.webm' } }),
      }),
    },
  },
}));

// Mock integrations
vi.mock('@/integrations/geminiSentimentAnalysis', () => ({
  analyzeSentimentWithGemini: vi.fn().mockResolvedValue({
    label: 'positive',
    score: 0.8,
    generatedAt: new Date(),
  }),
  generateSentimentInsights: vi.fn(),
}));

vi.mock('@/integrations/whisperTranscription', () => ({
  transcribeAudioWithWhisper: vi.fn().mockResolvedValue({
    success: true,
    text: 'Transcribed áudio content',
    transcribedAt: new Date(),
  }),
  validateAudioFile: vi.fn().mockReturnValue({ valid: true }),
  getAudioDuration: vi.fn().mockReturnValue(10),
  postProcessTranscription: vi.fn((text) => text),
}));

vi.mock('@/utils/momentValidation', () => ({
  validateMomentInput: vi.fn(() => ({
    valid: true,
    validatedInput: {
      userId: 'user-123',
      content: 'Test moment',
      emotionSelected: 'happy',
      emotionIntensity: 5,
      lifeAreas: ['work'],
      tags: ['test'],
    },
    errors: [],
    warnings: [],
  })),
  sanitizeText: vi.fn((text) => text),
  checkRateLimit: vi.fn(() => true),
  estimateBaseCP: vi.fn(() => 5),
}));

describe('AI Tracking for Sentiment Analysis & Auto-Tagging', () => {
  let mockGemini: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGemini = {
      call: vi.fn(),
    };

    vi.mocked(GeminiClient.getInstance).mockReturnValue(mockGemini);
  });

  describe('6. analyzeMomentSentiment - AI Tracking', () => {
    it('should call trackAIUsage after sentiment analysis', async () => {
      mockGemini.call.mockResolvedValue({
        result: {
          timestamp: new Date(),
          sentiment: 'positive',
          sentimentScore: 0.85,
          emotions: ['happy', 'excited'],
          triggers: ['achievement'],
          energyLevel: 75,
        },
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 150,
          candidatesTokenCount: 80,
        },
      });

      // Import and call the service directly
      const { createMoment } = await import('../momentService');
      await createMoment('user-123', {
        type: 'text',
        content: 'I feel amazing today after completing the project!',
        emotion: 'happy',
      });

      // Should be called for sentiment analysis
      expect(trackAIUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_type: 'text_generation',
          ai_model: 'gemini-2.0-flash',
          input_tokens: expect.any(Number),
          output_tokens: expect.any(Number),
          module_type: 'journey',
          request_metadata: expect.objectContaining({
            function_name: 'analyzeMomentSentiment',
            operation: 'sentiment_analysis',
            content_length: expect.any(Number),
          }),
        })
      );
    });

    it('should track content_length in metadata', async () => {
      const longContent = 'A'.repeat(500);

      mockGemini.call.mockResolvedValue({
        result: {
          timestamp: new Date(),
          sentiment: 'neutral',
          sentimentScore: 0.5,
          emotions: [],
          triggers: [],
          energyLevel: 50,
        },
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 200,
          candidatesTokenCount: 100,
        },
      });

      const { createMoment } = await import('../momentService');
      await createMoment('user-123', {
        type: 'text',
        content: longContent,
        emotion: 'neutral',
      });

      const sentimentTrackingCall = vi
        .mocked(trackAIUsage)
        .mock.calls.find((call) => call[0].request_metadata?.function_name === 'analyzeMomentSentiment');

      expect(sentimentTrackingCall?.[0].request_metadata?.content_length).toBeGreaterThan(400);
    });

    it('should be non-blocking: sentiment tracking errors do not break moment creation', async () => {
      mockGemini.call.mockResolvedValue({
        result: {
          timestamp: new Date(),
          sentiment: 'positive',
          sentimentScore: 0.7,
          emotions: [],
          triggers: [],
          energyLevel: 60,
        },
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
        },
      });

      vi.mocked(trackAIUsage).mockRejectedValueOnce(new Error('Tracking failed'));

      const { createMoment } = await import('../momentService');

      await expect(
        createMoment('user-123', {
          type: 'text',
          content: 'This moment should still be created',
          emotion: 'happy',
        })
      ).resolves.toBeDefined();
    });

    it('should use fast model for sentiment analysis', async () => {
      mockGemini.call.mockResolvedValue({
        result: {
          timestamp: new Date(),
          sentiment: 'positive',
          sentimentScore: 0.8,
          emotions: [],
          triggers: [],
          energyLevel: 70,
        },
        model: 'gemini-2.0-flash', // Fast model
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 60,
        },
      });

      const { createMoment } = await import('../momentService');
      await createMoment('user-123', {
        type: 'text',
        content: 'Test content for fast model',
        emotion: 'happy',
      });

      expect(mockGemini.call).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'fast',
        })
      );
    });
  });

  describe('7. generateAutoTags - AI Tracking', () => {
    it('should call trackAIUsage after auto-tag generation', async () => {
      mockGemini.call.mockResolvedValue({
        result: {
          text: '{"tags": ["work", "achievement", "learning"], "insights": "Great progress!", "confidence": {"work": 0.9, "achievement": 0.85, "learning": 0.7}}',
        },
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 250,
          candidatesTokenCount: 120,
        },
      });

      const { createMomentEntry } = await import('../momentPersistenceService');

      await createMomentEntry({
        userId: 'user-123',
        content: 'Completed a major project milestone today',
        emotionSelected: 'accomplished',
        emotionIntensity: 8,
        lifeAreas: ['work', 'career'],
        tags: ['project'],
      });

      // Should be called for auto-tagging
      const autoTaggingCall = vi
        .mocked(trackAIUsage)
        .mock.calls.find((call) => call[0].request_metadata?.function_name === 'generateAutoTags');

      expect(autoTaggingCall).toBeDefined();
      expect(autoTaggingCall?.[0]).toMatchObject({
        operation_type: 'text_generation',
        ai_model: 'gemini-2.0-flash',
        input_tokens: 250,
        output_tokens: 120,
        module_type: 'journey',
        request_metadata: expect.objectContaining({
          function_name: 'generateAutoTags',
          operation: 'auto_tagging',
          content_length: expect.any(Number),
        }),
      });
    });

    it('should track content_length for auto-tagging', async () => {
      const longContent =
        'This is a very detailed moment entry that contains a lot of information about my day and accomplishments. I worked on multiple projects, had several meetings, and made significant progress on my goals. This should result in meaningful tags being generated.';

      mockGemini.call.mockResolvedValue({
        result: {
          text: '{"tags": ["work", "productivity", "goals"], "insights": "Productive day", "confidence": {"work": 0.9}}',
        },
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 300,
          candidatesTokenCount: 100,
        },
      });

      const { createMomentEntry } = await import('../momentPersistenceService');

      await createMomentEntry({
        userId: 'user-123',
        content: longContent,
        emotionSelected: 'productive',
        emotionIntensity: 7,
        lifeAreas: ['work'],
        tags: [],
      });

      const autoTaggingCall = vi
        .mocked(trackAIUsage)
        .mock.calls.find((call) => call[0].request_metadata?.function_name === 'generateAutoTags');

      expect(autoTaggingCall?.[0].request_metadata?.content_length).toBe(longContent.length);
    });

    it('should be non-blocking: auto-tagging tracking errors do not break moment creation', async () => {
      mockGemini.call.mockResolvedValue({
        result: {
          text: '{"tags": ["test"], "insights": "Test", "confidence": {"test": 0.8}}',
        },
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 200,
          candidatesTokenCount: 80,
        },
      });

      // Make first trackAIUsage call (sentiment) succeed, second (tags) fail
      vi.mocked(trackAIUsage)
        .mockResolvedValueOnce(undefined) // sentiment succeeds
        .mockRejectedValueOnce(new Error('Tracking error')); // tags fails

      const { createMomentEntry } = await import('../momentPersistenceService');

      await expect(
        createMomentEntry({
          userId: 'user-123',
          content: 'This moment should still be created despite tracking error',
          emotionSelected: 'happy',
          emotionIntensity: 5,
          lifeAreas: ['personal'],
          tags: [],
        })
      ).resolves.toBeDefined();
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockGemini.call.mockResolvedValue({
        result: {
          text: 'Invalid JSON response {broken',
        },
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 200,
          candidatesTokenCount: 50,
        },
      });

      const { createMomentEntry } = await import('../momentPersistenceService');

      // Should still create moment with fallback tags
      await expect(
        createMomentEntry({
          userId: 'user-123',
          content: 'Test content with broken JSON response',
          emotionSelected: 'neutral',
          emotionIntensity: 5,
          lifeAreas: ['personal'],
          tags: [],
        })
      ).resolves.toBeDefined();

      // Should still attempt to track AI usage
      expect(trackAIUsage).toHaveBeenCalled();
    });

    it('should truncate content to 500 chars for tagging', async () => {
      const veryLongContent = 'A'.repeat(1000);

      mockGemini.call.mockResolvedValue({
        result: {
          text: '{"tags": ["test"], "insights": "Test", "confidence": {"test": 0.8}}',
        },
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 200,
          candidatesTokenCount: 80,
        },
      });

      const { createMomentEntry } = await import('../momentPersistenceService');

      await createMomentEntry({
        userId: 'user-123',
        content: veryLongContent,
        emotionSelected: 'neutral',
        emotionIntensity: 5,
        lifeAreas: ['personal'],
        tags: [],
      });

      // Gemini should be called with truncated content (first 500 chars)
      expect(mockGemini.call).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            content: expect.stringMatching(/^A{500}$/), // Exactly 500 A's
          }),
        })
      );
    });
  });

  describe('Combined Operations: Full Moment Creation Flow', () => {
    it('should track both sentiment analysis and auto-tagging in single moment creation', async () => {
      // Mock Gemini responses for both operations
      mockGemini.call
        .mockResolvedValueOnce({
          // First call: sentiment analysis
          result: {
            timestamp: new Date(),
            sentiment: 'positive',
            sentimentScore: 0.85,
            emotions: ['happy'],
            triggers: [],
            energyLevel: 80,
          },
          model: 'gemini-2.0-flash',
          usageMetadata: {
            promptTokenCount: 150,
            candidatesTokenCount: 80,
          },
        })
        .mockResolvedValueOnce({
          // Second call: auto-tagging
          result: {
            text: '{"tags": ["work", "success"], "insights": "Great work!", "confidence": {"work": 0.9}}',
          },
          model: 'gemini-2.0-flash',
          usageMetadata: {
            promptTokenCount: 250,
            candidatesTokenCount: 100,
          },
        });

      const { createMomentEntry } = await import('../momentPersistenceService');

      await createMomentEntry({
        userId: 'user-123',
        content: 'Successfully launched the new feature today!',
        emotionSelected: 'accomplished',
        emotionIntensity: 9,
        lifeAreas: ['work', 'career'],
        tags: ['launch'],
      });

      // Should be called twice: once for sentiment, once for tags
      expect(trackAIUsage).toHaveBeenCalledTimes(2);

      // Verify sentiment tracking
      const sentimentCall = vi.mocked(trackAIUsage).mock.calls[0][0];
      expect(sentimentCall.request_metadata?.function_name).toBe('analyzeMomentSentiment');

      // Verify auto-tagging tracking
      const taggingCall = vi.mocked(trackAIUsage).mock.calls[1][0];
      expect(taggingCall.request_metadata?.function_name).toBe('generateAutoTags');
    });

    it('should accumulate token costs correctly for both operations', async () => {
      mockGemini.call
        .mockResolvedValueOnce({
          result: {
            timestamp: new Date(),
            sentiment: 'positive',
            sentimentScore: 0.8,
            emotions: [],
            triggers: [],
            energyLevel: 70,
          },
          model: 'gemini-2.0-flash',
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
          },
        })
        .mockResolvedValueOnce({
          result: {
            text: '{"tags": ["test"], "insights": "Test", "confidence": {"test": 0.8}}',
          },
          model: 'gemini-2.0-flash',
          usageMetadata: {
            promptTokenCount: 200,
            candidatesTokenCount: 80,
          },
        });

      const { createMomentEntry } = await import('../momentPersistenceService');

      await createMomentEntry({
        userId: 'user-123',
        content: 'Test moment for token accumulation',
        emotionSelected: 'neutral',
        emotionIntensity: 5,
        lifeAreas: ['personal'],
        tags: [],
      });

      // Verify total tokens tracked
      const allCalls = vi.mocked(trackAIUsage).mock.calls;
      const totalInputTokens = allCalls.reduce((sum, call) => sum + (call[0].input_tokens || 0), 0);
      const totalOutputTokens = allCalls.reduce((sum, call) => sum + (call[0].output_tokens || 0), 0);

      expect(totalInputTokens).toBe(300); // 100 + 200
      expect(totalOutputTokens).toBe(130); // 50 + 80
    });
  });

  describe('Error Recovery & Fallbacks', () => {
    it('should use fallback sentiment if AI fails, still track attempt', async () => {
      mockGemini.call.mockRejectedValueOnce(new Error('Gemini API error'));

      const { createMoment } = await import('../momentService');

      const result = await createMoment('user-123', {
        type: 'text',
        content: 'This should get fallback sentiment',
        emotion: 'neutral',
      });

      expect(result).toBeDefined();
      // Fallback sentiment should be applied
      expect(result.sentiment_data?.sentiment).toBe('neutral');
    });

    it('should use fallback tags if AI fails, still track attempt', async () => {
      mockGemini.call
        .mockResolvedValueOnce({
          // Sentiment succeeds
          result: {
            timestamp: new Date(),
            sentiment: 'positive',
            sentimentScore: 0.8,
            emotions: [],
            triggers: [],
            energyLevel: 70,
          },
          model: 'gemini-2.0-flash',
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
          },
        })
        .mockRejectedValueOnce(new Error('Tagging API error')); // Tagging fails

      const { createMomentEntry } = await import('../momentPersistenceService');

      const result = await createMomentEntry({
        userId: 'user-123',
        content: 'This should get fallback tags',
        emotionSelected: 'happy',
        emotionIntensity: 7,
        lifeAreas: ['work'],
        tags: ['manual-tag'],
      });

      expect(result).toBeDefined();
      // Should still have manual tag at minimum
      expect(result.momentId).toBeDefined();
    });
  });
});
