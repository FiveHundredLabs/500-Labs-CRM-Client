import { useState, useMemo, useCallback } from 'react';
import type { Order, Customer, User } from '../models/domain';
import { format } from 'date-fns';

const toDateString = (val?: string | null): string => {
  if (!val) return '';
  if (val.length >= 10 && val[4] === '-' && val[7] === '-') {
    return val.slice(0, 10);
  }
  try {
    return format(new Date(val), 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

export function useOrderFilters(
  orders: Order[],
  customersMap: Record<string, Customer>,
  membersMap: Record<string, User>
) {
  const [selectedDate, setSelectedDate] = useState<string>(''); // '' represents "All Dates"
  const [statusFilter, setStatusFilter] = useState<'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'ALL'>('DISPATCHED');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Global Date Filtered Dataset
  const dateFilteredOrders = useMemo(() => {
    if (!selectedDate || selectedDate === 'ALL') return orders;
    return orders.filter((order) => {
      const createdDate = toDateString(order.createdAt);
      if (createdDate === selectedDate) return true;
      const updatedDate = order.updatedAt ? toDateString(order.updatedAt) : createdDate;
      return updatedDate === selectedDate;
    });
  }, [orders, selectedDate]);

  // Dynamic counts based on date scope in a single pass
  const { dispatchedCount, deliveredCount, rejectedCount } = useMemo(() => {
    let dispatched = 0;
    let delivered = 0;
    let rejected = 0;
    for (let i = 0; i < dateFilteredOrders.length; i++) {
      const status = dateFilteredOrders[i].status;
      if (status === 'DISPATCHED') dispatched++;
      else if (status === 'DELIVERED') delivered++;
      else if (status === 'REJECTED') rejected++;
    }
    return { dispatchedCount: dispatched, deliveredCount: delivered, rejectedCount: rejected };
  }, [dateFilteredOrders]);

  // Combined filtered orders (Date + Status + Team Member + Search)
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cleanQuery = q.replace(/\D/g, '');
    const hasSearch = q.length > 0;
    const isAllMember = selectedMemberId === 'ALL';

    return dateFilteredOrders.filter((order) => {
      if (statusFilter !== 'ALL') {
        if (order.status !== statusFilter) return false;
      } else {
        if (
          order.status !== 'DISPATCHED' &&
          order.status !== 'DELIVERED' &&
          order.status !== 'REJECTED'
        ) {
          return false;
        }
      }

      if (!isAllMember && order.teamMemberId !== selectedMemberId) {
        return false;
      }

      if (!hasSearch) {
        return true;
      }

      const customer = customersMap[order.customerId];
      const member = membersMap[order.teamMemberId];

      const matchesPhone = (customerPhone?: string): boolean => {
        if (!customerPhone) return false;
        if (customerPhone.includes(q)) return true;
        if (cleanQuery.length > 2) {
          const cleanPhone = customerPhone.replace(/\D/g, '');
          return cleanPhone.includes(cleanQuery);
        }
        return false;
      };

      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.itemsDescription.toLowerCase().includes(q) ||
        order.totalAmount.toString().includes(q) ||
        (order.remarks && order.remarks.toLowerCase().includes(q)) ||
        (customer && customer.fullName.toLowerCase().includes(q)) ||
        (customer && matchesPhone(customer.phone)) ||
        (customer && customer.address.toLowerCase().includes(q)) ||
        (customer && customer.email && customer.email.toLowerCase().includes(q)) ||
        (member && member.fullName.toLowerCase().includes(q)) ||
        (member && member.username.toLowerCase().includes(q))
      );
    });
  }, [dateFilteredOrders, customersMap, membersMap, statusFilter, selectedMemberId, search]);

  const resetFilters = useCallback(() => {
    setSelectedDate('');
    setSelectedMemberId('ALL');
    setSearch('');
    setStatusFilter('ALL');
  }, []);

  return {
    selectedDate,
    setSelectedDate,
    statusFilter,
    setStatusFilter,
    selectedMemberId,
    setSelectedMemberId,
    search,
    setSearch,
    dateFilteredOrders,
    filteredOrders,
    dispatchedCount,
    deliveredCount,
    rejectedCount,
    resetFilters,
  };
}
