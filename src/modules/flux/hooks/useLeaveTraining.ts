import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AthleteService } from '../services/athleteService';

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
    const { error: unlinkError } = await AthleteService.unlinkSelf();
    if (unlinkError) {
      setError('Erro ao sair do treino. Tente novamente.');
      setIsLeaving(false);
      setShowConfirm(true);
      return;
    }
    setIsLeaving(false);
    navigate('/');
  }, [navigate]);

  return { isLeaving, showConfirm, error, requestLeave, cancelLeave, confirmLeave };
}
