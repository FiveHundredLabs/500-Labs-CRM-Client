import React, { useState, useEffect, useMemo } from 'react';
import type { User, Contact, CallLog, Order, ActivityLog, ContactStatus } from '../../../models/domain';
import { callLogRepository, orderRepository, contactRepository, activityLogRepository } from '../../../repositories';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { StatCard } from '../../shared/StatCard';
import { StatusBadge } from '../../shared/StatusBadge';
import { ActivityTimeline } from '../../shared/ActivityTimeline';
import { LoadingState } from '../../shared/LoadingState';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Dialog } from '../../ui/Dialog';
import { DollarSign, CheckCircle2, XCircle, PhoneCall, Sparkles, Truck, Calendar, Filter, Clock, Package, Eye, MapPin, User as UserIcon, Phone } from 'lucide-react';
import { formatCurrency } from '../../../utils/currency';
import { getProductSalesValue, getAmountToCollect } from '../../../utils/orderAmounts';

export interface TeamMemberDetailedViewProps {
  member: User;
  onClose: () => void;
}

export type PerformanceDateFilter = 'WEEKLY' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';
export type ActivityDateFilter = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export const TeamMemberDetailedView: React.FC<TeamMemberDetailedViewProps> = ({ member, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedCallDetails, setSelectedCallDetails] = useState<CallLog | null>(null);

  // Performance & Calls Table Date Filter
  const [perfDateFilter, setPerfDateFilter] = useState<PerformanceDateFilter>('THIS_MONTH');
  const [perfStartDate, setPerfStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [perfEndDate, setPerfEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Calls Table Status Filter
  const [callStatusFilter, setCallStatusFilter] = useState<string>('ALL');

  // Activity Logs Date Filter
  const [actDateFilter, setActDateFilter] = useState<ActivityDateFilter>('THIS_MONTH');
  const [actStartDate, setActStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [actEndDate, setActEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const loadMemberData = async () => {
      setLoading(true);
      try {
        const [cLogs, mOrders, mContacts, aLogs] = await Promise.all([
          callLogRepository.getByMemberId(member.id),
          orderRepository.getByMemberId(member.id),
          contactRepository.getByMemberId(member.id),
          activityLogRepository.getRecentWithinMonth(member.id),
        ]);

        setCallLogs(cLogs);
        setOrders(mOrders);
        setContacts(mContacts);
        setActivityLogs(aLogs);
      } finally {
        setLoading(false);
      }
    };

    loadMemberData();
  }, [member.id]);

  // Date Filtering Helper
  const isDateInPerformanceRange = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();

    if (perfDateFilter === 'WEEKLY') {
      return isWithinInterval(date, { start: startOfWeek(now), end: endOfWeek(now) });
    }
    if (perfDateFilter === 'THIS_MONTH') {
      return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
    }
    if (perfDateFilter === 'LAST_MONTH') {
      const lastMonth = subMonths(now, 1);
      return isWithinInterval(date, { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
    }
    if (perfDateFilter === 'CUSTOM') {
      const start = new Date(perfStartDate);
      const end = new Date(perfEndDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return true;
  };

  // Performance Metrics Calculation
  const performanceData = useMemo(() => {
    const scopedOrders = orders.filter((o) => isDateInPerformanceRange(o.createdAt));
    const scopedContacts = contacts.filter((c) => isDateInPerformanceRange(c.importedAt || c.updatedAt));
    const scopedCallLogs = callLogs.filter((cl) => isDateInPerformanceRange(cl.calledAt));

    const deliveredOrders = scopedOrders.filter((o) => o.status === 'DELIVERED');
    const rejectedOrders = scopedOrders.filter((o) => o.status === 'REJECTED' || o.status === 'RETURNED');
    const dispatchedOrders = scopedOrders.filter((o) => o.status === 'DISPATCHED');

    const totalSalesAmount = deliveredOrders.reduce((sum, o) => sum + getProductSalesValue(o), 0);
    const interestedCount = scopedCallLogs.filter((cl) => cl.status === 'INTERESTED').length;
    const totalNumbersAdded = scopedContacts.filter((c) => c.addedBy === member.id || c.isSelfAdded).length || scopedContacts.length;

    return {
      salesAmount: totalSalesAmount,
      deliveredCount: deliveredOrders.length,
      rejectedCount: rejectedOrders.length,
      numbersAddedCount: totalNumbersAdded,
      interestedCount: interestedCount,
      dispatchedCount: dispatchedOrders.length,
    };
  }, [orders, contacts, callLogs, perfDateFilter, perfStartDate, perfEndDate, member.id]);

  // Lookup map for fast contact phone resolution
  const contactsMap = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => {
      map.set(c.id, c.phone);
    });
    return map;
  }, [contacts]);

  const normalizePhone = (p?: string | null) => {
    if (!p) return '';
    const digits = p.replace(/\D/g, '');
    return digits.length >= 9 ? digits.slice(-9) : digits;
  };

  // Lookup map for orders by contactId and customer phone
  const ordersByContactId = useMemo(() => {
    const map = new Map<string, Order>();
    orders.forEach((o) => {
      const cid = o.customer?.contactId;
      if (cid && !map.has(cid)) map.set(cid, o);
    });
    return map;
  }, [orders]);

  const ordersByPhone = useMemo(() => {
    const map = new Map<string, Order>();
    orders.forEach((o) => {
      const p = o.customer?.phone;
      if (p) {
        if (!map.has(p)) map.set(p, o);
        const norm = normalizePhone(p);
        if (norm && !map.has(norm)) map.set(norm, o);
      }
      const s = o.customer?.secondaryMobile;
      if (s) {
        if (!map.has(s)) map.set(s, o);
        const normS = normalizePhone(s);
        if (normS && !map.has(normS)) map.set(normS, o);
      }
    });
    return map;
  }, [orders]);

  // Filtered Calls Table Data
  const filteredCallLogs = useMemo(() => {
    return callLogs.filter((cl) => {
      const matchesDate = isDateInPerformanceRange(cl.calledAt);
      const matchesStatus = callStatusFilter === 'ALL' || cl.status === callStatusFilter;
      return matchesDate && matchesStatus;
    });
  }, [callLogs, perfDateFilter, perfStartDate, perfEndDate, callStatusFilter]);

  // Filtered Activity Logs Data (Enforcing 1-month retention)
  const filteredActivityLogs = useMemo(() => {
    const oneMonthAgo = subDays(new Date(), 30).getTime();
    const now = new Date();

    return activityLogs.filter((log) => {
      const logTime = new Date(log.createdAt).getTime();
      if (logTime < oneMonthAgo) return false; // Hard 1-month retention limit

      const logDate = new Date(log.createdAt);
      if (actDateFilter === 'TODAY') {
        return format(logDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      }
      if (actDateFilter === 'THIS_WEEK') {
        return isWithinInterval(logDate, { start: startOfWeek(now), end: endOfWeek(now) });
      }
      if (actDateFilter === 'THIS_MONTH') {
        return isWithinInterval(logDate, { start: startOfMonth(now), end: endOfMonth(now) });
      }
      if (actDateFilter === 'CUSTOM') {
        const start = new Date(actStartDate);
        const end = new Date(actEndDate);
        end.setHours(23, 59, 59, 999);
        return logDate >= start && logDate <= end;
      }
      return true;
    });
  }, [activityLogs, actDateFilter, actStartDate, actEndDate]);

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      {/* 1. Header Details Bar */}
      <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>{member.fullName}</span>
            <span className="text-xs bg-slate-800 text-blue-300 px-2 py-0.5 rounded font-mono">
              {member.id}
            </span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Joined: {format(new Date(member.joiningDate), 'MMMM dd, yyyy')}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Back to Team List
        </Button>
      </div>

      {/* 2. Performance Summary Section */}
      <div className="space-y-3 p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Performance Analytics Summary</h3>
            <p className="text-xs text-slate-500">Selected Team Member Performance Metrics</p>
          </div>

          {/* Date Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['WEEKLY', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM'] as PerformanceDateFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setPerfDateFilter(tab)}
                className={`py-1 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  perfDateFilter === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'WEEKLY' ? 'Weekly' : tab === 'THIS_MONTH' ? 'This Month' : tab === 'LAST_MONTH' ? 'Last Month' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {perfDateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-2 pt-2">
            <Input
              type="date"
              value={perfStartDate}
              onChange={(e) => setPerfStartDate(e.target.value)}
              className="text-xs py-1"
            />
            <span className="text-xs text-slate-400">to</span>
            <Input
              type="date"
              value={perfEndDate}
              onChange={(e) => setPerfEndDate(e.target.value)}
              className="text-xs py-1"
            />
          </div>
        )}

        {/* 6 Performance Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 pt-2">
          <StatCard
            title="Sales Amount"
            value={`LKR ${performanceData.salesAmount.toLocaleString()}`}
            subtitle="Delivered sales total"
            icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
            accentColor="green"
          />
          <StatCard
            title="Delivered Count"
            value={performanceData.deliveredCount}
            subtitle="Delivered orders"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            accentColor="green"
          />
          <StatCard
            title="Rejected Count"
            value={performanceData.rejectedCount}
            subtitle="Rejected orders"
            icon={<XCircle className="w-4 h-4 text-rose-600" />}
            accentColor="red"
          />
          <StatCard
            title="Numbers Added"
            value={performanceData.numbersAddedCount}
            subtitle="Contact numbers added"
            icon={<PhoneCall className="w-4 h-4 text-blue-600" />}
            accentColor="blue"
          />
          <StatCard
            title="Interested Count"
            value={performanceData.interestedCount}
            subtitle="Interested leads"
            icon={<Sparkles className="w-4 h-4 text-amber-600" />}
            accentColor="amber"
          />
          <StatCard
            title="Dispatched Count"
            value={performanceData.dispatchedCount}
            subtitle="Dispatched orders"
            icon={<Truck className="w-4 h-4 text-purple-600" />}
            accentColor="purple"
          />
        </div>
      </div>

      {/* 3. Team Member Calls Table */}
      <div className="space-y-3 p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Team Member Calls Table</h3>
            <p className="text-xs text-slate-500">Calls logged & handled by {member.fullName}</p>
          </div>

          {/* Call Status Filters */}
          <div className="flex flex-wrap items-center gap-1 overflow-x-auto max-w-full">
            {['ALL', 'ANSWERED', 'INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP', 'DISPATCHED', 'DELIVERED', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setCallStatusFilter(st)}
                className={`py-1 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  callStatusFilter === st
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'FOLLOW_UP' ? 'Follow Up' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Calls Table Container */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-72">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase sticky top-0 bg-slate-50">
              <tr>
                <th className="py-2.5 px-3">Contact Number</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3">Call Date/Time</th>
                <th className="py-2.5 px-3">Call Status</th>
                <th className="py-2.5 px-3">Package / Items</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">COD Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCallLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                    No calls logged matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCallLogs.map((log) => {
                  const phoneDisplay = log.contactPhone || log.contact?.phone || contactsMap.get(log.contactId) || log.contactId;
                  const normPhone = normalizePhone(phoneDisplay);
                  const normSec = normalizePhone(log.secondaryMobile);

                  const matchingOrder =
                    (log.contactId ? ordersByContactId.get(log.contactId) : undefined) ||
                    (phoneDisplay ? ordersByPhone.get(phoneDisplay) : undefined) ||
                    (normPhone ? ordersByPhone.get(normPhone) : undefined) ||
                    (log.secondaryMobile ? ordersByPhone.get(log.secondaryMobile) : undefined) ||
                    (normSec ? ordersByPhone.get(normSec) : undefined);

                  let totalQty = 0;
                  let packageSummary = '-';

                  if (matchingOrder) {
                    if (matchingOrder.items && matchingOrder.items.length > 0) {
                      totalQty = matchingOrder.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                      packageSummary = matchingOrder.items
                        .map((it) => `${it.productName} (${it.quantity})`)
                        .join(', ');
                    } else if ((Number(matchingOrder.adultQty) || 0) + (Number(matchingOrder.kidsQty) || 0) > 0) {
                      totalQty = (Number(matchingOrder.adultQty) || 0) + (Number(matchingOrder.kidsQty) || 0);
                    }

                    if (packageSummary === '-' && matchingOrder.itemsDescription && matchingOrder.itemsDescription.trim() !== '') {
                      packageSummary = matchingOrder.itemsDescription;
                    } else if (packageSummary === '-' && matchingOrder.selectedPackage && matchingOrder.selectedPackage !== 'NONE') {
                      if (matchingOrder.selectedPackage === 'BOTH') {
                        packageSummary = `BOTH (${matchingOrder.adultQty || 0}A + ${matchingOrder.kidsQty || 0}K)`;
                      } else if (matchingOrder.selectedPackage === 'ADULT') {
                        packageSummary = `Adult (${matchingOrder.adultQty || totalQty || 1})`;
                      } else if (matchingOrder.selectedPackage === 'KIDS') {
                        packageSummary = `Kids (${matchingOrder.kidsQty || totalQty || 1})`;
                      } else {
                        packageSummary = `${matchingOrder.selectedPackage} (${totalQty || 1})`;
                      }
                    }
                  }

                  // Fallback to call log's legacy package fields if order didn't specify
                  if (packageSummary === '-' || totalQty === 0) {
                    const legacyQty = (Number(log.adultQty) || 0) + (Number(log.kidsQty) || 0);
                    if (legacyQty > 0) totalQty = legacyQty;

                    if (log.selectedPackage && log.selectedPackage !== 'NONE') {
                      if (log.selectedPackage === 'BOTH') {
                        packageSummary = `BOTH (${log.adultQty || 0}A + ${log.kidsQty || 0}K)`;
                      } else if (log.selectedPackage === 'ADULT') {
                        packageSummary = `Adult (${log.adultQty || totalQty || 1})`;
                      } else if (log.selectedPackage === 'KIDS') {
                        packageSummary = `Kids (${log.kidsQty || totalQty || 1})`;
                      } else {
                        packageSummary = `${log.selectedPackage} (${totalQty || 1})`;
                      }
                    }
                  }

                  // Fallback for leads with COD amount or INTERESTED status
                  if (packageSummary === '-' && (log.status === 'INTERESTED' || Number(log.codAmount) > 0 || Number(log.totalPackageValue) > 0)) {
                    packageSummary = 'Package Order';
                    if (totalQty === 0) totalQty = 1;
                  }

                  if (packageSummary !== '-' && totalQty === 0) {
                    totalQty = 1;
                  }

                  const hasPackage = Boolean(packageSummary !== '-' && totalQty > 0);
                  const codVal = matchingOrder ? getAmountToCollect(matchingOrder) : (Number(log.codAmount) || 0);
                  const codDisplay = codVal > 0 ? `LKR ${codVal.toLocaleString()}` : '-';

                  const formatBadgeText = (text: string) => {
                    if (!text || text === '-') return '-';
                    const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
                    const formattedParts = parts.map((part) => {
                      const m = part.match(/^(.*?)(?:\s+x\s+|\s*\()(\d+)\)?$/i);
                      if (m) {
                        let name = m[1].trim();
                        const qty = m[2];
                        if (/^adult\s+package$/i.test(name)) name = 'Adult';
                        else if (/^kids?\s+package$/i.test(name)) name = 'Kids';
                        return `${name} (${qty})`;
                      }
                      return part;
                    });
                    return formattedParts.join(', ');
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {log.secondaryMobile ? `${phoneDisplay} (${log.secondaryMobile})` : phoneDisplay}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {log.customerName || matchingOrder?.customer?.fullName || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {format(new Date(log.calledAt), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge type="contact" status={log.status} />
                      </td>
                      <td className="py-2.5 px-3">
                        {hasPackage ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCallDetails(log)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors max-w-[200px] truncate"
                            title="Click to view full package order & customer details"
                          >
                            <Package className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="truncate">{formatBadgeText(packageSummary)}</span>
                            <Eye className="w-3 h-3 text-blue-500 opacity-60 ml-0.5 shrink-0" />
                          </button>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 font-mono">
                        {hasPackage ? totalQty : 0}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">
                        {codDisplay}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Team Member Activity Logs (1-Month Retention Enforced) */}
      <div className="space-y-3 p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Team Member Activity Logs</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                1-Month Retention
              </span>
            </h3>
            <p className="text-xs text-slate-500">Audit logs retained up to 30 days</p>
          </div>

          {/* Activity Date Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'CUSTOM'] as ActivityDateFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActDateFilter(tab)}
                className={`py-1 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  actDateFilter === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'TODAY' ? 'Today' : tab === 'THIS_WEEK' ? 'This Week' : tab === 'THIS_MONTH' ? 'This Month' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {actDateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              type="date"
              value={actStartDate}
              onChange={(e) => setActStartDate(e.target.value)}
              className="text-xs py-1"
            />
            <span className="text-xs text-slate-400">to</span>
            <Input
              type="date"
              value={actEndDate}
              onChange={(e) => setActEndDate(e.target.value)}
              className="text-xs py-1"
            />
          </div>
        )}

        <div className="max-h-72 overflow-y-auto pt-2">
          {filteredActivityLogs.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No activity logs recorded within the selected timeframe (max 30 days).
            </div>
          ) : (
            <ActivityTimeline activities={filteredActivityLogs} />
          )}
        </div>
      </div>

      {/* Package Order & Call Details Modal */}
      <Dialog
        isOpen={!!selectedCallDetails}
        onClose={() => setSelectedCallDetails(null)}
        title="Package Order & Call Details"
        description={`Logged call details for ${selectedCallDetails?.contactPhone || contactsMap.get(selectedCallDetails?.contactId || '') || selectedCallDetails?.contactId}`}
        maxWidth="lg"
      >
        {selectedCallDetails && (() => {
          const selectedPhone = selectedCallDetails.contactPhone || selectedCallDetails.contact?.phone || contactsMap.get(selectedCallDetails.contactId) || selectedCallDetails.contactId;
          const normPhone = normalizePhone(selectedPhone);
          const normSec = normalizePhone(selectedCallDetails.secondaryMobile);
          const selectedOrder =
            (selectedCallDetails.contactId ? ordersByContactId.get(selectedCallDetails.contactId) : undefined) ||
            (selectedPhone ? ordersByPhone.get(selectedPhone) : undefined) ||
            (normPhone ? ordersByPhone.get(normPhone) : undefined) ||
            (selectedCallDetails.secondaryMobile ? ordersByPhone.get(selectedCallDetails.secondaryMobile) : undefined) ||
            (normSec ? ordersByPhone.get(normSec) : undefined);

          const displayPackageName = selectedOrder?.itemsDescription || selectedCallDetails.selectedPackage || 'Package Order';
          const effectiveCodAmount = selectedOrder ? getAmountToCollect(selectedOrder) : (Number(selectedCallDetails.codAmount) || 0);
          const effectiveProductValue = selectedOrder?.totalPackageValue || selectedCallDetails.totalPackageValue || effectiveCodAmount;

          return (
            <div className="space-y-4">
              {/* Customer & Call Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Customer Name</span>
                  <strong className="text-slate-900 text-sm mt-0.5 block">{selectedCallDetails.customerName || selectedOrder?.customer?.fullName || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Contact Number</span>
                  <strong className="text-slate-900 font-mono text-sm mt-0.5 block">
                    {selectedPhone}
                    {selectedCallDetails.secondaryMobile ? ` (${selectedCallDetails.secondaryMobile})` : ''}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Call Status</span>
                  <div className="mt-1">
                    <StatusBadge type="contact" status={selectedCallDetails.status} />
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Call Date & Time</span>
                  <span className="text-slate-700 font-mono mt-0.5 block">
                    {format(new Date(selectedCallDetails.calledAt), 'MMM dd, yyyy HH:mm:ss')}
                  </span>
                </div>
              </div>

              {/* Delivery Address & Location */}
              {(selectedCallDetails.customerAddress || selectedCallDetails.city || selectedOrder?.customer?.address || selectedOrder?.customer?.city) && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Delivery Address</span>
                  </div>
                  <p className="text-slate-800 font-medium">
                    {selectedCallDetails.customerAddress || selectedOrder?.customer?.address || ''}
                    {(selectedCallDetails.city || selectedOrder?.customer?.city) ? `, ${selectedCallDetails.city || selectedOrder?.customer?.city}` : ''}
                  </p>
                </div>
              )}

              {/* Package & Pricing Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span>Selected Package: {displayPackageName}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    COD: {effectiveCodAmount > 0 ? formatCurrency(effectiveCodAmount) : '-'}
                  </span>
                </div>

                <div className="p-3 bg-white text-xs space-y-2 font-mono">
                  {/* Order Items list if present */}
                  {selectedOrder?.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((it, idx) => (
                      <div key={it.id || idx} className="flex items-center justify-between py-1 border-b border-slate-100 font-sans">
                        <span className="text-slate-700">{it.productName} ({it.quantity} units)</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {it.subtotal ? formatCurrency(it.subtotal) : `${it.quantity} qty`}
                        </span>
                      </div>
                    ))
                  ) : selectedOrder?.itemsDescription && selectedOrder.itemsDescription.trim() !== '' && selectedOrder.itemsDescription !== 'Package Order' ? (
                    selectedOrder.itemsDescription.split(',').map((part, idx) => {
                      const m = part.trim().match(/^(.*?)(?:\s+x\s+|\s*\()(\d+)\)?$/i);
                      const itName = m ? m[1].trim() : part.trim();
                      const itQty = m ? m[2] : '1';
                      return (
                        <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 font-sans">
                          <span className="text-slate-700">{itName} ({itQty} units)</span>
                          <span className="font-mono font-semibold text-slate-900">{itQty} qty</span>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      {((selectedCallDetails.adultQty && selectedCallDetails.adultQty > 0) || (selectedOrder?.adultQty && selectedOrder.adultQty > 0)) ? (
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 font-sans">
                          <span className="text-slate-700">Adult Package ({selectedCallDetails.adultQty || selectedOrder?.adultQty} units)</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {selectedCallDetails.adultSubtotal || selectedOrder?.adultSubtotal
                              ? formatCurrency(selectedCallDetails.adultSubtotal || selectedOrder?.adultSubtotal || 0)
                              : `${selectedCallDetails.adultQty || selectedOrder?.adultQty} qty`}
                          </span>
                        </div>
                      ) : null}

                      {((selectedCallDetails.kidsQty && selectedCallDetails.kidsQty > 0) || (selectedOrder?.kidsQty && selectedOrder.kidsQty > 0)) ? (
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 font-sans">
                          <span className="text-slate-700">Kids Package ({selectedCallDetails.kidsQty || selectedOrder?.kidsQty} units)</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {selectedCallDetails.kidsSubtotal || selectedOrder?.kidsSubtotal
                              ? formatCurrency(selectedCallDetails.kidsSubtotal || selectedOrder?.kidsSubtotal || 0)
                              : `${selectedCallDetails.kidsQty || selectedOrder?.kidsQty} qty`}
                          </span>
                        </div>
                      ) : null}

                      {Boolean(selectedCallDetails.selectedPackage && selectedCallDetails.selectedPackage !== 'NONE' && selectedCallDetails.selectedPackage !== 'ADULT' && selectedCallDetails.selectedPackage !== 'KIDS' && selectedCallDetails.selectedPackage !== 'BOTH' && !selectedCallDetails.adultQty && !selectedCallDetails.kidsQty) ? (
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 font-sans">
                          <span className="text-slate-700">{selectedCallDetails.selectedPackage}</span>
                          <span className="font-mono font-semibold text-slate-900">1 qty</span>
                        </div>
                      ) : null}
                    </>
                  )}

                  {/* Delivery / COD Charge if present */}
                  {selectedOrder?.codCharge && Number(selectedOrder.codCharge) > 0 ? (
                    <div className="flex items-center justify-between py-1 border-b border-slate-100 font-sans text-slate-600">
                      <span>Delivery / COD Charge:</span>
                      <span className="font-mono font-semibold">{formatCurrency(selectedOrder.codCharge)}</span>
                    </div>
                  ) : null}

                  {effectiveProductValue > 0 && (
                    <div className="flex items-center justify-between pt-1 font-sans font-bold">
                      <span className="text-slate-900">Total Order Value:</span>
                      <span className="font-mono text-emerald-700 text-sm">{formatCurrency(effectiveProductValue)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {(selectedCallDetails.remarks || selectedOrder?.remarks) && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1">
                  <span className="text-amber-800 font-bold uppercase tracking-wider text-[10px]">Call Remarks & Customer Notes</span>
                  <p className="text-slate-800">{selectedCallDetails.remarks || selectedOrder?.remarks}</p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setSelectedCallDetails(null)}>
                  Close
                </Button>
              </div>
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
};
