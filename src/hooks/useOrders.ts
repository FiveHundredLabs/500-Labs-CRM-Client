import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import type { Customer, User, Order, OrderStatus, DeliveryStatusHistory } from '../models/domain';
import { customerRepository, userRepository, orderRepository, deliveryStatusHistoryRepository } from '../repositories';
import { OrderService } from '../services/orderService';
import toast from 'react-hot-toast';

export function useOrders(overrideTeamId?: string) {
  const { user } = useAuth();
  const effectiveTeamId = overrideTeamId || user?.teamId || 'team_001';

  const [orders, setOrders] = useState<Order[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, Customer>>({});
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [oList, cList, teamUsers] = await Promise.all([
        orderRepository.getByTeamId(effectiveTeamId),
        customerRepository.getByTeamId(effectiveTeamId),
        userRepository.getByTeamId(effectiveTeamId),
      ]);

      setOrders(oList);

      const cMap: Record<string, Customer> = {};
      cList.forEach((c) => (cMap[c.id] = c));
      setCustomersMap(cMap);

      const membersOnly = teamUsers.filter((u) => u.role === 'TEAM_MEMBER');
      setTeamMembers(membersOnly);

      const uMap: Record<string, User> = {};
      teamUsers.forEach((u) => (uMap[u.id] = u));
      setMembersMap(uMap);
    } finally {
      setLoading(false);
    }
  }, [user, effectiveTeamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute duplicate conflict info for each order
  const orderConflictMap = React.useMemo<Record<string, any>>(() => {
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

    const conflictMap: Record<string, any> = {};

    orders.forEach((ord) => {
      const cust = customersMap[ord.customerId] || (ord as any).customer;
      const rawPhone = cust?.phone || '';
      const norm = rawPhone.trim();
      if (!norm || !mapByPhone[norm]) return;

      const isThisOrderActive = ['DRAFT', 'PREPARED', 'DISPATCHED'].includes(ord.status);
      const allForPhone = mapByPhone[norm];
      const otherOrders = allForPhone.filter((o) => o.id !== ord.id);
      const activeDuplicates = otherOrders.filter((o) =>
        ['DRAFT', 'PREPARED', 'DISPATCHED'].includes(o.status)
      );
      const previousDelivered = otherOrders.filter((o) => o.status === 'DELIVERED');

      conflictMap[ord.id] = {
        phone: norm,
        customerName: cust?.fullName,
        hasDuplicateActiveOrders: isThisOrderActive && activeDuplicates.length > 0,
        activeDuplicateOrders: activeDuplicates,
        hasPreviousDeliveredOrder: isThisOrderActive && previousDelivered.length > 0,
        previousDeliveredOrders: previousDelivered,
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
      await OrderService.updateOrderStatus(
        targetOrder.id,
        targetNewStatus,
        user,
        statusRemark.trim() || undefined,
        damagedItems
      );
      toast.success(`Order #${targetOrder.orderNumber} status changed to ${targetNewStatus}`);
      await loadData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Status transition failed.');
      return false;
    }
  };

  const updateOrderRemark = async (remarkOrder: Order, remarkText: string) => {
    if (!user) return false;
    try {
      await OrderService.updateOrderRemark(remarkOrder.id, remarkText.trim(), user);
      toast.success(`Remark updated for Order #${remarkOrder.orderNumber}`);
      await loadData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update remark.');
      return false;
    }
  };

  const bulkUpdateOrderStatus = async (
    selectedOrderIds: string[],
    bulkTargetStatus: OrderStatus
  ) => {
    if (!user || selectedOrderIds.length === 0) return false;
    try {
      const count = await OrderService.bulkUpdateOrderStatus(
        selectedOrderIds,
        bulkTargetStatus,
        user
      );
      toast.success(`Updated status of ${count} selected order(s) to ${bulkTargetStatus}`);
      await loadData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Bulk status update failed.');
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
