import { supabase } from '../../../lib/supabase';
import type {
  ConnectionMember,
  AddMemberPayload,
  MemberRole
} from '../types';

// ==================== CONNECTION MEMBERS ====================

export async function getSpaceMembers(spaceId: string): Promise<ConnectionMember[]> {
  const { data, error } = await supabase
    .from('connection_members')
    .select('*')
    .eq('space_id', spaceId)
    .eq('is_active', true)
    .order('role', { ascending: true })
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getMemberById(memberId: string): Promise<ConnectionMember | null> {
  const { data, error } = await supabase
    .from('connection_members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function addMember(input: AddMemberPayload & { space_id: string }): Promise<ConnectionMember> {
  const { data, error } = await supabase
    .from('connection_members')
    .insert({
      space_id: input.space_id,
      user_id: input.user_id,
      external_name: input.external_name,
      external_email: input.external_email,
      external_phone: input.external_phone,
      role: input.role || 'member',
      context_label: input.context_label,
      context_data: input.context_data || {},
      permissions: {},
      is_active: true,
      joined_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMemberRole(memberId: string, role: MemberRole): Promise<void> {
  const { error } = await supabase
    .from('connection_members')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) throw error;
}

export async function updateMemberContext(
  memberId: string,
  contextLabel: string,
  contextData: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('connection_members')
    .update({
      context_label: contextLabel,
      context_data: contextData,
      updated_at: new Date().toISOString()
    })
    .eq('id', memberId);

  if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from('connection_members')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) throw error;
}

export async function getMemberCountBySpace(spaceId: string): Promise<number> {
  const { count, error } = await supabase
    .from('connection_members')
    .select('*', { count: 'exact', head: true })
    .eq('space_id', spaceId)
    .eq('is_active', true);

  if (error) throw error;
  return count || 0;
}

export async function isUserMemberOfSpace(userId: string, spaceId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('connection_members')
    .select('id')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
