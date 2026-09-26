import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import type { Customer, User, Order, Contact } from '../models/domain';
import { customerRepository, userRepository, orderRepository, contactRepository } from '../repositories';
import { LeadService } from '../services/leadService';
import { normalizeSriLankanPhone } from '../utils/phoneUtils';
import type { DuplicateOrderConflictInfo } from '../components/orders/DuplicateOrderConflictDialog';
import { CACHE_TIERS, queryKeys } from '../lib/queryClient';
import toast from 'react-hot-toast';

export function useInterestedLeads(overrideTeamId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveTeamId = overrideTeamId || user?.teamId || '';

  const {
    data: bundleData,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['interested-leads-bundle', effectiveTeamId],
    queryFn: async () => {
      if (!effectiveTeamId) {
        return {
          cList: [] as Customer[],
          contactList: [] as Contact[],
          teamUsers: [] as User[],
          oList: [] as Order[],
          conflicts: {} as Record<string, DuplicateOrderConflictInfo>,
        };
      }
      const [cList, contactList, teamUsers, oList] = await Promise.all([
        customerRepository.getByTeamId(effectiveTeamId),
        contactRepository.getByTeamId(effectiveTeamId),
        userRepository.getByTeamId(effectiveTeamId),
        orderRepository.getByTeamId(effectiveTeamId),
      ]);

      const custIds = cList.map((c) => c.id);
      let conflicts: Record<string, DuplicateOrderConflictInfo> = {};
      if (custIds.length > 0 && orderRepository.checkConflicts) {
        try {
          conflicts = await orderRepository.checkConflicts({
            customerIds: custIds,
            teamId: effectiveTeamId,
          });
        } catch (e) {
          console.error('Failed to check order conflicts:', e);
        }
      }

      return { cList, contactList, teamUsers, oList, conflicts };
    },
    enabled: Boolean(user && effectiveTeamId),
    staleTime: CACHE_TIERS.WARM,
  });

  const loadData = useCallback(async (_silent?: boolean) => {
    await refetch();
  }, [refetch]);

  // Optimized O(N) derived calculations with useMemo
  const processedData = useMemo(() => {
    if (!bundleData) {
      return {
        customers: [] as Customer[],
        teamMembers: [] as User[],
        membersMap: {} as Record<string, User>,
        ordersMap: {} as Record<string, Order[]>,
        allCustomersMap: {} as Record<string, Customer>,
        interestedConflictMap: {} as Record<string, DuplicateOrderConflictInfo>,
      };
    }

    const { cList, contactList, teamUsers, oList, conflicts } = bundleData;

    const cntMap: Record<string, Contact> = {};
    contactList.forEach((cnt) => (cntMap[cnt.id] = cnt));

    // Sort orders descending by createdAt (guarantee index 0 is always newest)
    const sortedOList = [...oList].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const globalCustMap: Record<string, Customer> = {};
    cList.forEach((c) => (globalCustMap[c.id] = c));
    Object.values(conflicts).forEach((info) => {
      info.allOrdersForPhone?.forEach((o: any) => {
        if (o.customer && !globalCustMap[o.customerId]) {
          globalCustMap[o.customerId] = o.customer;
        }
      });
    });

    const ordMap: Record<string, Order[]> = {};
    sortedOList.forEach((o) => {
      if (!ordMap[o.customerId]) ordMap[o.customerId] = [];
      ordMap[o.customerId].push(o);
    });

    // Ensure each customer's primary order is the active PREPARED order and attach orderHistory
    Object.keys(ordMap).forEach((custId) => {
      const custOrders = ordMap[custId];
      const primaryOrder = custOrders.find((o) => o.status === 'PREPARED') || custOrders[0];
      if (primaryOrder) {
        const conflictInfo = conflicts[custId];
        const phoneOrders = conflictInfo?.allOrdersForPhone || custOrders;
        // Order history contains strictly previous/completed/dispatched/delivered/cancelled orders
        const historyOrders = phoneOrders.filter((o) =>
          o.id !== primaryOrder.id &&
          ['DISPATCHED', 'DELIVERED', 'REJECTED', 'CANCELLED', 'RETURNED'].includes(o.status)
        );
        primaryOrder.orderHistory = historyOrders;
        primaryOrder.hasPreviousOrders = historyOrders.length > 0;
        primaryOrder.previousOrdersCount = historyOrders.length;

        // Place primaryOrder first
        ordMap[custId] = [primaryOrder, ...custOrders.filter((o) => o.id !== primaryOrder.id)];
      }
    });

    const membersOnly = teamUsers.filter((u) => u.role === 'TEAM_MEMBER');
    const uMap: Record<string, User> = {};
    teamUsers.forEach((u) => (uMap[u.id] = u));

    // Filter ONLY customers that currently have an active PREPARED order or contact is INTERESTED
    const interestedOnlyCustomers = cList.filter((cust) => {
      const cnt = cntMap[cust.contactId];
      const custOrders = ordMap[cust.id] || [];
      const latestOrder = custOrders[0];
      const hasActivePrepared = custOrders.some((o) => o.status === 'PREPARED');

      const isLeadInterested = hasActivePrepared || !cnt || cnt.status === 'INTERESTED' || latestOrder?.status === 'PREPARED';

      const isLatestOrderFinished =
        latestOrder &&
        !hasActivePrepared &&
        (latestOrder.status === 'DISPATCHED' ||
          latestOrder.status === 'DELIVERED' ||
          latestOrder.status === 'REJECTED' ||
          latestOrder.status === 'CANCELLED' ||
          latestOrder.status === 'RETURNED');

      return isLeadInterested && !isLatestOrderFinished;
    });

    // Map normalized phone to all interested leads within current batch
    const phoneToInterestedLeadsMap: Record<string, Customer[]> = {};
    interestedOnlyCustomers.forEach((cust) => {
      const norm = normalizeSriLankanPhone(cust.phone) || cust.phone.trim();
      if (!phoneToInterestedLeadsMap[norm]) {
        phoneToInterestedLeadsMap[norm] = [];
      }
      phoneToInterestedLeadsMap[norm].push(cust);
    });

    const finalConflictMap: Record<string, DuplicateOrderConflictInfo> = {};
    interestedOnlyCustomers.forEach((cust) => {
      const norm = normalizeSriLankanPhone(cust.phone) || cust.phone.trim();
      const serverConflict = conflicts[cust.id] || (norm ? conflicts[norm] : undefined);
      const samePhoneInterested = phoneToInterestedLeadsMap[norm] || [];

      if (serverConflict) {
        finalConflictMap[cust.id] = {
          ...serverConflict,
          hasDuplicateActiveOrders:
            serverConflict.hasDuplicateActiveOrders || samePhoneInterested.length >= 2,
        };
      } else if (samePhoneInterested.length >= 2) {
        finalConflictMap[cust.id] = {
          phone: norm,
          customerName: cust.fullName,
          hasDuplicateActiveOrders: true,
          activeDuplicateOrders: [],
          hasPreviousDeliveredOrder: false,
          previousDeliveredOrders: [],
          hasPreviousRejectedOrder: false,
          previousRejectedOrders: [],
          allOrdersForPhone: [],
        };
      }
    });

    return {
      customers: interestedOnlyCustomers,
      teamMembers: membersOnly,
      membersMap: uMap,
      ordersMap: ordMap,
      allCustomersMap: globalCustMap,
      interestedConflictMap: finalConflictMap,
    };
  }, [bundleData]);

  const dispatchInterestedLeads = async (selectedIds: string[]) => {
    if (!user || selectedIds.length === 0) return false;
    try {
      const count = await LeadService.dispatchInterestedLeads(selectedIds, user);
      toast.success(`${count} lead${count === 1 ? '' : 's'} marked as Dispatched.`);
      queryClient.invalidateQueries({ queryKey: ['interested-leads-bundle'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch leads.');
      return false;
    }
  };

  const cancelInterestedLead = async (
    customerId: string,
    reason: string = 'Duplicate review',
    specificOrderId?: string
  ) => {
    if (!user) return false;
    try {
      const success = await LeadService.cancelInterestedLead(customerId, reason, user, specificOrderId);
      if (success) {
        toast.success(specificOrderId ? 'Duplicate order cancelled.' : 'Interested lead / order cancelled.');
        queryClient.invalidateQueries({ queryKey: ['interested-leads-bundle'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      }
      return success;
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel lead.');
      return false;
    }
  };

  const updateDeliveryCharge = async (orderId: string, codCharge: number, remarks?: string) => {
    try {
      const updated = await orderRepository.updateDeliveryCharge(orderId, codCharge, remarks);
      toast.success('Delivery charge updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['interested-leads-bundle'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update delivery charge.');
      throw err;
    }
  };

  const bulkUpdateDeliveryCharge = async (
    updates: { orderId: string; codCharge: number; remarks?: string }[],
    commonRemarks?: string
  ) => {
    try {
      const res = await orderRepository.bulkUpdateDeliveryCharge({ updates, commonRemarks });
      toast.success(`Successfully updated delivery charges for ${res.count} orders!`);
      queryClient.invalidateQueries({ queryKey: ['interested-leads-bundle'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      return res;
    } catch (err: any) {
      toast.error(err.message || 'Failed to bulk update delivery charges.');
      throw err;
    }
  };

  return {
    user,
    effectiveTeamId,
    customers: processedData.customers,
    teamMembers: processedData.teamMembers,
    membersMap: processedData.membersMap,
    ordersMap: processedData.ordersMap,
    allCustomersMap: processedData.allCustomersMap,
    interestedConflictMap: processedData.interestedConflictMap,
    loading,
    loadData,
    dispatchInterestedLeads,
    cancelInterestedLead,
    updateDeliveryCharge,
    bulkUpdateDeliveryCharge,
  };
}
