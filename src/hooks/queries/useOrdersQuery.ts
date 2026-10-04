import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { orderRepository } from '../../repositories';
import { OrderService } from '../../services/orderService';
import { queryKeys, CACHE_TIERS } from '../../lib/queryClient';
import type { Order, OrderStatus } from '../../models/domain';
import toast from 'react-hot-toast';

export interface OrderQueryFilters {
  teamId?: string;
  supervisorId?: string;
  memberId?: string;
  customerId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useOrdersQuery(filters: OrderQueryFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: async () => {
      if (filters.teamId) {
        return orderRepository.getByTeamId(filters.teamId);
      }
      if (filters.supervisorId) {
        return orderRepository.getBySupervisorId(filters.supervisorId);
      }
      if (filters.memberId) {
        return orderRepository.getByMemberId(filters.memberId);
      }
      if (filters.customerId) {
        return orderRepository.getByCustomerId(filters.customerId);
      }
      return orderRepository.getAll();
    },
    enabled: enabled && Boolean(filters.teamId || filters.supervisorId || filters.memberId || filters.customerId),
    staleTime: CACHE_TIERS.HOT,
  });
}

export function usePaginatedOrdersQuery(params: import('../../repositories/interfaces').OrderPaginationParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders.paginated(params),
    queryFn: () => orderRepository.getPaginated(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: CACHE_TIERS.HOT,
  });
}

export function useOrderMetricsQuery(
  params?: { teamId?: string; supervisorId?: string; memberId?: string; startDate?: string; endDate?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.orders.metrics(params),
    queryFn: () => orderRepository.getMetrics(params),
    enabled,
    staleTime: CACHE_TIERS.HOT,
  });
}

export function useOrderConflictsQuery(
  dto: import('../../repositories/interfaces').OrderConflictCheckDto,
  enabled = true,
) {
  const hasKeys = Boolean(
    (dto.orderIds && dto.orderIds.length > 0) ||
    (dto.customerIds && dto.customerIds.length > 0) ||
    (dto.phones && dto.phones.length > 0)
  );

  return useQuery({
    queryKey: queryKeys.orders.conflicts(dto),
    queryFn: () => orderRepository.checkConflicts(dto),
    enabled: enabled && hasKeys,
    staleTime: CACHE_TIERS.HOT,
  });
}

export function useOrderDetailQuery(id?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      return orderRepository.getById(id);
    },
    enabled: enabled && Boolean(id),
    staleTime: CACHE_TIERS.WARM,
  });
}

export function useOrderMutations() {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      targetOrder,
      targetNewStatus,
      user,
      statusRemark,
      damagedItems,
      actionDate,
    }: {
      targetOrder: Order;
      targetNewStatus: OrderStatus;
      user: any;
      statusRemark?: string;
      damagedItems?: any[];
      actionDate?: string;
    }) => {
      return OrderService.updateOrderStatus(
        targetOrder.id,
        targetNewStatus,
        user,
        statusRemark?.trim() || undefined,
        damagedItems,
        actionDate,
      );
    },
    onSuccess: (_, variables) => {
      toast.success(`Order #${variables.targetOrder.orderNumber} status changed to ${variables.targetNewStatus}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: ['interested-leads-bundle'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.dashboard() });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Status transition failed.');
    },
  });

  const updateRemarkMutation = useMutation({
    mutationFn: async ({
      remarkOrder,
      remarkText,
      user,
    }: {
      remarkOrder: Order;
      remarkText: string;
      user: any;
    }) => {
      return OrderService.updateOrderRemark(remarkOrder.id, remarkText.trim(), user);
    },
    onSuccess: (_, variables) => {
      toast.success(`Remark updated for Order #${variables.remarkOrder.orderNumber}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: ['interested-leads-bundle'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update remark.');
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({
      selectedOrderIds,
      bulkTargetStatus,
      user,
      damagedItems,
      actionDate,
    }: {
      selectedOrderIds: string[];
      bulkTargetStatus: OrderStatus;
      user: any;
      damagedItems?: any[];
      actionDate?: string;
    }) => {
      return OrderService.bulkUpdateOrderStatus(
        selectedOrderIds,
        bulkTargetStatus,
        user,
        damagedItems,
        actionDate,
      );
    },
    onSuccess: (count, variables) => {
      toast.success(`Updated status of ${count} selected order(s) to ${variables.bulkTargetStatus}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: ['interested-leads-bundle'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.dashboard() });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Bulk status update failed.');
    },
  });

  return {
    updateStatusMutation,
    updateRemarkMutation,
    bulkUpdateStatusMutation,
  };
}
