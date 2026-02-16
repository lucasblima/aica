import { useQuery } from '@tanstack/react-query';
import { getDailyAgenda } from '@/services/supabaseService';
import { queryKeys } from './queryKeys';

export function useDailyAgendaQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dailyAgenda.all,
    queryFn: getDailyAgenda,
    enabled,
  });
}
