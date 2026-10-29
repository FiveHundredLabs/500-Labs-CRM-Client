import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teamRepository, userRepository } from '../../repositories';
import { Team } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { Leaderboard } from '../../components/leaderboard';
import { TeamMemberFilters } from '../../components/supervisor/team/TeamMemberFilters';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { Layers } from 'lucide-react';

export const AdminLeaderboardsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlTeamId = searchParams.get('teamId');

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [backendLeaderboard, setBackendLeaderboard] = useState<any[] | null>(null);

  // 1. Load active sales teams only
  useEffect(() => {
    let isMounted = true;
    setLoadingTeams(true);
    teamRepository
      .getAll()
      .then((teamsData) => {
        if (!isMounted) return;
        const salesTeams = teamsData.filter((t) => t.includeInSalesCalculations !== false);
        setTeams(salesTeams);

        if (salesTeams.length > 0) {
          const matched = urlTeamId && salesTeams.some((t) => t.id === urlTeamId);
          setSelectedTeamId(matched ? urlTeamId : salesTeams[0].id);
        }
      })
      .catch((err) => {
        if (isMounted) console.error('Failed to load teams:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingTeams(false);
      });

    return () => {
      isMounted = false;
    };
  }, [urlTeamId]);

  // 2. Fetch server-aggregated leaderboard for selected team & date range
  useEffect(() => {
    if (!selectedTeamId) {
      setBackendLeaderboard(null);
      return;
    }
    let active = true;
    setLeaderboardLoading(true);
    setLeaderboardError(null);

    userRepository
      .getLeaderboard(selectedTeamId, startDate || undefined, endDate || undefined)
      .then((data) => {
        if (active && Array.isArray(data)) {
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
            primaryValue: m.deliveredSalesAmount || 0,
            secondaryValue: m.deliveredOrdersCount || 0,
            primaryLabel: 'Delivered Sales',
            secondaryLabel: 'Delivered Orders',
            unitLabel: 'orders',
            deliveredOrdersList: m.deliveredOrdersList || [],
          }));
          setBackendLeaderboard(ranked);
        }
      })
      .catch((err) => {
        console.error('Could not load backend leaderboard:', err);
        if (active) {
          setBackendLeaderboard([]);
          setLeaderboardError('Failed to load leaderboard data. Please try again.');
        }
      })
      .finally(() => {
        if (active) setLeaderboardLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTeamId, startDate, endDate]);

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

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  const leaderboardItems = useMemo(() => {
    if (!backendLeaderboard) return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return backendLeaderboard.filter((m) => m.name.toLowerCase().includes(q));
    }
    return backendLeaderboard;
  }, [backendLeaderboard, searchQuery]);

  if (loadingTeams) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Team Leaderboards"
        description="Cross-team performance rankings, delivery fulfillment analysis, and sales metrics"
      />

      {/* Top-Center Team Selector */}
      <div className="flex justify-center w-full">
        <div className="inline-flex p-1.5 bg-slate-100/90 rounded-xl shadow-xs border border-slate-200">
          {teams.map((team) => {
            const isSelected = selectedTeamId === team.id;
            return (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Layers className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{team.name}</span>
              </button>
            );
          })}
        </div>
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

      {/* Shared Leaderboard Component */}
      {leaderboardLoading ? (
        <LoadingState rows={6} />
      ) : (
        <Leaderboard
          items={leaderboardItems}
          chartTitle={`${selectedTeam ? selectedTeam.name : 'Team'} Member Delivered Sales Ranking`}
          tableTitle={`${selectedTeam ? selectedTeam.name : 'Team'} Sales Performance Data Table`}
          primaryLabel="Delivered Sales"
          secondaryLabel="Delivered Orders"
          unitLabel="orders"
          emptyMessage={
            leaderboardError ||
            `No leaderboard data available for ${selectedTeam ? selectedTeam.name : 'this team'}.`
          }
        />
      )}
    </div>
  );
};
