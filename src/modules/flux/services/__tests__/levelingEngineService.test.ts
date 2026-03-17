import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LevelingEngineService } from '../levelingEngineService';

// Mock MicrocycleService to avoid Supabase calls
vi.mock('../microcycleService', () => ({
  MicrocycleService: {
    getMicrocyclesByAthlete: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

describe('LevelingEngineService', () => {
  describe('getLevelInfo', () => {
    it('returns correct info for iniciante', () => {
      const info = LevelingEngineService.getLevelInfo('iniciante');
      expect(info.label).toBe('Iniciante');
      expect(info.description).toContain('3 meses');
      expect(info.thresholds.min_consistency).toBe(0);
      expect(info.thresholds.min_weeks_active).toBe(0);
    });

    it('returns correct info for intermediario', () => {
      const info = LevelingEngineService.getLevelInfo('intermediario');
      expect(info.label).toBe('Intermediário');
      expect(info.thresholds.min_consistency).toBe(70);
      expect(info.thresholds.min_weeks_active).toBe(12);
    });

    it('returns correct info for avancado', () => {
      const info = LevelingEngineService.getLevelInfo('avancado');
      expect(info.label).toBe('Avançado');
      expect(info.thresholds.min_consistency).toBe(85);
      expect(info.thresholds.min_weeks_active).toBe(48);
    });

    it('returns a description for all levels', () => {
      const levels = ['iniciante', 'intermediario', 'avancado'] as const;
      for (const level of levels) {
        const info = LevelingEngineService.getLevelInfo(level);
        expect(info.description).toBeTruthy();
        expect(typeof info.description).toBe('string');
      }
    });
  });

  describe('analyzeAthleteLevel', () => {
    const baseProfile = {
      id: 'profile-123',
      user_id: 'user-123',
      athlete_id: 'test-123',
      name: 'Test Athlete',
      status: 'active' as const,
      level: 'iniciante' as const,
      created_at: new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
      updated_at: new Date().toISOString(),
      consistency_rate: 50,
      weekly_volume_average: 200,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('recommends iniciante for a new athlete with low metrics', async () => {
      const result = await LevelingEngineService.analyzeAthleteLevel(baseProfile);
      expect(result.recommended_level).toBe('iniciante');
      expect(result.athlete_id).toBe('test-123');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeTruthy();
    });

    it('returns current_level matching profile level', async () => {
      const result = await LevelingEngineService.analyzeAthleteLevel(baseProfile);
      expect(result.current_level).toBe('iniciante');
    });

    it('recommends intermediario for athlete meeting intermediate thresholds', async () => {
      const profile = {
        ...baseProfile,
        level: 'iniciante' as const,
        // 16 weeks active, consistency >= 70, volume >= 240 and <= 780
        created_at: new Date(Date.now() - 16 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        consistency_rate: 75,
        weekly_volume_average: 300,
      };
      const result = await LevelingEngineService.analyzeAthleteLevel(profile);
      expect(result.recommended_level).toBe('intermediario');
    });

    it('recommends avancado for veteran athlete with high metrics', async () => {
      const profile = {
        ...baseProfile,
        level: 'intermediario' as const,
        // 52 weeks active, consistency >= 85, volume >= 480
        created_at: new Date(Date.now() - 52 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        consistency_rate: 90,
        weekly_volume_average: 600,
      };
      const result = await LevelingEngineService.analyzeAthleteLevel(profile);
      expect(result.recommended_level).toBe('avancado');
    });

    it('returns metrics in the result', async () => {
      const result = await LevelingEngineService.analyzeAthleteLevel(baseProfile);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.consistency_rate).toBe(50);
      expect(result.metrics.weekly_volume).toBe(200);
      expect(['improving', 'stable', 'declining']).toContain(result.metrics.performance_trend);
    });

    it('returns stable performance_trend when no microcycle data exists', async () => {
      const result = await LevelingEngineService.analyzeAthleteLevel(baseProfile);
      expect(result.metrics.performance_trend).toBe('stable');
    });

    it('confidence is between 0 and 100', async () => {
      const result = await LevelingEngineService.analyzeAthleteLevel(baseProfile);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('uses provided microcycles instead of fetching', async () => {
      const microcycles = [
        {
          id: 'mc-1',
          user_id: 'user-123',
          athlete_id: 'test-123',
          name: 'Week 1',
          week_1_focus: 'volume' as const,
          week_2_focus: 'volume' as const,
          week_3_focus: 'recovery' as const,
          week_4_focus: 'recovery' as const,
          start_date: '2026-01-01',
          end_date: '2026-01-28',
          status: 'completed' as const,
          actual_weekly_load: [300, 350, 280, 200],
          target_weekly_load: [300, 320, 280, 200],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      // Should not throw; microcycles passed directly
      const result = await LevelingEngineService.analyzeAthleteLevel(baseProfile, microcycles);
      expect(result).toBeDefined();
      expect(result.athlete_id).toBe('test-123');
    });

    it('handles missing optional fields gracefully (no consistency or volume)', async () => {
      const minimalProfile = {
        id: 'profile-999',
        user_id: 'user-999',
        athlete_id: 'athlete-minimal',
        name: 'Minimal Athlete',
        status: 'active' as const,
        level: 'iniciante' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // consistency_rate and weekly_volume_average are undefined
      };
      const result = await LevelingEngineService.analyzeAthleteLevel(minimalProfile);
      expect(result.recommended_level).toBe('iniciante');
      expect(result.metrics.consistency_rate).toBe(0);
      expect(result.metrics.weekly_volume).toBe(0);
    });
  });

  describe('batchAnalyzeAthletes', () => {
    const makeProfile = (
      id: string,
      level: 'iniciante' | 'intermediario' | 'avancado',
      weeksAgo: number,
      consistency: number,
      volume: number
    ) => ({
      id: `profile-${id}`,
      user_id: 'user-123',
      athlete_id: id,
      name: `Athlete ${id}`,
      status: 'active' as const,
      level,
      created_at: new Date(Date.now() - weeksAgo * 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      consistency_rate: consistency,
      weekly_volume_average: volume,
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('analyzes multiple athletes and returns results for each', async () => {
      const profiles = [
        makeProfile('a1', 'iniciante', 2, 30, 100),
        makeProfile('a2', 'intermediario', 20, 80, 400),
      ];
      const results = await LevelingEngineService.batchAnalyzeAthletes(profiles);
      expect(results).toHaveLength(2);
      expect(results[0].athlete_id).toBe('a1');
      expect(results[1].athlete_id).toBe('a2');
    });

    it('returns empty array for empty input', async () => {
      const results = await LevelingEngineService.batchAnalyzeAthletes([]);
      expect(results).toEqual([]);
    });

    it('each result has required fields', async () => {
      const profiles = [makeProfile('a3', 'iniciante', 1, 20, 60)];
      const results = await LevelingEngineService.batchAnalyzeAthletes(profiles);
      expect(results[0]).toMatchObject({
        athlete_id: 'a3',
        current_level: 'iniciante',
        recommended_level: expect.stringMatching(/^(iniciante|intermediario|avancado)$/),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        metrics: expect.objectContaining({
          consistency_rate: expect.any(Number),
          weekly_volume: expect.any(Number),
          performance_trend: expect.stringMatching(/^(improving|stable|declining)$/),
        }),
      });
    });

    it('continues processing remaining athletes if one fails', async () => {
      // Spy on analyzeAthleteLevel to make the first call throw
      const spy = vi
        .spyOn(LevelingEngineService, 'analyzeAthleteLevel')
        .mockRejectedValueOnce(new Error('Simulated error'))
        .mockResolvedValueOnce({
          athlete_id: 'a5',
          current_level: 'iniciante',
          recommended_level: 'iniciante',
          confidence: 60,
          reasoning: 'Stable',
          metrics: { consistency_rate: 50, weekly_volume: 200, performance_trend: 'stable' },
        });

      const profiles = [
        makeProfile('a4', 'iniciante', 1, 20, 60),
        makeProfile('a5', 'iniciante', 1, 50, 200),
      ];

      const results = await LevelingEngineService.batchAnalyzeAthletes(profiles);
      // First athlete errored, should be skipped; second should succeed
      expect(results).toHaveLength(1);
      expect(results[0].athlete_id).toBe('a5');

      spy.mockRestore();
    });
  });

  describe('getAthletesNeedingAdjustment', () => {
    const makeProfile = (
      id: string,
      level: 'iniciante' | 'intermediario' | 'avancado',
      weeksAgo: number,
      consistency: number,
      volume: number
    ) => ({
      id: `profile-${id}`,
      user_id: 'user-123',
      athlete_id: id,
      name: `Athlete ${id}`,
      status: 'active' as const,
      level,
      created_at: new Date(Date.now() - weeksAgo * 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      consistency_rate: consistency,
      weekly_volume_average: volume,
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns only athletes where current level differs from recommended and confidence meets threshold', async () => {
      const profiles = [
        // Should stay at iniciante (new, low metrics)
        makeProfile('b1', 'iniciante', 1, 20, 100),
        // Has intermediario metrics but marked as iniciante → should need upgrade
        makeProfile('b2', 'iniciante', 20, 80, 400),
      ];

      const results = await LevelingEngineService.getAthletesNeedingAdjustment(profiles);
      // b2 should need adjustment (iniciante → intermediario), b1 should not
      const adjustedIds = results.map((r) => r.athlete_id);
      expect(adjustedIds).toContain('b2');
      expect(adjustedIds).not.toContain('b1');
    });

    it('returns empty array when no athletes need adjustment', async () => {
      const profiles = [
        // Correct level for their metrics
        makeProfile('c1', 'iniciante', 1, 20, 100),
      ];
      const results = await LevelingEngineService.getAthletesNeedingAdjustment(profiles);
      expect(results).toEqual([]);
    });

    it('respects custom minConfidence threshold', async () => {
      const profiles = [
        makeProfile('d1', 'iniciante', 20, 80, 400),
      ];
      // With a very high confidence requirement, the athlete may not qualify
      const highConfidenceResults = await LevelingEngineService.getAthletesNeedingAdjustment(
        profiles,
        99
      );
      const normalResults = await LevelingEngineService.getAthletesNeedingAdjustment(
        profiles,
        0
      );
      // Lower threshold should include at least as many results
      expect(normalResults.length).toBeGreaterThanOrEqual(highConfidenceResults.length);
    });
  });
});
