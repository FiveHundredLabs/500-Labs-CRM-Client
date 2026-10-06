import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, Order } from '../../models/domain';
import { userRepository, orderRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { Leaderboard, LeaderboardItem } from '../../components/leaderboard';
import { TeamMemberFilters } from '../../components/supervisor/team/TeamMemberFilters';
import {
  SupervisorAnalyticsService,
  ReportsFilterOptions,
} from '../../services/supervisorAnalyticsService';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';

export const MemberLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const currentTeamId = user?.teamId;
        if (!currentTeamId) {
          setMembers([]);
          setAllOrders([]);
          return;
        }
        const [teamUsers, teamOrders] = await Promise.all([
          userRepository.getByTeamId(currentTeamId).catch(() => []),
          orderRepository.getByTeamId(currentTeamId).catch(() => []),
        ]);

        const activeMembers = teamUsers.filter((u) => u.role === 'TEAM_MEMBER' && u.isActive);
        setMembers(activeMembers);
        setAllOrders(teamOrders);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
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
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'CUSTOM') {
      if (!startDate && !endDate) {
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
      }
    }
  };

  const filters: ReportsFilterOptions = {
    datePreset,
    startDate,
    endDate,
    searchQuery,
  };

  const leaderboardStats = SupervisorAnalyticsService.computeLeaderboard(members, allOrders, filters);

  const filteredLeaderboard = searchQuery.trim()
    ? leaderboardStats.filter((m) => m.memberName.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : leaderboardStats;

  const items: LeaderboardItem[] = filteredLeaderboard.map((m) => ({
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
  }));

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Delivered Sales Leaderboard"
        description="Team member rankings based on total verified delivered sales revenue (LKR)"
      />

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

      <Leaderboard
        items={items}
        loading={loading}
        chartTitle="Delivered Sales Revenue Ranking"
        tableTitle="Delivered Sales Performance Table"
        primaryLabel="Delivered Sales"
        secondaryLabel="Delivered Orders"
        unitLabel="orders"
      />
    </div>
  );
};
