/**
 * Performance Test Service
 *
 * CRUD operations for the performance_tests table.
 * Tracks FTP, CSS, pace, VO2max, and lactate threshold results over time.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('PerformanceTestService');

export type PerformanceTestType = 'ftp' | 'css' | 'pace' | 'vo2max' | 'lactate';
export type PerformanceTestUnit = 'watts' | 'min_per_100m' | 'min_per_km' | 'ml_kg_min' | 'mmol_l';

export interface PerformanceTest {
  id: string;
  athlete_id: string;
  coach_id: string;
  test_type: PerformanceTestType;
  test_value: number;
  test_unit: PerformanceTestUnit;
  test_date: string;
  notes: string | null;
  created_at: string;
}

export interface CreatePerformanceTestInput {
  athlete_id: string;
  test_type: PerformanceTestType;
  test_value: number;
  test_unit: PerformanceTestUnit;
  test_date?: string;
  notes?: string;
}

export interface UpdatePerformanceTestInput {
  id: string;
  test_value?: number;
  test_unit?: PerformanceTestUnit;
  test_date?: string;
  notes?: string;
}

export class PerformanceTestService {
  /**
   * Get all tests for an athlete
   */
  static async getTestsByAthlete(
    athleteId: string
  ): Promise<{ data: PerformanceTest[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('performance_tests')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('test_date', { ascending: false });

      return { data, error };
    } catch (error) {
      log.error('Error fetching tests:', error);
      return { data: null, error };
    }
  }

  /**
   * Get tests filtered by type
   */
  static async getTestsByType(
    athleteId: string,
    testType: PerformanceTestType
  ): Promise<{ data: PerformanceTest[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('performance_tests')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('test_type', testType)
        .order('test_date', { ascending: false });

      return { data, error };
    } catch (error) {
      log.error('Error fetching tests by type:', error);
      return { data: null, error };
    }
  }

  /**
   * Get performance trend via RPC (last 12 results)
   */
  static async getTrend(
    athleteId: string,
    testType: PerformanceTestType
  ): Promise<{ data: PerformanceTest[] | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('get_athlete_performance_trend', {
        p_athlete_id: athleteId,
        p_test_type: testType,
      });

      return { data, error };
    } catch (error) {
      log.error('Error fetching trend:', error);
      return { data: null, error };
    }
  }

  /**
   * Get single test by ID
   */
  static async getTestById(
    id: string
  ): Promise<{ data: PerformanceTest | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('performance_tests')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error fetching test:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a new performance test
   */
  static async createTest(
    input: CreatePerformanceTestInput
  ): Promise<{ data: PerformanceTest | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('performance_tests')
        .insert({
          ...input,
          coach_id: userData.user.id,
          test_date: input.test_date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (data) {
        log.info('Created performance test', {
          athleteId: input.athlete_id,
          type: input.test_type,
          value: input.test_value,
        });
      }

      return { data, error };
    } catch (error) {
      log.error('Error creating test:', error);
      return { data: null, error };
    }
  }

  /**
   * Update an existing performance test
   */
  static async updateTest(
    input: UpdatePerformanceTestInput
  ): Promise<{ data: PerformanceTest | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('performance_tests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error updating test:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a performance test
   */
  static async deleteTest(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('performance_tests')
        .delete()
        .eq('id', id);

      return { error };
    } catch (error) {
      log.error('Error deleting test:', error);
      return { error };
    }
  }

  /**
   * Get the latest test result for each type for an athlete
   */
  static async getLatestByType(
    athleteId: string
  ): Promise<{ data: Record<PerformanceTestType, PerformanceTest | null>; error: any }> {
    try {
      const { data: allTests, error } = await supabase
        .from('performance_tests')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('test_date', { ascending: false });

      if (error) return { data: { ftp: null, css: null, pace: null, vo2max: null, lactate: null }, error };

      const latest: Record<PerformanceTestType, PerformanceTest | null> = {
        ftp: null,
        css: null,
        pace: null,
        vo2max: null,
        lactate: null,
      };

      for (const test of allTests || []) {
        const type = test.test_type as PerformanceTestType;
        if (!latest[type]) {
          latest[type] = test;
        }
      }

      return { data: latest, error: null };
    } catch (error) {
      log.error('Error fetching latest by type:', error);
      return { data: { ftp: null, css: null, pace: null, vo2max: null, lactate: null }, error };
    }
  }
}
