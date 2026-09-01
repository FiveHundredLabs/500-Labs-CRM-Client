import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, Contact, Order, ActivityLog, Product, CallLog } from '../../models/domain';
import {
  userRepository,
  contactRepository,
  orderRepository,
  activityLogRepository,
  productRepository,
  callLogRepository,
} from '../../repositories';
import { SupervisorAnalyticsService } from '../../services/supervisorAnalyticsService';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { LoadingState } from '../../components/shared/LoadingState';
import { Leaderboard } from '../../components/leaderboard';
import {
  Users,
  Layers,
  Package,
  CheckCircle2,
  Truck,
  XCircle,
  PieChart,
  AlertTriangle,
  Calendar,
  PhoneCall,
  Sparkles,
  DollarSign,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import toast from 'react-hot-toast';

export type DashboardDateFilter = 'THIS_MONTH' | 'LAST_MONTH' | 'TODAY' | 'THIS_WEEK' | 'ALL' | 'LAST_6_MONTHS' | 'CUSTOM';

export const SupervisorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DashboardDateFilter>('THIS_MONTH');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) return;
      const effectiveTeamId = user.teamId || (user as any).team?.id;
      setLoading(true);
      try {
        if (effectiveTeamId) {
          const [members, tContacts, tOrders, cLogs, teamProducts, logs] = await Promise.all([
            userRepository.getByTeamId(effectiveTeamId).catch(() => []),
            contactRepository.getByTeamId(effectiveTeamId).catch(() => []),
            orderRepository.getByTeamId(effectiveTeamId).catch(() => []),
            callLogRepository.getByTeamId(effectiveTeamId).catch(() => []),
            productRepository.getByTeamId(effectiveTeamId).catch(() => []),
            activityLogRepository.getRecentWithinMonth().catch(() => []),
          ]);

          setTeamMembers(members.filter((m) => m.role === 'TEAM_MEMBER'));
          setContacts(tContacts);
          setOrders(tOrders);
          setCallLogs(cLogs);
          setProducts(teamProducts);
          setActivities(logs.filter((l) => !l.teamId || l.teamId === effectiveTeamId).slice(0, 8));
        } else {
          const [members, tContacts, tOrders, cLogs, teamProducts, logs] = await Promise.all([
            userRepository.getAll().catch(() => []),
            contactRepository.getAll().catch(() => []),
            orderRepository.getAll().catch(() => []),
            callLogRepository.getAll().catch(() => []),
            productRepository.getAll().catch(() => []),
            activityLogRepository.getAll().catch(() => []),
          ]);
          setTeamMembers(members.filter((m) => m.role === 'TEAM_MEMBER'));
          setContacts(tContacts);
          setOrders(tOrders);
          setCallLogs(cLogs);
          setProducts(teamProducts);
          setActivities(logs.slice(0, 8));
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load supervisor dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  // Date Range Matcher Helper
  const isDateInFilter = (dateStr?: string | null) => {
    if (!dateStr) return false;
    if (dateFilter === 'ALL') return true;

    const date = new Date(dateStr);
    const now = new Date();

    if (dateFilter === 'TODAY') {
      return isWithinInterval(date, { start: startOfDay(now), end: endOfDay(now) });
    }
    if (dateFilter === 'THIS_WEEK') {
      return isWithinInterval(date, { start: startOfWeek(now), end: endOfWeek(now) });
    }
    if (dateFilter === 'THIS_MONTH') {
      return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
    }
    if (dateFilter === 'LAST_MONTH') {
      const lastMonth = subMonths(now, 1);
      return isWithinInterval(date, { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
    }
    if (dateFilter === 'LAST_6_MONTHS') {
      const sixMonthsAgo = subMonths(now, 6);
      return date >= sixMonthsAgo && date <= now;
    }
    if (dateFilter === 'CUSTOM') {
      const s = new Date(startDate);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      return date >= s && date <= e;
    }
    return true;
  };

  // Filtered Datasets based on selected date range
  const scopedOrders = useMemo(
    () => orders.filter((o) => isDateInFilter(o.createdAt)),
    [orders, dateFilter, startDate, endDate]
  );
  const scopedCalls = useMemo(
    () => callLogs.filter((cl) => isDateInFilter(cl.calledAt)),
    [callLogs, dateFilter, startDate, endDate]
  );
  const scopedInterestedContacts = useMemo(
    () => contacts.filter((c) => c.status === 'INTERESTED' && isDateInFilter(c.updatedAt || c.importedAt)),
    [contacts, dateFilter, startDate, endDate]
  );

  // Status Metrics
  const totalOrders = scopedOrders.length;
  const dispatchedOrders = scopedOrders.filter((o) => o.status === 'DISPATCHED').length;
  const deliveredOrders = scopedOrders.filter((o) => o.status === 'DELIVERED').length;
  const rejectedOrders = scopedOrders.filter((o) => o.status === 'REJECTED' || o.status === 'RETURNED').length;
  
  const totalGrossSales = scopedOrders.reduce(
    (sum, o) => sum + (Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : o.totalAmount) || 0),
    0
  );

  const totalDeliveredSales = scopedOrders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

  // Low Stock Alerts (Requirement 2.13)
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.currentStock <= p.minStockThreshold);
  }, [products]);

  // Dynamic Leaderboard based on scoped orders
  const leaderboard = useMemo(() => {
    return SupervisorAnalyticsService.computeLeaderboard(teamMembers, scopedOrders);
  }, [teamMembers, scopedOrders]);

  if (loading) return <LoadingState rows={6} />;

  const unallocatedContacts = contacts.filter((c) => !c.isAllocated && c.status === 'NEW').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Supervisor Overview"
        description="Operational & Sales Control Center for Team Performance and Fulfillment"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Trophy className="w-4 h-4 text-amber-500" />}
              onClick={() => navigate('/supervisor/team-members')}
            >
              Leaderboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Package className="w-4 h-4 text-slate-600" />}
              onClick={() => navigate('/supervisor/stock')}
            >
              Stock Management
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PieChart className="w-4 h-4" />}
              onClick={() => navigate('/supervisor/reports')}
            >
              Reports & Analytics
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Layers className="w-4 h-4" />}
              onClick={() => navigate('/supervisor/allocation')}
            >
              Allocate Leads ({unallocatedContacts})
            </Button>
          </div>
        }
      />

      {/* Date Range Selector Toolbar (Requirement 2.5) */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Time Period Scope:</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full capitalize tracking-normal border border-blue-100">
              {dateFilter === 'ALL'
                ? 'All Time (Total)'
                : dateFilter === 'THIS_MONTH'
                ? 'This Month'
                : dateFilter === 'LAST_MONTH'
                ? 'Last Month'
                : dateFilter === 'TODAY'
                ? 'Today'
                : dateFilter === 'THIS_WEEK'
                ? 'This Week'
                : dateFilter === 'LAST_6_MONTHS'
                ? 'Last 6 Months'
                : `${startDate} to ${endDate}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'THIS_MONTH', label: 'This Month' },
              { key: 'LAST_MONTH', label: 'Last Month' },
              { key: 'TODAY', label: 'Today' },
              { key: 'THIS_WEEK', label: 'This Week' },
              { key: 'ALL', label: 'All Time (Total)' },
              { key: 'LAST_6_MONTHS', label: 'Last 6 Months' },
              { key: 'CUSTOM', label: 'Custom' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setDateFilter(item.key as DashboardDateFilter)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  dateFilter === item.key
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {dateFilter === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">From Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">To Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Low Stock Alert Section (Requirement 2.13) */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-amber-800">Inventory Alert: Low Stock</div>
              <div className="text-xs text-amber-900 mt-0.5">
                {lowStockProducts.map((p) => `${p.name} (${p.currentStock} remaining)`).join(' • ')}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/supervisor/stock')}
            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 text-xs"
          >
            Request Stock Addition
          </Button>
        </div>
      )}

      {/* KPI Metric Cards Scoped to Date Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Gross Sales"
          value={formatCurrency(totalGrossSales)}
          subtitle={`${totalOrders} Booked Orders`}
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          title="Delivered Sales"
          value={formatCurrency(totalDeliveredSales)}
          subtitle={`${deliveredOrders} Delivered (${deliveryRate}%)`}
          icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Dispatched"
          value={`${dispatchedOrders} Orders`}
          subtitle="In courier transit"
          icon={<Truck className="w-4 h-4 text-amber-600" />}
          accentColor="amber"
        />
        <StatCard
          title="Interested Leads"
          value={scopedInterestedContacts.length}
          subtitle="Qualified prospect leads"
          icon={<Sparkles className="w-4 h-4 text-purple-600" />}
          accentColor="purple"
        />
        <StatCard
          title="Calls Handled"
          value={scopedCalls.length}
          subtitle="Customer calls logged"
          icon={<PhoneCall className="w-4 h-4 text-indigo-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Rejected / Returns"
          value={rejectedOrders}
          subtitle="Customer rejected / returned"
          icon={<XCircle className="w-4 h-4 text-rose-600" />}
          accentColor="red"
        />
      </div>

      {/* Main Grid: Team Leaderboard & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard (Col-span 2) */}
        <div className="lg:col-span-2">
          <Leaderboard
            items={leaderboard.map((m) => ({
              id: m.memberId,
              rank: m.rank,
              name: m.memberName,
              avatarUrl: m.avatarUrl,
              isCurrentUser: m.memberId === user?.id,
              primaryValue: m.totalSalesValue,
              secondaryValue: m.deliveredOrders,
              primaryLabel: 'Delivered Sales',
              secondaryLabel: 'Delivered Orders',
              unitLabel: 'orders',
            }))}
            compact={true}
            title="Team Delivered Sales Leaderboard"
            unitLabel="orders"
            onViewFullLeaderboard={() => navigate('/supervisor/team-members')}
          />
        </div>

        {/* Recent Activity Feed */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Recent Activity Feed</CardTitle>
              <CardDescription>Live team audit feed within past 30 days</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/supervisor/team')}
              className="text-xs"
            >
              View Team
            </Button>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-6 max-h-[420px] overflow-y-auto">
            <ActivityTimeline activities={activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


