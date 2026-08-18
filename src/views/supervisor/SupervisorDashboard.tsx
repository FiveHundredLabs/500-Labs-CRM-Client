import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, Contact, Order, ActivityLog, Product, CallLog } from '../../models/domain';
import { userRepository, contactRepository, orderRepository, activityLogRepository, productRepository, callLogRepository } from '../../repositories';
import { SupervisorAnalyticsService } from '../../services/supervisorAnalyticsService';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { LoadingState } from '../../components/shared/LoadingState';
import { Leaderboard } from '../../components/leaderboard';
import { Users, Upload, Layers, Package, CheckCircle2, Truck, XCircle, PieChart, AlertTriangle, Calendar, PhoneCall, Sparkles, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';

export type DashboardDateFilter = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_6_MONTHS' | 'CUSTOM';

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
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user || !user.teamId) return;
      setLoading(true);
      try {
        const [members, tContacts, tOrders, cLogs, teamProducts, logs] = await Promise.all([
          userRepository.getByTeamId(user.teamId),
          contactRepository.getByTeamId(user.teamId),
          orderRepository.getByTeamId(user.teamId),
          callLogRepository.getByTeamId(user.teamId),
          productRepository.getByTeamId(user.teamId),
          activityLogRepository.getRecentWithinMonth(),
        ]);

        setTeamMembers(members.filter((m) => m.role === 'TEAM_MEMBER'));
        setContacts(tContacts);
        setOrders(tOrders);
        setCallLogs(cLogs);
        setProducts(teamProducts);
        setActivities(logs.filter((l) => !l.teamId || l.teamId === user.teamId).slice(0, 8));
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  // Date Range Matcher Helper
  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr) return false;
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
  const scopedOrders = useMemo(() => orders.filter((o) => isDateInFilter(o.createdAt)), [orders, dateFilter, startDate, endDate]);
  const scopedCalls = useMemo(() => callLogs.filter((cl) => isDateInFilter(cl.calledAt)), [callLogs, dateFilter, startDate, endDate]);
  const scopedInterestedContacts = useMemo(
    () => contacts.filter((c) => c.status === 'INTERESTED' && isDateInFilter(c.updatedAt || c.importedAt)),
    [contacts, dateFilter, startDate, endDate]
  );

  // Status Metrics
  const totalOrders = scopedOrders.length;
  const dispatchedOrders = scopedOrders.filter((o) => o.status === 'DISPATCHED').length;
  const deliveredOrders = scopedOrders.filter((o) => o.status === 'DELIVERED').length;
  const rejectedOrders = scopedOrders.filter((o) => o.status === 'REJECTED' || o.status === 'RETURNED').length;
  const totalSales = scopedOrders.filter((o) => o.status === 'DELIVERED').reduce((sum, o) => sum + o.totalAmount, 0);

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
    <div className="space-y-6">
      <PageHeader
        title="Supervisor Overview"
        description="Operational & Sales Control Center"
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
      <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Dashboard Date Scoping Filter</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'TODAY', label: 'Today' },
              { key: 'THIS_WEEK', label: 'This Week' },
              { key: 'THIS_MONTH', label: 'This Month' },
              { key: 'LAST_MONTH', label: 'Last Month' },
              { key: 'LAST_6_MONTHS', label: 'Last 6 Months' },
              { key: 'CUSTOM', label: 'Custom' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setDateFilter(item.key as DashboardDateFilter)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  dateFilter === item.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 max-w-md">
            <Input
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Low Stock Alert Section (Requirement 2.13) */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-amber-900">
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
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard
          title="Calls Handled"
          value={scopedCalls.length}
          subtitle="Calls in selected period"
          icon={<PhoneCall className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Interested Leads"
          value={scopedInterestedContacts.length}
          subtitle="Captured interested leads"
          icon={<Sparkles className="w-4 h-4 text-amber-600" />}
          accentColor="amber"
        />
        <StatCard
          title="Total Orders"
          value={totalOrders}
          subtitle="Created in period"
          icon={<Package className="w-4 h-4 text-purple-600" />}
          accentColor="purple"
        />
        <StatCard
          title="Delivered Sales"
          value={`LKR ${totalSales.toLocaleString()}`}
          subtitle={`${deliveredOrders} delivered orders`}
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          title="Dispatched"
          value={dispatchedOrders}
          subtitle="In-transit orders"
          icon={<Truck className="w-4 h-4 text-amber-600" />}
          accentColor="amber"
        />
        <StatCard
          title="Rejected"
          value={rejectedOrders}
          subtitle="Rejected orders"
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
              primaryValue: m.deliveredOrders,
              secondaryValue: m.totalOrders,
              primaryLabel: 'Delivered',
              secondaryLabel: 'Orders Handled',
              unitLabel: 'orders',
            }))}
            compact={true}
            title="Team Delivered Leaderboard"
            unitLabel="orders"
            onViewFullLeaderboard={() => navigate('/supervisor/team-members')}
          />
        </div>

        {/* Recent Activity Feed */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Recent Activity Feed</CardTitle>
            <CardDescription>Live team audit feed within past 30 days</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-y-auto">
            <ActivityTimeline activities={activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

