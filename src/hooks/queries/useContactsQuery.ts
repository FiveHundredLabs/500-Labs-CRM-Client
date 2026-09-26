import { useQuery } from '@tanstack/react-query';
import { contactRepository } from '../../repositories';
import { queryKeys, CACHE_TIERS } from '../../lib/queryClient';
import type { ContactPaginationParams, PaginatedResponse } from '../../repositories/interfaces';
import type { Contact } from '../../models/domain';

export interface ContactQueryFilters {
  teamId?: string;
  memberId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useContactCountsQuery(
  filters: { teamId?: string; memberId?: string; search?: string },
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.contacts.counts(filters),
    queryFn: async () => {
      return contactRepository.getCounts(filters);
    },
    enabled: enabled && Boolean(filters.teamId || filters.memberId),
    staleTime: CACHE_TIERS.HOT,
  });
}

export function usePaginatedContactsQuery(
  params: ContactPaginationParams,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.contacts.paginated(params),
    queryFn: async (): Promise<PaginatedResponse<Contact>> => {
      return contactRepository.getPaginated(params);
    },
    enabled: enabled && Boolean(params.teamId || params.memberId),
    staleTime: CACHE_TIERS.HOT,
  });
}

export function useContactsQuery(filters: ContactQueryFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.contacts.list(filters),
    queryFn: async () => {
      if (filters.teamId) {
        return contactRepository.getByTeamId(filters.teamId);
      }
      if (filters.memberId) {
        return contactRepository.getByMemberId(filters.memberId);
      }
      return contactRepository.getAll();
    },
    enabled: enabled && Boolean(filters.teamId || filters.memberId),
    staleTime: CACHE_TIERS.WARM,
  });
}

export function useContactDetailQuery(id?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      return contactRepository.getById(id);
    },
    enabled: enabled && Boolean(id),
    staleTime: CACHE_TIERS.WARM,
  });
}
