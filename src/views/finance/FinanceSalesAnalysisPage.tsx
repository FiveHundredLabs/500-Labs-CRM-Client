import React, { useState, useEffect, useMemo } from 'react';
import { orderRepository, teamRepository, userRepository } from '../../repositories';
import { Order, Team, User, OrderStatus } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/shared/SearchInput';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle2,
  Truck,
  Filter,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ShoppingBag,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import toast from 'react-hot-toast';

export const FinanceSalesAnalysisPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [packageFilter, setPackageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [ordersData, teamsData, usersData] = await Promise.all([
          orderRepository.getAll(),
          teamRepository.getAll().catch(() => []),
          userRepository.getAll().catch(() => []),
        ]);
        setOrders(ordersData);
        setTeams(teamsData);
        setUsers(usersData);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load sales data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Update date boundaries when preset changes
  useEffect(() => {
    const now = new Date();
    if (datePreset === 'TODAY') {
      const todayStr = format(now, 'yyyy-MM-dd');
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (datePreset === 'YESTERDAY') {
      const yestStr = format(subDays(now, 1), 'yyyy-MM-dd');
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (datePreset === 'LAST_7_DAYS') {
      setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (datePreset === 'LAST_30_DAYS') {
      setStartDate(format(subDays(now, 30), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (datePreset === 'THIS_MONTH') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (datePreset === 'LAST_MONTH') {
      const prevMonth = subMonths(now, 1);
      setStartDate(format(startOfMonth(prevMonth), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(prevMonth), 'yyyy-MM-dd'));
    } else if (datePreset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  }, [datePreset]);

  // Lookup maps for fast access
  const teamMap = useMemo(() => {
    const map: Record<string, Team> = {};
    teams.forEach((t) => (map[t.id] = t));
    return map;
  }, [teams]);

  const userMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((u) => (map[u.id] = u));
    return map;
  }, [users]);

  // Master filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Team filter
      if (selectedTeamId !== 'ALL' && o.teamId !== selectedTeamId) return false;

      // 2. Status filter
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;

      // 3. Package filter
      if (packageFilter !== 'ALL') {
        if (o.selectedPackage !== packageFilter) return false;
      }

      // 4. Date filter
      if (startDate || endDate) {
        const orderDate = o.createdAt.split('T')[0];
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const repName = userMap[o.teamMemberId]?.fullName?.toLowerCase() || '';
        const orderNum = o.orderNumber.toLowerCase();
        const items = (o.itemsDescription || '').toLowerCase();
        const remarks = (o.remarks || '').toLowerCase();
        if (
          !orderNum.includes(q) &&
          !repName.includes(q) &&
          !items.includes(q) &&
          !remarks.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedTeamId, statusFilter, packageFilter, startDate, endDate, searchQuery, userMap]);

  // Executive KPI Calculations
  const metrics = useMemo(() => {
    let totalSalesValue = 0;
    let deliveredValue = 0;
    let dispatchedValue = 0;
    let preparedValue = 0;
    let deliveredCount = 0;
    let dispatchedCount = 0;
    let rejectedCount = 0;
    let adultUnits = 0;
    let kidsUnits = 0;

    filteredOrders.forEach((o) => {
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      totalSalesValue += amt;

      if (o.status === 'DELIVERED') {
        deliveredValue += amt;
        deliveredCount++;
      } else if (o.status === 'DISPATCHED') {
        dispatchedValue += amt;
        dispatchedCount++;
      } else if (o.status === 'PREPARED') {
        preparedValue += amt;
      } else if (o.status === 'REJECTED') {
        rejectedCount++;
      }

      adultUnits += Number(o.adultQty || 0);
      kidsUnits += Number(o.kidsQty || 0);
    });

    const totalOrdersCount = filteredOrders.length;
    const fulfilledOrders = deliveredCount + rejectedCount;
    const deliverySuccessRate = fulfilledOrders > 0 ? (deliveredCount / fulfilledOrders) * 100 : (deliveredCount > 0 ? 100 : 0);
    const averageOrderValue = totalOrdersCount > 0 ? totalSalesValue / totalOrdersCount : 0;

    return {
      totalSalesValue,
      deliveredValue,
      dispatchedValue,
      preparedValue,
      deliveredCount,
      dispatchedCount,
      rejectedCount,
      totalOrdersCount,
      deliverySuccessRate,
      averageOrderValue,
      totalUnits: adultUnits + kidsUnits,
      adultUnits,
      kidsUnits,
    };
  }, [filteredOrders]);

  // Dynamic Chart 1: Daily/Weekly Sales Trend
  const salesTimelineData = useMemo(() => {
    const dateGroups: Record<string, { date: string; revenue: number; orders: number; delivered: number }> = {};

    filteredOrders.forEach((o) => {
      const dateKey = o.createdAt.split('T')[0];
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = {
          date: format(parseISO(dateKey), 'MMM dd'),
          revenue: 0,
          orders: 0,
          delivered: 0,
        };
      }
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      dateGroups[dateKey].revenue += amt;
      dateGroups[dateKey].orders += 1;
      if (o.status === 'DELIVERED') {
        dateGroups[dateKey].delivered += amt;
      }
    });

    return Object.values(dateGroups).sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [filteredOrders]);

  // Dynamic Chart 2: Team Performance Comparison
  const teamComparisonData = useMemo(() => {
    const teamStats: Record<string, { name: string; revenue: number; orders: number; delivered: number }> = {};

    filteredOrders.forEach((o) => {
      const team = teamMap[o.teamId];
      const tName = team ? team.name : 'Unassigned';
      if (!teamStats[tName]) {
        teamStats[tName] = { name: tName, revenue: 0, orders: 0, delivered: 0 };
      }
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      teamStats[tName].revenue += amt;
      teamStats[tName].orders += 1;
      if (o.status === 'DELIVERED') {
        teamStats[tName].delivered += amt;
      }
    });

    return Object.values(teamStats);
  }, [filteredOrders, teamMap]);

  // Dynamic Chart 3: Package Distribution
  const packageDistributionData = useMemo(() => {
    let adultRev = 0;
    let kidsRev = 0;
    let bothRev = 0;
    let standardRev = 0;

    filteredOrders.forEach((o) => {
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      if (o.selectedPackage === 'ADULT') adultRev += amt;
      else if (o.selectedPackage === 'KIDS') kidsRev += amt;
      else if (o.selectedPackage === 'BOTH') bothRev += amt;
      else standardRev += amt;
    });

    const data = [
      { name: 'Adult Package', value: adultRev, color: '#2563EB' },
      { name: 'Kids Package', value: kidsRev, color: '#10B981' },
      { name: 'Combo (Both)', value: bothRev, color: '#8B5CF6' },
    ];
    if (standardRev > 0) {
      data.push({ name: 'Standard / Custom', value: standardRev, color: '#F59E0B' });
    }
    return data.filter((d) => d.value > 0);
  }, [filteredOrders]);

  // Dynamic Chart 4: Order Status Breakdown
  const orderStatusData = useMemo(() => {
    const counts: Record<string, number> = {
      DELIVERED: 0,
      DISPATCHED: 0,
      PREPARED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    filteredOrders.forEach((o) => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });
    return [
      { status: 'Delivered', count: counts.DELIVERED, color: '#16A34A' },
      { status: 'Dispatched', count: counts.DISPATCHED, color: '#2563EB' },
      { status: 'Prepared', count: counts.PREPARED, color: '#D97706' },
      { status: 'Rejected', count: counts.REJECTED, color: '#DC2626' },
      { status: 'Cancelled', count: counts.CANCELLED, color: '#64748B' },
    ];
  }, [filteredOrders]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error('No sales transactions to export.');
      return;
    }

    const headers = [
      'Order Number',
      'Date',
      'Team',
      'Sales Rep',
      'Package',
      'Adult Qty',
      'Kids Qty',
      'Total Amount (LKR)',
      'COD Amount (LKR)',
      'Status',
      'Remarks',
    ];

    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.createdAt.split('T')[0],
      `"${(teamMap[o.teamId]?.name || o.teamId).replace(/"/g, '""')}"`,
      `"${(userMap[o.teamMemberId]?.fullName || o.teamMemberId).replace(/"/g, '""')}"`,
      o.selectedPackage || 'STANDARD',
      o.adultQty || 0,
      o.kidsQty || 0,
      (o.totalAmount || 0).toFixed(2),
      (o.codAmount || 0).toFixed(2),
      o.status,
      `"${(o.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      `"500 Labs - Detailed Sales Analysis Report"`,
      `"Exported Date","${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}"`,
      `"Team Filter","${selectedTeamId === 'ALL' ? 'All Teams' : teamMap[selectedTeamId]?.name || selectedTeamId}"`,
      `"Date Range","${startDate || 'Start'} to ${endDate || 'Present'}"`,
      `"Total Filtered Sales","${formatCurrency(metrics.totalSalesValue)}"`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Sales_Analysis_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sales ledger exported successfully!');
  };

  // Pagination for transaction table
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Financial Analysis & Intelligence"
        description="Executive multi-parameter revenue tracking, team performance comparison, and fulfillment ledger."
        actions={
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4 text-blue-600" />}
            onClick={handleExportCSV}
          >
            Export Sales Ledger (CSV)
          </Button>
        }
      />

      {/* Multi-Parameter Filtering Panel */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Multi-Parameter Filters</span>
            </div>
            <button
              onClick={() => {
                setSelectedTeamId('ALL');
                setDatePreset('THIS_MONTH');
                setStatusFilter('ALL');
                setPackageFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Team-wise Filter */}
            <Select
              label="Assigned Brand / Team"
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'ALL', label: '🌟 All Brands & Teams' },
                ...teams.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
              ]}
            />

            {/* 2. Date Range Preset */}
            <Select
              label="Date Range Period"
              value={datePreset}
              onChange={(e) => {
                setDatePreset(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'TODAY', label: 'Today' },
                { value: 'YESTERDAY', label: 'Yesterday' },
                { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
                { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
                { value: 'THIS_MONTH', label: 'This Month' },
                { value: 'LAST_MONTH', label: 'Last Month' },
                { value: 'ALL', label: 'All Historical Records' },
                { value: 'CUSTOM', label: 'Custom Date Range' },
              ]}
            />

            {/* 3. Order Status Filter */}
            <Select
              label="Fulfillment Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'DELIVERED', label: 'Delivered (Realized COD)' },
                { value: 'DISPATCHED', label: 'Dispatched (In-Transit)' },
                { value: 'PREPARED', label: 'Prepared (Interested/Draft)' },
                { value: 'REJECTED', label: 'Rejected / Returned' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />

            {/* 4. Package Selection Filter */}
            <Select
              label="Package Tier"
              value={packageFilter}
              onChange={(e) => {
                setPackageFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Packages' },
                { value: 'ADULT', label: 'Adult Package Only' },
                { value: 'KIDS', label: 'Kids Package Only' },
                { value: 'BOTH', label: 'Combo (Adult & Kids)' },
              ]}
            />
          </div>

          {/* Custom Date Range Inputs (if CUSTOM selected) */}
          {datePreset === 'CUSTOM' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top-Level Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Gross Sales"
          value={formatCurrency(metrics.totalSalesValue)}
          subtitle={`${metrics.totalOrdersCount} Total Booked Orders`}
          icon={<DollarSign className="w-4 h-4" />}
          accentColor="blue"
        />
        <StatCard
          title="Delivered COD Revenue"
          value={formatCurrency(metrics.deliveredValue)}
          subtitle={`${metrics.deliveredCount} Realized Orders`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="green"
        />
        <StatCard
          title="In-Transit Dispatched"
          value={formatCurrency(metrics.dispatchedValue)}
          subtitle={`${metrics.dispatchedCount} Dispatches in Courier`}
          icon={<Truck className="w-4 h-4" />}
          accentColor="purple"
        />
        <StatCard
          title="Average Order Value"
          value={formatCurrency(metrics.averageOrderValue)}
          subtitle={`${metrics.totalUnits} Packages Sold`}
          icon={<ShoppingBag className="w-4 h-4" />}
          accentColor="amber"
        />
        <StatCard
          title="Delivery Success Rate"
          value={`${metrics.deliverySuccessRate.toFixed(1)}%`}
          subtitle={`${metrics.rejectedCount} Return / Rejections`}
          icon={<TrendingUp className="w-4 h-4" />}
          accentColor={metrics.deliverySuccessRate >= 80 ? 'green' : 'amber'}
        />
      </div>

      {/* Dynamic Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Revenue & Order Volume Chart */}
        <Card className="lg:col-span-2 border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Sales Revenue & Order Volume Trajectory
              </CardTitle>
              <CardDescription>Daily revenue intake and delivered order momentum</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-blue-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Total Booked
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Delivered COD
              </span>
            </div>
          </CardHeader>
          <CardContent className="h-[280px]">
            {salesTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="delivGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => `Rs. ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      formatCurrency(Number(val)),
                      name === 'revenue' ? 'Total Booked Revenue' : 'Delivered COD',
                    ]}
                    labelStyle={{ fontWeight: 'bold', color: '#1E293B' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#delivGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No Sales in Selected Period" description="Adjust date range or team filter." />
            )}
          </CardContent>
        </Card>

        {/* Package Revenue Share (Donut Chart) */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Package Revenue Share</CardTitle>
            <CardDescription>Adult vs Kids vs Combo package contribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex flex-col items-center justify-center">
            {packageDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={packageDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {packageDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Revenue Contribution']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No Package Data" description="No package transactions found." />
            )}
          </CardContent>
        </Card>

        {/* Team-wise Performance Comparison Bar Chart */}
        <Card className="lg:col-span-2 border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Team-wise Sales Revenue Comparison</CardTitle>
            <CardDescription>Total Gross Sales vs Realized Delivered COD by Brand</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {teamComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => `Rs. ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      formatCurrency(Number(val)),
                      name === 'revenue' ? 'Total Booked' : 'Delivered COD',
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="revenue" name="Total Booked (LKR)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="delivered" name="Delivered COD (LKR)" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No Team Data" description="No orders matching filter criteria." />
            )}
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Fulfillment Pipeline</CardTitle>
            <CardDescription>Volume of orders across each operational stage</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderStatusData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 11, fill: '#334155' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} Orders`, 'Count']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                  }}
                />
                <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]}>
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-status-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sales Ledger Table */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Sales Transactions Ledger</CardTitle>
            <CardDescription>
              Showing {filteredOrders.length} filtered transactions ({formatCurrency(metrics.totalSalesValue)})
            </CardDescription>
          </div>
          <div className="w-full sm:w-72">
            <SearchInput
              value={searchQuery}
              onChange={(q) => {
                setSearchQuery(q);
                setCurrentPage(1);
              }}
              placeholder="Search order #, rep, remarks..."
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedOrders.length > 0 ? (
            <div className="enterprise-table-container overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Brand / Team</th>
                    <th className="py-3 px-4">Sales Agent</th>
                    <th className="py-3 px-4">Package & Quantities</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">COD Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 text-xs">{o.orderNumber}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {format(new Date(o.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-800">
                        {teamMap[o.teamId]?.name || 'System Wide'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {userMap[o.teamMemberId]?.fullName || o.teamMemberId}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="font-semibold text-slate-900">{o.selectedPackage || 'STANDARD'}</span>
                        <div className="text-[11px] text-slate-400">
                          {o.adultQty ? `Adult: ${o.adultQty}` : ''}{' '}
                          {o.kidsQty ? `Kids: ${o.kidsQty}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(o.totalAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-xs text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(o.codAmount || o.totalAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge type="order" status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8">
              <EmptyState
                title="No Sales Transactions Found"
                description="Try changing the date range, team, or status filter."
              />
            </div>
          )}

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-600">
              <div>
                Page {currentPage} of {totalPages} ({filteredOrders.length} total records)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
