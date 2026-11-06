import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, Order } from '../../models/domain';
import { userRepository, orderRepository, teamRepository } from '../../repositories';
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

import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';

export const SupervisorReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || '');

  const effectiveTeamId = user?.role === 'ADMIN' ? adminTeamId : user?.teamId || '';

  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSalesEligible, setIsSalesEligible] = useState<boolean>(true);
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
      if (!user) return;
      if (!effectiveTeamId) {
        setTeamMembers([]);
        setOrders([]);
        setIsSalesEligible(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [membersData, ordersData, teamData] = await Promise.all([
          userRepository.getByTeamId(effectiveTeamId).catch(() => []),
          orderRepository.getByTeamId(effectiveTeamId).catch(() => []),
          teamRepository.getById(effectiveTeamId).catch(() => null),
        ]);
        setTeamMembers(membersData.filter((m) => m.role === 'TEAM_MEMBER'));
        setOrders(ordersData);
        setIsSalesEligible(teamData ? teamData.includeInSalesCalculations !== false : true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, effectiveTeamId]);

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
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
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
  const rawFinancialSummary = SupervisorAnalyticsService.computeFinancialSummary(filteredOrders);
  const financialSummary = isSalesEligible
    ? rawFinancialSummary
    : {
        ...rawFinancialSummary,
        totalOrderValue: 0,
        deliveredOrderValue: 0,
        dispatchedOrderValue: 0,
        rejectedOrderValue: 0,
        averageOrderValue: 0,
      };

  const rawStatusDistribution = SupervisorAnalyticsService.computeStatusDistribution(filteredOrders);
  const statusDistribution = isSalesEligible
    ? rawStatusDistribution
    : rawStatusDistribution.map((d) => ({ ...d, value: 0 }));

  const leaderboard = isSalesEligible
    ? SupervisorAnalyticsService.computeLeaderboard(teamMembers, filteredOrders)
    : [];

  const memberPerformance = isSalesEligible
    ? SupervisorAnalyticsService.computeMemberPerformanceChart(leaderboard)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisor Sales & Financial Reports"
        description="Business reporting, financial KPIs in LKR, order delivery rates, and team member sales performance"
      />

      <AdminTeamSelector
        activeTeamId={effectiveTeamId}
        onTeamChange={setAdminTeamId}
        title="Sales & Financial Reports Scope"
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
