import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import type { SimulationInput } from './types';
import { DEFAULT_SIMULATION } from './simulatorDefaults';

export function useBaselineData(): { input: SimulationInput; isLoading: boolean } {
  const [input, setInput] = useState(DEFAULT_SIMULATION);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBaseline() {
      try {
        // Get current subscriber counts
        const { data: subs } = await supabase
          .from('user_subscriptions')
          .select('plan_id')
          .eq('status', 'active');

        // Get current plan prices
        const { data: plans } = await supabase
          .from('pricing_plans')
          .select('id, name, monthly_price_brl, monthly_credits');

        if (subs && plans) {
          const proPlan = plans.find(p => p.name === 'Pro');
          const teamsPlan = plans.find(p => p.name === 'Teams');
          const freePlan = plans.find(p => p.name === 'Free');

          setInput(prev => ({
            ...prev,
            pricing: {
              priceProBRL: proPlan?.monthly_price_brl ?? prev.pricing.priceProBRL,
              priceTeamsBRL: teamsPlan?.monthly_price_brl ?? prev.pricing.priceTeamsBRL,
              creditsFree: freePlan?.monthly_credits ?? prev.pricing.creditsFree,
              creditsPro: proPlan?.monthly_credits ?? prev.pricing.creditsPro,
              creditsTeams: teamsPlan?.monthly_credits ?? prev.pricing.creditsTeams,
            },
            growth: {
              ...prev.growth,
              initialUsers: subs.length || prev.growth.initialUsers,
            },
          }));
        }
      } catch (err) {
        console.warn('[simulator] Failed to fetch baseline, using defaults:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBaseline();
  }, []);

  return { input, isLoading };
}
