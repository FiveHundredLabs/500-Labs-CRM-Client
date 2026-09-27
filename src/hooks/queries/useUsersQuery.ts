import { useQuery } from '@tanstack/react-query';
import { userRepository } from '../../repositories';
import { queryKeys, CACHE_TIERS } from '../../lib/queryClient';

export function useTeamUsersQuery(teamId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.teamMembers(teamId),
    queryFn: async () => {
      if (!teamId) return [];
      return userRepository.getByTeamId(teamId);
    },
    enabled: enabled && Boolean(teamId),
    staleTime: CACHE_TIERS.WARM,
  });
}
