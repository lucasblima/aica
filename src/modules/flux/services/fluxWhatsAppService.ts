/**
 * Flux WhatsApp Service
 *
 * Handles workout plan publishing via WhatsApp.
 * Records scheduled_workouts entries and generates WhatsApp deep links.
 *
 * Note: Direct WhatsApp API (Evolution API) was removed — sends go via
 * WhatsApp Web deep link (wa.me) for the coach to confirm manually.
 */

import { supabase } from '@/services/supabaseClient';
import type { WorkoutBlockData } from '../components/canvas/WorkoutBlock';

export interface PublishWorkoutParams {
  athleteId: string;
  athleteName: string;
  athletePhone: string;
  weekNumber: number;
  weekWorkouts: WorkoutBlockData[];
  message: string;
  sendNow: boolean;
  microcycleId?: string;
}

export interface PublishWorkoutResult {
  success: boolean;
  scheduledWorkoutId?: string;
  whatsappUrl?: string;
  error?: string;
}

/**
 * Format phone for WhatsApp deep link (international format, digits only)
 */
function formatPhoneForWhatsApp(phone: string): string {
  // Remove everything except digits
  let digits = phone.replace(/\D/g, '');

  // If starts with 0, assume Brazilian and add country code
  if (digits.startsWith('0')) {
    digits = '55' + digits.slice(1);
  }

  // If doesn't start with country code, assume Brazilian
  if (!digits.startsWith('55') && digits.length <= 11) {
    digits = '55' + digits;
  }

  return digits;
}

/**
 * Generate WhatsApp Web deep link
 */
function getWhatsAppUrl(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Publish a workout plan via WhatsApp.
 *
 * - Records a `scheduled_workouts` entry for tracking
 * - For "send now": opens WhatsApp Web link for coach to confirm
 * - For "schedule": creates a pending entry for later processing
 */
export async function publishWorkoutViaWhatsApp(
  params: PublishWorkoutParams
): Promise<PublishWorkoutResult> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    const scheduledFor = params.sendNow
      ? new Date().toISOString()
      : getNextSunday6PM().toISOString();

    // Record in scheduled_workouts for tracking
    const { data: scheduled, error: scheduleError } = await supabase
      .from('scheduled_workouts')
      .insert({
        user_id: userData.user.id,
        microcycle_id: params.microcycleId || null,
        athlete_id: params.athleteId,
        scheduled_for: scheduledFor,
        send_method: 'whatsapp',
        message_text: params.message,
        message_data: {
          week_number: params.weekNumber,
          workout_count: params.weekWorkouts.length,
          total_duration: params.weekWorkouts.reduce((sum, w) => sum + w.duration, 0),
        },
        status: params.sendNow ? 'sent' : 'pending',
        whatsapp_recipient_phone: params.athletePhone,
      })
      .select()
      .single();

    if (scheduleError) {
      console.error('[FluxWhatsApp] Error recording scheduled workout:', scheduleError);
      return { success: false, error: 'Erro ao registrar envio. Tente novamente.' };
    }

    // For "send now", generate WhatsApp deep link
    if (params.sendNow) {
      const whatsappUrl = getWhatsAppUrl(params.athletePhone, params.message);
      window.open(whatsappUrl, '_blank');
      return {
        success: true,
        scheduledWorkoutId: scheduled?.id,
        whatsappUrl,
      };
    }

    // For scheduled: entry is already created with status 'pending'
    return {
      success: true,
      scheduledWorkoutId: scheduled?.id,
    };
  } catch (error) {
    console.error('[FluxWhatsApp] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro inesperado ao enviar',
    };
  }
}

/**
 * Get next Sunday 6PM (BRT) timestamp
 */
function getNextSunday6PM(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(18, 0, 0, 0);
  return nextSunday;
}

/**
 * Update a scheduled workout status (e.g. mark as sent or cancelled)
 */
export async function updateScheduledWorkoutStatus(
  id: string,
  status: 'sent' | 'failed' | 'cancelled',
  failedReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'sent') {
      updates.sent_at = new Date().toISOString();
    }

    if (failedReason) {
      updates.failed_reason = failedReason;
    }

    const { error } = await supabase
      .from('scheduled_workouts')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[FluxWhatsApp] Error updating status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[FluxWhatsApp] Error updating status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
