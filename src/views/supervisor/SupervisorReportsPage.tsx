import React, { useState, useEffect, useMemo } from 'react';
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
import { Button } from '../../components/ui/Button';
import { Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';

import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';

export const SupervisorReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || '');

  const effectiveTeamId = user?.role === 'ADMIN' ? adminTeamId : user?.teamId || '';

  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSalesEligible, setIsSalesEligible] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

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
  const filteredOrders = useMemo(
    () => SupervisorAnalyticsService.filterOrders(orders, filterOptions),
    [orders, datePreset, startDate, endDate, teamMemberId, orderStatus, searchQuery],
  );

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    const exportedAt = new Date();
    const memberMap = new Map<string, string>(teamMembers.map((member) => [member.id, member.fullName]));
    const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Order Number',
      'Team Member ID',
      'Team Member Name',
      'Status',
      'Items Description',
      'Created Date',
      'Amount (LKR)',
    ];
    const rows = filteredOrders.map((order) => [
      order.orderNumber,
      order.teamMemberId,
      memberMap.get(order.teamMemberId) || order.teamMemberId,
      order.status,
      order.itemsDescription,
      order.createdAt ? order.createdAt.substring(0, 10) : '',
      (Number(order.totalAmount) || 0).toFixed(2),
    ]);
    const totalAmount = filteredOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const csvContent = [
      csvEscape('Supervisor Sales & Financial Report'),
      [csvEscape('Export Date'), csvEscape(format(exportedAt, 'yyyy-MM-dd HH:mm:ss'))].join(','),
      [csvEscape('Total Records'), csvEscape(filteredOrders.length)].join(','),
      [csvEscape('Total Amount (LKR)'), csvEscape(totalAmount.toFixed(2))].join(','),
      '',
      headers.map(csvEscape).join(','),
      ...rows.map((row) => row.map(csvEscape).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Supervisor_Report_${format(exportedAt, 'yyyyMMdd_HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success('CSV Report exported successfully!');
  };

  const handleExportExcel = async () => {
    if (filteredOrders.length === 0) return;

    setIsExportingExcel(true);
    try {
      const XLSX = await import('xlsx');
      const exportedAt = new Date();
      const memberMap = new Map<string, string>(teamMembers.map((member) => [member.id, member.fullName]));
      const rows = filteredOrders.map((order) => ({
        'Order Number': order.orderNumber,
        'Team Member ID': order.teamMemberId,
        'Team Member Name': memberMap.get(order.teamMemberId) || order.teamMemberId,
        Status: order.status,
        'Items Description': order.itemsDescription,
        'Created Date': order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd') : '',
        'Delivered Date': order.deliveredAt ? format(new Date(order.deliveredAt), 'yyyy-MM-dd') : '',
        'Amount (LKR)': Number(order.totalAmount) || 0,
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 20 },
        { wch: 26 },
        { wch: 28 },
        { wch: 16 },
        { wch: 48 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Supervisor Report');
      XLSX.writeFile(workbook, `Supervisor_Report_${format(exportedAt, 'yyyyMMdd_HHmm')}.xlsx`);
      toast.success(`Exported ${rows.length} report rows to Excel.`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export report to Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

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
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4 text-emerald-600" />}
              onClick={handleExportCSV}
              disabled={filteredOrders.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              onClick={handleExportExcel}
              disabled={filteredOrders.length === 0 || isExportingExcel}
              isLoading={isExportingExcel}
            >
              Export Excel
            </Button>
          </>
        }
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
