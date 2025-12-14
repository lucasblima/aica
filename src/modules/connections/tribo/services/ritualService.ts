import { supabase } from '@/lib/supabase';
import type {
  TriboRitual,
  CreateRitualPayload,
  UpdateRitualPayload,
  RitualOccurrence,
  CreateOccurrencePayload,
  UpdateOccurrencePayload,
  RSVPPayload,
  BringListItem,
} from '../types';

// ============= RITUALS =============

export const ritualService = {
  // Get all rituals for a space
  async getRituals(spaceId: string): Promise<TriboRitual[]> {
    const { data, error } = await supabase
      .from('tribo_rituals')
      .select('*')
      .eq('space_id', spaceId)
      .order('next_occurrence_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(transformRitualFromDB);
  },

  // Get active rituals only
  async getActiveRituals(spaceId: string): Promise<TriboRitual[]> {
    const { data, error } = await supabase
      .from('tribo_rituals')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .order('next_occurrence_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(transformRitualFromDB);
  },

  // Get single ritual
  async getRitual(ritualId: string): Promise<TriboRitual> {
    const { data, error } = await supabase
      .from('tribo_rituals')
      .select('*')
      .eq('id', ritualId)
      .single();

    if (error) throw error;

    return transformRitualFromDB(data);
  },

  // Create ritual
  async createRitual(payload: CreateRitualPayload): Promise<TriboRitual> {
    const { data, error } = await supabase
      .from('tribo_rituals')
      .insert({
        space_id: payload.spaceId,
        name: payload.name,
        description: payload.description,
        recurrence_rule: payload.recurrenceRule,
        default_time: payload.defaultTime,
        default_duration_minutes: payload.defaultDurationMinutes || 60,
        default_location: payload.defaultLocation,
        is_mandatory: payload.isMandatory || false,
        typical_attendance: payload.typicalAttendance,
      })
      .select()
      .single();

    if (error) throw error;

    return transformRitualFromDB(data);
  },

  // Update ritual
  async updateRitual(
    ritualId: string,
    payload: UpdateRitualPayload
  ): Promise<TriboRitual> {
    const updateData: any = {};

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.recurrenceRule !== undefined)
      updateData.recurrence_rule = payload.recurrenceRule;
    if (payload.defaultTime !== undefined) updateData.default_time = payload.defaultTime;
    if (payload.defaultDurationMinutes !== undefined)
      updateData.default_duration_minutes = payload.defaultDurationMinutes;
    if (payload.defaultLocation !== undefined)
      updateData.default_location = payload.defaultLocation;
    if (payload.isMandatory !== undefined) updateData.is_mandatory = payload.isMandatory;
    if (payload.typicalAttendance !== undefined)
      updateData.typical_attendance = payload.typicalAttendance;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

    const { data, error } = await supabase
      .from('tribo_rituals')
      .update(updateData)
      .eq('id', ritualId)
      .select()
      .single();

    if (error) throw error;

    return transformRitualFromDB(data);
  },

  // Delete ritual
  async deleteRitual(ritualId: string): Promise<void> {
    const { error } = await supabase.from('tribo_rituals').delete().eq('id', ritualId);

    if (error) throw error;
  },

  // ============= OCCURRENCES =============

  // Get occurrences for a ritual
  async getOccurrences(ritualId: string): Promise<RitualOccurrence[]> {
    const { data, error } = await supabase
      .from('tribo_ritual_occurrences')
      .select('*, ritual:tribo_rituals(*)')
      .eq('ritual_id', ritualId)
      .order('occurrence_date', { ascending: true });

    if (error) throw error;

    return (data || []).map(transformOccurrenceFromDB);
  },

  // Get upcoming occurrences for a space
  async getUpcomingOccurrences(
    spaceId: string,
    limit: number = 10
  ): Promise<RitualOccurrence[]> {
    const { data, error } = await supabase
      .from('tribo_ritual_occurrences')
      .select('*, ritual:tribo_rituals!inner(*)')
      .eq('ritual.space_id', spaceId)
      .gte('occurrence_date', new Date().toISOString())
      .eq('status', 'scheduled')
      .order('occurrence_date', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(transformOccurrenceFromDB);
  },

  // Get single occurrence
  async getOccurrence(occurrenceId: string): Promise<RitualOccurrence> {
    const { data, error } = await supabase
      .from('tribo_ritual_occurrences')
      .select('*, ritual:tribo_rituals(*)')
      .eq('id', occurrenceId)
      .single();

    if (error) throw error;

    return transformOccurrenceFromDB(data);
  },

  // Create occurrence
  async createOccurrence(payload: CreateOccurrencePayload): Promise<RitualOccurrence> {
    const { data, error } = await supabase
      .from('tribo_ritual_occurrences')
      .insert({
        ritual_id: payload.ritualId,
        occurrence_date: payload.occurrenceDate,
        location: payload.location,
        notes: payload.notes,
      })
      .select('*, ritual:tribo_rituals(*)')
      .single();

    if (error) throw error;

    return transformOccurrenceFromDB(data);
  },

  // Update occurrence
  async updateOccurrence(
    occurrenceId: string,
    payload: UpdateOccurrencePayload
  ): Promise<RitualOccurrence> {
    const updateData: any = {};

    if (payload.location !== undefined) updateData.location = payload.location;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.bringList !== undefined) updateData.bring_list = payload.bringList;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.actualAttendance !== undefined)
      updateData.actual_attendance = payload.actualAttendance;

    const { data, error } = await supabase
      .from('tribo_ritual_occurrences')
      .update(updateData)
      .eq('id', occurrenceId)
      .select('*, ritual:tribo_rituals(*)')
      .single();

    if (error) throw error;

    return transformOccurrenceFromDB(data);
  },

  // RSVP to occurrence
  async rsvp(payload: RSVPPayload): Promise<RitualOccurrence> {
    // Get current occurrence
    const occurrence = await this.getOccurrence(payload.occurrenceId);

    // Update RSVP data
    const updatedRsvpData = {
      ...occurrence.rsvpData,
      [payload.memberId]: payload.status,
    };

    const { data, error } = await supabase
      .from('tribo_ritual_occurrences')
      .update({ rsvp_data: updatedRsvpData })
      .eq('id', payload.occurrenceId)
      .select('*, ritual:tribo_rituals(*)')
      .single();

    if (error) throw error;

    return transformOccurrenceFromDB(data);
  },

  // Update bring list
  async updateBringList(
    occurrenceId: string,
    bringList: BringListItem[]
  ): Promise<RitualOccurrence> {
    const { data, error } = await supabase
      .from('tribo_ritual_occurrences')
      .update({ bring_list: bringList })
      .eq('id', occurrenceId)
      .select('*, ritual:tribo_rituals(*)')
      .single();

    if (error) throw error;

    return transformOccurrenceFromDB(data);
  },

  // Assign bring list item to member
  async assignBringListItem(
    occurrenceId: string,
    itemId: string,
    memberId: string
  ): Promise<RitualOccurrence> {
    const occurrence = await this.getOccurrence(occurrenceId);
    const updatedBringList = occurrence.bringList.map((item) =>
      item.id === itemId ? { ...item, assignedTo: memberId } : item
    );

    return this.updateBringList(occurrenceId, updatedBringList);
  },

  // Toggle bring list item completion
  async toggleBringListItem(
    occurrenceId: string,
    itemId: string
  ): Promise<RitualOccurrence> {
    const occurrence = await this.getOccurrence(occurrenceId);
    const updatedBringList = occurrence.bringList.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    return this.updateBringList(occurrenceId, updatedBringList);
  },

  // Delete occurrence
  async deleteOccurrence(occurrenceId: string): Promise<void> {
    const { error } = await supabase
      .from('tribo_ritual_occurrences')
      .delete()
      .eq('id', occurrenceId);

    if (error) throw error;
  },
};

// ============= TRANSFORMERS =============

function transformRitualFromDB(data: any): TriboRitual {
  return {
    id: data.id,
    spaceId: data.space_id,
    name: data.name,
    description: data.description,
    recurrenceRule: data.recurrence_rule,
    defaultTime: data.default_time,
    defaultDurationMinutes: data.default_duration_minutes,
    defaultLocation: data.default_location,
    isMandatory: data.is_mandatory,
    typicalAttendance: data.typical_attendance,
    isActive: data.is_active,
    nextOccurrenceAt: data.next_occurrence_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function transformOccurrenceFromDB(data: any): RitualOccurrence {
  return {
    id: data.id,
    ritualId: data.ritual_id,
    eventId: data.event_id,
    occurrenceDate: data.occurrence_date,
    location: data.location,
    notes: data.notes,
    bringList: data.bring_list || [],
    rsvpData: data.rsvp_data || {},
    status: data.status,
    actualAttendance: data.actual_attendance,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    ritual: data.ritual ? transformRitualFromDB(data.ritual) : undefined,
  };
}
