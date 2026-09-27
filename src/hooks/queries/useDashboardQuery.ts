import { useQuery } from '@tanstack/react-query';
import { dashboardRepository } from '../../repositories';
import { queryKeys, CACHE_TIERS } from '../../lib/queryClient';

export function useAdminDashboardQuery(filters?: { startDate?: string; endDate?: string }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.admin(filters),
    queryFn: () => dashboardRepository.getAdminSummary(filters),
    enabled,
    staleTime: CACHE_TIERS.WARM,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSupervisorDashboardQuery(
  filters?: { startDate?: string; endDate?: string; teamId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.dashboard.supervisor(filters),
    queryFn: () => dashboardRepository.getSupervisorSummary(filters),
    enabled,
    staleTime: CACHE_TIERS.WARM,
    gcTime: 10 * 60 * 1000,
  });
}
