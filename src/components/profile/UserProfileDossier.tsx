import React, { useState, useEffect, useMemo } from 'react';
import type { User, Contact, CallLog, Order, ActivityLog } from '../../models/domain';
import { userRepository, callLogRepository, orderRepository, contactRepository, activityLogRepository } from '../../repositories';
import { getTeamBranding } from '../../config/branding';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { StatCard } from '../shared/StatCard';
import { StatusBadge } from '../shared/StatusBadge';
import { ProfileAvatar } from '../shared/ProfileAvatar';
import { ActivityTimeline } from '../shared/ActivityTimeline';
import { LoadingState } from '../shared/LoadingState';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog } from '../ui/Dialog';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Sparkles,
  Truck,
  Users,
  Shield,
  MapPin,
  Calendar,
  Mail,
  Phone,
  CreditCard,
  ArrowLeft,
  Clock,
  Package,
  Eye,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export interface UserProfileDossierProps {
  user: User;
  onClose?: () => void;
  onSelectUser?: (userId: string) => void;
}

export type DossierDateFilter = 'WEEKLY' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export const UserProfileDossier: React.FC<UserProfileDossierProps> = ({ user, onClose, onSelectUser }) => {
  const [loading, setLoading] = useState(true);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [managedMembers, setManagedMembers] = useState<User[]>([]);
  const [selectedCallDetails, setSelectedCallDetails] = useState<CallLog | null>(null);

  // Performance Date Filter
  const [dateFilter, setDateFilter] = useState<DossierDateFilter>('THIS_MONTH');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Calls Table Status Filter (For Team Members)
  const [callStatusFilter, setCallStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        if (user.role === 'TEAM_MEMBER') {
          const [cLogs, mOrders, mContacts, aLogs] = await Promise.all([
            callLogRepository.getByMemberId(user.id),
            orderRepository.getByMemberId(user.id),
            contactRepository.getByMemberId(user.id),
            activityLogRepository.getRecentWithinMonth(user.id),
          ]);
          setCallLogs(cLogs);
          setOrders(mOrders);
          setContacts(mContacts);
          setActivities(aLogs);
        } else if (user.role === 'SUPERVISOR' && user.teamId) {
          const [members, tContacts, tOrders, cLogs, aLogs] = await Promise.all([
            userRepository.getByTeamId(user.teamId),
            contactRepository.getByTeamId(user.teamId),
            orderRepository.getByTeamId(user.teamId),
            callLogRepository.getByTeamId(user.teamId),
            activityLogRepository.getRecentWithinMonth(user.id),
          ]);
          setManagedMembers(members.filter((m) => m.role === 'TEAM_MEMBER'));
          setContacts(tContacts);
          setOrders(tOrders);
          setCallLogs(cLogs);
          setActivities(aLogs);
        } else {
          const aLogs = await activityLogRepository.getRecentWithinMonth(user.id);
          setActivities(aLogs);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user.id, user.role, user.teamId]);

  // Date Range Matcher Helper
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();

    if (dateFilter === 'WEEKLY') {
      return isWithinInterval(date, { start: startOfWeek(now), end: endOfWeek(now) });
    }
    if (dateFilter === 'THIS_MONTH') {
      return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
    }
    if (dateFilter === 'LAST_MONTH') {
      const lastMonth = subMonths(now, 1);
      return isWithinInterval(date, { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
    }
    if (dateFilter === 'CUSTOM') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return true;
  };

  // Metrics for Team Members
  const memberMetrics = useMemo(() => {
    const scopedOrders = orders.filter((o) => isDateInRange(o.createdAt));
    const scopedContacts = contacts.filter((c) => isDateInRange(c.importedAt || c.updatedAt));
    const scopedCallLogs = callLogs.filter((cl) => isDateInRange(cl.calledAt));

    const delivered = scopedOrders.filter((o) => o.status === 'DELIVERED');
    const rejected = scopedOrders.filter((o) => o.status === 'REJECTED' || o.status === 'RETURNED');
    const dispatched = scopedOrders.filter((o) => o.status === 'DISPATCHED');

    const totalSales = delivered.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const interested = scopedCallLogs.filter((cl) => cl.status === 'INTERESTED').length;
    const numbersAdded = scopedContacts.filter((c) => c.addedBy === user.id || c.isSelfAdded).length || scopedContacts.length;

    return {
      salesAmount: totalSales,
      deliveredCount: delivered.length,
      rejectedCount: rejected.length,
      numbersAddedCount: numbersAdded,
      interestedCount: interested,
      dispatchedCount: dispatched.length,
    };
  }, [orders, contacts, callLogs, dateFilter, startDate, endDate, user.id]);

  // Lookup map for fast contact phone resolution
  const contactsMap = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => {
      map.set(c.id, c.phone);
    });
    return map;
  }, [contacts]);

  // Metrics for Supervisors
  const supervisorMetrics = useMemo(() => {
    const scopedOrders = orders.filter((o) => isDateInRange(o.createdAt));
    const scopedCalls = callLogs.filter((cl) => isDateInRange(cl.calledAt));

    const delivered = scopedOrders.filter((o) => o.status === 'DELIVERED');
    const rejected = scopedOrders.filter((o) => o.status === 'REJECTED' || o.status === 'RETURNED');
    const totalSales = delivered.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    return {
      salesAmount: totalSales,
      deliveredCount: delivered.length,
      rejectedCount: rejected.length,
      callsCount: scopedCalls.length,
      membersCount: managedMembers.length,
    };
  }, [orders, callLogs, managedMembers, dateFilter, startDate, endDate]);

  // Filtered Call Logs for Calls Table
  const filteredCallLogs = useMemo(() => {
    return callLogs.filter((cl) => {
      const matchesDate = isDateInRange(cl.calledAt);
      const matchesStatus = callStatusFilter === 'ALL' || cl.status === callStatusFilter;
      return matchesDate && matchesStatus;
    });
  }, [callLogs, dateFilter, startDate, endDate, callStatusFilter]);

  if (loading) return <LoadingState rows={8} />;

  const teamBrand = getTeamBranding(user.team || user.teamId);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={onClose}
        >
          Back to Directory
        </Button>
      )}

      {/* 1. Header Profile Banner — 100% Light CRM Styling */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ProfileAvatar name={user.fullName} avatarUrl={user.avatarUrl} size="lg" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{user.fullName}</h2>
              <span className="font-mono text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                {user.id}
              </span>
              <StatusBadge type="user" status={String(user.isActive)} />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-semibold text-blue-700">
                <Shield className="w-3.5 h-3.5" />
                {user.role.replace(/_/g, ' ')}
              </span>
              <span>&bull;</span>
              <span>{teamBrand.name}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Joined {format(new Date(user.joiningDate || user.createdAt), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Date Filter Tabs Bar */}
        {(user.role === 'TEAM_MEMBER' || user.role === 'SUPERVISOR') && (
          <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            {(['WEEKLY', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM'] as DossierDateFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDateFilter(tab)}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  dateFilter === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {tab === 'WEEKLY' ? 'Weekly' : tab === 'THIS_MONTH' ? 'This Month' : tab === 'LAST_MONTH' ? 'Last Month' : 'Custom'}
              </button>
            ))}
          </div>
        )}
      </div>

      {dateFilter === 'CUSTOM' && (user.role === 'TEAM_MEMBER' || user.role === 'SUPERVISOR') && (
        <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs max-w-md">
          <Input
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs py-1"
          />
          <Input
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs py-1"
          />
        </div>
      )}

      {/* 2. ROLE-BASED CONDITIONAL SECTIONS */}

      {/* SECTION A: TEAM MEMBER SPECIFIC PERFORMANCE & CALLS TABLE */}
      {user.role === 'TEAM_MEMBER' && (
        <>
          {/* Performance Summary Cards */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Performance Analytics Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
              <StatCard
                title="Sales Amount"
                value={`LKR ${memberMetrics.salesAmount.toLocaleString()}`}
                subtitle="Delivered sales total"
                icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
                accentColor="green"
              />
              <StatCard
                title="Delivered"
                value={memberMetrics.deliveredCount}
                subtitle="Delivered orders"
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                accentColor="green"
              />
              <StatCard
                title="Rejected"
                value={memberMetrics.rejectedCount}
                subtitle="Rejected orders"
                icon={<XCircle className="w-4 h-4 text-rose-600" />}
                accentColor="red"
              />
              <StatCard
                title="Numbers Added"
                value={memberMetrics.numbersAddedCount}
                subtitle="Contacts added"
                icon={<PhoneCall className="w-4 h-4 text-blue-600" />}
                accentColor="blue"
              />
              <StatCard
                title="Interested"
                value={memberMetrics.interestedCount}
                subtitle="Interested leads"
                icon={<Sparkles className="w-4 h-4 text-amber-600" />}
                accentColor="amber"
              />
              <StatCard
                title="Dispatched"
                value={memberMetrics.dispatchedCount}
                subtitle="Dispatched orders"
                icon={<Truck className="w-4 h-4 text-purple-600" />}
                accentColor="purple"
              />
            </div>
          </div>

          {/* Calls Table Section */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Calls Logged & Handled</h3>
                <p className="text-xs text-slate-500">Filtered by selected timeframe and call status</p>
              </div>

              {/* Call Status Filters */}
              <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
                {['ALL', 'ANSWERED', 'INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP', 'DISPATCHED', 'DELIVERED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCallStatusFilter(st)}
                    className={`py-1 px-2 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      callStatusFilter === st
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'FOLLOW_UP' ? 'Follow Up' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-72">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Contact Number</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Call Date/Time</th>
                    <th className="py-2.5 px-3">Call Status</th>
                    <th className="py-2.5 px-3">Package / Item</th>
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
                      const totalQty = (log.adultQty || 0) + (log.kidsQty || 0);
                      const hasPackage = Boolean(log.selectedPackage && log.selectedPackage !== 'NONE' && totalQty > 0);

                      let packageSummary = '-';
                      if (hasPackage) {
                        if (log.selectedPackage === 'BOTH') {
                          packageSummary = `BOTH (${log.adultQty || 0}A + ${log.kidsQty || 0}K)`;
                        } else if (log.selectedPackage === 'ADULT') {
                          packageSummary = `Adult (${log.adultQty || totalQty})`;
                        } else if (log.selectedPackage === 'KIDS') {
                          packageSummary = `Kids (${log.kidsQty || totalQty})`;
                        } else {
                          packageSummary = `${log.selectedPackage} (${totalQty})`;
                        }
                      }

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {log.secondaryMobile ? `${phoneDisplay} (${log.secondaryMobile})` : phoneDisplay}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{log.customerName || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{format(new Date(log.calledAt), 'MMM dd, yyyy HH:mm')}</td>
                          <td className="py-2.5 px-3">
                            <StatusBadge type="contact" status={log.status} />
                          </td>
                          <td className="py-2.5 px-3">
                            {hasPackage ? (
                              <button
                                type="button"
                                onClick={() => setSelectedCallDetails(log)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                                title="Click to view full package order & customer details"
                              >
                                <Package className="w-3 h-3 text-blue-600" />
                                <span>{packageSummary}</span>
                                <Eye className="w-3 h-3 text-blue-500 opacity-60 ml-0.5" />
                              </button>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 font-mono">
                            {hasPackage ? totalQty : 0}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">
                            {log.codAmount && Number(log.codAmount) > 0 ? `LKR ${Number(log.codAmount).toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SECTION B: SUPERVISOR SPECIFIC TEAM PERFORMANCE & MANAGED MEMBERS GRID */}
      {user.role === 'SUPERVISOR' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard title="Team Sales" value={`LKR ${supervisorMetrics.salesAmount.toLocaleString()}`} icon={<DollarSign className="w-4 h-4 text-emerald-600" />} accentColor="green" />
            <StatCard title="Delivered Orders" value={supervisorMetrics.deliveredCount} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} accentColor="green" />
            <StatCard title="Rejected Orders" value={supervisorMetrics.rejectedCount} icon={<XCircle className="w-4 h-4 text-rose-600" />} accentColor="red" />
            <StatCard title="Team Calls" value={supervisorMetrics.callsCount} icon={<PhoneCall className="w-4 h-4 text-blue-600" />} accentColor="blue" />
            <StatCard title="Managed Members" value={supervisorMetrics.membersCount} icon={<Users className="w-4 h-4 text-purple-600" />} accentColor="purple" />
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Managed Team Specialists ({managedMembers.length})</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {managedMembers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onSelectUser && onSelectUser(m.id)}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <ProfileAvatar name={m.fullName} avatarUrl={m.avatarUrl} size="sm" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">{m.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.phone}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[10px] text-blue-600">View Dossier</Button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* SECTION C: CONTACT & PERSONAL INFORMATION GRID FOR ALL ROLES */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Personal & Account Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
            <div className="text-slate-500 font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Email Address</span>
            </div>
            <div className="font-semibold text-slate-900 break-all">{user.email}</div>
          </div>

          <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
            <div className="text-slate-500 font-medium flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Phone Number</span>
            </div>
            <div className="font-semibold font-mono text-slate-900">{user.phone}</div>
          </div>

          <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
            <div className="text-slate-500 font-medium flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>NIC / National ID</span>
            </div>
            <div className="font-semibold font-mono text-slate-900">{user.nic || 'Not Specified'}</div>
          </div>
        </div>
      </div>

      {/* 3. 1-MONTH RETENTION ACTIVITY LOG TIMELINE */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Activity Audit Log Feed</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
              1-Month Retention
            </span>
          </h3>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">No activity logs recorded within 30 days.</div>
          ) : (
            <ActivityTimeline activities={activities} />
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
        {selectedCallDetails && (
          <div className="space-y-4">
            {/* Customer & Call Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Customer Name</span>
                <strong className="text-slate-900 text-sm mt-0.5 block">{selectedCallDetails.customerName || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Contact Number</span>
                <strong className="text-slate-900 font-mono text-sm mt-0.5 block">
                  {selectedCallDetails.contactPhone || contactsMap.get(selectedCallDetails.contactId) || selectedCallDetails.contactId}
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
            {(selectedCallDetails.customerAddress || selectedCallDetails.city) && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Delivery Address</span>
                </div>
                <p className="text-slate-800 font-medium">
                  {selectedCallDetails.customerAddress || ''}
                  {selectedCallDetails.city ? `, ${selectedCallDetails.city}` : ''}
                </p>
              </div>
            )}

            {/* Package & Pricing Breakdown */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>Selected Package: {selectedCallDetails.selectedPackage || 'Custom Order'}</span>
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  COD: {selectedCallDetails.codAmount ? formatCurrency(selectedCallDetails.codAmount) : '-'}
                </span>
              </div>

              <div className="p-3 bg-white text-xs space-y-2 font-mono">
                {selectedCallDetails.adultQty && selectedCallDetails.adultQty > 0 ? (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 font-sans">
                    <span className="text-slate-700">Adult Package ({selectedCallDetails.adultQty} units)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedCallDetails.adultSubtotal ? formatCurrency(selectedCallDetails.adultSubtotal) : `${selectedCallDetails.adultQty} qty`}
                    </span>
                  </div>
                ) : null}

                {selectedCallDetails.kidsQty && selectedCallDetails.kidsQty > 0 ? (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 font-sans">
                    <span className="text-slate-700">Kids Package ({selectedCallDetails.kidsQty} units)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedCallDetails.kidsSubtotal ? formatCurrency(selectedCallDetails.kidsSubtotal) : `${selectedCallDetails.kidsQty} qty`}
                    </span>
                  </div>
                ) : null}

                {selectedCallDetails.totalPackageValue && (
                  <div className="flex items-center justify-between pt-1 font-sans font-bold">
                    <span className="text-slate-900">Total Order Value:</span>
                    <span className="font-mono text-emerald-700 text-sm">{formatCurrency(selectedCallDetails.totalPackageValue)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Remarks */}
            {selectedCallDetails.remarks && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="text-amber-800 font-bold uppercase tracking-wider text-[10px]">Call Remarks & Customer Notes</span>
                <p className="text-slate-800">{selectedCallDetails.remarks}</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setSelectedCallDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
