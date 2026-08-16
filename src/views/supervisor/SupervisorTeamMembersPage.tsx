import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, Order } from '../../models/domain';
import { userRepository, orderRepository } from '../../repositories';
import {
  SupervisorAnalyticsService,
  ReportsFilterOptions,
} from '../../services/supervisorAnalyticsService';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { Leaderboard } from '../../components/leaderboard';
import { TeamMemberFilters } from '../../components/supervisor/team/TeamMemberFilters';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { Trophy, Users, CheckCircle2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export const SupervisorTeamMembersPage: React.FC = () => {
  const { user } = useAuth();

  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      if (!user || !user.teamId) return;
      setLoading(true);
      try {
        const [membersData, ordersData] = await Promise.all([
          userRepository.getByTeamId(user.teamId),
          orderRepository.getByTeamId(user.teamId),
        ]);
        setTeamMembers(membersData.filter((m) => m.role === 'TEAM_MEMBER'));
        setOrders(ordersData);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'THIS_MONTH') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (preset === 'LAST_MONTH') {
      const prev = subMonths(now, 1);
      setStartDate(format(startOfMonth(prev), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(prev), 'yyyy-MM-dd'));
    } else if (preset === 'THIS_WEEK') {
      setStartDate(format(startOfWeek(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(now), 'yyyy-MM-dd'));
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  if (loading) return <LoadingState rows={8} />;

  const filters: ReportsFilterOptions = {
    datePreset,
    startDate,
    endDate,
    searchQuery,
  };

  const leaderboard = SupervisorAnalyticsService.computeLeaderboard(teamMembers, orders, filters);

  // Search query filter applied to leaderboard list
  const filteredLeaderboard = searchQuery.trim()
    ? leaderboard.filter((m) => m.memberName.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : leaderboard;

  // Aggregate metrics
  const totalHandledOrders = leaderboard.reduce((acc, curr) => acc + curr.totalOrders, 0);
  const totalDeliveredOrders = leaderboard.reduce((acc, curr) => acc + curr.deliveredOrders, 0);
  const totalSalesRevenue = leaderboard.reduce((acc, curr) => acc + curr.totalSalesValue, 0);
  const overallDeliveryRate =
    totalHandledOrders > 0 ? Math.round((totalDeliveredOrders / totalHandledOrders) * 1000) / 10 : 0;
  const topPerformer = leaderboard.length > 0 ? leaderboard[0].memberName : 'None';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Performance & Leaderboard"
        description="Comprehensive analysis of team member order handling, delivery rates, and revenue performance"
      />

      {/* Top Level Performance Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Top Performer"
          value={topPerformer}
          subtitle={`Rank #1 in Team`}
          icon={<Trophy className="w-4 h-4 text-amber-500" />}
          accentColor="amber"
        />
        <StatCard
          title="Handled Orders"
          value={totalHandledOrders}
          subtitle={`${teamMembers.length} active members`}
          icon={<Users className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Delivered Rate"
          value={`${overallDeliveryRate}%`}
          subtitle={`${totalDeliveredOrders} of ${totalHandledOrders} orders`}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          title="Total Team Sales"
          value={formatCurrency(totalSalesRevenue)}
          subtitle="Delivered order revenue"
          icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
          accentColor="purple"
        />
      </div>

      {/* Filters */}
      <TeamMemberFilters
        datePreset={datePreset}
        onDatePresetChange={handleDatePresetChange}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {/* Full Leaderboard Component */}
      <Leaderboard
        items={filteredLeaderboard.map((m) => ({
          id: m.memberId,
          rank: m.rank,
          name: m.memberName,
          avatarUrl: m.avatarUrl,
          isCurrentUser: m.memberId === user?.id,
          primaryValue: m.deliveredOrders,
          secondaryValue: m.totalOrders,
          primaryLabel: 'Delivered',
          secondaryLabel: 'Handled Orders',
          unitLabel: 'orders',
        }))}
        chartTitle="Team Member Delivered Orders Ranking"
        tableTitle="Team Performance Data Table"
        primaryLabel="Delivered"
        secondaryLabel="Total Orders"
        unitLabel="orders"
      />
    </div>
  );
};
