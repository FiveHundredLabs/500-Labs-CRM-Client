import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, Order } from '../../models/domain';
import { userRepository, orderRepository } from '../../repositories';
import {
  SupervisorAnalyticsService,
  ReportsFilterOptions,
} from '../../services/supervisorAnalyticsService';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { Leaderboard } from '../../components/leaderboard';
import { TeamMemberFilters } from '../../components/supervisor/team/TeamMemberFilters';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';

import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';

export const SupervisorTeamMembersPage: React.FC = () => {
  const { user } = useAuth();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || '');

  const effectiveTeamId = user?.role === 'ADMIN' ? adminTeamId : user?.teamId || '';

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
      if (!user) return;
      if (!effectiveTeamId) {
        setTeamMembers([]);
        setOrders([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [membersData, ordersData] = await Promise.all([
          userRepository.getByTeamId(effectiveTeamId).catch(() => []),
          orderRepository.getByTeamId(effectiveTeamId).catch(() => []),
        ]);
        setTeamMembers(membersData.filter((m) => m.role === 'TEAM_MEMBER'));
        setOrders(ordersData);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, effectiveTeamId]);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Performance & Leaderboard"
        description="Comprehensive analysis of team member order handling, delivery rates, and revenue performance"
      />

      <AdminTeamSelector
        activeTeamId={effectiveTeamId}
        onTeamChange={setAdminTeamId}
        title="Team Leaderboard Scope"
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

      {/* Full Leaderboard Component */}
      <Leaderboard
        items={filteredLeaderboard.map((m) => ({
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
        chartTitle="Team Member Delivered Sales Ranking"
        tableTitle="Team Performance & Delivered Sales Table"
        primaryLabel="Delivered Sales"
        secondaryLabel="Delivered Orders"
        unitLabel="orders"
      />
    </div>
  );
};

