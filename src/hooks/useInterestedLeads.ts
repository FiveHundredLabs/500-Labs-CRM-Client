import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Customer, User, Order, Contact } from '../models/domain';
import { customerRepository, userRepository, orderRepository, contactRepository } from '../repositories';
import { LeadService } from '../services/leadService';
import { normalizeSriLankanPhone } from '../utils/phoneUtils';
import type { DuplicateOrderConflictInfo } from '../components/orders/DuplicateOrderConflictDialog';
import toast from 'react-hot-toast';

export function useInterestedLeads(overrideTeamId?: string) {
  const { user } = useAuth();
  const effectiveTeamId = overrideTeamId || user?.teamId || 'team_001';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, User>>({});
  const [ordersMap, setOrdersMap] = useState<Record<string, Order[]>>({});
  const [allCustomersMap, setAllCustomersMap] = useState<Record<string, Customer>>({});
  const [interestedConflictMap, setInterestedConflictMap] = useState<Record<string, DuplicateOrderConflictInfo>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cList, contactList, teamUsers, oList, allOrders, allCusts] = await Promise.all([
        customerRepository.getByTeamId(effectiveTeamId),
        contactRepository.getByTeamId(effectiveTeamId),
        userRepository.getByTeamId(effectiveTeamId),
        orderRepository.getByTeamId(effectiveTeamId),
        orderRepository.getAll ? orderRepository.getAll() : orderRepository.getByTeamId(effectiveTeamId),
        customerRepository.getAll ? customerRepository.getAll() : customerRepository.getByTeamId(effectiveTeamId),
      ]);

      const cntMap: Record<string, Contact> = {};
      contactList.forEach((cnt) => (cntMap[cnt.id] = cnt));

      const ordMap: Record<string, Order[]> = {};
      oList.forEach((o) => {
        if (!ordMap[o.customerId]) ordMap[o.customerId] = [];
        ordMap[o.customerId].push(o);
      });
      setOrdersMap(ordMap);

      const membersOnly = teamUsers.filter((u) => u.role === 'TEAM_MEMBER');
      setTeamMembers(membersOnly);

      const uMap: Record<string, User> = {};
      teamUsers.forEach((u) => (uMap[u.id] = u));
      setMembersMap(uMap);

      const globalCustMap: Record<string, Customer> = {};
      allCusts.forEach((c) => (globalCustMap[c.id] = c));
      cList.forEach((c) => (globalCustMap[c.id] = c));
      setAllCustomersMap(globalCustMap);

      // Filter ONLY customers with status = INTERESTED
      const interestedOnlyCustomers = cList.filter((cust) => {
        const cnt = cntMap[cust.contactId];
        const custOrders = ordMap[cust.id] || [];
        const latestOrder = custOrders[custOrders.length - 1];

        // Contact status must be INTERESTED (if contact record exists)
        const isContactInterested = !cnt || cnt.status === 'INTERESTED';

        // Order status must NOT be DISPATCHED, DELIVERED, REJECTED, or RETURNED
        const isOrderFinishedOrDispatched =
          latestOrder &&
          (latestOrder.status === 'DISPATCHED' ||
            latestOrder.status === 'DELIVERED' ||
            latestOrder.status === 'REJECTED' ||
            latestOrder.status === 'RETURNED');

        return isContactInterested && !isOrderFinishedOrDispatched;
      });

      // ── Build phone-to-orders index for early duplicate & conflict detection ──
      const phoneToOrdersMap: Record<string, Order[]> = {};
      allOrders.forEach((ord) => {
        const c = globalCustMap[ord.customerId] || (ord as any).customer;
        if (c?.phone) {
          const norm = normalizeSriLankanPhone(c.phone) || c.phone.trim();
          if (!phoneToOrdersMap[norm]) {
            phoneToOrdersMap[norm] = [];
          }
          phoneToOrdersMap[norm].push(ord);
        }
      });

      // Map normalized phone to all interested leads
      const phoneToInterestedLeadsMap: Record<string, Customer[]> = {};
      interestedOnlyCustomers.forEach((cust) => {
        const norm = normalizeSriLankanPhone(cust.phone) || cust.phone.trim();
        if (!phoneToInterestedLeadsMap[norm]) {
          phoneToInterestedLeadsMap[norm] = [];
        }
        phoneToInterestedLeadsMap[norm].push(cust);
      });

      const conflictMap: Record<string, DuplicateOrderConflictInfo> = {};
      interestedOnlyCustomers.forEach((cust) => {
        const norm = normalizeSriLankanPhone(cust.phone) || cust.phone.trim();
        const ordersForPhone = phoneToOrdersMap[norm] || [];
        const samePhoneInterested = phoneToInterestedLeadsMap[norm] || [];

        // Active orders for this phone
        const activeOrders = ordersForPhone.filter((o) =>
          ['DRAFT', 'PREPARED', 'DISPATCHED'].includes(o.status)
        );

        // Orders belonging to other customers/reps with same phone
        const foreignOrders = ordersForPhone.filter(
          (o) => o.customerId !== cust.id || o.teamMemberId !== cust.responsibleTeamMemberId
        );
        const foreignActiveOrders = foreignOrders.filter((o) =>
          ['DRAFT', 'PREPARED', 'DISPATCHED'].includes(o.status)
        );

        // True duplicate scenario:
        // 1. Multiple interested leads sharing this phone number (>= 2)
        // 2. OR Multiple active orders on this phone (>= 2)
        // 3. OR Active order exists on this phone belonging to another rep/customer
        const hasDuplicateInterestedOrActive =
          samePhoneInterested.length >= 2 ||
          activeOrders.length >= 2 ||
          foreignActiveOrders.length > 0;

        // Previous delivered orders on this phone
        const deliveredOrders = ordersForPhone.filter((o) => o.status === 'DELIVERED');
        const hasPreviousDelivered = deliveredOrders.length > 0;

        // Previous rejected orders on this phone
        const rejectedOrders = ordersForPhone.filter((o) => o.status === 'REJECTED');
        const hasPreviousRejected = rejectedOrders.length > 0;

        if (hasDuplicateInterestedOrActive || hasPreviousDelivered || hasPreviousRejected) {
          conflictMap[cust.id] = {
            phone: norm,
            customerName: cust.fullName,
            hasDuplicateActiveOrders: hasDuplicateInterestedOrActive,
            activeDuplicateOrders: activeOrders,
            hasPreviousDeliveredOrder: hasPreviousDelivered,
            previousDeliveredOrders: deliveredOrders,
            hasPreviousRejectedOrder: hasPreviousRejected,
            previousRejectedOrders: rejectedOrders,
            allOrdersForPhone: ordersForPhone,
          };
        }
      });

      setInterestedConflictMap(conflictMap);
      setCustomers(interestedOnlyCustomers);
    } finally {
      setLoading(false);
    }
  }, [user, effectiveTeamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dispatchInterestedLeads = async (selectedIds: string[]) => {
    if (!user || selectedIds.length === 0) return false;
    try {
      const count = await LeadService.dispatchInterestedLeads(selectedIds, user);
      toast.success(`${count} lead${count === 1 ? '' : 's'} marked as Dispatched.`);
      await loadData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch leads.');
      return false;
    }
  };

  const cancelInterestedLead = async (customerId: string, reason: string = 'Duplicate review') => {
    if (!user) return false;
    try {
      const success = await LeadService.cancelInterestedLead(customerId, reason, user);
      if (success) {
        toast.success('Interested lead / order cancelled.');
        await loadData();
      }
      return success;
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel lead.');
      return false;
    }
  };

  return {
    user,
    effectiveTeamId,
    customers,
    teamMembers,
    membersMap,
    ordersMap,
    allCustomersMap,
    interestedConflictMap,
    loading,
    loadData,
    dispatchInterestedLeads,
    cancelInterestedLead,
  };
}
