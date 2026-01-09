/**
 * AI Tracking Integration Tests for Finance Module
 *
 * SCOPE: Validates that trackAIUsage() is called correctly after all 5 AI operations in Finance module:
 * 1. chat - Finance agent conversational interface
 * 2. analyzeSpending - Spending pattern analysis
 * 3. predictNextMonth - Monthly spending prediction
 * 4. suggestSavings - Savings opportunity identification
 * 5. identifyAnomalies - Transaction anomaly detection
 *
 * CRITICAL VALIDATIONS (HIGH PRIORITY):
 * - trackAIUsage is called after each AI operation
 * - Tokens are extracted correctly from responses
 * - Tracking is non-blocking (errors don't break app)
 * - Metadata is correctly registered
 *
 * Run with:
 * npm test financeAITracking.test.ts
 * npm test -- --coverage financeAITracking.test.ts
 *
 * @see docs/FINANCE_AI_COST_TRACKING_INTEGRATION.md for comprehensive integration guide
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackAIUsage } from '@/services/aiUsageTrackingService';
import { GeminiClient } from '@/lib/gemini/client';
import { FinanceAgentService } from '../financeAgentService';
import type { AgentContext } from '../../types';

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
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  },
}));

describe('Finance AI Tracking Integration', () => {
  let mockGemini: any;
  let financeService: FinanceAgentService;
  let mockContext: AgentContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Gemini mock with realistic response structure
    mockGemini = {
      call: vi.fn(),
    };

    vi.mocked(GeminiClient.getInstance).mockReturnValue(mockGemini);

    financeService = new FinanceAgentService();

    // Create mock context
    mockContext = {
      transactions: [
        {
          id: 't1',
          user_id: 'user-123',
          transaction_date: '2025-01-01',
          amount: -50.00,
          type: 'expense',
          category: 'food',
          description: 'Grocery shopping',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:00:00Z'
        },
        {
          id: 't2',
          user_id: 'user-123',
          transaction_date: '2025-01-05',
          amount: -30.00,
          type: 'expense',
          category: 'transport',
          description: 'Uber',
          created_at: '2025-01-05T14:00:00Z',
          updated_at: '2025-01-05T14:00:00Z'
        }
      ],
      summary: {
        totalIncome: 3000.00,
        totalExpenses: 1500.00,
        balance: 1500.00,
        topCategories: [
          { category: 'food', amount: 500.00 },
          { category: 'transport', amount: 300.00 },
          { category: 'entertainment', amount: 200.00 }
        ],
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
        transactionCount: 25
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. chat() - AI Tracking', () => {
    it('should call trackAIUsage after successful Gemini response', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Seu saldo está positivo em R$ 1500.00. Bom trabalho!',
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 450,
          candidatesTokenCount: 120,
          totalTokenCount: 570,
        },
      });

      await financeService.chat('user-123', 'session-1', 'Como estão minhas finanças?', [], mockContext);

      expect(trackAIUsage).toHaveBeenCalledTimes(1);
      expect(trackAIUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_type: 'text_generation',
          ai_model: 'gemini-2.0-flash',
          input_tokens: 450,
          output_tokens: 120,
          module_type: 'finance',
          module_id: 'session-1',
          duration_seconds: expect.any(Number),
          request_metadata: expect.objectContaining({
            function_name: 'chat',
            use_case: 'finance_chat',
            message_length: expect.any(Number),
            has_context: true,
            session_id: 'session-1',
            history_length: 0
          }),
        })
      );
    });

    it('should extract tokens correctly from usageMetadata', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Análise completa',
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 800,
          candidatesTokenCount: 250,
        },
      });

      await financeService.chat('user-123', 'session-1', 'Analise meus gastos', [], mockContext);

      const trackingCall = vi.mocked(trackAIUsage).mock.calls[0][0];
      expect(trackingCall.input_tokens).toBe(800);
      expect(trackingCall.output_tokens).toBe(250);
    });

    it('should be non-blocking: tracking errors do not break chat', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Resposta normal',
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 300,
          candidatesTokenCount: 100,
        },
      });

      // Simulate tracking error
      vi.mocked(trackAIUsage).mockRejectedValueOnce(new Error('Database error'));

      // Should still return result successfully
      const result = await financeService.chat('user-123', 'session-1', 'Pergunta', [], mockContext);

      expect(result).toBeDefined();
      expect(result).toBe('Resposta normal');
    });

    it('should include correct metadata fields', async () => {
      const message = 'Quanto gastei em transporte?';
      const history = [
        { role: 'user' as const, content: 'Oi' },
        { role: 'assistant' as const, content: 'Olá! Como posso ajudar?' }
      ];

      mockGemini.call.mockResolvedValue({
        result: 'Você gastou R$ 300 em transporte.',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 500, candidatesTokenCount: 80 },
      });

      await financeService.chat('user-123', 'session-abc', message, history, mockContext);

      const trackingCall = vi.mocked(trackAIUsage).mock.calls[0][0];
      expect(trackingCall.request_metadata).toMatchObject({
        function_name: 'chat',
        use_case: 'finance_chat',
        message_length: message.length,
        has_context: true,
        session_id: 'session-abc',
        history_length: 2
      });
    });

    it('should measure duration accurately', async () => {
      mockGemini.call.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  result: 'Delayed response',
                  model: 'gemini-2.0-flash',
                  usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 50 },
                }),
              100
            )
          )
      );

      await financeService.chat('user-123', 'session-1', 'Test', [], mockContext);

      const trackingCall = vi.mocked(trackAIUsage).mock.calls[0][0];
      expect(trackingCall.duration_seconds).toBeGreaterThan(0.05);
      expect(trackingCall.duration_seconds).toBeLessThan(1);
    });

    it('should handle missing usageMetadata gracefully', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Response without metadata',
        model: 'gemini-2.0-flash',
        // usageMetadata missing
      });

      await financeService.chat('user-123', 'session-1', 'Test', [], mockContext);

      expect(trackAIUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          input_tokens: 0,
          output_tokens: 0,
        })
      );
    });
  });

  describe('2. analyzeSpending() - AI Tracking', () => {
    it('should call trackAIUsage after analyzing spending', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Suas principais categorias de gasto são: Alimentação (R$ 500), Transporte (R$ 300).',
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 600,
          candidatesTokenCount: 180,
        },
      });

      await financeService.analyzeSpending('user-123', mockContext);

      // Should have 2 tracking calls: one from chat(), one from analyzeSpending()
      expect(trackAIUsage).toHaveBeenCalledTimes(2);

      // Find the analyzeSpending tracking call
      const analyzeCall = vi.mocked(trackAIUsage).mock.calls.find(
        call => call[0].request_metadata?.function_name === 'analyzeSpending'
      );

      expect(analyzeCall).toBeDefined();
      expect(analyzeCall![0]).toMatchObject({
        operation_type: 'text_generation',
        ai_model: 'gemini-2.0-flash',
        module_type: 'finance',
        request_metadata: expect.objectContaining({
          function_name: 'analyzeSpending',
          use_case: 'finance_analysis',
          transactions_count: 2,
          date_range: '2025-01-01 to 2025-01-31',
          total_expenses: 1500.00
        }),
      });
    });

    it('should track transactions_count in metadata', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Analysis result',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 500, candidatesTokenCount: 150 },
      });

      await financeService.analyzeSpending('user-123', mockContext);

      const analyzeCall = vi.mocked(trackAIUsage).mock.calls.find(
        call => call[0].request_metadata?.function_name === 'analyzeSpending'
      );

      expect(analyzeCall![0].request_metadata?.transactions_count).toBe(2);
    });

    it('should be non-blocking on tracking failure', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Spending analysis',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 400, candidatesTokenCount: 120 },
      });

      vi.mocked(trackAIUsage).mockRejectedValueOnce(new Error('Network down'));

      const result = await financeService.analyzeSpending('user-123', mockContext);

      expect(result).toBeTruthy();
    });
  });

  describe('3. predictNextMonth() - AI Tracking', () => {
    it('should call trackAIUsage after prediction', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Previsão: R$ 1600 em gastos no próximo mês.',
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 700,
          candidatesTokenCount: 200,
        },
      });

      await financeService.predictNextMonth('user-123', mockContext);

      const predictCall = vi.mocked(trackAIUsage).mock.calls.find(
        call => call[0].request_metadata?.function_name === 'predictNextMonth'
      );

      expect(predictCall).toBeDefined();
      expect(predictCall![0]).toMatchObject({
        operation_type: 'text_generation',
        ai_model: 'gemini-2.0-flash',
        module_type: 'finance',
        request_metadata: expect.objectContaining({
          function_name: 'predictNextMonth',
          use_case: 'finance_prediction',
          historical_months: 1,
          categories_count: 3,
          total_income: 3000.00,
          total_expenses: 1500.00
        }),
      });
    });

    it('should calculate historical_months correctly', async () => {
      const multiMonthContext = {
        ...mockContext,
        summary: {
          ...mockContext.summary,
          periodStart: '2024-10-01',
          periodEnd: '2025-01-31'
        }
      };

      mockGemini.call.mockResolvedValue({
        result: 'Prediction',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 600, candidatesTokenCount: 180 },
      });

      await financeService.predictNextMonth('user-123', multiMonthContext);

      const predictCall = vi.mocked(trackAIUsage).mock.calls.find(
        call => call[0].request_metadata?.function_name === 'predictNextMonth'
      );

      // From Oct 2024 to Jan 2025 = 4 months
      expect(predictCall![0].request_metadata?.historical_months).toBe(4);
    });
  });

  describe('4. suggestSavings() - AI Tracking', () => {
    it('should call trackAIUsage after suggesting savings', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Você pode economizar R$ 200 reduzindo gastos em entretenimento.',
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 650,
          candidatesTokenCount: 150,
        },
      });

      await financeService.suggestSavings('user-123', mockContext);

      const savingsCall = vi.mocked(trackAIUsage).mock.calls.find(
        call => call[0].request_metadata?.function_name === 'suggestSavings'
      );

      expect(savingsCall).toBeDefined();
      expect(savingsCall![0]).toMatchObject({
        operation_type: 'text_generation',
        ai_model: 'gemini-2.0-flash',
        module_type: 'finance',
        request_metadata: expect.objectContaining({
          function_name: 'suggestSavings',
          use_case: 'finance_savings',
          current_spending: 1500.00,
          target_savings: 0, // Balance is positive
          categories_analyzed: 3,
          balance: 1500.00
        }),
      });
    });

    it('should calculate target_savings for negative balance', async () => {
      const negativeBalanceContext = {
        ...mockContext,
        summary: {
          ...mockContext.summary,
          totalIncome: 1000.00,
          totalExpenses: 1500.00,
          balance: -500.00
        }
      };

      mockGemini.call.mockResolvedValue({
        result: 'Savings suggestion',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 600, candidatesTokenCount: 140 },
      });

      await financeService.suggestSavings('user-123', negativeBalanceContext);

      const savingsCall = vi.mocked(trackAIUsage).mock.calls.find(
        call => call[0].request_metadata?.function_name === 'suggestSavings'
      );

      expect(savingsCall![0].request_metadata?.target_savings).toBe(500.00);
    });
  });

  describe('5. identifyAnomalies() - AI Tracking', () => {
    it('should call trackAIUsage after identifying anomalies', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Detectamos uma cobrança duplicada de R$ 50 em 05/01.',
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 800,
          candidatesTokenCount: 180,
        },
      });

      await financeService.identifyAnomalies('user-123', mockContext);

      const anomalyCall = vi.mocked(trackAIUsage).mock.calls.find(
        call => call[0].request_metadata?.function_name === 'identifyAnomalies'
      );

      expect(anomalyCall).toBeDefined();
      expect(anomalyCall![0]).toMatchObject({
        operation_type: 'text_generation',
        ai_model: 'gemini-2.0-flash',
        module_type: 'finance',
        request_metadata: expect.objectContaining({
          function_name: 'identifyAnomalies',
          use_case: 'finance_anomaly',
          transactions_analyzed: 2,
          anomalies_found: 0,
          date_range: '2025-01-01 to 2025-01-31',
          total_transactions: 25
        }),
      });
    });

    it('should track date_range correctly', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'No anomalies found',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 700, candidatesTokenCount: 100 },
      });

      await financeService.identifyAnomalies('user-123', mockContext);

      const anomalyCall = vi.mocked(trackAIUsage).mock.calls.find(
        call => call[0].request_metadata?.function_name === 'identifyAnomalies'
      );

      expect(anomalyCall![0].request_metadata?.date_range).toBe('2025-01-01 to 2025-01-31');
    });
  });

  describe('Performance & Non-Blocking Behavior', () => {
    it('should not impact operation latency significantly', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Fast response',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 50 },
      });

      const startTime = Date.now();
      await financeService.chat('user-123', 'session-1', 'Quick test', [], mockContext);
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // Total time should be reasonable (< 1 second in tests)
      expect(totalTime).toBeLessThan(1000);
    });

    it('should use fire-and-forget pattern (no await on trackAIUsage)', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Response',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 80 },
      });

      // Simulate slow tracking
      vi.mocked(trackAIUsage).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500))
      );

      const startTime = Date.now();
      const result = await financeService.chat('user-123', 'session-1', 'Test', [], mockContext);
      const endTime = Date.now();

      expect(result).toBeDefined();
      // Should return quickly despite slow tracking
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should handle tracking errors without throwing', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Normal response',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 250, candidatesTokenCount: 70 },
      });

      vi.mocked(trackAIUsage).mockRejectedValue(new Error('Tracking service down'));

      await expect(financeService.chat('user-123', 'session-1', 'Test', [], mockContext))
        .resolves.not.toThrow();
    });
  });

  describe('Token Extraction Edge Cases', () => {
    it('should handle zero tokens gracefully', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Empty response',
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
        },
      });

      await financeService.chat('user-123', 'session-1', 'Test', [], mockContext);

      expect(trackAIUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          input_tokens: 0,
          output_tokens: 0,
        })
      );
    });

    it('should handle very large token counts', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Long response',
        model: 'gemini-2.0-flash',
        usageMetadata: {
          promptTokenCount: 30000,
          candidatesTokenCount: 8000,
        },
      });

      await financeService.chat('user-123', 'session-1', 'Long prompt', [], mockContext);

      const trackingCall = vi.mocked(trackAIUsage).mock.calls[0][0];
      expect(trackingCall.input_tokens).toBe(30000);
      expect(trackingCall.output_tokens).toBe(8000);
    });

    it('should handle malformed usageMetadata', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Response',
        model: 'gemini-2.0-flash',
        usageMetadata: {
          // Missing candidatesTokenCount
          promptTokenCount: 400,
        },
      });

      await financeService.chat('user-123', 'session-1', 'Test', [], mockContext);

      expect(trackAIUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          input_tokens: 400,
          output_tokens: 0,
        })
      );
    });
  });

  describe('Model Name Validation', () => {
    it('should track correct model name from response', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Response',
        model: 'gemini-1.5-flash',
        usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 100 },
      });

      await financeService.chat('user-123', 'session-1', 'Test', [], mockContext);

      expect(trackAIUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          ai_model: 'gemini-1.5-flash',
        })
      );
    });

    it('should fallback to default model if missing', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Response',
        // model missing
        usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 100 },
      });

      await financeService.chat('user-123', 'session-1', 'Test', [], mockContext);

      expect(trackAIUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          ai_model: 'gemini-2.0-flash',
        })
      );
    });
  });

  describe('Metadata Accuracy', () => {
    it('should always set module_type to "finance"', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Response',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 250, candidatesTokenCount: 80 },
      });

      await financeService.chat('user-123', 'session-1', 'Test', [], mockContext);

      expect(trackAIUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          module_type: 'finance',
        })
      );
    });

    it('should include use_case in metadata', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Response',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 250, candidatesTokenCount: 80 },
      });

      await financeService.analyzeSpending('user-123', mockContext);

      const analyzeCall = vi.mocked(trackAIUsage).mock.calls.find(
        call => call[0].request_metadata?.function_name === 'analyzeSpending'
      );

      expect(analyzeCall![0].request_metadata?.use_case).toBe('finance_analysis');
    });

    it('should include function name in metadata', async () => {
      mockGemini.call.mockResolvedValue({
        result: 'Response',
        model: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 250, candidatesTokenCount: 80 },
      });

      await financeService.chat('user-123', 'session-1', 'Test', [], mockContext);

      const trackingCall = vi.mocked(trackAIUsage).mock.calls[0][0];
      expect(trackingCall.request_metadata?.function_name).toBe('chat');
    });
  });
});
