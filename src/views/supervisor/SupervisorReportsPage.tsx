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
import { ReportFilters } from '../../components/supervisor/reports/ReportFilters';
import { ReportKpis } from '../../components/supervisor/reports/ReportKpis';
import { ReportCharts } from '../../components/supervisor/reports/ReportCharts';
import { ReportTable } from '../../components/supervisor/reports/ReportTable';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';

export const SupervisorReportsPage: React.FC = () => {
  const { user } = useAuth();

  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [teamMemberId, setTeamMemberId] = useState<string>('ALL');
  const [orderStatus, setOrderStatus] = useState<string>('ALL');
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

  // Handle Preset Changes
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

  useEffect(() => {
    handleDatePresetChange('THIS_MONTH');
  }, []);

  if (loading) return <LoadingState rows={8} />;

  const filterOptions: ReportsFilterOptions = {
    datePreset,
    startDate,
    endDate,
    teamMemberId,
    orderStatus,
    searchQuery,
  };

  // Filtered orders list
  const filteredOrders = SupervisorAnalyticsService.filterOrders(orders, filterOptions);

  // Compute analytics metrics
  const financialSummary = SupervisorAnalyticsService.computeFinancialSummary(filteredOrders);
  const statusDistribution = SupervisorAnalyticsService.computeStatusDistribution(filteredOrders);
  const leaderboard = SupervisorAnalyticsService.computeLeaderboard(teamMembers, filteredOrders);
  const memberPerformance = SupervisorAnalyticsService.computeMemberPerformanceChart(leaderboard);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisor Sales & Financial Reports"
        description="Business reporting, financial KPIs in LKR, order delivery rates, and team member sales performance"
      />

      {/* Filter Parameters Section */}
      <ReportFilters
        datePreset={datePreset}
        onDatePresetChange={handleDatePresetChange}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        teamMemberId={teamMemberId}
        onTeamMemberIdChange={setTeamMemberId}
        orderStatus={orderStatus}
        onOrderStatusChange={setOrderStatus}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        teamMembers={teamMembers}
      />

      {/* Financial & Sales KPI Cards */}
      <ReportKpis summary={financialSummary} />

      {/* Visualizations (Charts) */}
      <ReportCharts statusDistribution={statusDistribution} memberPerformance={memberPerformance} />

      {/* Filtered Order Breakdown Table */}
      <ReportTable orders={filteredOrders} teamMembers={teamMembers} />
    </div>
  );
};
