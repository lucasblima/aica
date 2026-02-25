/**
 * EraForge Game Service
 *
 * CRUD operations for eraforge game tables: child_profiles, worlds, world_members.
 * Follows Flux AthleteService pattern (static class, { data, error } tuples).
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  ChildProfile,
  ChildProfileCreateInput,
  ChildProfileUpdateInput,
  World,
  WorldCreateInput,
  WorldUpdateInput,
  WorldMember,
  WorldMemberCreateInput,
  ParentalSettings,
  ParentalSettingsUpdateInput,
} from '../types/eraforge.types';

// ─── Stats history entry (7-day sparkline data) ─────────────────────────────
export interface ChildStatDay {
  date: string; // YYYY-MM-DD
  knowledge: number;
  cooperation: number;
  courage: number;
  turns: number;
}

// ─── Decision history entry ──────────────────────────────────────────────────
export interface ChildTurnHistoryEntry {
  id: string;
  created_at: string;
  scenario_title: string | null;
  decision: string | null;
  consequence_narrative: string | null;
  knowledge_delta: number;
  cooperation_delta: number;
  courage_delta: number;
}

const log = createNamespacedLogger('EraforgeGameService');

export class EraforgeGameService {
  // ============================================
  // CHILD PROFILES
  // ============================================

  static async getChildProfiles(): Promise<{ data: ChildProfile[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_child_profiles')
        .select('*')
        .order('display_name');

      return { data, error };
    } catch (error) {
      log.error('Error fetching child profiles:', error);
      return { data: null, error };
    }
  }

  static async getChildProfile(id: string): Promise<{ data: ChildProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_child_profiles')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error fetching child profile:', error);
      return { data: null, error };
    }
  }

  static async createChildProfile(input: ChildProfileCreateInput): Promise<{ data: ChildProfile | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('eraforge_child_profiles')
        .insert({ ...input, parent_id: user.id })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error creating child profile:', error);
      return { data: null, error };
    }
  }

  static async updateChildProfile(id: string, input: ChildProfileUpdateInput): Promise<{ data: ChildProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_child_profiles')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error updating child profile:', error);
      return { data: null, error };
    }
  }

  static async deleteChildProfile(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('eraforge_child_profiles')
        .delete()
        .eq('id', id);

      return { error };
    } catch (error) {
      log.error('Error deleting child profile:', error);
      return { error };
    }
  }

  // ============================================
  // WORLDS
  // ============================================

  static async getWorlds(): Promise<{ data: World[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_worlds')
        .select('*')
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      log.error('Error fetching worlds:', error);
      return { data: null, error };
    }
  }

  static async getWorld(id: string): Promise<{ data: World | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_worlds')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error fetching world:', error);
      return { data: null, error };
    }
  }

  static async createWorld(input: WorldCreateInput): Promise<{ data: World | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('eraforge_worlds')
        .insert({ ...input, parent_id: user.id })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error creating world:', error);
      return { data: null, error };
    }
  }

  static async updateWorld(id: string, input: WorldUpdateInput): Promise<{ data: World | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_worlds')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error updating world:', error);
      return { data: null, error };
    }
  }

  // ============================================
  // WORLD MEMBERS
  // ============================================

  static async getWorldMembers(worldId: string): Promise<{ data: WorldMember[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_world_members')
        .select('*')
        .eq('world_id', worldId);

      return { data, error };
    } catch (error) {
      log.error('Error fetching world members:', error);
      return { data: null, error };
    }
  }

  static async joinWorld(input: WorldMemberCreateInput): Promise<{ data: WorldMember | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_world_members')
        .insert(input)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error joining world:', error);
      return { data: null, error };
    }
  }

  static async getChildMember(worldId: string, childId: string): Promise<{ data: WorldMember | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_world_members')
        .select('*')
        .eq('world_id', worldId)
        .eq('child_id', childId)
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error fetching child member:', error);
      return { data: null, error };
    }
  }

  // ============================================
  // PARENTAL SETTINGS
  // ============================================

  static async getParentalSettings(): Promise<{ data: ParentalSettings | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('eraforge_parental_settings')
        .select('*')
        .eq('parent_id', user.id)
        .maybeSingle();

      return { data, error };
    } catch (error) {
      log.error('Error fetching parental settings:', error);
      return { data: null, error };
    }
  }

  static async upsertParentalSettings(input: ParentalSettingsUpdateInput): Promise<{ data: ParentalSettings | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('eraforge_parental_settings')
        .upsert({ ...input, parent_id: user.id }, { onConflict: 'parent_id' })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error upserting parental settings:', error);
      return { data: null, error };
    }
  }

  // ============================================
  // CHILD STATS HISTORY (7-day sparkline)
  // ============================================

  /**
   * Returns the last 7 days of WorldMember stats for a given child.
   * Since the DB only stores current stats (not historical), we synthesise
   * a history by querying the last 7 turns grouped by date and accumulating
   * the deltas. Falls back to today-only snapshot if no turns exist.
   */
  static async getChildStatsHistory(childId: string): Promise<{ data: ChildStatDay[] | null; error: any }> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: turns, error } = await supabase
        .from('eraforge_turns')
        .select('created_at, consequences')
        .eq('child_id', childId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true });

      if (error) return { data: null, error };

      // Build date-keyed map
      const byDate: Record<string, ChildStatDay> = {};

      const todayStr = new Date().toISOString().split('T')[0];
      // Seed last 7 days with zeros so all days appear in the chart
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split('T')[0];
        byDate[key] = { date: key, knowledge: 0, cooperation: 0, courage: 0, turns: 0 };
      }

      for (const turn of (turns ?? [])) {
        const dateKey = turn.created_at.split('T')[0];
        if (!byDate[dateKey]) continue; // outside window
        const c = turn.consequences as { knowledge_delta?: number; cooperation_delta?: number; courage_delta?: number } | null;
        byDate[dateKey].knowledge += c?.knowledge_delta ?? 0;
        byDate[dateKey].cooperation += c?.cooperation_delta ?? 0;
        byDate[dateKey].courage += c?.courage_delta ?? 0;
        byDate[dateKey].turns += 1;
      }

      // Convert to running cumulative so the sparkline shows progression
      const days = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
      let cumK = 0, cumCo = 0, cumCr = 0;
      const history: ChildStatDay[] = days.map(d => {
        cumK += d.knowledge;
        cumCo += d.cooperation;
        cumCr += d.courage;
        return { ...d, knowledge: cumK, cooperation: cumCo, courage: cumCr };
      });

      return { data: history, error: null };
    } catch (error) {
      log.error('Error fetching child stats history:', error);
      return { data: null, error };
    }
  }

  // ============================================
  // CHILD TURN HISTORY (decision log)
  // ============================================

  /**
   * Returns the last `limit` turns (decisions) made by a child.
   */
  static async getChildTurnHistory(childId: string, limit = 10): Promise<{ data: ChildTurnHistoryEntry[] | null; error: any }> {
    try {
      const { data: turns, error } = await supabase
        .from('eraforge_turns')
        .select('id, created_at, scenario, decision, consequences')
        .eq('child_id', childId)
        .not('decision', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return { data: null, error };

      const entries: ChildTurnHistoryEntry[] = (turns ?? []).map(t => {
        const sc = t.scenario as { title?: string } | null;
        const c = t.consequences as {
          narrative?: string;
          knowledge_delta?: number;
          cooperation_delta?: number;
          courage_delta?: number;
        } | null;
        return {
          id: t.id,
          created_at: t.created_at,
          scenario_title: sc?.title ?? null,
          decision: t.decision as string | null,
          consequence_narrative: c?.narrative ?? null,
          knowledge_delta: c?.knowledge_delta ?? 0,
          cooperation_delta: c?.cooperation_delta ?? 0,
          courage_delta: c?.courage_delta ?? 0,
        };
      });

      return { data: entries, error: null };
    } catch (error) {
      log.error('Error fetching child turn history:', error);
      return { data: null, error };
    }
  }
}
