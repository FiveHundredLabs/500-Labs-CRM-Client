import React, { useState, useEffect } from 'react';
import { teamRepository, userRepository, orderRepository } from '../../repositories';
import { Team, User, Order } from '../../models/domain';
import {
  SupervisorAnalyticsService,
  ReportsFilterOptions,
} from '../../services/supervisorAnalyticsService';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { Leaderboard } from '../../components/leaderboard';
import { TeamMemberFilters } from '../../components/supervisor/team/TeamMemberFilters';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { Layers } from 'lucide-react';

export const AdminLeaderboardsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [teamsData, usersData, ordersData] = await Promise.all([
          teamRepository.getAll(),
          userRepository.getAll(),
          orderRepository.getAll(),
        ]);
        setTeams(teamsData);
        setUsers(usersData);
        setOrders(ordersData);

        if (teamsData.length > 0) {
          setSelectedTeamId(teamsData[0].id);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  // Get active team members and orders for selected team
  const teamMembers = users.filter(
    (u) => u.teamId === selectedTeamId && u.role === 'TEAM_MEMBER' && u.isActive
  );
  const teamOrders = orders.filter((o) => o.teamId === selectedTeamId);

  const filters: ReportsFilterOptions = {
    datePreset,
    startDate,
    endDate,
    searchQuery,
  };

  // Compute leaderboard using shared analytics service
  const leaderboard = SupervisorAnalyticsService.computeLeaderboard(teamMembers, teamOrders, filters);

  // Search query filter applied to leaderboard list
  const filteredLeaderboard = searchQuery.trim()
    ? leaderboard.filter((m) => m.memberName.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : leaderboard;

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

      {/* Reused Shared Leaderboard Component */}
      <Leaderboard
        items={filteredLeaderboard.map((m) => ({
          id: m.memberId,
          rank: m.rank,
          name: m.memberName,
          avatarUrl: m.avatarUrl,
          primaryValue: m.totalSalesValue,
          secondaryValue: m.deliveredOrders,
          primaryLabel: 'Delivered Sales',
          secondaryLabel: 'Delivered Orders',
          unitLabel: 'orders',
        }))}
        chartTitle={`${selectedTeam ? selectedTeam.name : 'Team'} Member Delivered Sales Ranking`}
        tableTitle={`${selectedTeam ? selectedTeam.name : 'Team'} Sales Performance Data Table`}
        primaryLabel="Delivered Sales"
        secondaryLabel="Delivered Orders"
        unitLabel="orders"
        emptyMessage={`No leaderboard data available for ${selectedTeam ? selectedTeam.name : 'this team'}.`}
      />
    </div>
  );
};

