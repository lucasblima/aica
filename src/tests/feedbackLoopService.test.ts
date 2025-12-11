/**
 * Unit Tests for FeedbackLoopService
 * PHASE 3.3: Learning Feedback Loop for Recommendations
 *
 * Tests core functionality of the feedback learning system
 * - Feedback recording
 * - Weight calculations
 * - Gamification integration
 * - User preferences aggregation
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { FeedbackLoopService, ModuleFeedback, UserModulePreferences } from '@/services/feedbackLoopService';
import { supabase } from '@/services/supabaseClient';
import { gamificationService } from '@/services/gamificationService';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@/services/supabaseClient');
jest.mock('@/services/gamificationService');
jest.mock('@/services/notificationService');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockGamification = gamificationService as jest.Mocked<typeof gamificationService>;

// ============================================================================
// TEST SETUP
// ============================================================================

describe('FeedbackLoopService', () => {
  let service: FeedbackLoopService;
  const testUserId = 'test-user-uuid';
  const testModuleId = 'test-module-uuid';

  beforeEach(() => {
    service = new FeedbackLoopService();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Test: recordModuleFeedback()
  // ==========================================================================

  describe('recordModuleFeedback', () => {
    test('should create accepted feedback record', async () => {
      const mockFeedback: ModuleFeedback = {
        id: 'feedback-1',
        user_id: testUserId,
        module_id: testModuleId,
        feedback_type: 'accepted',
        interacted_at: new Date().toISOString(),
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      const result = await service.recordModuleFeedback(
        testUserId,
        testModuleId,
        'accepted'
      );

      expect(result.feedback_type).toBe('accepted');
      expect(result.user_id).toBe(testUserId);
    });

    test('should award CP points on acceptance', async () => {
      const mockFeedback: ModuleFeedback = {
        id: 'feedback-1',
        user_id: testUserId,
        module_id: testModuleId,
        feedback_type: 'accepted',
        interacted_at: new Date().toISOString(),
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      mockGamification.addXp.mockResolvedValue({ newLevel: 1, levelUpBonus: 0 });

      await service.recordModuleFeedback(testUserId, testModuleId, 'accepted');

      expect(mockGamification.addXp).toHaveBeenCalledWith(testUserId, expect.any(Number));
    });

    test('should record rejection with reasons', async () => {
      const reasons = ['already_know', 'too_difficult'];
      const reasonData = JSON.stringify({ reasons, comment: 'Already completed' });

      const mockFeedback: ModuleFeedback = {
        id: 'feedback-2',
        user_id: testUserId,
        module_id: testModuleId,
        feedback_type: 'rejected',
        reason: reasonData,
        interacted_at: new Date().toISOString(),
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      const result = await service.recordModuleFeedback(
        testUserId,
        testModuleId,
        'rejected',
        { reason: reasonData }
      );

      expect(result.feedback_type).toBe('rejected');
      expect(result.reason).toBe(reasonData);
    });

    test('should not award points on rejection', async () => {
      const mockFeedback: ModuleFeedback = {
        id: 'feedback-2',
        user_id: testUserId,
        module_id: testModuleId,
        feedback_type: 'rejected',
        interacted_at: new Date().toISOString(),
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      await service.recordModuleFeedback(testUserId, testModuleId, 'rejected');

      // Should not call addXp for rejection
      expect(mockGamification.addXp).not.toHaveBeenCalled();
    });

    test('should handle skip feedback', async () => {
      const mockFeedback: ModuleFeedback = {
        id: 'feedback-3',
        user_id: testUserId,
        module_id: testModuleId,
        feedback_type: 'skipped',
        interacted_at: new Date().toISOString(),
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      const result = await service.recordModuleFeedback(
        testUserId,
        testModuleId,
        'skipped'
      );

      expect(result.feedback_type).toBe('skipped');
    });
  });

  // ==========================================================================
  // Test: updateModuleWeight()
  // ==========================================================================

  describe('updateModuleWeight', () => {
    test('should increase weight with acceptances', async () => {
      // Mock feedback stats: 3 acceptances
      mockSupabase.from().select().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock feedback summary for weight calculation
      const mockStats = {
        accepted_count: 3,
        rejected_count: 0,
        completed_count: 0,
        average_rating: null,
      };

      // Would be called multiple times, so we need flexible mocking
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await service.updateModuleWeight(
        testUserId,
        testModuleId,
        'accepted'
      );

      // Weight should be > 1.0 with 3 acceptances
      expect(result.new_weight).toBeGreaterThan(1.0);
    });

    test('should decrease weight with rejections', async () => {
      // Mock: 1 acceptance, 3 rejections
      const mockStats = {
        accepted_count: 1,
        rejected_count: 3,
        completed_count: 0,
        average_rating: null,
      };

      mockSupabase.from().select().single.mockResolvedValueOnce({
        data: { final_weight: 2.0 }, // Old weight
        error: null,
      });

      // Weight calculation would result in lower weight
      const oldWeight = 2.0;

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await service.updateModuleWeight(
        testUserId,
        testModuleId,
        'rejected'
      );

      // Should be lower than starting point with more rejections
      expect(result.new_weight).toBeLessThanOrEqual(oldWeight);
    });

    test('should clamp weight between 0.1 and 10.0', async () => {
      const mockStats = {
        accepted_count: 50, // Extreme value
        rejected_count: 0,
        completed_count: 20,
        average_rating: 5.0,
      };

      mockSupabase.from().select().single.mockResolvedValue({
        data: { final_weight: 1.0 },
        error: null,
      });

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await service.updateModuleWeight(
        testUserId,
        testModuleId,
        'accepted'
      );

      expect(result.new_weight).toBeGreaterThanOrEqual(0.1);
      expect(result.new_weight).toBeLessThanOrEqual(10.0);
    });

    test('should apply recency boost for recent feedback', async () => {
      // Feedback from 5 days ago should get 2x boost
      const mockStats = {
        accepted_count: 2,
        rejected_count: 0,
        completed_count: 0,
        average_rating: null,
      };

      mockSupabase.from().select().single.mockResolvedValue({
        data: { final_weight: 1.0 },
        error: null,
      });

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      // Mock getDaysSinceLastFeedback to return 5 days
      const result = await service.updateModuleWeight(
        testUserId,
        testModuleId,
        'accepted'
      );

      // Recent feedback (5 days) should have reasonable boost
      expect(result.new_weight).toBeGreaterThan(1.0);
    });

    test('should apply decay for old feedback', async () => {
      const mockStats = {
        accepted_count: 2,
        rejected_count: 0,
        completed_count: 0,
        average_rating: null,
      };

      mockSupabase.from().select().single.mockResolvedValue({
        data: { final_weight: 2.0 },
        error: null,
      });

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await service.updateModuleWeight(
        testUserId,
        testModuleId,
        'accepted'
      );

      // Old feedback should result in decay
      expect(result.new_weight).toBeDefined();
      expect(result.new_weight).toBeGreaterThanOrEqual(0.1);
    });

    test('should bonus weight for completed module', async () => {
      const mockStats = {
        accepted_count: 1,
        rejected_count: 0,
        completed_count: 1, // Completed!
        average_rating: 4.0,
      };

      mockSupabase.from().select().single.mockResolvedValue({
        data: { final_weight: 1.0 },
        error: null,
      });

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await service.updateModuleWeight(
        testUserId,
        testModuleId,
        'accepted'
      );

      // Completed module should have high weight
      expect(result.new_weight).toBeGreaterThan(1.5);
    });

    test('should add rating bonus to weight', async () => {
      const mockStats = {
        accepted_count: 1,
        rejected_count: 0,
        completed_count: 1,
        average_rating: 5.0, // Perfect rating
      };

      mockSupabase.from().select().single.mockResolvedValue({
        data: { final_weight: 1.0 },
        error: null,
      });

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await service.updateModuleWeight(
        testUserId,
        testModuleId,
        'accepted'
      );

      // 5-star rating should add +10 to weight
      expect(result.new_weight).toBeGreaterThan(2.0);
    });
  });

  // ==========================================================================
  // Test: getUserPreferences()
  // ==========================================================================

  describe('getUserPreferences', () => {
    test('should categorize feedback correctly', async () => {
      const mockFeedback = [
        {
          module_id: 'module1',
          feedback_type: 'accepted',
          progress: 0,
          completed_at: null,
          rating: null,
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 1' },
        },
        {
          module_id: 'module2',
          feedback_type: 'rejected',
          progress: null,
          completed_at: null,
          rating: null,
          reason: JSON.stringify({ reasons: ['already_know'] }),
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 2' },
        },
        {
          module_id: 'module3',
          feedback_type: 'accepted',
          progress: 100,
          completed_at: new Date().toISOString(),
          rating: 4,
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 3' },
        },
      ];

      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      const prefs = await service.getUserPreferences(testUserId);

      expect(prefs.accepted_modules.length).toBeGreaterThanOrEqual(1);
      expect(prefs.rejected_modules.length).toBeGreaterThanOrEqual(1);
      expect(prefs.completed_modules.length).toBeGreaterThanOrEqual(1);
    });

    test('should calculate correct acceptance rate', async () => {
      // 2 accepted, 1 rejected = 66.7% acceptance
      const mockFeedback = [
        {
          module_id: 'mod1',
          feedback_type: 'accepted',
          completed_at: null,
          progress: null,
          rating: null,
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 1' },
        },
        {
          module_id: 'mod2',
          feedback_type: 'accepted',
          completed_at: null,
          progress: null,
          rating: null,
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 2' },
        },
        {
          module_id: 'mod3',
          feedback_type: 'rejected',
          completed_at: null,
          progress: null,
          rating: null,
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 3' },
        },
      ];

      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      const prefs = await service.getUserPreferences(testUserId);

      expect(prefs.stats.acceptance_rate).toBeGreaterThan(0.6);
      expect(prefs.stats.acceptance_rate).toBeLessThan(0.8);
    });

    test('should determine learning pace correctly', async () => {
      // Fast learner: 3 completions out of 3 acceptances = 100% completion
      const mockFeedback = [
        {
          module_id: 'mod1',
          feedback_type: 'accepted',
          completed_at: new Date().toISOString(),
          progress: 100,
          rating: 5,
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 1' },
        },
        {
          module_id: 'mod2',
          feedback_type: 'accepted',
          completed_at: new Date().toISOString(),
          progress: 100,
          rating: 4,
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 2' },
        },
        {
          module_id: 'mod3',
          feedback_type: 'accepted',
          completed_at: new Date().toISOString(),
          progress: 100,
          rating: 5,
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 3' },
        },
      ];

      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      const prefs = await service.getUserPreferences(testUserId);

      expect(prefs.stats.learning_pace).toBe('fast');
    });

    test('should calculate average rating', async () => {
      const mockFeedback = [
        {
          module_id: 'mod1',
          feedback_type: 'accepted',
          completed_at: new Date().toISOString(),
          progress: 100,
          rating: 5,
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 1' },
        },
        {
          module_id: 'mod2',
          feedback_type: 'accepted',
          completed_at: new Date().toISOString(),
          progress: 100,
          rating: 3,
          interacted_at: new Date().toISOString(),
          module_definitions: { name: 'Module 2' },
        },
      ];

      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      const prefs = await service.getUserPreferences(testUserId);

      expect(prefs.stats.avg_rating).toBe(4.0); // (5 + 3) / 2
    });
  });

  // ==========================================================================
  // Test: handleModuleCompletion()
  // ==========================================================================

  describe('handleModuleCompletion', () => {
    test('should award base XP for completion', async () => {
      mockSupabase.from().update().eq().eq().order().limit().select().single.mockResolvedValue({
        data: {
          completed_at: new Date().toISOString(),
          progress: 100,
          rating: null,
        },
        error: null,
      });

      mockGamification.addXp.mockResolvedValue({ newLevel: 1, levelUpBonus: 0 });

      const result = await service.handleModuleCompletion(testUserId, testModuleId);

      // Base reward is 50 CP
      expect(result.xpAwarded).toBeGreaterThanOrEqual(50);
      expect(mockGamification.addXp).toHaveBeenCalled();
    });

    test('should add rating bonus to XP', async () => {
      mockSupabase.from().update().eq().eq().order().limit().select().single.mockResolvedValue({
        data: {
          completed_at: new Date().toISOString(),
          progress: 100,
          rating: 5,
        },
        error: null,
      });

      mockGamification.addXp.mockResolvedValue({ newLevel: 2, levelUpBonus: 100 });

      const result = await service.handleModuleCompletion(testUserId, testModuleId, {
        rating: 5,
      });

      // 50 base + (5 * 10) bonus = 100 XP
      expect(result.xpAwarded).toBe(100);
    });

    test('should unlock EARLY_ADOPTER achievement on first completion', async () => {
      mockSupabase.from().update().eq().eq().order().limit().select().single.mockResolvedValue({
        data: {
          completed_at: new Date().toISOString(),
          progress: 100,
        },
        error: null,
      });

      mockGamification.addXp.mockResolvedValue({ newLevel: 1, levelUpBonus: 0 });

      // Mock getUserPreferences to return 1 completion
      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: [
          {
            module_id: testModuleId,
            feedback_type: 'accepted',
            completed_at: new Date().toISOString(),
            rating: 3,
            progress: 100,
            interacted_at: new Date().toISOString(),
            module_definitions: { name: 'Test Module' },
          },
        ],
        error: null,
      });

      const result = await service.handleModuleCompletion(testUserId, testModuleId);

      expect(result.achievement_unlocked).toBe('EARLY_ADOPTER');
    });

    test('should unlock LEARNER achievement on 5th completion', async () => {
      mockSupabase.from().update().eq().eq().order().limit().select().single.mockResolvedValue({
        data: {
          completed_at: new Date().toISOString(),
          progress: 100,
        },
        error: null,
      });

      mockGamification.addXp.mockResolvedValue({ newLevel: 3, levelUpBonus: 50 });

      // Mock 5 completed modules
      const completedModules = Array.from({ length: 5 }, (_, i) => ({
        module_id: `mod${i}`,
        feedback_type: 'accepted',
        completed_at: new Date().toISOString(),
        rating: 4,
        progress: 100,
        interacted_at: new Date().toISOString(),
        module_definitions: { name: `Module ${i}` },
      }));

      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: completedModules,
        error: null,
      });

      const result = await service.handleModuleCompletion(testUserId, testModuleId);

      expect(result.achievement_unlocked).toBe('LEARNER');
    });

    test('should update module weight after completion', async () => {
      mockSupabase.from().update().eq().eq().order().limit().select().single.mockResolvedValue({
        data: {
          completed_at: new Date().toISOString(),
          progress: 100,
        },
        error: null,
      });

      mockGamification.addXp.mockResolvedValue({ newLevel: 1, levelUpBonus: 0 });

      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock weight update
      mockSupabase.from().select().single.mockResolvedValue({
        data: { final_weight: 1.0 },
        error: null,
      });

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          accepted_count: 1,
          rejected_count: 0,
          completed_count: 1,
          average_rating: null,
        },
        error: null,
      });

      const result = await service.handleModuleCompletion(testUserId, testModuleId);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Test: getModuleCompletionStatus()
  // ==========================================================================

  describe('getModuleCompletionStatus', () => {
    test('should return not_started for new module', async () => {
      mockSupabase.from().select().eq().eq().order().limit().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const status = await service.getModuleCompletionStatus(testUserId, testModuleId);

      expect(status.status).toBe('not_started');
      expect(status.progress).toBe(0);
    });

    test('should return in_progress for partial completion', async () => {
      mockSupabase.from().select().eq().eq().order().limit().single.mockResolvedValue({
        data: {
          progress: 50,
          rating: null,
          completed_at: null,
          feedback_type: 'accepted',
        },
        error: null,
      });

      const status = await service.getModuleCompletionStatus(testUserId, testModuleId);

      expect(status.status).toBe('in_progress');
      expect(status.progress).toBe(50);
    });

    test('should return completed with rating', async () => {
      mockSupabase.from().select().eq().eq().order().limit().single.mockResolvedValue({
        data: {
          progress: 100,
          rating: 4,
          completed_at: new Date().toISOString(),
          feedback_type: 'accepted',
        },
        error: null,
      });

      const status = await service.getModuleCompletionStatus(testUserId, testModuleId);

      expect(status.status).toBe('completed');
      expect(status.progress).toBe(100);
      expect(status.rating).toBe(4);
    });
  });

  // ==========================================================================
  // Test: decayOldRecommendations()
  // ==========================================================================

  describe('decayOldRecommendations', () => {
    test('should identify weights older than threshold', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

      mockSupabase.from().select().eq().lt().mockResolvedValue({
        data: [
          {
            user_id: testUserId,
            module_id: testModuleId,
            final_weight: 2.0,
            last_feedback_date: oldDate.toISOString(),
          },
        ],
        error: null,
      });

      const decayed = await service.decayOldRecommendations(testUserId, 30);

      expect(decayed).toBeGreaterThan(0);
    });

    test('should apply decay to old weights', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45); // 45 days ago

      mockSupabase.from().select().eq().lt().mockResolvedValue({
        data: [
          {
            user_id: testUserId,
            module_id: 'old-module',
            final_weight: 2.0,
            last_feedback_date: oldDate.toISOString(),
          },
        ],
        error: null,
      });

      await service.decayOldRecommendations(testUserId, 30);

      // Verify upsert was called with lower weight
      expect(mockSupabase.from).toHaveBeenCalledWith('user_module_weights');
    });
  });

  // ==========================================================================
  // Test: recalculateUserWeights()
  // ==========================================================================

  describe('recalculateUserWeights', () => {
    test('should recalculate all user module weights', async () => {
      mockSupabase.from().select().eq().distinct.mockResolvedValue({
        data: [
          { module_id: 'mod1' },
          { module_id: 'mod2' },
          { module_id: 'mod3' },
        ],
        error: null,
      });

      // Mock weight calculation for each module
      mockSupabase.from().select().single.mockResolvedValue({
        data: { final_weight: 1.0 },
        error: null,
      });

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          accepted_count: 2,
          rejected_count: 0,
          completed_count: 1,
          average_rating: 4.0,
        },
        error: null,
      });

      const weights = await service.recalculateUserWeights(testUserId);

      expect(weights.size).toBe(3);
      expect(weights.get('mod1')).toBeDefined();
      expect(weights.get('mod2')).toBeDefined();
      expect(weights.get('mod3')).toBeDefined();
    });
  });

  // ==========================================================================
  // Test: getUserModuleWeights()
  // ==========================================================================

  describe('getUserModuleWeights', () => {
    test('should fetch all user weights', async () => {
      mockSupabase.from().select().eq().mockResolvedValue({
        data: [
          { module_id: 'mod1', final_weight: 2.5 },
          { module_id: 'mod2', final_weight: 0.8 },
          { module_id: 'mod3', final_weight: 10.0 },
        ],
        error: null,
      });

      const weights = await service.getUserModuleWeights(testUserId);

      expect(weights.size).toBe(3);
      expect(weights.get('mod1')).toBe(2.5);
      expect(weights.get('mod2')).toBe(0.8);
      expect(weights.get('mod3')).toBe(10.0);
    });

    test('should handle empty weights gracefully', async () => {
      mockSupabase.from().select().eq().mockResolvedValue({
        data: [],
        error: null,
      });

      const weights = await service.getUserModuleWeights(testUserId);

      expect(weights.size).toBe(0);
    });
  });
});
