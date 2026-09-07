import React, { useState, useEffect, useMemo } from 'react';
import { orderRepository, teamRepository, userRepository } from '../../repositories';
import { Order, Team, User } from '../../models/domain';
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
  CheckCircle2,
  Truck,
  Filter,
  Download,
  ShoppingBag,
  Calendar,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
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
      { name: 'Adult Package', value: adultRev, color: '#01A8F3' },
      { name: 'Kids Package', value: kidsRev, color: '#80BD2B' },
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
      { status: 'Delivered', count: counts.DELIVERED, color: '#80BD2B' },
      { status: 'Dispatched', count: counts.DISPATCHED, color: '#01A8F3' },
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              leftIcon={<Download className="w-4 h-4 text-[#01A8F3]" />}
              onClick={handleExportCSV}
            >
              Export Sales Ledger (CSV)
            </Button>
          </div>
        }
      />

      {/* Multi-Parameter Filtering Panel */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            {/* Top row filters */}
            {/* Top row filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sales Team / Brand</label>
                <Select
                  value={selectedTeamId}
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs"
                  options={[
                    { value: 'ALL', label: 'All Brands & Teams' },
                    ...teams.map((t) => ({ value: t.id, label: t.name })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Order Status</label>
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs"
                  options={[
                    { value: 'ALL', label: 'All Operational Statuses' },
                    { value: 'PREPARED', label: 'Prepared' },
                    { value: 'DISPATCHED', label: 'Dispatched' },
                    { value: 'DELIVERED', label: 'Delivered (COD Realized)' },
                    { value: 'REJECTED', label: 'Rejected' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Package Filter</label>
                <Select
                  value={packageFilter}
                  onChange={(e) => {
                    setPackageFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs"
                  options={[
                    { value: 'ALL', label: 'All Packages' },
                    { value: 'ADULT', label: 'Adult Package' },
                    { value: 'KIDS', label: 'Kids Package' },
                    { value: 'BOTH', label: 'Combo (Both)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Time Period Preset</label>
                <Select
                  value={datePreset}
                  onChange={(e) => {
                    setDatePreset(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs"
                  options={[
                    { value: 'TODAY', label: 'Today' },
                    { value: 'YESTERDAY', label: 'Yesterday' },
                    { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
                    { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
                    { value: 'THIS_MONTH', label: 'This Month' },
                    { value: 'LAST_MONTH', label: 'Last Month' },
                    { value: 'CUSTOM', label: 'Custom Date Range' },
                    { value: 'ALL', label: 'All Time' },
                  ]}
                />
              </div>
            </div>

            {/* Custom Date Inputs if CUSTOM */}
            {datePreset === 'CUSTOM' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#01A8F3]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#01A8F3]"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Filtered Gross Sales"
          value={formatCurrency(metrics.totalSalesValue)}
          subtitle={`${metrics.totalOrdersCount} Total Orders in Period`}
          icon={<DollarSign className="w-5 h-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Realized Delivered Revenue"
          value={formatCurrency(metrics.deliveredValue)}
          subtitle={`${metrics.deliveredCount} Orders (${metrics.deliverySuccessRate.toFixed(1)}% Success)`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accentColor="green"
        />
        <StatCard
          title="Dispatched (In Transit)"
          value={formatCurrency(metrics.dispatchedValue)}
          subtitle={`${metrics.dispatchedCount} Parcels with Courier`}
          icon={<Truck className="w-5 h-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Units Dispatched & Sold"
          value={metrics.totalUnits.toLocaleString()}
          subtitle={`Adult: ${metrics.adultUnits} | Kids: ${metrics.kidsUnits}`}
          icon={<ShoppingBag className="w-5 h-5" />}
          accentColor="purple"
        />
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Timeline Area Chart */}
        <Card className="lg:col-span-2 border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Revenue & Cashflow Timeline</CardTitle>
            <CardDescription>Daily gross booked sales vs realized delivered cash collections</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {salesTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#01A8F3" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#01A8F3" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#80BD2B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#80BD2B" stopOpacity={0} />
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
                      name === 'revenue' ? 'Gross Booked' : 'Delivered COD',
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Gross Booked (LKR)"
                    stroke="#01A8F3"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGross)"
                  />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    name="Delivered COD (LKR)"
                    stroke="#80BD2B"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDelivered)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No Chart Data" description="No sales in selected period." />
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
                  <Bar dataKey="revenue" name="Total Booked (LKR)" fill="#01A8F3" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="delivered" name="Delivered COD (LKR)" fill="#80BD2B" radius={[4, 4, 0, 0]} />
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
                <Bar dataKey="count" fill="#01A8F3" radius={[0, 4, 4, 0]}>
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
                      <td className="py-3 px-4 font-mono font-bold text-[#0188C7] text-xs">{o.orderNumber}</td>
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
                      <td className="py-3 px-4 text-xs text-right font-mono font-bold text-[#547E1B]">
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
