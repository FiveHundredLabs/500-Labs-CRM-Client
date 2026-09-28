import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Customer, User, Order, OrderStatus, DeliveryStatusHistory } from '../models/domain';
import { deliveryStatusHistoryRepository } from '../repositories';
import { useOrdersQuery, usePaginatedOrdersQuery, useOrderMetricsQuery, useOrderConflictsQuery, useOrderMutations } from './queries/useOrdersQuery';
import { useCustomersQuery } from './queries/useCustomersQuery';
import { useTeamUsersQuery } from './queries/useUsersQuery';
import type { PageInfo } from '../repositories/interfaces';

export interface UseOrdersOptions {
  overrideTeamId?: string;
  page?: number;
  limit?: number;
  status?: string;
  memberId?: string;
  search?: string;
  date?: string;
  paginate?: boolean;
}

export function useOrders(options?: string | UseOrdersOptions) {
  const opts: UseOrdersOptions = useMemo(() => {
    if (typeof options === 'string') {
      return { overrideTeamId: options };
    }
    return options || {};
  }, [options]);

  const { user } = useAuth();
  const effectiveTeamId = opts.overrideTeamId || user?.teamId || '';
  const isPaginated = Boolean(opts.paginate || opts.page !== undefined || opts.limit !== undefined);

  // 1. TanStack Queries for Server State
  const paginationParams = useMemo(() => {
    if (!isPaginated) return null;
    return {
      teamId: effectiveTeamId,
      page: opts.page ?? 1,
      limit: opts.limit ?? 50,
      status: opts.status && opts.status !== 'ALL' ? opts.status : (opts.status === 'ALL' ? 'ALL' : undefined),
      memberId: opts.memberId && opts.memberId !== 'ALL' ? opts.memberId : undefined,
      search: opts.search ? opts.search.trim() : undefined,
      date: opts.date && opts.date !== 'ALL' ? opts.date : undefined,
    };
  }, [isPaginated, effectiveTeamId, opts.page, opts.limit, opts.status, opts.memberId, opts.search, opts.date]);

  const paginatedOrdersQuery = usePaginatedOrdersQuery(
    paginationParams!,
    Boolean(user && effectiveTeamId && isPaginated)
  );

  const flatOrdersQuery = useOrdersQuery(
    { teamId: effectiveTeamId },
    Boolean(user && effectiveTeamId && !isPaginated)
  );

  const activeOrdersQuery = isPaginated ? paginatedOrdersQuery : flatOrdersQuery;

  const customersQuery = useCustomersQuery({ teamId: effectiveTeamId }, Boolean(user && effectiveTeamId));
  const usersQuery = useTeamUsersQuery(effectiveTeamId, Boolean(user && effectiveTeamId));

  const metricsQuery = useOrderMetricsQuery(
    {
      teamId: effectiveTeamId,
      memberId: opts.memberId && opts.memberId !== 'ALL' ? opts.memberId : undefined,
      startDate: opts.date && opts.date !== 'ALL' ? opts.date : undefined,
      endDate: opts.date && opts.date !== 'ALL' ? opts.date : undefined,
    },
    Boolean(user && effectiveTeamId)
  );

  const { updateStatusMutation, updateRemarkMutation, bulkUpdateStatusMutation } = useOrderMutations();

  const orders = useMemo(() => {
    if (isPaginated) {
      return (paginatedOrdersQuery.data?.items as Order[]) ?? [];
    }
    return (flatOrdersQuery.data as Order[]) ?? [];
  }, [isPaginated, paginatedOrdersQuery.data, flatOrdersQuery.data]);

  const pageInfo: PageInfo | null = useMemo(() => {
    if (isPaginated && paginatedOrdersQuery.data?.pageInfo) {
      return paginatedOrdersQuery.data.pageInfo;
    }
    return null;
  }, [isPaginated, paginatedOrdersQuery.data]);

  const statusMetrics = useMemo(() => {
    return {
      dispatchedCount: metricsQuery.data?.dispatchedCount ?? 0,
      deliveredCount: metricsQuery.data?.deliveredCount ?? 0,
      rejectedCount: metricsQuery.data?.rejectedCount ?? 0,
      totalOrdersCount: metricsQuery.data?.totalOrdersCount ?? 0,
    };
  }, [metricsQuery.data]);

  const customersMap = useMemo(() => {
    const list = customersQuery.data ?? [];
    const map: Record<string, Customer> = {};
    list.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [customersQuery.data]);

  const teamUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const teamMembers = useMemo(() => {
    return teamUsers.filter((u) => u.role === 'TEAM_MEMBER');
  }, [teamUsers]);

  const membersMap = useMemo(() => {
    const map: Record<string, User> = {};
    teamUsers.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, [teamUsers]);

  // Only consider loading on initial mount when no data is available yet
  const isInitialLoading =
    (activeOrdersQuery.isLoading && !activeOrdersQuery.data) ||
    (customersQuery.isLoading && !customersQuery.data) ||
    (usersQuery.isLoading && !usersQuery.data);

  const isRefreshing =
    activeOrdersQuery.isFetching ||
    customersQuery.isFetching ||
    usersQuery.isFetching ||
    Boolean((activeOrdersQuery as any).isPlaceholderData);

  const loading = isInitialLoading;

  // Order IDs on active page for backend-wide duplicate conflict intelligence
  const orderIdsForConflict = useMemo(() => {
    return orders.map((o) => o.id);
  }, [orders]);

  const backendConflictsQuery = useOrderConflictsQuery(
    { orderIds: orderIdsForConflict },
    Boolean(orderIdsForConflict.length > 0)
  );

  // Fast O(N) duplicate conflict resolution merging backend intelligence with local dataset
  const orderConflictMap = useMemo<Record<string, any>>(() => {
    const backendConflicts = backendConflictsQuery.data || {};
    const mapByPhone: Record<string, Order[]> = {};

    orders.forEach((ord) => {
      const cust = customersMap[ord.customerId] || (ord as any).customer;
      const rawPhone = cust?.phone || '';
      const norm = rawPhone.trim();
      if (!norm) return;
      if (!mapByPhone[norm]) {
        mapByPhone[norm] = [];
      }
      mapByPhone[norm].push(ord);
    });

    const activeByPhone: Record<string, Order[]> = {};
    const deliveredByPhone: Record<string, Order[]> = {};

    Object.entries(mapByPhone).forEach(([phone, ords]) => {
      activeByPhone[phone] = ords.filter(
        (o) => ['DRAFT', 'PREPARED', 'DISPATCHED'].includes(o.status) && !o.isReplacement
      );
      deliveredByPhone[phone] = ords.filter((o) => o.status === 'DELIVERED');
    });

    const conflictMap: Record<string, any> = { ...backendConflicts };

    orders.forEach((ord) => {
      if (backendConflicts[ord.id]) {
        return;
      }
      const cust = customersMap[ord.customerId] || (ord as any).customer;
      const rawPhone = cust?.phone || '';
      const norm = rawPhone.trim();
      if (!norm || !mapByPhone[norm]) return;

      const isThisOrderActive = ['DRAFT', 'PREPARED', 'DISPATCHED'].includes(ord.status);
      const allForPhone = mapByPhone[norm];
      const activeDuplicates = (activeByPhone[norm] || []).filter((o) => o.id !== ord.id);
      const previousDelivered = (deliveredByPhone[norm] || []).filter((o) => o.id !== ord.id);

      conflictMap[ord.id] = {
        phone: norm,
        customerName: cust?.fullName,
        hasDuplicateActiveOrders: !ord.isReplacement && isThisOrderActive && activeDuplicates.length > 0,
        activeDuplicateOrders: ord.isReplacement ? [] : activeDuplicates,
        hasPreviousDeliveredOrder: !ord.isReplacement && isThisOrderActive && previousDelivered.length > 0,
        previousDeliveredOrders: ord.isReplacement ? [] : previousDelivered,
        allOrdersForPhone: allForPhone,
      };
    });

    return conflictMap;
  }, [orders, customersMap, backendConflictsQuery.data]);

  const loadData = useCallback(async () => {
    await Promise.all([
      activeOrdersQuery.refetch(),
      customersQuery.refetch(),
      usersQuery.refetch(),
      metricsQuery.refetch(),
    ]);
  }, [activeOrdersQuery, customersQuery, usersQuery, metricsQuery]);

  const updateOrderStatus = async (
    targetOrder: Order,
    targetNewStatus: OrderStatus,
    statusRemark: string,
    damagedItems?: { productId?: string; productName: string; quantity: number; reason?: string }[]
  ) => {
    if (!user) return false;
    try {
      await updateStatusMutation.mutateAsync({
        targetOrder,
        targetNewStatus,
        user,
        statusRemark,
        damagedItems,
      });
      return true;
    } catch {
      return false;
    }
  };

  const updateOrderRemark = async (remarkOrder: Order, remarkText: string) => {
    if (!user) return false;
    try {
      await updateRemarkMutation.mutateAsync({
        remarkOrder,
        remarkText,
        user,
      });
      return true;
    } catch {
      return false;
    }
  };

  const bulkUpdateOrderStatus = async (
    selectedOrderIds: string[],
    bulkTargetStatus: OrderStatus,
    damagedItems?: { productId?: string; productName: string; quantity: number; reason?: string }[]
  ) => {
    if (!user || selectedOrderIds.length === 0) return false;
    try {
      await bulkUpdateStatusMutation.mutateAsync({
        selectedOrderIds,
        bulkTargetStatus,
        user,
        damagedItems,
      });
      return true;
    } catch {
      return false;
    }
  };

  const fetchOrderHistory = async (orderId: string): Promise<DeliveryStatusHistory[]> => {
    return deliveryStatusHistoryRepository.getByOrderId(orderId);
  };

  return {
    user,
    effectiveTeamId,
    orders,
    pageInfo,
    statusMetrics,
    customersMap,
    teamMembers,
    membersMap,
    orderConflictMap,
    loading,
    isRefreshing,
    loadData,
    updateOrderStatus,
    updateOrderRemark,
    bulkUpdateOrderStatus,
    fetchOrderHistory,
  };
}
