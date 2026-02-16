import { useQuery } from '@tanstack/react-query';
import { getLifeAreas } from '@/services/supabaseService';
import { queryKeys } from './queryKeys';

export function useLifeAreasQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.lifeAreas.all,
    queryFn: getLifeAreas,
    enabled,
  });
}
