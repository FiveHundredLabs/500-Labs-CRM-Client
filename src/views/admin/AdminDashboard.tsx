import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  teamRepository,
  userRepository,
  contactRepository,
  orderRepository,
  activityLogRepository,
  deliveryStatusHistoryRepository,
  expenseRepository,
  callLogRepository,
} from '../../repositories';
import { Team, User, Contact, Order, ActivityLog, DeliveryStatusHistory, Expense, CallLog } from '../../models/domain';
import { SupervisorAnalyticsService } from '../../services/supervisorAnalyticsService';
import { AdminAnalyticsService } from '../../services/adminAnalyticsService';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { LoadingState } from '../../components/shared/LoadingState';
import { Leaderboard } from '../../components/leaderboard';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { PhoneCall, CheckCircle2, Package, Trophy, ArrowRight, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const COMPANY_LINE_COLORS: Record<string, string> = {
  'Brand Alpha': '#7c3aed', // Primary Purple
  'Brand Beta': '#2563eb',  // Royal Blue
};
const FALLBACK_COLORS = ['#7c3aed', '#2563EB', '#16A34A', '#D97706', '#4F46E5', '#EC4899'];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [histories, setHistories] = useState<DeliveryStatusHistory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tList, uList, cList, oList, logs, dshList, expList, clList] = await Promise.all([
          teamRepository.getAll(),
          userRepository.getAll(),
          contactRepository.getAll(),
          orderRepository.getAll(),
          activityLogRepository.getAll(),
          deliveryStatusHistoryRepository.getAll(),
          expenseRepository.getAll(),
          callLogRepository.getAll(),
        ]);
        setTeams(tList);
        setUsers(uList);
        setContacts(cList);
        setOrders(oList);
        setActivities(logs.slice(0, 5));
        setHistories(dshList);
        setExpenses(expList);
        setCallLogs(clList);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState rows={6} />;

  // 1. Dynamic KPI Calculations via AdminAnalyticsService
  const thisMonthDeliveredOrders = AdminAnalyticsService.getThisMonthDeliveredOrders(orders, histories);
  const todayInterestedCount = AdminAnalyticsService.getTodayInterestedCount(contacts, callLogs);
  const { count: lastDispatchedCount, latestDate: lastDispatchedDate } = AdminAnalyticsService.getLastDispatchedInfo(orders, histories);
  const thisMonthExpenses = AdminAnalyticsService.getThisMonthExpenses(expenses);

  // 2. Line Chart Data (Last 12 Months Delivered Orders by Company)
  const monthlyDeliveredData = AdminAnalyticsService.getMonthlyDeliveredOrdersByCompany(orders, teams, histories);

  // 3. Dynamic calculation for Team Leaderboards Section
  const teamLeaderboardSummaries = teams.map((team) => {
    const teamMembers = users.filter(
      (u) => u.teamId === team.id && u.role === 'TEAM_MEMBER' && u.isActive
    );
    const teamOrders = orders.filter((o) => o.teamId === team.id);
    const stats = SupervisorAnalyticsService.computeLeaderboard(teamMembers, teamOrders);

    return {
      team,
      stats,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description="System-wide metrics, sales trends, and team performance audit"
      />

      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="This Month Delivered Orders"
          value={thisMonthDeliveredOrders}
          subtitle="Delivered in current calendar month"
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="green"
        />
        <StatCard
          title="Today's Interested Count"
          value={todayInterestedCount}
          subtitle="Interested leads recorded today"
          icon={<PhoneCall className="w-4 h-4" />}
          accentColor="blue"
        />
        <StatCard
          title="Last Dispatched Count"
          value={lastDispatchedCount}
          subtitle={lastDispatchedDate ? `Latest dispatch: ${lastDispatchedDate}` : 'Most recent dispatch date'}
          icon={<Package className="w-4 h-4" />}
          accentColor="amber"
        />
        <StatCard
          title="This Month Expenses"
          value={formatCurrency(thisMonthExpenses)}
          subtitle="Current calendar month total expenses"
          icon={<DollarSign className="w-4 h-4" />}
          accentColor="purple"
        />
      </div>

      {/* Monthly Delivered Orders Line Chart (Last 12 Months) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Monthly Delivered Orders</CardTitle>
            <CardDescription>Last 12 Months Delivered Orders</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyDeliveredData} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="monthLabel" stroke="#64748B" fontSize={12} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
              <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                  color: '#0F172A',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              {teams.map((team, idx) => (
                <Line
                  key={team.id}
                  type="monotone"
                  dataKey={team.name}
                  name={team.name}
                  stroke={COMPANY_LINE_COLORS[team.name] || team.brandColor || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Dynamic Team Leaderboards Comparison Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Team Performance Leaderboards</span>
            </h2>
            <p className="text-xs text-slate-500">
              Comparative view of member rankings across teams
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/leaderboards')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>View Full Leaderboards Module</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teamLeaderboardSummaries.map(({ team, stats }) => {
            const isBrandAlpha = team.name.toLowerCase().includes('alpha');
            return (
              <Leaderboard
                key={team.id}
                items={stats.map((m) => ({
                  id: m.memberId,
                  rank: m.rank,
                  name: m.memberName,
                  avatarUrl: m.avatarUrl,
                  primaryValue: m.deliveredOrders,
                  secondaryValue: m.totalOrders,
                  primaryLabel: 'Delivered',
                  secondaryLabel: 'Handled Orders',
                  unitLabel: 'orders',
                }))}
                compact={true}
                limit={isBrandAlpha ? 3 : undefined}
                title={`${team.name} Leaderboard`}
                unitLabel="orders"
                onViewFullLeaderboard={() => navigate('/admin/leaderboards')}
              />
            );
          })}
        </div>
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity Audit</CardTitle>
          <CardDescription>Recent cross-team operations and user actions</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[350px] overflow-y-auto">
          <ActivityTimeline activities={activities} />
        </CardContent>
      </Card>
    </div>
  );
};
