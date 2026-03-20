/**
 * Coach Invite Link Service — manages reusable invite links ("Link Coringa")
 */
import { supabase } from '@/services/supabaseClient';
import type { PostgrestError } from '@supabase/postgrest-js';

export interface CoachInviteLink {
  id: string;
  user_id: string;
  token: string;
  max_uses: number;
  current_uses: number;
  health_config: {
    requires_cardio_exam: boolean;
    requires_clearance_cert: boolean;
    allow_parq_onboarding: boolean;
  };
  group_id: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (const byte of array) {
    token += chars[byte % chars.length];
  }
  return token;
}

export class CoachInviteLinkService {
  static async findActiveLink(
    healthConfig: CoachInviteLink['health_config'],
    groupId?: string | null
  ): Promise<CoachInviteLink | null> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const { data, error } = await supabase
      .from('coach_invite_links')
      .select('*')
      .eq('is_active', true)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;

    // Find link with matching health config + group that's still usable
    for (const row of data) {
      const link = row as CoachInviteLink;
      const cfg = link.health_config;
      if (
        cfg.requires_cardio_exam === healthConfig.requires_cardio_exam &&
        cfg.requires_clearance_cert === healthConfig.requires_clearance_cert &&
        cfg.allow_parq_onboarding === healthConfig.allow_parq_onboarding &&
        (link.group_id || null) === (groupId || null) &&
        link.current_uses < link.max_uses &&
        (!link.expires_at || new Date(link.expires_at) > new Date())
      ) {
        return link;
      }
    }
    return null;
  }

  static async createLink(
    healthConfig: CoachInviteLink['health_config'],
    maxUses = 10,
    groupId?: string | null
  ): Promise<{
    data: CoachInviteLink | null;
    error: PostgrestError | null;
  }> {
    const token = generateToken();
    const insertData = {
      token,
      max_uses: maxUses,
      health_config: healthConfig,
      ...(groupId ? { group_id: groupId } : {}),
    };

    const { data, error } = await supabase
      .from('coach_invite_links')
      .insert(insertData)
      .select()
      .single();
    return { data: data as CoachInviteLink | null, error };
  }

  static async getOrCreateLink(
    healthConfig: CoachInviteLink['health_config'],
    maxUses = 10,
    groupId?: string | null
  ): Promise<{
    data: CoachInviteLink | null;
    error: PostgrestError | null;
  }> {
    const existing = await this.findActiveLink(healthConfig, groupId);
    if (existing) return { data: existing, error: null };
    return this.createLink(healthConfig, maxUses, groupId);
  }

  static async getMyLinks(): Promise<{ data: CoachInviteLink[]; error: PostgrestError | null }> {
    const { data, error } = await supabase
      .from('coach_invite_links')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: (data || []) as CoachInviteLink[], error };
  }

  static async deactivateLink(linkId: string): Promise<{ error: PostgrestError | null }> {
    const { error } = await supabase
      .from('coach_invite_links')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', linkId);
    return { error };
  }
}
