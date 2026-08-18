import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

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
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Dynamic KPI Metrics
  const lastDispatchedCount = orders.filter((o) => o.status === 'DISPATCHED').length;
  const totalDeliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const todayInterestedCount = contacts.filter((c) => c.status === 'INTERESTED').length;
  const totalMonthlyExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Dynamic Per-Team Leaderboards based on loaded teams
  const teamLeaderboards = teams.map((team) => {
    const teamMembers = users.filter((u) => u.teamId === team.id && u.role === 'TEAM_MEMBER');
    const list = teamMembers.map((m) => {
      const memberOrders = orders.filter((o) => o.teamMemberId === m.id);
      const deliveredCount = memberOrders.filter((o) => o.status === 'DELIVERED').length;
      return {
        id: m.id,
        rank: 0,
        name: m.fullName,
        avatarUrl: m.avatarUrl,
        primaryValue: deliveredCount,
        secondaryValue: memberOrders.length,
        primaryLabel: 'Delivered',
        secondaryLabel: 'Handled Orders',
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Executive Overview"
        description="System-wide performance metrics, multi-brand sales trends, and cross-team audit"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Bell className="w-4 h-4 text-amber-600" />}
              onClick={() => navigate('/admin/approvals')}
            >
              Approvals Queue ({pendingApprovals.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<PieChartIcon className="w-4 h-4 text-blue-600" />}
              onClick={() => navigate('/admin/reports')}
            >
              System Reports
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Users className="w-4 h-4" />}
              onClick={() => navigate('/admin/users')}
            >
              Manage Users
            </Button>
          </div>
        }
      />

      {/* In-System Notifications & Pending Approvals Banner (Section 6) */}
      {pendingApprovals.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-amber-800 flex items-center gap-2">
                <span>In-System Notification: Pending Approval Requests</span>
                <span className="bg-amber-200 text-amber-900 px-2 py-0.2 rounded-full font-extrabold text-[10px]">
                  {pendingApprovals.length} Pending
                </span>
              </div>
              <div className="text-xs text-amber-900 mt-0.5">
                {pendingApprovals.map((r) => `${r.requestedByName}: ${r.requestType.replace(/_/g, ' ')} (${r.productName})`).join(' • ')}
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/approvals')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
          >
            Review Approvals Center
          </Button>
        </div>
      )}

      {/* 1. Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Last Dispatched Batch"
          value={`${lastDispatchedCount} Orders`}
          subtitle="Total dispatched orders"
          icon={<Package className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />

        <StatCard
          title="This Month Delivered Orders"
          value={totalDeliveredOrders}
          subtitle="Successful customer handovers"
          icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />

        <StatCard
          title="Today's Interested Leads"
          value={todayInterestedCount}
          subtitle="Qualified from live tele-calling"
          icon={<PhoneCall className="w-4 h-4 text-purple-600" />}
          accentColor="purple"
        />

        <StatCard
          title="Monthly Operating Expenses"
          value={formatCurrency(totalMonthlyExpenses)}
          subtitle="Finance logged expenditures"
          icon={<DollarSign className="w-4 h-4 text-amber-600" />}
          accentColor="amber"
        />
      </div>

      {/* 2. Quick Executive Action Navigation Strip */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Multi-Team Management Shortcuts:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                onClick={() => navigate('/admin/import')}
              >
                Import Leads
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Layers className="w-3.5 h-3.5 text-blue-600" />}
                onClick={() => navigate('/admin/allocation')}
              >
                Allocate Contacts
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Package className="w-3.5 h-3.5 text-amber-600" />}
                onClick={() => navigate('/admin/orders')}
              >
                Dispatched Orders
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<DollarSign className="w-3.5 h-3.5 text-purple-600" />}
                onClick={() => navigate('/admin/finance/expenses')}
              >
                Expenses Register
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Team Leaderboards Comparison Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Top Tele-Calling Specialists Ranking</span>
            </h2>
            <p className="text-xs text-slate-500">
              Performance leaderboard by verified delivered orders across teams
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate('/supervisor/team-members')}
          >
            Full Performance Report
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teamLeaderboards.map(({ team, items }) => (
            <Leaderboard
              key={team.id}
              items={items}
              compact={true}
              title={`${team.name} Leaderboard`}
              unitLabel="orders"
              onViewFullLeaderboard={() => navigate('/supervisor/team-members')}
            />
          ))}
        </div>
      </div>

      {/* 6. Live System Activity Audit Stream */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>System Activity Audit Stream</span>
            </CardTitle>
            <CardDescription>Live record of multi-team operations and platform state transitions</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate('/admin/activity')}
          >
            View All Logs
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 max-h-[360px] overflow-y-auto">
          <ActivityTimeline activities={recentActivities} />
        </CardContent>
      </Card>
    </div>
  );
};
