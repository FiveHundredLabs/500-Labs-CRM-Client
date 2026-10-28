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
import { Button } from '../../components/ui/Button';
import { FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';

export interface SupervisorReportsPageProps {
  onBack?: () => void;
}

export const SupervisorReportsPage: React.FC<SupervisorReportsPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || '');

  const effectiveTeamId = user?.role === 'ADMIN' ? adminTeamId : user?.teamId || '';

  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  // If Admin has no team selected yet, auto-select the first available team
  useEffect(() => {
    if (user?.role === 'ADMIN' && !adminTeamId) {
      teamRepository.getAll().then((teams) => {
        if (teams.length > 0) {
          setAdminTeamId(teams[0].id);
        }
      }).catch(() => {});
    }
  }, [user, adminTeamId]);

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

  // Export to Excel handler
  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      toast.error('No orders match current filter parameters to export.');
      return;
    }

    try {
      setExportingExcel(true);
      const toastId = toast.loading('Generating Excel report...');

      // Lookup map for team members
      const memberMap = new Map<string, User>();
      teamMembers.forEach((m) => memberMap.set(m.id, m));

      // 1. Metadata Rows
      const metadataRows = [
        ['Sales & Orders Report'],
        ['Generated Date:', format(new Date(), 'yyyy-MM-dd HH:mm')],
        ['Date Range:', `${startDate || 'All Time'} to ${endDate || 'All Time'}`],
        ['Status Filter:', orderStatus === 'ALL' ? 'All Statuses' : orderStatus],
        ['Team Member Filter:', teamMemberId === 'ALL' ? 'All Members' : (memberMap.get(teamMemberId)?.fullName || teamMemberId)],
        ['Total Orders:', filteredOrders.length],
        [],
      ];

      // 2. Table Headers
      const headers = [
        'Order #',
        'Team Member',
        'Username',
        'Status',
        'Delivery Method',
        'Total Amount (LKR)',
        'COD Amount (LKR)',
        'Created Date',
        'Delivered Date',
        'Rejected Date',
        'Package / Items',
      ];

      let sumTotal = 0;
      let sumCod = 0;

      // 3. Data Rows
      const dataRows = filteredOrders.map((o) => {
        const mem = memberMap.get(o.teamMemberId);
        const amt = Number(o.totalAmount) || 0;
        const cod = Number(o.codAmount) || 0;
        sumTotal += amt;
        sumCod += cod;

        return [
          o.orderNumber || '-',
          mem?.fullName || '-',
          mem?.username || '-',
          o.status || '-',
          o.deliveryMethod || '-',
          amt,
          cod,
          o.createdAt ? format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm') : '-',
          o.deliveredAt ? format(new Date(o.deliveredAt), 'yyyy-MM-dd HH:mm') : '-',
          o.rejectedAt ? format(new Date(o.rejectedAt), 'yyyy-MM-dd HH:mm') : '-',
          o.itemsDescription || o.selectedPackage || '-',
        ];
      });

      // 4. Summary Row
      const summaryRow = [
        'TOTALS',
        `${filteredOrders.length} Orders`,
        '',
        '',
        '',
        sumTotal,
        sumCod,
        '',
        '',
        '',
        '',
      ];

      const worksheetData = [...metadataRows, headers, ...dataRows, [], summaryRow];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      worksheet['!cols'] = [
        { wch: 18 }, // Order #
        { wch: 22 }, // Member Name
        { wch: 16 }, // Username
        { wch: 14 }, // Status
        { wch: 16 }, // Delivery Method
        { wch: 18 }, // Total Amount
        { wch: 16 }, // COD Amount
        { wch: 18 }, // Created Date
        { wch: 18 }, // Delivered Date
        { wch: 18 }, // Rejected Date
        { wch: 32 }, // Package / Items
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders Report');

      const filename = `Orders_Report_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.dismiss(toastId);
      toast.success(`Exported ${filteredOrders.length} orders successfully!`);
    } catch (err: any) {
      toast.error('Excel Export Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingExcel(false);
    }
  };

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      {/* Return to reports landing if onBack provided */}
      {onBack && (
        <div className="pb-1">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0188C7] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back to All Reports</span>
          </button>
        </div>
      )}

      <PageHeader
        title={user?.role === 'ADMIN' ? 'Team Member Orders & Sales Report' : 'Supervisor Sales & Financial Reports'}
        description="Business reporting, financial KPIs in LKR, order delivery rates, and team member sales performance"
        actions={
          <Button
            onClick={handleExportExcel}
            disabled={exportingExcel || filteredOrders.length === 0}
            className="flex items-center gap-2 text-xs font-bold bg-[#0188C7] hover:bg-[#0170a4] text-white rounded-xl shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exportingExcel ? 'Exporting...' : 'Download Excel (.xlsx)'}</span>
          </Button>
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

