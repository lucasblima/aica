import { useQuery } from '@tanstack/react-query';
import { getAssociations } from '@/services/supabaseService';
import { queryKeys } from './queryKeys';

export function useAssociationsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.associations.all,
    queryFn: getAssociations,
    enabled,
  });
}
