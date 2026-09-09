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
  supervisorTargetRepository,
} from '../../repositories';
import type { SupervisorSalesTarget } from '../../models/domain';
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
  Target,
  Award,
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
import { getAmountToCollect, getProductSalesValue } from '../../utils/orderAmounts';
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

  // Supervisor team goal state
  const [supervisorTarget, setSupervisorTarget] = useState<SupervisorSalesTarget | null>(null);

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

  // Load supervisor's own team goal (current month)
  useEffect(() => {
    if (!user) return;
    const currentMonth = new Date().toISOString().substring(0, 7);
    supervisorTargetRepository
      .getAll(currentMonth, user.id)
      .then((results) => setSupervisorTarget(results[0] || null))
      .catch(() => setSupervisorTarget(null));
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
    (sum, o) => sum + getAmountToCollect(o),
    0
  );

  const totalDeliveredSales = scopedOrders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + getProductSalesValue(o), 0);

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
    <div className="space-y-6 pb-16">
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
            <Calendar className="w-4 h-4 text-[#01A8F3] shrink-0" />
            <span>Time Period Scope:</span>
            <span className="text-[10px] bg-[#E8F7FE] text-[#0188C7] font-bold px-2.5 py-0.5 rounded-full capitalize tracking-normal border border-[#B9E7FC]">
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
                    ? 'bg-[#01A8F3] text-white shadow-xs font-bold'
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
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/20"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">To Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/20"
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

      {/* Supervisor Team Goal & Incentive Widget */}
      {supervisorTarget && (() => {
        const pct = Number(supervisorTarget.achievementPercentage || 0);
        const isAchieved = pct >= 100;
        const isNear = pct >= 80 && pct < 100;
        return (
          <div className={`p-4 rounded-xl border shadow-2xs ${isAchieved ? 'bg-emerald-50 border-emerald-200' : isNear ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isAchieved ? 'bg-emerald-500/20' : 'bg-blue-500/10'}`}>
                  <Target className={`w-5 h-5 ${isAchieved ? 'text-emerald-600' : 'text-blue-600'}`} />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    My Team Goal — {supervisorTarget.evaluatedMonth || supervisorTarget.month}
                    {isAchieved && <span className="ml-2 text-emerald-700">🏆 Goal Achieved!</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Collective team sales target · {supervisorTarget.membersCount || 0} team member(s)
                  </div>
                </div>
              </div>
              {(supervisorTarget.unlockedAllowance || 0) > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg px-3 py-1.5 font-bold text-xs">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  Incentive Unlocked: {formatCurrency(supervisorTarget.unlockedAllowance!)}
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-2 bg-white/80 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Team Target</div>
                <div className="font-bold font-mono text-slate-900 text-sm mt-0.5">{formatCurrency(supervisorTarget.targetAmount)}</div>
              </div>
              <div className="text-center p-2 bg-white/80 rounded-lg border border-slate-100">
                <div className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Team Sales</div>
                <div className="font-bold font-mono text-emerald-800 text-sm mt-0.5">{formatCurrency(supervisorTarget.totalTeamSales || 0)}</div>
              </div>
              <div className="text-center p-2 bg-white/80 rounded-lg border border-slate-100">
                <div className={`text-[10px] font-semibold uppercase tracking-wider ${isAchieved ? 'text-emerald-600' : isNear ? 'text-amber-600' : 'text-blue-600'}`}>Achievement</div>
                <div className={`font-bold font-mono text-sm mt-0.5 ${isAchieved ? 'text-emerald-800' : isNear ? 'text-amber-800' : 'text-blue-800'}`}>{pct.toFixed(1)}%</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isAchieved ? 'bg-gradient-to-r from-emerald-400 to-green-500' : isNear ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>

            {/* Tier badges */}
            {supervisorTarget.tiers && supervisorTarget.tiers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {supervisorTarget.tiers.map((tier, i) => {
                  const isUnlocked = pct >= Number(tier.minPercentage);
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isUnlocked ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                    >
                      {isUnlocked && <Award className="w-2.5 h-2.5 text-emerald-600" />}
                      {Number(tier.minPercentage)}% → {formatCurrency(Number(tier.allowanceAmount))}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* KPI Metric Cards Scoped to Date Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 xl:gap-3">
        <StatCard
          size="compact"
          title="Gross Sales"
          value={formatCurrency(totalGrossSales)}
          subtitle={`${totalOrders} Booked Orders`}
          icon={<DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          size="compact"
          title="Delivered"
          value={formatCurrency(totalDeliveredSales)}
          subtitle={`${deliveredOrders} Delivered (${deliveryRate}%)`}
          icon={<CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          size="compact"
          title="Dispatched"
          value={`${dispatchedOrders} Orders`}
          subtitle="In courier transit"
          icon={<Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />}
          accentColor="amber"
        />
        <StatCard
          size="compact"
          title="Interested"
          value={scopedInterestedContacts.length}
          subtitle="Qualified prospect leads"
          icon={<Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />}
          accentColor="purple"
        />
        <StatCard
          size="compact"
          title="Calls Handled"
          value={scopedCalls.length}
          subtitle="Customer calls logged"
          icon={<PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />}
          accentColor="blue"
        />
        <StatCard
          size="compact"
          title="Rejected / Ret."
          value={rejectedOrders}
          subtitle="Customer rejected / returned"
          icon={<XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />}
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


