import { useState, useEffect, useCallback } from 'react';
import {
  adminListCoupons,
  adminCreateCoupon,
  adminToggleCoupon,
  adminTopUp,
  type Coupon,
  type CreateCouponResult,
  type AdminTopUpResult,
} from '@/services/couponService';

interface UseAdminCouponsReturn {
  coupons: Coupon[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  createCoupon: (params: {
    code: string;
    credits: number;
    maxRedemptions?: number | null;
    maxPerUser?: number;
    allowedPlans?: string[] | null;
    campaign?: string | null;
    startsAt?: string;
    expiresAt?: string | null;
  }) => Promise<CreateCouponResult>;
  toggleCoupon: (couponId: string, active: boolean) => Promise<{ success: boolean; message: string }>;
  topUp: (targetUserId: string, amount: number, reason: string) => Promise<AdminTopUpResult>;
}

export function useAdminCoupons(): UseAdminCouponsReturn {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const data = await adminListCoupons();
    setCoupons(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createCoupon = useCallback(async (params: Parameters<typeof adminCreateCoupon>[0]) => {
    const result = await adminCreateCoupon(params);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const toggleCoupon = useCallback(async (couponId: string, active: boolean) => {
    const result = await adminToggleCoupon(couponId, active);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const topUp = useCallback(async (targetUserId: string, amount: number, reason: string) => {
    return adminTopUp(targetUserId, amount, reason);
  }, []);

  return { coupons, isLoading, refresh, createCoupon, toggleCoupon, topUp };
}
