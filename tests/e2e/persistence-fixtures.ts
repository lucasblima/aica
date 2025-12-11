/**
 * Persistence Testing Fixtures & Utilities
 * Provides test data factories, seed functions, and cleanup utilities
 */

import { test as base } from '@playwright/test';
import { cleanupTestData, createDataSnapshot } from './db-helpers';

// ==========================================
// Test Data Factories
// ==========================================

/**
 * Factory for creating trail response test data
 */
export function createTrailResponseData(userId: string, trailId: string) {
  return {
    user_id: userId,
    trail_id: trailId,
    answers: {
      q1: 'Very challenging',
      q2: 'Seeking growth',
      q3: 'Need support',
    },
    scores: {
      health: 6,
      finance: 4,
      relationships: 7,
      growth: 8,
    },
    recommended_modules: ['health-wellness', 'growth-mindset'],
    completed_at: new Date().toISOString(),
  };
}

/**
 * Factory for creating moment entry test data
 */
export function createMomentData(userId: string, overrides?: Partial<any>) {
  const timestamp = new Date();
  const weekNumber = Math.ceil(
    (timestamp.getTime() - new Date(timestamp.getFullYear(), 0, 1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );

  return {
    user_id: userId,
    content: `E2E Test Moment - ${new Date().toISOString()}: Reflecting on growth and challenges.`,
    emotion: 'Motivated',
    emotion_intensity: 7,
    entry_type: 'manual',
    source: 'manual',
    life_areas: ['profissional', 'pessoal'],
    tags: ['reflexão', 'crescimento'],
    sentiment_score: 0.7,
    week_number: weekNumber,
    created_at: timestamp.toISOString(),
    ...overrides,
  };
}

/**
 * Factory for consciousness points log entry
 */
export function createConsciousnessPointsLogData(
  userId: string,
  referenceId?: string,
  overrides?: Partial<any>
) {
  return {
    user_id: userId,
    points_awarded: 10,
    reason: 'moment_created',
    reference_id: referenceId,
    awarded_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Factory for module feedback
 */
export function createModuleFeedbackData(
  userId: string,
  moduleId: string,
  overrides?: Partial<any>
) {
  return {
    user_id: userId,
    module_id: moduleId,
    feedback_type: 'accepted',
    rating: 5,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Factory for consciousness stats
 */
export function createConsciousnessStatsData(userId: string, overrides?: Partial<any>) {
  return {
    user_id: userId,
    total_points: 0,
    current_level: 1,
    current_streak: 0,
    longest_streak: 0,
    last_moment_date: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ==========================================
// Fixtures
// ==========================================

/**
 * Fixture for test isolation and cleanup
 */
export const test = base.extend<{
  testUserId: string;
  dataSnapshot: any;
  cleanup: () => Promise<void>;
}>({
  testUserId: async ({}, use) => {
    // Generate unique user ID for this test
    const userId = `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await use(userId);

    // Cleanup after test
    try {
      await cleanupTestData(userId);
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  },

  dataSnapshot: async ({ testUserId }, use) => {
    const snapshot = await createDataSnapshot(testUserId);
    await use(snapshot);
  },

  cleanup: async ({ testUserId }, use) => {
    await use(async () => {
      await cleanupTestData(testUserId);
    });
  },
});

export { expect } from '@playwright/test';

// ==========================================
// Seed Functions
// ==========================================

/**
 * Seed multiple trail responses
 */
export async function seedTrailResponses(
  supabaseClient: any,
  userId: string,
  trailIds: string[]
): Promise<any[]> {
  const responses = trailIds.map((trailId) =>
    createTrailResponseData(userId, trailId)
  );

  const { data, error } = await supabaseClient
    .from('onboarding_context_captures')
    .insert(responses)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Seed multiple moments
 */
export async function seedMoments(
  supabaseClient: any,
  userId: string,
  count: number = 5
): Promise<any[]> {
  const moments = Array.from({ length: count }, (_, i) =>
    createMomentData(userId, {
      content: `Test Moment ${i + 1} - ${new Date().toISOString()}`,
    })
  );

  const { data, error } = await supabaseClient
    .from('moment_entries')
    .insert(moments)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Seed consciousness points log entries
 */
export async function seedConsciousnessPointsLog(
  supabaseClient: any,
  userId: string,
  momentIds: string[],
  pointsPerMoment: number = 10
): Promise<any[]> {
  const logs = momentIds.map((momentId, i) =>
    createConsciousnessPointsLogData(userId, momentId, {
      points_awarded: pointsPerMoment,
      reason: i === 0 ? 'moment_created' : 'bonus_audio',
    })
  );

  const { data, error } = await supabaseClient
    .from('consciousness_points_log')
    .insert(logs)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Seed module feedback entries
 */
export async function seedModuleFeedback(
  supabaseClient: any,
  userId: string,
  moduleIds: string[]
): Promise<any[]> {
  const feedbacks = moduleIds.map((moduleId) =>
    createModuleFeedbackData(userId, moduleId, {
      feedback_type: Math.random() > 0.3 ? 'accepted' : 'rejected',
      rating: Math.floor(Math.random() * 5) + 1,
    })
  );

  const { data, error } = await supabaseClient
    .from('user_module_feedback')
    .insert(feedbacks)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Seed user consciousness stats
 */
export async function seedConsciousnessStats(
  supabaseClient: any,
  userId: string,
  totalPoints: number = 100,
  currentLevel: number = 2,
  currentStreak: number = 5
): Promise<any> {
  const { data, error } = await supabaseClient
    .from('user_consciousness_stats')
    .insert({
      user_id: userId,
      total_points: totalPoints,
      current_level: currentLevel,
      current_streak: currentStreak,
      longest_streak: currentStreak,
      last_moment_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==========================================
// Test Data Scenarios
// ==========================================

/**
 * Scenario: User completes onboarding
 */
export async function scenarioCompleteOnboarding(
  supabaseClient: any,
  userId: string
): Promise<{
  trailResponses: any[];
  moments: any[];
  stats: any;
}> {
  // Create trail responses
  const trailResponses = await seedTrailResponses(supabaseClient, userId, [
    'health-emotional',
    'finance',
    'relationships',
  ]);

  // Create initial moments
  const moments = await seedMoments(supabaseClient, userId, 3);

  // Create consciousness stats
  const stats = await seedConsciousnessStats(supabaseClient, userId, 30, 1, 3);

  return { trailResponses, moments, stats };
}

/**
 * Scenario: User with high engagement
 */
export async function scenarioHighEngagement(
  supabaseClient: any,
  userId: string
): Promise<any> {
  // Create trail responses
  const trailResponses = await seedTrailResponses(supabaseClient, userId, [
    'health-emotional',
    'finance',
    'relationships',
    'growth',
  ]);

  // Create many moments
  const moments = await seedMoments(supabaseClient, userId, 15);
  const momentIds = moments.map((m: any) => m.id);

  // Create consciousness points log
  const logs = await seedConsciousnessPointsLog(
    supabaseClient,
    userId,
    momentIds,
    15
  );

  // Create stats with high values
  const stats = await seedConsciousnessStats(
    supabaseClient,
    userId,
    500,
    5,
    21
  );

  // Create module feedback
  const feedbacks = await seedModuleFeedback(supabaseClient, userId, [
    'module-1',
    'module-2',
    'module-3',
  ]);

  return { trailResponses, moments, logs, stats, feedbacks };
}

/**
 * Scenario: User with low engagement
 */
export async function scenarioLowEngagement(
  supabaseClient: any,
  userId: string
): Promise<any> {
  // Create minimal trail responses
  const trailResponses = await seedTrailResponses(supabaseClient, userId, [
    'health-emotional',
  ]);

  // Create single moment
  const moments = await seedMoments(supabaseClient, userId, 1);

  // Create minimal stats
  const stats = await seedConsciousnessStats(supabaseClient, userId, 10, 1, 1);

  return { trailResponses, moments, stats };
}

/**
 * Scenario: User with streak pattern
 */
export async function scenarioStreakPattern(
  supabaseClient: any,
  userId: string
): Promise<any> {
  // Create moments with specific timeline for streak testing
  const moments = [];
  const now = new Date();

  // Create moments for last 7 days (7-day streak)
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i)); // Going backwards
    date.setHours(10, 0, 0, 0);

    moments.push(
      createMomentData(userId, {
        content: `Day ${i + 1} moment`,
        created_at: date.toISOString(),
      })
    );
  }

  const { data, error } = await supabaseClient
    .from('moment_entries')
    .insert(moments)
    .select();

  if (error) throw error;

  // Update stats with 7-day streak
  const stats = await seedConsciousnessStats(
    supabaseClient,
    userId,
    150,
    2,
    7
  );

  return { moments: data, stats };
}

// ==========================================
// Validation Helpers
// ==========================================

/**
 * Validate seed data was created correctly
 */
export function validateSeedData(
  seedResult: any,
  expectedType: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!seedResult) {
    errors.push('Seed result is null or undefined');
    return { valid: false, errors };
  }

  if (Array.isArray(seedResult)) {
    if (seedResult.length === 0) {
      errors.push('Seed result array is empty');
    }

    seedResult.forEach((item, index) => {
      if (!item.id) {
        errors.push(`Item ${index} missing id`);
      }
      if (!item.user_id) {
        errors.push(`Item ${index} missing user_id`);
      }
    });
  } else {
    if (!seedResult.id && !seedResult.user_id) {
      errors.push('Single item seed result missing required fields');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==========================================
// Concurrency Testing Utilities
// ==========================================

/**
 * Create multiple users for concurrency testing
 */
export async function createConcurrentTestUsers(
  count: number
): Promise<string[]> {
  return Array.from({ length: count }, () =>
    `concurrent-user-${Date.now()}-${Math.random().toString(36).substring(7)}`
  );
}

/**
 * Execute operations concurrently
 */
export async function executeConcurrentOperations<T>(
  operations: (() => Promise<T>)[]
): Promise<{ results: T[]; errors: Error[] }> {
  const results: T[] = [];
  const errors: Error[] = [];

  const promises = operations.map(async (op) => {
    try {
      const result = await op();
      results.push(result);
    } catch (error) {
      errors.push(error as Error);
    }
  });

  await Promise.all(promises);

  return { results, errors };
}

// ==========================================
// Random Data Generation
// ==========================================

/**
 * Generate random moment content
 */
export function generateRandomMomentContent(): string {
  const templates = [
    'Reflecting on today: {emotion}, {insight}',
    'Just experienced: {emotion}, learned {insight}',
    'Thinking about: {emotion}, wondering {insight}',
  ];

  const emotions = ['joy', 'peace', 'gratitude', 'motivation', 'contemplation'];
  const insights = [
    'the power of consistency',
    'importance of self-care',
    'value of relationships',
    'my own resilience',
    'new perspectives',
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];
  const emotion = emotions[Math.floor(Math.random() * emotions.length)];
  const insight = insights[Math.floor(Math.random() * insights.length)];

  return template
    .replace('{emotion}', emotion)
    .replace('{insight}', insight);
}

/**
 * Generate random emotion intensity
 */
export function generateRandomIntensity(): number {
  return Math.floor(Math.random() * 11); // 0-10
}

/**
 * Generate random sentiment score
 */
export function generateRandomSentimentScore(): number {
  return Number((Math.random() * 2 - 1).toFixed(2)); // -1 to 1
}

/**
 * Generate random life areas
 */
export function generateRandomLifeAreas(count: number = 2): string[] {
  const areas = [
    'profissional',
    'pessoal',
    'relacionamentos',
    'saúde',
    'financeiro',
    'espiritual',
  ];
  const shuffled = areas.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, areas.length));
}

/**
 * Generate random tags
 */
export function generateRandomTags(): string[] {
  const tags = [
    'reflexão',
    'crescimento',
    'gratidão',
    'aprendizado',
    'desafio',
    'sucesso',
    'jornada',
  ];
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 tags
  const shuffled = tags.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
