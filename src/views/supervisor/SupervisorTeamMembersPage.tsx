import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userRepository } from '../../repositories';
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

  const [loading, setLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [backendLeaderboard, setBackendLeaderboard] = useState<any[] | null>(null);

  // Fetch server-aggregated team leaderboard
  useEffect(() => {
    if (!effectiveTeamId) {
      setBackendLeaderboard(null);
      return;
    }

    let active = true;
    setLoading(true);
    setLeaderboardError(null);

    userRepository
      .getLeaderboard(effectiveTeamId, startDate || undefined, endDate || undefined)
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data)) {
          const sorted = [...data].sort(
            (a, b) =>
              (b.deliveredSalesAmount || 0) - (a.deliveredSalesAmount || 0) ||
              (b.deliveredOrdersCount || 0) - (a.deliveredOrdersCount || 0)
          );
          const ranked = sorted.map((m, idx) => ({
            id: m.id,
            rank: idx + 1,
            name: m.fullName || m.username || 'Agent',
            avatarUrl: m.avatarUrl,
            isCurrentUser: m.id === user?.id,
            primaryValue: m.deliveredSalesAmount || 0,
            secondaryValue: m.deliveredOrdersCount || 0,
            primaryLabel: 'Delivered Sales',
            secondaryLabel: 'Delivered Orders',
            unitLabel: 'orders',
            deliveredOrdersList: m.deliveredOrdersList || [],
          }));
          setBackendLeaderboard(ranked);
        } else {
          setBackendLeaderboard([]);
        }
      })
      .catch((err) => {
        console.error('Could not load backend leaderboard:', err);
        if (active) {
          setBackendLeaderboard([]);
          setLeaderboardError('Failed to load team leaderboard data. Please try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [effectiveTeamId, startDate, endDate, user?.id]);

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

  const leaderboardItems = useMemo(() => {
    if (!backendLeaderboard) return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return backendLeaderboard.filter((m) => m.name.toLowerCase().includes(q));
    }
    return backendLeaderboard;
  }, [backendLeaderboard, searchQuery]);

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
      {loading ? (
        <LoadingState rows={8} />
      ) : (
        <Leaderboard
          items={leaderboardItems}
          chartTitle="Team Member Delivered Sales Ranking"
          tableTitle="Team Performance & Delivered Sales Table"
          primaryLabel="Delivered Sales"
          secondaryLabel="Delivered Orders"
          unitLabel="orders"
          emptyMessage={leaderboardError || 'No leaderboard data available for this team and date range.'}
        />
      )}
    </div>
  );
};
