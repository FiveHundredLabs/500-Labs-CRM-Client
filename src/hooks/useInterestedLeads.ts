import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Customer, User, Order, Contact } from '../models/domain';
import { customerRepository, userRepository, orderRepository, contactRepository } from '../repositories';
import { LeadService } from '../services/leadService';
import toast from 'react-hot-toast';

export function useInterestedLeads() {
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, User>>({});
  const [ordersMap, setOrdersMap] = useState<Record<string, Order[]>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user || !user.teamId) return;
    setLoading(true);
    try {
      const [cList, contactList, teamUsers, oList] = await Promise.all([
        customerRepository.getByTeamId(user.teamId),
        contactRepository.getByTeamId(user.teamId),
        userRepository.getByTeamId(user.teamId),
        orderRepository.getByTeamId(user.teamId),
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

      setCustomers(interestedOnlyCustomers);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

  return {
    user,
    customers,
    teamMembers,
    membersMap,
    ordersMap,
    loading,
    loadData,
    dispatchInterestedLeads,
  };
}
