import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { orderRepository, contactRepository, customerRepository } from '../../repositories';
import { Order, Contact, Customer } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/shared/LoadingState';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  Package,
  CheckCircle2,
  XCircle,
  Search,
  DollarSign,
  Truck,
  Sparkles,
  Eye,
  X,
  Phone,
  User,
  Layers,
  Clock,
  Ban,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import toast from 'react-hot-toast';

type ActiveTab = 'ALL' | 'INTERESTED' | 'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'CANCELLED';

export const MemberSalesPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Raw Datasets
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Filter States
  const [activeTab, setActiveTab] = useState<ActiveTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected Item for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    const loadMemberData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [allOrders, allContacts, allCustomers] = await Promise.all([
          orderRepository.getAll(),
          contactRepository.getAll(),
          customerRepository.getAll().catch(() => []),
        ]);

        // Filter isolated strictly to logged-in Team Member
        const memberOrders = allOrders.filter(
          (o) => o.teamMemberId === user.id || (o as any).responsibleTeamMemberId === user.id
        );
        const memberContacts = allContacts.filter(
          (c) =>
            c.allocatedToId === user.id ||
            c.addedBy === user.id ||
            (c as any).addedById === user.id ||
            (c as any).importedById === user.id ||
            (c as any).importedBy === user.id
        );

        setOrders(memberOrders);
        setContacts(memberContacts);
        setCustomers(allCustomers);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load your personal sales data.');
      } finally {
        setLoading(false);
      }
    };

    loadMemberData();
  }, [user]);

  // Handle Date Presets
  useEffect(() => {
    const now = new Date();
    if (datePreset === 'TODAY') {
      const t = format(now, 'yyyy-MM-dd');
      setStartDate(t);
      setEndDate(t);
    } else if (datePreset === 'YESTERDAY') {
      const y = format(subDays(now, 1), 'yyyy-MM-dd');
      setStartDate(y);
      setEndDate(y);
    } else if (datePreset === 'THIS_WEEK') {
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (datePreset === 'LAST_7_DAYS') {
      setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (datePreset === 'THIS_MONTH') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (datePreset === 'LAST_MONTH') {
      const prevMonth = subMonths(now, 1);
      setStartDate(format(startOfMonth(prevMonth), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(prevMonth), 'yyyy-MM-dd'));
    } else if (datePreset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  }, [datePreset]);

  // Customer map lookup
  const customerMap = useMemo(() => {
    const map: Record<string, Customer> = {};
    customers.forEach((c) => (map[c.id] = c));
    return map;
  }, [customers]);

  // Filtered Orders within Date Range
  const dateFilteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = o.createdAt.split('T')[0];
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [orders, startDate, endDate]);

  // Filtered Interested Contacts within Date Range
  const interestedContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (c.status !== 'INTERESTED') return false;
      const d = c.updatedAt ? c.updatedAt.split('T')[0] : '';
      if (startDate && d && d < startDate) return false;
      if (endDate && d && d > endDate) return false;
      return true;
    });
  }, [contacts, startDate, endDate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Personal Sales Summary KPI Metrics
  // ─────────────────────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let totalBookedSales = 0;
    let deliveredCODSales = 0;
    let dispatchedCODSales = 0;
    let rejectedCODSales = 0;
    let cancelledCODSales = 0;

    let dispatchedCount = 0;
    let deliveredCount = 0;
    let rejectedCount = 0;
    let cancelledCount = 0;
    let awaitingDispatchCount = 0;

    dateFilteredOrders.forEach((o) => {
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      totalBookedSales += amt;

      if (o.status === 'DELIVERED') {
        deliveredCount++;
        deliveredCODSales += amt;
      } else if (o.status === 'DISPATCHED') {
        dispatchedCount++;
        dispatchedCODSales += amt;
      } else if (o.status === 'REJECTED') {
        rejectedCount++;
        rejectedCODSales += amt;
      } else if (o.status === 'CANCELLED') {
        cancelledCount++;
        cancelledCODSales += amt;
      } else if (o.status === 'PREPARED') {
        awaitingDispatchCount++;
      }
    });

    const finalizedOrders = deliveredCount + rejectedCount;
    const successRate = finalizedOrders > 0 ? (deliveredCount / finalizedOrders) * 100 : 100;

    return {
      totalOrdersCount: dateFilteredOrders.length,
      totalBookedSales,
      deliveredCount,
      deliveredCODSales,
      dispatchedCount,
      dispatchedCODSales,
      rejectedCount,
      rejectedCODSales,
      cancelledCount,
      cancelledCODSales,
      awaitingDispatchCount,
      interestedCount: interestedContacts.length,
      successRate: Number(successRate.toFixed(1)),
    };
  }, [dateFilteredOrders, interestedContacts]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Combined Table Rows for Active Tab & Search
  // ─────────────────────────────────────────────────────────────────────────────
  const displayOrders = useMemo(() => {
    let list = dateFilteredOrders;
    if (activeTab === 'DISPATCHED') list = list.filter((o) => o.status === 'DISPATCHED');
    if (activeTab === 'DELIVERED') list = list.filter((o) => o.status === 'DELIVERED');
    if (activeTab === 'REJECTED') list = list.filter((o) => o.status === 'REJECTED');
    if (activeTab === 'CANCELLED') list = list.filter((o) => o.status === 'CANCELLED');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((o) => {
        const cust = customerMap[o.customerId];
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          (cust?.fullName || '').toLowerCase().includes(q) ||
          (cust?.phone || '').includes(q) ||
          (cust?.city || '').toLowerCase().includes(q)
        );
      });
    }

    return list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }, [dateFilteredOrders, activeTab, searchQuery, customerMap]);

  const displayContacts = useMemo(() => {
    let list = interestedContacts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        return (
          c.phone.includes(q) ||
          (c.city || '').toLowerCase().includes(q) ||
          (c.secondaryMobile || '').includes(q)
        );
      });
    }
    return list;
  }, [interestedContacts, searchQuery]);

  // Clean Chart Data (Interested Leads -> Dispatched -> Delivered COD -> Rejected -> Cancelled)
  const chartData = [
    { name: 'Interested Leads', count: metrics.interestedCount, fill: '#8B5CF6' },
    { name: 'Dispatched (In Transit)', count: metrics.dispatchedCount, fill: '#3B82F6' },
    { name: 'Delivered (Realized COD)', count: metrics.deliveredCount, fill: '#10B981' },
    { name: 'Rejected Returns', count: metrics.rejectedCount, fill: '#EF4444' },
    { name: 'Cancelled Orders', count: metrics.cancelledCount, fill: '#64748B' },
  ];

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Sales & Fulfillment Dashboard"
        description="Track your personal sales pipeline, interested customer leads, dispatched courier parcels, delivered COD collections, returned parcels, and cancelled orders."
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          1. Hero KPI Stat Cards
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Booked Sales */}
        <StatCard
          title="Total Booked Sales"
          value={formatCurrency(metrics.totalBookedSales)}
          subtitle={`${metrics.totalOrdersCount} Total Orders`}
          icon={<DollarSign className="w-4 h-4" />}
          accentColor="blue"
        />

        {/* Delivered COD Collections */}
        <StatCard
          title="Delivered (Realized COD)"
          value={formatCurrency(metrics.deliveredCODSales)}
          subtitle={`${metrics.deliveredCount} Orders Handed Over`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="green"
        />

        {/* Dispatched in Transit */}
        <StatCard
          title="Dispatched in Transit"
          value={`${metrics.dispatchedCount} Orders`}
          subtitle={formatCurrency(metrics.dispatchedCODSales)}
          icon={<Truck className="w-4 h-4" />}
          accentColor="blue"
        />

        {/* Rejected / Returned */}
        <StatCard
          title="Rejected Returns"
          value={`${metrics.rejectedCount} Orders`}
          subtitle={formatCurrency(metrics.rejectedCODSales)}
          icon={<XCircle className="w-4 h-4" />}
          accentColor="red"
        />

        {/* Cancelled Orders */}
        <StatCard
          title="Cancelled Orders"
          value={`${metrics.cancelledCount} Orders`}
          subtitle={formatCurrency(metrics.cancelledCODSales)}
          icon={<Ban className="w-4 h-4" />}
          accentColor="amber"
        />

        {/* Interested Leads */}
        <StatCard
          title="Interested Leads"
          value={`${metrics.interestedCount} Leads`}
          subtitle="Awaiting dispatch by Supervisor"
          icon={<Sparkles className="w-4 h-4" />}
          accentColor="purple"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. Stage Breakdown Filter Tabs & Period Selector Toolbar
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Stage Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              All Orders ({dateFilteredOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('INTERESTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'INTERESTED'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-purple-700 hover:bg-purple-100/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interested Leads ({metrics.interestedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('DISPATCHED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DISPATCHED'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-blue-700 hover:bg-blue-100/60'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatched ({metrics.dispatchedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('DELIVERED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DELIVERED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-100/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Delivered COD ({metrics.deliveredCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('REJECTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-700 hover:bg-rose-100/60'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected ({metrics.rejectedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('CANCELLED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CANCELLED'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancelled ({metrics.cancelledCount})</span>
            </button>
          </div>

          {/* Date Window Preset Selector */}
          <div className="w-full md:w-56 shrink-0">
            <Select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              options={[
                { value: 'THIS_MONTH', label: '📅 This Month' },
                { value: 'LAST_MONTH', label: '📅 Last Month' },
                { value: 'THIS_WEEK', label: '📅 This Week' },
                { value: 'LAST_7_DAYS', label: '📅 Last 7 Days' },
                { value: 'TODAY', label: '📅 Today' },
                { value: 'ALL', label: '📅 All Time' },
              ]}
            />
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'INTERESTED'
                ? 'Search interested contacts by phone, city...'
                : 'Search your orders by Order #, Customer Name, Phone, or City...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9.5 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          3. Main Data Table: Orders or Interested Leads
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">
              {activeTab === 'INTERESTED'
                ? `Interested Leads Register (${displayContacts.length})`
                : `${activeTab === 'ALL' ? 'My Sales & Fulfillment Pipeline' : `${activeTab} Orders`} (${displayOrders.length})`}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing records for: <strong className="text-slate-800">{startDate || 'Inception'}</strong> to{' '}
            <strong className="text-slate-800">{endDate || 'Present'}</strong>
          </span>
        </div>

        {/* IF INTERESTED TAB IS SELECTED */}
        {activeTab === 'INTERESTED' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">City / Region</th>
                  <th className="py-3 px-4">Secondary Mobile</th>
                  <th className="py-3 px-4 text-center">Attempts</th>
                  <th className="py-3 px-4">Lead Status</th>
                  <th className="py-3 px-4">Marked Date</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No interested leads found for the selected filter period.
                    </td>
                  </tr>
                ) : (
                  displayContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-purple-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-purple-500" />
                        <span>{contact.phone}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{contact.city || '-'}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{contact.secondaryMobile || '-'}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{contact.attemptCount}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          ⭐ Interested Lead
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {contact.updatedAt ? contact.updatedAt.split('T')[0] : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                          onClick={() => setSelectedContact(contact)}
                          className="text-xs h-7 px-2.5"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ORDERS TABLE (ALL, DISPATCHED, DELIVERED, REJECTED, CANCELLED) */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">City / Region</th>
                  <th className="py-3 px-4">Package Ordered</th>
                  <th className="py-3 px-4 text-right">COD Amount</th>
                  <th className="py-3 px-4 text-center">Fulfillment Status</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No orders found in this stage for the selected timeframe.
                    </td>
                  </tr>
                ) : (
                  displayOrders.map((order) => {
                    const cust = customerMap[order.customerId] || (order as any).customer;
                    const codVal = Number(
                      order.codAmount !== undefined && order.codAmount !== null
                        ? order.codAmount
                        : (order.totalAmount || 0)
                    );

                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{cust?.fullName || 'Customer'}</div>
                          <div className="font-mono text-[11px] text-slate-500">{cust?.phone || '-'}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {cust?.city || (order as any).city || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">
                            {order.selectedPackage || order.itemsDescription || 'Standard Package'}
                          </span>
                          {(order.adultQty || order.kidsQty) && (
                            <span className="text-[11px] text-slate-500 block">
                              {order.adultQty ? `${order.adultQty} Adult ` : ''}
                              {order.kidsQty ? `${order.kidsQty} Kids` : ''}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(codVal)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {order.status === 'DELIVERED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Delivered COD</span>
                            </span>
                          )}
                          {order.status === 'DISPATCHED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Truck className="w-3.5 h-3.5" />
                              <span>Dispatched</span>
                            </span>
                          )}
                          {order.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {order.status === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              <Ban className="w-3.5 h-3.5 text-slate-500" />
                              <span>Cancelled</span>
                            </span>
                          )}
                          {order.status === 'PREPARED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Awaiting Dispatch</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {order.createdAt.split('T')[0]}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                            onClick={() => setSelectedOrder(order)}
                            className="text-xs h-7 px-2.5"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {displayOrders.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td className="py-3 px-4" colSpan={4}>
                      Filtered Orders Value Sum
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-800 font-extrabold text-sm">
                      {formatCurrency(
                        displayOrders.reduce(
                          (sum, o) =>
                            sum +
                            Number(
                              o.codAmount !== undefined && o.codAmount !== null
                                ? o.codAmount
                                : (o.totalAmount || 0)
                            ),
                          0
                        )
                      )}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          4. Performance Distribution Recharts Visual (Includes Cancelled)
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
        <h4 className="text-sm font-bold text-slate-900 mb-1">My Pipeline & Fulfillment Distribution</h4>
        <p className="text-xs text-slate-500 mb-4">Volume breakdown across your generated leads, dispatched, delivered, rejected, and cancelled orders</p>

        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip formatter={(val: any) => [val, 'Count']} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-member-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          5. Order Detail Inspection Modal
         ───────────────────────────────────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Order Details: {selectedOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Customer Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>
                    {customerMap[selectedOrder.customerId]?.fullName ||
                      (selectedOrder as any).customer?.fullName ||
                      'Customer'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                    <span className="font-mono font-bold text-slate-800">
                      {customerMap[selectedOrder.customerId]?.phone ||
                        (selectedOrder as any).customer?.phone ||
                        '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">City</span>
                    <span className="font-semibold text-slate-800">
                      {customerMap[selectedOrder.customerId]?.city || (selectedOrder as any).city || '-'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Address</span>
                  <span className="text-slate-700">
                    {customerMap[selectedOrder.customerId]?.address ||
                      (selectedOrder as any).customer?.address ||
                      '-'}
                  </span>
                </div>
              </div>

              {/* Items & Financials */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-800">Package Description</span>
                  <span className="font-semibold text-blue-700">
                    {selectedOrder.selectedPackage || selectedOrder.itemsDescription}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Adult Quantity</span>
                  <span className="font-bold">{selectedOrder.adultQty || 0} Units</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Kids Quantity</span>
                  <span className="font-bold">{selectedOrder.kidsQty || 0} Units</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-extrabold text-sm">
                  <span className="text-slate-900">Total COD Collectible</span>
                  <span className="font-mono text-emerald-700">
                    {formatCurrency(
                      Number(
                        selectedOrder.codAmount !== undefined && selectedOrder.codAmount !== null
                          ? selectedOrder.codAmount
                          : (selectedOrder.totalAmount || 0)
                      )
                    )}
                  </span>
                </div>
              </div>

              {/* Status & Remarks */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Fulfillment Remarks</span>
                <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {selectedOrder.remarks || 'No specific delivery remarks provided.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-100/60 border-t border-slate-200 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          6. Contact Detail Inspection Modal
         ───────────────────────────────────────────────────────────────────────── */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-purple-900 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-300" />
                <h3 className="font-bold text-sm text-white">Interested Contact Lead</h3>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1 text-purple-200 hover:text-white rounded-lg hover:bg-purple-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200">
                <span className="text-[10px] font-bold text-purple-700 uppercase block">Phone Number</span>
                <span className="text-base font-extrabold font-mono text-purple-900 mt-0.5 block">
                  {selectedContact.phone}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">City</span>
                  <span className="font-bold mt-0.5 block">{selectedContact.city || 'Not specified'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Call Attempts</span>
                  <span className="font-bold mt-0.5 block">{selectedContact.attemptCount} Attempts</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Secondary Mobile</span>
                <span className="font-mono mt-0.5 block">{selectedContact.secondaryMobile || 'None'}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-100/60 border-t border-slate-200 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedContact(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
