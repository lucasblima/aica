/**
 * Auto Persona Service
 *
 * Automatically creates and manages entity personas linked to AICA modules.
 * When a user engages with a module, a persona is auto-created so they
 * don't need to manually set one up. XP is awarded for module actions.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { EntityPersona, ProjectStats, OrganizationStats } from '../types/liferpg';
import { getXPForLevel } from '../types/liferpg';

const log = createNamespacedLogger('AutoPersonaService');

// ── Module-to-Persona mapping ─────────────────────────────────────

type ModuleId = 'flux' | 'journey' | 'finance' | 'studio' | 'atlas' | 'connections' | 'grants';

interface ModulePersonaTemplate {
  name: string;
  emoji: string;
  type: 'project' | 'organization';
  color: string;
}

const MODULE_PERSONA_MAP: Record<ModuleId, ModulePersonaTemplate> = {
  flux:        { name: 'Treino',            emoji: '\u{1F3CB}\uFE0F', type: 'project',      color: '#F59E0B' },
  journey:     { name: 'Autoconhecimento',  emoji: '\u{1F9ED}',       type: 'project',      color: '#8B5CF6' },
  finance:     { name: 'Finan\u00E7as',     emoji: '\u{1F4B0}',       type: 'project',      color: '#10B981' },
  studio:      { name: 'Podcast',           emoji: '\u{1F399}\uFE0F', type: 'project',      color: '#EC4899' },
  atlas:       { name: 'Produtividade',     emoji: '\u{1F4CB}',       type: 'project',      color: '#3B82F6' },
  connections: { name: 'Rede',              emoji: '\u{1F517}',       type: 'organization', color: '#6366F1' },
  grants:      { name: 'Capta\u00E7\u00E3o', emoji: '\u{1F4C4}',     type: 'project',      color: '#14B8A6' },
};

// ── XP rewards per module action ──────────────────────────────────

const MODULE_XP_REWARDS: Record<ModuleId, Record<string, number>> = {
  flux:        { complete_workout: 20, give_feedback: 10, create_microcycle: 30 },
  journey:     { create_moment: 10, answer_question: 5, write_reflection: 15 },
  finance:     { upload_statement: 25, categorize_transaction: 5 },
  studio:      { create_episode: 30, invite_guest: 15, publish: 50 },
  atlas:       { complete_task: 10, complete_urgent: 20 },
  connections: { analyze_contact: 15, send_invite: 10 },
  grants:      { submit_proposal: 50, parse_edital: 25 },
};

// ── Default stats by entity type ──────────────────────────────────

function getDefaultStats(type: 'project' | 'organization'): ProjectStats | OrganizationStats {
  if (type === 'organization') {
    return { efficiency: 50, health: 50, morale: 50, compliance: 50, innovation: 50 };
  }
  return { progress: 0, quality: 50, momentum: 50 };
}

// ── Service ───────────────────────────────────────────────────────

export class AutoPersonaService {
  /**
   * Ensure a persona exists for a given module. Creates one if missing.
   * Returns the persona (existing or newly created).
   */
  static async ensureModulePersona(
    userId: string,
    moduleId: string
  ): Promise<EntityPersona | null> {
    const template = MODULE_PERSONA_MAP[moduleId as ModuleId];
    if (!template) {
      log.warn('Unknown module for persona creation', { moduleId });
      return null;
    }

    const entityRefId = `module:${moduleId}`;

    try {
      // Check if persona already exists
      const { data: existing, error: fetchError } = await supabase
        .from('entity_personas')
        .select('*')
        .eq('user_id', userId)
        .eq('entity_ref_id', entityRefId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        return existing as EntityPersona;
      }

      // Create new persona for this module
      const { data: created, error: createError } = await supabase
        .from('entity_personas')
        .insert({
          user_id: userId,
          entity_type: template.type,
          entity_ref_id: entityRefId,
          persona_name: template.name,
          persona_voice: 'neutral',
          personality_traits: [],
          hp: 100,
          stats: getDefaultStats(template.type),
          level: 1,
          xp: 0,
          avatar_emoji: template.emoji,
          avatar_color: template.color,
          is_active: true,
        })
        .select()
        .single();

      if (createError) throw createError;

      log.info('Auto-created module persona', { moduleId, personaId: created.id });
      return created as EntityPersona;
    } catch (err) {
      log.error('Failed to ensure module persona', { moduleId, err });
      return null;
    }
  }

  /**
   * Award XP to a module's persona for a specific action.
   * Handles level-up detection.
   */
  static async awardModuleXP(
    userId: string,
    moduleId: string,
    action: string,
    xpAmount?: number
  ): Promise<{
    success: boolean;
    xpAwarded: number;
    leveledUp: boolean;
    newLevel?: number;
    error?: string;
  }> {
    try {
      // Resolve XP amount
      const rewards = MODULE_XP_REWARDS[moduleId as ModuleId];
      const xp = xpAmount ?? rewards?.[action] ?? 5;

      // Ensure persona exists
      const persona = await this.ensureModulePersona(userId, moduleId);
      if (!persona) {
        return { success: false, xpAwarded: 0, leveledUp: false, error: 'Could not resolve persona' };
      }

      // Calculate new XP and check level up
      const newXP = persona.xp + xp;
      let newLevel = persona.level;
      let leveledUp = false;

      // Check if we've reached the next level threshold
      const nextLevelXP = getXPForLevel(newLevel + 1);
      if (newXP >= nextLevelXP) {
        newLevel += 1;
        leveledUp = true;
      }

      // Update persona
      const { error: updateError } = await supabase
        .from('entity_personas')
        .update({
          xp: newXP,
          level: newLevel,
          last_interaction: new Date().toISOString(),
        })
        .eq('id', persona.id);

      if (updateError) throw updateError;

      // Log event (non-critical)
      try {
        await supabase.from('entity_event_log').insert({
          persona_id: persona.id,
          event_type: leveledUp ? 'level_up' : 'quest_completed',
          event_data: {
            module: moduleId,
            action,
            xp_awarded: xp,
            new_xp: newXP,
            new_level: newLevel,
            leveled_up: leveledUp,
          },
          triggered_by: 'system',
        });
      } catch (logErr) {
        log.warn('Failed to log XP event', { logErr });
      }

      log.debug('Awarded module XP', { moduleId, action, xp, newXP, newLevel, leveledUp });

      return {
        success: true,
        xpAwarded: xp,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
      };
    } catch (err) {
      log.error('Failed to award module XP', { moduleId, action, err });
      return { success: false, xpAwarded: 0, leveledUp: false, error: (err as Error).message };
    }
  }

  /**
   * Get all module-linked personas for a user (for dashboard display).
   */
  static async getModulePersonas(
    userId: string
  ): Promise<EntityPersona[]> {
    try {
      const { data, error } = await supabase
        .from('entity_personas')
        .select('*')
        .eq('user_id', userId)
        .like('entity_ref_id', 'module:%')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as EntityPersona[];
    } catch (err) {
      log.error('Failed to get module personas', { err });
      return [];
    }
  }

  /**
   * Get the template info for a module (for UI rendering).
   */
  static getModuleTemplate(moduleId: string): ModulePersonaTemplate | null {
    return MODULE_PERSONA_MAP[moduleId as ModuleId] ?? null;
  }

  /**
   * Get XP reward amount for a module action (for UI display).
   */
  static getActionXPReward(moduleId: string, action: string): number {
    const rewards = MODULE_XP_REWARDS[moduleId as ModuleId];
    return rewards?.[action] ?? 5;
  }
}
