import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userRepository } from '../../repositories';
import { LeaderboardUser } from '../../repositories/interfaces';
import { PageHeader } from '../../components/shared/PageHeader';
import { Leaderboard, LeaderboardItem } from '../../components/leaderboard';
import { TeamMemberFilters } from '../../components/supervisor/team/TeamMemberFilters';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';

export const MemberLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const currentTeamId = user?.teamId;
        if (!currentTeamId) {
          setMembers([]);
          return;
        }
        const leaderboardData = await userRepository
          .getLeaderboard(currentTeamId, startDate || undefined, endDate || undefined)
          .catch(() => []);

        setMembers(leaderboardData);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [user?.teamId, startDate, endDate]);

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

  const filteredMembers = searchQuery.trim()
    ? members.filter((m) => m.fullName.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : members;

  const sortedMembers = [...filteredMembers].sort(
    (a, b) =>
      (b.deliveredSalesAmount || 0) - (a.deliveredSalesAmount || 0) ||
      (b.deliveredOrdersCount || 0) - (a.deliveredOrdersCount || 0)
  );

  const items: LeaderboardItem[] = sortedMembers.map((m, idx) => ({
    id: m.id,
    rank: idx + 1,
    name: m.fullName,
    avatarUrl: m.avatarUrl,
    isCurrentUser: m.id === user?.id,
    primaryValue: m.deliveredSalesAmount || 0,
    secondaryValue: m.deliveredOrdersCount || 0,
    primaryLabel: 'Delivered Sales',
    secondaryLabel: 'Delivered Orders',
    unitLabel: 'orders',
    deliveredOrdersList: m.deliveredOrdersList,
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
