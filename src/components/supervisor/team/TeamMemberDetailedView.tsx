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
import { DollarSign, CheckCircle2, XCircle, PhoneCall, Sparkles, Truck, Calendar, Filter, Clock } from 'lucide-react';

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

    const totalSalesAmount = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
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
                filteredCallLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">
                      {log.secondaryMobile ? `${log.contactId} (${log.secondaryMobile})` : log.contactId}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {log.customerName || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {format(new Date(log.calledAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge type="contact" status={log.status} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {log.selectedPackage || 'Standard Product'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {(log.adultQty || 0) + (log.kidsQty || 0) || 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">
                      {log.codAmount ? `LKR ${log.codAmount.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))
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
                className={`py-1 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
    </div>
  );
};
