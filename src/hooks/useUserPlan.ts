import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

export interface UserPlan {
  id: string
  name: string
  monthly_credits: number
  price_brl_monthly: number
  status: string
}

const FREE_PLAN: UserPlan = {
  id: 'free',
  name: 'Free',
  monthly_credits: 500,
  price_brl_monthly: 0,
  status: 'active',
}

async function fetchUserPlan(userId: string): Promise<UserPlan> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('plan_id, status, pricing_plans(id, name, monthly_credits, price_brl_monthly)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error || !data) return FREE_PLAN

  const plan = data.pricing_plans as unknown as {
    id: string
    name: string
    monthly_credits: number
    price_brl_monthly: number
  } | null

  if (!plan) return FREE_PLAN

  return {
    id: plan.id,
    name: plan.name,
    monthly_credits: plan.monthly_credits ?? 500,
    price_brl_monthly: plan.price_brl_monthly,
    status: data.status,
  }
  } catch {
    // Table may not exist yet (billing not configured) — fallback to free plan
    return FREE_PLAN
  }
}

export function useUserPlan() {
  const { user } = useAuth()

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: () => fetchUserPlan(user!.id),
    enabled: !!user?.id,
  })

  return {
    plan: plan ?? FREE_PLAN,
    isLoading,
    error,
  }
}
