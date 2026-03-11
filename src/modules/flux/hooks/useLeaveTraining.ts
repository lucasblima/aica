import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AthleteService } from '../services/athleteService';
import { deleteCalendarEvent } from '@/services/googleCalendarWriteService';

export function useLeaveTraining() {
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLeave = useCallback(() => {
    setError(null);
    setShowConfirm(true);
  }, []);

  const cancelLeave = useCallback(() => {
    setShowConfirm(false);
    setError(null);
  }, []);

  const confirmLeave = useCallback(async () => {
    setIsLeaving(true);
    setError(null);
    const { googleEventIds, error: unlinkError } = await AthleteService.unlinkSelf();
    if (unlinkError) {
      setError('Erro ao sair do treino. Tente novamente.');
      setIsLeaving(false);
      setShowConfirm(true);
      return;
    }

    // Best-effort: delete orphaned Google Calendar events.
    // Works when athlete has Google Calendar connected (same account as coach).
    // Silently fails otherwise — events remain on coach's calendar.
    for (const eventId of googleEventIds) {
      try {
        await deleteCalendarEvent(eventId);
      } catch {
        // Expected when athlete ≠ coach (no access to coach's calendar)
      }
    }

    setIsLeaving(false);
    navigate('/');
  }, [navigate]);

  return { isLeaving, showConfirm, error, requestLeave, cancelLeave, confirmLeave };
}
