import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Order, Customer, User } from '../models/domain';
import { format } from 'date-fns';
import { toColomboDateString } from '../utils/deliveryDateUtils';

const toDateString = (val?: string | null): string => {
  return toColomboDateString(val);
};

export function useOrderFilters(
  orders: Order[],
  customersMap: Record<string, Customer>,
  membersMap: Record<string, User>,
  isServerFiltered = false
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
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const p = Number(searchParams.get('page'));
    return Number.isInteger(p) && p >= 1 ? p : 1;
  });

  // 300ms input debounce for search to prevent per-keystroke API flooding
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 whenever search, status, member, or date changes
  const prevFilterState = useRef(`${selectedDate}|${statusFilter}|${selectedMemberId}|${debouncedSearch}`);
  useEffect(() => {
    const currentState = `${selectedDate}|${statusFilter}|${selectedMemberId}|${debouncedSearch}`;
    if (prevFilterState.current !== currentState) {
      prevFilterState.current = currentState;
      setCurrentPage(1);
    }
  }, [selectedDate, statusFilter, selectedMemberId, debouncedSearch]);

  // Keep URL parameters synchronized with active filter and page state without navigation loops
  const lastSyncedQuery = useRef<string>('');
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedDate) params.set('date', selectedDate);
    if (statusFilter !== 'DISPATCHED') params.set('status', statusFilter);
    if (selectedMemberId !== 'ALL') params.set('member', selectedMemberId);
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (currentPage > 1) params.set('page', String(currentPage));

    const newQuery = params.toString();
    const currentParams = new URLSearchParams(window.location.search);

    let isDifferent = false;
    for (const [key, val] of params.entries()) {
      if (currentParams.get(key) !== val) {
        isDifferent = true;
        break;
      }
    }
    if (!isDifferent) {
      for (const [key] of currentParams.entries()) {
        if (!params.has(key)) {
          isDifferent = true;
          break;
        }
      }
    }

    if (isDifferent && lastSyncedQuery.current !== newQuery) {
      lastSyncedQuery.current = newQuery;
      setSearchParams(params, { replace: true });
    }
  }, [selectedDate, statusFilter, selectedMemberId, debouncedSearch, currentPage, setSearchParams]);

  // Date Filtered Dataset (for local fallback / counting)
  const dateFilteredOrders = useMemo(() => {
    if (isServerFiltered || !selectedDate || selectedDate === 'ALL') return orders;
    return orders.filter((order) => {
      if (order.status === 'DELIVERED') {
        const delivDate = toDateString(order.deliveredAt || order.createdAt);
        return delivDate === selectedDate;
      }
      if (order.status === 'REJECTED') {
        const rejDate = toDateString(order.rejectedAt || order.createdAt);
        return rejDate === selectedDate;
      }
      const createdDate = toDateString(order.createdAt);
      if (createdDate === selectedDate) return true;
      const updatedDate = order.updatedAt ? toDateString(order.updatedAt) : createdDate;
      return updatedDate === selectedDate;
    });
  }, [orders, selectedDate, isServerFiltered]);

  // Dynamic counts based on date scope
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
    // If the backend already paginated and filtered the active dataset, return it directly
    if (isServerFiltered) {
      return orders;
    }

    const q = debouncedSearch.trim().toLowerCase();
    const cleanQuery = q.replace(/\D/g, '');
    const hasSearch = q.length > 0;
    const isAllMember = selectedMemberId === 'ALL';

    const list = dateFilteredOrders.filter((order) => {
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

      const customer = customersMap[order.customerId] || order.customer;
      const member = membersMap[order.teamMemberId] || (order as any).teamMember;

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
        Boolean(order.orderNumber && order.orderNumber.toLowerCase().includes(q)) ||
        Boolean(order.itemsDescription && order.itemsDescription.toLowerCase().includes(q)) ||
        Boolean(order.totalAmount !== undefined && order.totalAmount !== null && order.totalAmount.toString().includes(q)) ||
        Boolean(order.remarks && order.remarks.toLowerCase().includes(q)) ||
        Boolean(customer && customer.fullName && customer.fullName.toLowerCase().includes(q)) ||
        Boolean(customer && matchesPhone(customer.phone)) ||
        Boolean(customer && customer.address && customer.address.toLowerCase().includes(q)) ||
        Boolean(customer && customer.email && customer.email.toLowerCase().includes(q)) ||
        Boolean(member && member.fullName && member.fullName.toLowerCase().includes(q)) ||
        Boolean(member && member.username && member.username.toLowerCase().includes(q))
      );
    });

    if (statusFilter === 'DELIVERED') {
      return [...list].sort((a, b) => {
        const timeA = a.deliveredAt ? new Date(a.deliveredAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.deliveredAt ? new Date(b.deliveredAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    }

    if (statusFilter === 'REJECTED') {
      return [...list].sort((a, b) => {
        const timeA = a.rejectedAt ? new Date(a.rejectedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.rejectedAt ? new Date(b.rejectedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    }

    return list;
  }, [dateFilteredOrders, orders, customersMap, membersMap, statusFilter, selectedMemberId, debouncedSearch, isServerFiltered]);

  const resetFilters = useCallback(() => {
    setSelectedDate('');
    setSelectedMemberId('ALL');
    setSearch('');
    setStatusFilter('ALL');
    setCurrentPage(1);
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
    debouncedSearch,
    currentPage,
    setCurrentPage,
    dateFilteredOrders,
    filteredOrders,
    dispatchedCount,
    deliveredCount,
    rejectedCount,
    resetFilters,
  };
}
