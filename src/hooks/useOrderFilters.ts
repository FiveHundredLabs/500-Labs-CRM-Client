import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState<string>(() => searchParams.get('date') || '');
  const [statusFilter, setStatusFilter] = useState<'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'ALL'>(() => {
    const s = searchParams.get('status');
    if (s === 'DISPATCHED' || s === 'DELIVERED' || s === 'REJECTED' || s === 'ALL') {
      return s;
    }
    return 'DISPATCHED';
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => searchParams.get('member') || 'ALL');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') || '');

  // 250ms input debounce for search to prevent re-filtering jank
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Keep URL parameters synchronized with active filter state
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedDate) params.set('date', selectedDate);
    if (statusFilter !== 'DISPATCHED') params.set('status', statusFilter);
    if (selectedMemberId !== 'ALL') params.set('member', selectedMemberId);
    if (debouncedSearch) params.set('q', debouncedSearch);

    // Only update if search params actually changed
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedDate, statusFilter, selectedMemberId, debouncedSearch, searchParams, setSearchParams]);

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

  // Combined filtered orders (Date + Status + Team Member + Debounced Search)
  const filteredOrders = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
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
  }, [dateFilteredOrders, customersMap, membersMap, statusFilter, selectedMemberId, debouncedSearch]);

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
