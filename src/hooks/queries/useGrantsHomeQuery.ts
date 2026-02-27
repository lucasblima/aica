import { useQuery } from '@tanstack/react-query';
import {
  countAllActiveProjects,
  getUpcomingDeadlines,
  getRecentProjects,
} from '@/modules/grants/services/grantService';
import type { GrantDeadline, GrantProject } from '@/modules/grants/types';
import { queryKeys } from './queryKeys';

interface GrantsHomeData {
  activeProjects: number;
  upcomingDeadlines: GrantDeadline[];
  recentProjects: GrantProject[];
}

async function fetchGrantsHomeData(userId: string): Promise<GrantsHomeData> {
  const [activeProjects, upcomingDeadlines, recentProjects] = await Promise.all([
    countAllActiveProjects(userId),
    getUpcomingDeadlines(userId, 30),
    getRecentProjects(userId, 2),
  ]);
  return { activeProjects, upcomingDeadlines, recentProjects };
}

export function useGrantsHomeQuery(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.grantsHome.all,
    queryFn: () => fetchGrantsHomeData(userId!),
    enabled: enabled && !!userId,
  });
}
