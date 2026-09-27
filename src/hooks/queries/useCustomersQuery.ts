import { useQuery } from '@tanstack/react-query';
import { customerRepository } from '../../repositories';
import { queryKeys, CACHE_TIERS } from '../../lib/queryClient';

export interface CustomerQueryFilters {
  teamId?: string;
  supervisorId?: string;
  memberId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useCustomersQuery(filters: CustomerQueryFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: async () => {
      if (filters.teamId) {
        return customerRepository.getByTeamId(filters.teamId);
      }
      if (filters.supervisorId) {
        return customerRepository.getBySupervisorId(filters.supervisorId);
      }
      if (filters.memberId) {
        return customerRepository.getByMemberId(filters.memberId);
      }
      return customerRepository.getAll();
    },
    enabled: enabled && Boolean(filters.teamId || filters.supervisorId || filters.memberId),
    staleTime: CACHE_TIERS.WARM,
  });
}

export function usePaginatedCustomersQuery(params: import('../../repositories/interfaces').CustomerPaginationParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers.paginated(params),
    queryFn: () => customerRepository.getPaginated(params),
    enabled,
    staleTime: CACHE_TIERS.WARM,
  });
}

export function useCustomerDetailQuery(id?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      return customerRepository.getById(id);
    },
    enabled: enabled && Boolean(id),
    staleTime: CACHE_TIERS.WARM,
  });
}
