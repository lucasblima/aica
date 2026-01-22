import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ReminderService');

/**
 * Reminder configuration
 */
export interface Reminder {
  id: string;
  event_id: string;
  user_id: string;
  minutes_before: number;
  reminder_type: 'notification' | 'email' | 'sms';
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Pending reminder check result
 */
export interface PendingReminder {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartTime: string;
  minutesBefore: number;
  reminderType: 'notification' | 'email' | 'sms';
}

/**
 * Reminder Service
 *
 * Manages event reminders and notifications for Connection Events.
 * Supports multiple reminder types and intervals.
 */
export const reminderService = {
  /**
   * Creates or updates a reminder for an event
   */
  async setReminder(
    eventId: string,
    minutesBefore: number,
    reminderType: 'notification' | 'email' | 'sms' = 'notification'
  ): Promise<Reminder> {
    try {
      log.debug('[reminderService] 🔔 Setting reminder:', {
        eventId,
        minutesBefore,
        reminderType,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if reminder already exists
      const { data: existingReminder } = await supabase
        .from('connection_event_reminders')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('reminder_type', reminderType)
        .single();

      let result;

      if (existingReminder) {
        // Update existing reminder
        result = await supabase
          .from('connection_event_reminders')
          .update({
            minutes_before: minutesBefore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReminder.id)
          .select()
          .single();
      } else {
        // Create new reminder
        result = await supabase
          .from('connection_event_reminders')
          .insert({
            event_id: eventId,
            user_id: user.id,
            minutes_before: minutesBefore,
            reminder_type: reminderType,
            is_sent: false,
          })
          .select()
          .single();
      }

      if (result.error) {
        throw new Error(`Failed to set reminder: ${result.error.message}`);
      }

      log.debug('[reminderService] ✅ Reminder set successfully:', { reminderId: result.data.id });
      return result.data as Reminder;
    } catch (error) {
      log.error('[reminderService] ❌ Error setting reminder:', { error });
      throw error;
    }
  },

  /**
   * Gets all pending reminders that need to be sent
   * Checks for reminders where the event starts in X minutes
   */
  async getPendingReminders(): Promise<PendingReminder[]> {
    try {
      log.debug('[reminderService] 📋 Fetching pending reminders');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch reminders that haven't been sent yet
      const { data: reminders, error: remindersError } = await supabase
        .from('connection_event_reminders')
        .select(`
          id,
          event_id,
          minutes_before,
          reminder_type,
          connection_events (
            id,
            title,
            starts_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_sent', false)
        .order('created_at', { ascending: true });

      if (remindersError) {
        throw new Error(`Failed to fetch reminders: ${remindersError.message}`);
      }

      if (!reminders || reminders.length === 0) {
        log.debug('[reminderService] ℹ️ No pending reminders');
        return [];
      }

      // Filter reminders that are ready to be sent
      const now = new Date();
      const pendingReminders: PendingReminder[] = [];

      for (const reminder of reminders) {
        const event = Array.isArray(reminder.connection_events)
          ? reminder.connection_events[0]
          : reminder.connection_events;

        if (!event) continue;

        const eventTime = new Date(event.starts_at);
        const minutesUntilEvent = (eventTime.getTime() - now.getTime()) / 60000;

        // If the reminder time has arrived (within 1 minute tolerance)
        if (
          minutesUntilEvent <= reminder.minutes_before &&
          minutesUntilEvent > reminder.minutes_before - 1
        ) {
          pendingReminders.push({
            id: reminder.id,
            eventId: event.id,
            eventTitle: event.title,
            eventStartTime: event.starts_at,
            minutesBefore: reminder.minutes_before,
            reminderType: reminder.reminder_type,
          });
        }
      }

      log.debug('[reminderService] ✅ Pending reminders fetched:', {
        count: pendingReminders.length,
      });

      return pendingReminders;
    } catch (error) {
      log.error('[reminderService] ❌ Error fetching pending reminders:', { error });
      throw error;
    }
  },

  /**
   * Marks a reminder as sent
   */
  async markReminderAsSent(reminderId: string): Promise<Reminder> {
    try {
      log.debug('[reminderService] ✉️ Marking reminder as sent:', { reminderId });

      const result = await supabase
        .from('connection_event_reminders')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .select()
        .single();

      if (result.error) {
        throw new Error(`Failed to mark reminder as sent: ${result.error.message}`);
      }

      log.debug('[reminderService] ✅ Reminder marked as sent');
      return result.data as Reminder;
    } catch (error) {
      log.error('[reminderService] ❌ Error marking reminder as sent:', { error });
      throw error;
    }
  },

  /**
   * Removes a reminder
   */
  async removeReminder(reminderId: string): Promise<void> {
    try {
      log.debug('[reminderService] 🗑️ Removing reminder:', { reminderId });

      const { error } = await supabase
        .from('connection_event_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) {
        throw new Error(`Failed to remove reminder: ${error.message}`);
      }

      log.debug('[reminderService] ✅ Reminder removed');
    } catch (error) {
      log.error('[reminderService] ❌ Error removing reminder:', { error });
      throw error;
    }
  },

  /**
   * Gets all reminders for a specific event
   */
  async getEventReminders(eventId: string): Promise<Reminder[]> {
    try {
      log.debug('[reminderService] 📋 Fetching reminders for event:', { eventId });

      const { data, error } = await supabase
        .from('connection_event_reminders')
        .select('*')
        .eq('event_id', eventId)
        .order('minutes_before', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch reminders: ${error.message}`);
      }

      log.debug('[reminderService] ✅ Event reminders fetched:', { count: (data || []).length });
      return (data || []) as Reminder[];
    } catch (error) {
      log.error('[reminderService] ❌ Error fetching event reminders:', { error });
      throw error;
    }
  },

  /**
   * Updates a reminder
   */
  async updateReminder(
    reminderId: string,
    minutesBefore: number
  ): Promise<Reminder> {
    try {
      log.debug('[reminderService] 🔄 Updating reminder:', {
        reminderId,
        minutesBefore,
      });

      const result = await supabase
        .from('connection_event_reminders')
        .update({
          minutes_before: minutesBefore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .select()
        .single();

      if (result.error) {
        throw new Error(`Failed to update reminder: ${result.error.message}`);
      }

      log.debug('[reminderService] ✅ Reminder updated');
      return result.data as Reminder;
    } catch (error) {
      log.error('[reminderService] ❌ Error updating reminder:', { error });
      throw error;
    }
  },

  /**
   * Gets reminders for the next hour across all events
   * Useful for checking what reminders are coming up
   */
  async getUpcomingReminders(): Promise<PendingReminder[]> {
    try {
      log.debug('[reminderService] 🔔 Fetching upcoming reminders');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: reminders, error } = await supabase
        .from('connection_event_reminders')
        .select(`
          id,
          event_id,
          minutes_before,
          reminder_type,
          connection_events (
            id,
            title,
            starts_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_sent', false)
        .order('minutes_before', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch reminders: ${error.message}`);
      }

      if (!reminders || reminders.length === 0) {
        return [];
      }

      const now = new Date();
      const upcomingReminders: PendingReminder[] = [];

      for (const reminder of reminders) {
        const event = Array.isArray(reminder.connection_events)
          ? reminder.connection_events[0]
          : reminder.connection_events;

        if (!event) continue;

        const eventTime = new Date(event.starts_at);
        const minutesUntilEvent = (eventTime.getTime() - now.getTime()) / 60000;

        // Include reminders that are within the next 60 minutes
        if (minutesUntilEvent > 0 && minutesUntilEvent <= 60) {
          upcomingReminders.push({
            id: reminder.id,
            eventId: event.id,
            eventTitle: event.title,
            eventStartTime: event.starts_at,
            minutesBefore: reminder.minutes_before,
            reminderType: reminder.reminder_type,
          });
        }
      }

      log.debug('[reminderService] ✅ Upcoming reminders fetched:', {
        count: upcomingReminders.length,
      });

      return upcomingReminders;
    } catch (error) {
      log.error('[reminderService] ❌ Error fetching upcoming reminders:', { error });
      throw error;
    }
  },
};
