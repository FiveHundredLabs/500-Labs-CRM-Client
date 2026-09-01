import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  teamRepository,
  userRepository,
  contactRepository,
  orderRepository,
  activityLogRepository,
  expenseRepository,
  approvalRequestRepository,
  emailNotificationRepository,
} from '../../repositories';
import { Team, User, Contact, Order, ActivityLog, Expense, ApprovalRequest, EmailNotification } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { LoadingState } from '../../components/shared/LoadingState';
import { Leaderboard } from '../../components/leaderboard';
import {
  PhoneCall,
  CheckCircle2,
  Package,
  Trophy,
  ArrowRight,
  DollarSign,
  Users,
  Shield,
  Layers,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  Bell,
  Clock,
  AlertTriangle,
  Target,
  Calendar,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
} from 'date-fns';
import toast from 'react-hot-toast';

export type AdminDashboardDateFilter = 'THIS_MONTH' | 'LAST_MONTH' | 'TODAY' | 'THIS_WEEK' | 'ALL' | 'CUSTOM';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<AdminDashboardDateFilter>('THIS_MONTH');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [tList, uList, cList, oList, logs, expList, reqList, eLogs] = await Promise.all([
          teamRepository.getAll(),
          userRepository.getAll(),
          contactRepository.getAll(),
          orderRepository.getAll(),
          activityLogRepository.getAll(),
          expenseRepository.getAll(),
          approvalRequestRepository.getAll(),
          emailNotificationRepository.getAll(),
        ]);
        setTeams(tList);
        setUsers(uList);
        setContacts(cList);
        setOrders(oList);
        setActivities(logs);
        setExpenses(expList);
        setPendingApprovals(reqList.filter((r) => r.status === 'PENDING'));
        setEmailLogs(eLogs);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

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

  const scopedContacts = useMemo(
    () => contacts.filter((c) => isDateInFilter(c.updatedAt || c.importedAt)),
    [contacts, dateFilter, startDate, endDate]
  );

  const scopedExpenses = useMemo(
    () => expenses.filter((e: any) => isDateInFilter(e.expenseDate || e.createdAt || e.date)),
    [expenses, dateFilter, startDate, endDate]
  );

  // Dynamic KPI Metrics with explicit Number() casting
  const totalGrossSales = scopedOrders.reduce(
    (acc, curr) =>
      acc + Number(curr.codAmount !== undefined && curr.codAmount !== null ? curr.codAmount : (curr.totalAmount || 0)),
    0
  );
  const lastDispatchedCount = scopedOrders.filter((o) => o.status === 'DISPATCHED').length;
  const totalDeliveredOrders = scopedOrders.filter((o) => o.status === 'DELIVERED').length;
  const todayInterestedCount = scopedContacts.filter((c) => c.status === 'INTERESTED').length;
  const totalMonthlyExpenses = scopedExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // Dynamic Per-Team Leaderboards based on loaded teams and scoped orders
  const teamLeaderboards = teams.map((team) => {
    const teamMembers = users.filter((u) => u.teamId === team.id && u.role === 'TEAM_MEMBER');
    const list = teamMembers.map((m) => {
      const memberOrders = scopedOrders.filter((o) => o.teamMemberId === m.id);
      const deliveredOrders = memberOrders.filter((o) => o.status === 'DELIVERED');
      const deliveredSalesAmount = deliveredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      const deliveredCount = deliveredOrders.length;
      return {
        id: m.id,
        rank: 0,
        name: m.fullName,
        avatarUrl: m.avatarUrl,
        primaryValue: deliveredSalesAmount,
        secondaryValue: deliveredCount,
        primaryLabel: 'Delivered Sales',
        secondaryLabel: 'Delivered Orders',
        unitLabel: 'orders',
      };
    });
    list.sort((a, b) => b.primaryValue - a.primaryValue || b.secondaryValue - a.secondaryValue);
    list.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    return { team, items: list.slice(0, 5) };
  });

  const recentActivities: ActivityLog[] = activities.slice(0, 6);

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-24 overflow-hidden">
      <PageHeader
        title="Executive Overview"
        description="System-wide performance metrics, multi-brand sales trends, and cross-team audit"
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/reports')}
              className="flex-1 sm:flex-initial"
            >
              System Reports
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Users className="w-4 h-4" />}
              onClick={() => navigate('/admin/users')}
              className="flex-1 sm:flex-initial"
            >
              Manage Users
            </Button>
          </div>
        }
      />

      {/* In-System Notifications & Pending Approvals Banner (Section 6) */}
      {pendingApprovals.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-amber-800 flex items-center gap-2 flex-wrap">
                <span>In-System Notification: Pending Approvals</span>
                <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-extrabold text-[10px]">
                  {pendingApprovals.length} Pending
                </span>
              </div>
              <div className="text-xs text-amber-900 mt-0.5 line-clamp-1 sm:line-clamp-none">
                {pendingApprovals.map((r) => `${r.requestedByName}: ${r.requestType.replace(/_/g, ' ')} (${r.productName})`).join(' • ')}
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/approvals')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs w-full sm:w-auto"
          >
            Review Approvals Center
          </Button>
        </div>
      )}

      {/* Executive Date Scoping Filter Tab Toolbar */}
      <div className="p-3 sm:p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
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
                : `${startDate} to ${endDate}`}
            </span>
          </div>

          {/* Filter Tab Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'THIS_MONTH', label: 'This Month' },
              { key: 'LAST_MONTH', label: 'Last Month' },
              { key: 'TODAY', label: 'Today' },
              { key: 'THIS_WEEK', label: 'This Week' },
              { key: 'ALL', label: 'All Time (Total)' },
              { key: 'CUSTOM', label: 'Custom' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setDateFilter(item.key as AdminDashboardDateFilter)}
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

      {/* 1. Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <StatCard
          title="Gross Sales"
          value={formatCurrency(totalGrossSales)}
          subtitle={`${scopedOrders.length} Booked Orders`}
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
          className="col-span-2 sm:col-span-1"
        />

        <StatCard
          title="Dispatched"
          value={`${lastDispatchedCount} Orders`}
          subtitle="In courier transit"
          icon={<Package className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />

        <StatCard
          title="Delivered"
          value={totalDeliveredOrders}
          subtitle="Customer handovers"
          icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />

        <StatCard
          title="Interested"
          value={todayInterestedCount}
          subtitle="Qualified leads"
          icon={<PhoneCall className="w-4 h-4 text-purple-600" />}
          accentColor="purple"
        />

        <StatCard
          title="Expenses"
          value={formatCurrency(totalMonthlyExpenses)}
          subtitle="Finance logged"
          icon={<DollarSign className="w-4 h-4 text-amber-600" />}
          accentColor="amber"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* 2. Quick Executive Action Navigation Strip */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3 sm:p-4 space-y-2.5">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Multi-Team Operations Shortcuts:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Target className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
              onClick={() => navigate('/admin/sales-goals')}
              className="bg-rose-50/50 hover:bg-rose-50 text-rose-900 border-rose-200 text-xs justify-start truncate"
            >
              Sales Goals
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              onClick={() => navigate('/admin/import')}
              className="text-xs justify-start truncate"
            >
              Import Leads
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              onClick={() => navigate('/admin/allocation')}
              className="text-xs justify-start truncate"
            >
              Allocate Pool
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
              onClick={() => navigate('/admin/orders')}
              className="text-xs justify-start truncate"
            >
              Dispatched Orders
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<DollarSign className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
              onClick={() => navigate('/admin/finance/expenses')}
              className="text-xs justify-start truncate col-span-2 sm:col-span-1"
            >
              Expenses Register
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Team Leaderboards Comparison Section */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
              <span>Top Tele-Calling Specialists Ranking</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Performance leaderboard by verified delivered sales amount (LKR) across teams
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate('/supervisor/team-members')}
            className="w-full sm:w-auto text-xs"
          >
            Full Performance Report
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {teamLeaderboards.map(({ team, items }) => (
            <Leaderboard
              key={team.id}
              items={items}
              compact={true}
              title={`${team.name} Sales Leaderboard`}
              unitLabel="orders"
              onViewFullLeaderboard={() => navigate('/supervisor/team-members')}
            />
          ))}
        </div>
      </div>

      {/* 4. Live System Activity Audit Stream */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <span>System Activity Audit Stream</span>
            </CardTitle>
            <CardDescription className="text-xs">Live record of multi-team operations and platform state transitions</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate('/admin/activity')}
            className="w-full sm:w-auto text-xs"
          >
            View All Logs
          </Button>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-6 max-h-[360px] overflow-y-auto">
          <ActivityTimeline activities={recentActivities} />
        </CardContent>
      </Card>
    </div>
  );
};
