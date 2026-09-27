import { useQuery } from '@tanstack/react-query';
import { financeRepository } from '../../repositories';
import { queryKeys, CACHE_TIERS } from '../../lib/queryClient';

export function useSalesAnalysisSummaryQuery(
  filters?: {
    teamId?: string;
    status?: string;
    package?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.finance.salesAnalysis(filters),
    queryFn: () => financeRepository.getSalesAnalysisSummary(filters || {}),
    enabled,
    staleTime: CACHE_TIERS.WARM,
    gcTime: 10 * 60 * 1000,
  });
}
