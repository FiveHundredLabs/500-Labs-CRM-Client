import { useState, useMemo } from 'react';
import type { Order, Customer, User } from '../models/domain';
import { format } from 'date-fns';

export function useOrderFilters(
  orders: Order[],
  customersMap: Record<string, Customer>,
  membersMap: Record<string, User>
) {
  const [selectedDate, setSelectedDate] = useState<string>(''); // '' represents "All Dates"
  const [statusFilter, setStatusFilter] = useState<'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'ALL'>('DISPATCHED');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Phone matching helper
  const matchesPhone = (customerPhone: string | undefined, query: string): boolean => {
    if (!customerPhone) return false;
    if (customerPhone.includes(query)) return true;
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const cleanQuery = query.replace(/\D/g, '');
    return cleanQuery.length > 2 && cleanPhone.includes(cleanQuery);
  };

  // Date Filter Logic
  const matchesDate = (order: Order): boolean => {
    if (!selectedDate || selectedDate === 'ALL') return true;
    const createdDate = format(new Date(order.createdAt), 'yyyy-MM-dd');
    const updatedDate = order.updatedAt
      ? format(new Date(order.updatedAt), 'yyyy-MM-dd')
      : createdDate;
    return createdDate === selectedDate || updatedDate === selectedDate;
  };

  // Global Date Filtered Dataset
  const dateFilteredOrders = useMemo(() => {
    return orders.filter(matchesDate);
  }, [orders, selectedDate]);

  // Dynamic counts based on date scope
  const dispatchedCount = useMemo(() => {
    return dateFilteredOrders.filter((o) => o.status === 'DISPATCHED').length;
  }, [dateFilteredOrders]);

  const deliveredCount = useMemo(() => {
    return dateFilteredOrders.filter((o) => o.status === 'DELIVERED').length;
  }, [dateFilteredOrders]);

  const rejectedCount = useMemo(() => {
    return dateFilteredOrders.filter((o) => o.status === 'REJECTED').length;
  }, [dateFilteredOrders]);

  // Combined filtered orders (Date + Status + Team Member + Search)
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter((order) => {
      const customer = customersMap[order.customerId];
      const member = membersMap[order.teamMemberId];

      const matchesStatus =
        statusFilter === 'ALL'
          ? order.status === 'DISPATCHED' || order.status === 'DELIVERED' || order.status === 'REJECTED'
          : order.status === statusFilter;

      const matchesMember =
        selectedMemberId === 'ALL' || order.teamMemberId === selectedMemberId;

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.itemsDescription.toLowerCase().includes(q) ||
        order.totalAmount.toString().includes(q) ||
        (order.remarks && order.remarks.toLowerCase().includes(q)) ||
        (customer && customer.fullName.toLowerCase().includes(q)) ||
        (customer && matchesPhone(customer.phone, q)) ||
        (customer && customer.address.toLowerCase().includes(q)) ||
        (customer && customer.email && customer.email.toLowerCase().includes(q)) ||
        (member && member.fullName.toLowerCase().includes(q)) ||
        (member && member.username.toLowerCase().includes(q));

      return matchesStatus && matchesMember && matchesSearch;
    });
  }, [dateFilteredOrders, customersMap, membersMap, statusFilter, selectedMemberId, search]);

  const resetFilters = () => {
    setSelectedDate('');
    setSelectedMemberId('ALL');
    setSearch('');
    setStatusFilter('ALL');
  };

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
