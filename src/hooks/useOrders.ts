import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Customer, User, Order, OrderStatus, DeliveryStatusHistory } from '../models/domain';
import { deliveryStatusHistoryRepository } from '../repositories';
import { useOrdersQuery, useOrderMutations } from './queries/useOrdersQuery';
import { useCustomersQuery } from './queries/useCustomersQuery';
import { useTeamUsersQuery } from './queries/useUsersQuery';

export function useOrders(overrideTeamId?: string) {
  const { user } = useAuth();
  const effectiveTeamId = overrideTeamId || user?.teamId || '';

  // 1. TanStack Queries for Server State
  const ordersQuery = useOrdersQuery({ teamId: effectiveTeamId }, Boolean(user && effectiveTeamId));
  const customersQuery = useCustomersQuery({ teamId: effectiveTeamId }, Boolean(user && effectiveTeamId));
  const usersQuery = useTeamUsersQuery(effectiveTeamId, Boolean(user && effectiveTeamId));

  const { updateStatusMutation, updateRemarkMutation, bulkUpdateStatusMutation } = useOrderMutations();

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

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

  const loading = ordersQuery.isLoading || customersQuery.isLoading || usersQuery.isLoading;

  const loadData = useCallback(async () => {
    await Promise.all([
      ordersQuery.refetch(),
      customersQuery.refetch(),
      usersQuery.refetch(),
    ]);
  }, [ordersQuery, customersQuery, usersQuery]);

  // Fast O(N) duplicate conflict resolution
  const orderConflictMap = useMemo<Record<string, any>>(() => {
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

    // Pre-calculate active and delivered buckets per phone for O(1) checks
    const activeByPhone: Record<string, Order[]> = {};
    const deliveredByPhone: Record<string, Order[]> = {};

    Object.entries(mapByPhone).forEach(([phone, ords]) => {
      activeByPhone[phone] = ords.filter(
        (o) => ['DRAFT', 'PREPARED', 'DISPATCHED'].includes(o.status) && !o.isReplacement
      );
      deliveredByPhone[phone] = ords.filter((o) => o.status === 'DELIVERED');
    });

    const conflictMap: Record<string, any> = {};

    orders.forEach((ord) => {
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
  }, [orders, customersMap]);

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
    customersMap,
    teamMembers,
    membersMap,
    orderConflictMap,
    loading,
    loadData,
    updateOrderStatus,
    updateOrderRemark,
    bulkUpdateOrderStatus,
    fetchOrderHistory,
  };
}
