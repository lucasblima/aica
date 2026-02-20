import { useState, useEffect, useCallback } from 'react';
import { waitlistService } from '@/services/waitlistService';

export function useWaitlist() {
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyExists, setAlreadyExists] = useState(false);

  useEffect(() => {
    waitlistService.getWaitlistCount().then(setWaitlistCount);
  }, []);

  const joinWaitlist = useCallback(async (email: string, referralCode?: string) => {
    setIsSubmitting(true);
    setError(null);

    const result = await waitlistService.joinWaitlist(email, referralCode);

    setIsSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      setAlreadyExists(result.already_exists || false);
      // Refresh count
      waitlistService.getWaitlistCount().then(setWaitlistCount);
    } else {
      setError(result.error || 'Erro ao entrar na lista');
    }

    return result;
  }, []);

  const reset = useCallback(() => {
    setSubmitted(false);
    setError(null);
    setAlreadyExists(false);
  }, []);

  return {
    joinWaitlist,
    waitlistCount,
    isSubmitting,
    submitted,
    alreadyExists,
    error,
    reset,
  };
}
