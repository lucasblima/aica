import { useState, useCallback } from 'react';
import { redeemCoupon, type RedeemResult } from '@/services/couponService';

interface UseCouponRedemptionReturn {
  isRedeeming: boolean;
  result: RedeemResult | null;
  error: string | null;
  redeem: (code: string) => Promise<RedeemResult>;
  reset: () => void;
}

export function useCouponRedemption(): UseCouponRedemptionReturn {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redeem = useCallback(async (code: string): Promise<RedeemResult> => {
    const trimmed = code.trim();
    if (!trimmed) {
      const fail = { success: false, credits_earned: 0, new_balance: 0, message: 'Digite um codigo' };
      setError(fail.message);
      return fail;
    }

    setIsRedeeming(true);
    setError(null);
    setResult(null);

    const res = await redeemCoupon(trimmed);

    if (res.success) {
      setResult(res);
      setError(null);
    } else {
      setError(res.message);
      setResult(null);
    }

    setIsRedeeming(false);
    return res;
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { isRedeeming, result, error, redeem, reset };
}
