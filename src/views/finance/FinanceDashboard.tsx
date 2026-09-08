import React, { useState, useEffect, useMemo } from 'react';
import { expenseRepository, financeRepository, orderRepository } from '../../repositories';
import { Expense, FinanceDashboardStats, Order } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { LoadingState } from '../../components/shared/LoadingState';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import {
  DollarSign,
  Plus,
  Layers,
  ArrowRight,
  TrendingUp,
  Wallet,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import { getAmountToCollect, getProductSalesValue } from '../../utils/orderAmounts';

export const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<FinanceDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Date Filter States
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [dashboardStats, expData, orderData] = await Promise.all([
          financeRepository.getDashboard(startDate || undefined, endDate || undefined),
          expenseRepository.getAll(),
          orderRepository.getAll(),
        ]);
        setStats(dashboardStats);
        setExpenses(expData);
        setOrders(orderData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [startDate, endDate]);

  // Initialize dates on preset selection
  useEffect(() => {
    const now = new Date();
    if (datePreset === 'THIS_MONTH') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (datePreset === 'LAST_MONTH') {
      const prevMonth = subDays(startOfMonth(now), 1);
      setStartDate(format(startOfMonth(prevMonth), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(prevMonth), 'yyyy-MM-dd'));
    } else if (datePreset === 'LAST_7_DAYS') {
      setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (datePreset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  }, [datePreset]);

  // Filtered orders & expenses
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (startDate && o.createdAt.split('T')[0] < startDate) return false;
      if (endDate && o.createdAt.split('T')[0] > endDate) return false;
      return true;
    });
  }, [orders, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (startDate && e.expenseDate < startDate) return false;
      if (endDate && e.expenseDate > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  // Financial Metrics
  const salesMetrics = useMemo(() => {
    let totalSales = 0;
    let deliveredCOD = 0;
    let inTransit = 0;
    let deliveredCount = 0;

    filteredOrders.forEach((o) => {
      const productSalesValue = getProductSalesValue(o);
      const amountToCollect = getAmountToCollect(o);
      totalSales += productSalesValue;
      if (o.status === 'DELIVERED') {
        deliveredCOD += amountToCollect;
        deliveredCount++;
      } else if (o.status === 'DISPATCHED') {
        inTransit += amountToCollect;
      }
    });

    return {
      totalSales,
      deliveredCOD,
      inTransit,
      deliveredCount,
      totalOrders: filteredOrders.length,
    };
  }, [filteredOrders]);

  const salesRevenue = salesMetrics.totalSales || stats?.salesRevenue || 0;
  const grossProfit = stats?.grossProfit ?? 0;
  const totalExpenses = stats?.totalExpenses ?? 0;
  const cogs = stats?.cogs ?? 0;
  const netProfit = stats?.netProfit ?? 0;
  const deliveredCount = stats?.deliveredCount ?? 0;
  const totalOrders = stats?.totalOrders ?? 0;
  const pettyCashBalance = stats?.pettyCash?.remainingBalance ?? 0;
  const pettyCashAllocated = stats?.pettyCash?.allocatedAmount ?? 0;

  // Category breakdown for Pie Chart
  const categoryTotals: Record<string, number> = stats?.expenseByCategory ?? {};

  const COLORS = ['#01A8F3', '#80BD2B', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
  }));

  // Combined 14-Day Sales vs Expense Trend Chart
  const trendData = useMemo(() => {
    const dayMap: Record<string, { date: string; sales: number; expenses: number }> = {};
    const now = new Date();

    for (let i = 14; i >= 0; i--) {
      const d = subDays(now, i);
      const key = format(d, 'yyyy-MM-dd');
      dayMap[key] = {
        date: format(d, 'MMM dd'),
        sales: 0,
        expenses: 0,
      };
    }

    filteredOrders.forEach((o) => {
      const day = o.createdAt.split('T')[0];
      if (dayMap[day]) {
        dayMap[day].sales += getAmountToCollect(o);
      }
    });

    filteredExpenses.forEach((e) => {
      const day = e.expenseDate;
      if (dayMap[day]) {
        dayMap[day].expenses += Number(e.amount || 0);
      }
    });

    return Object.values(dayMap);
  }, [filteredOrders, filteredExpenses]);

  const getFilterLabel = () => {
    if (datePreset === 'THIS_MONTH') return 'This Month';
    if (datePreset === 'LAST_MONTH') return 'Last Month';
    if (datePreset === 'LAST_7_DAYS') return 'Last 7 Days';
    if (datePreset === 'ALL') return 'All Time';
    return 'Custom Range';
  };

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance & Revenue Command Center"
        description="High-level cash flow overview, prominent total sales tracking, and operational expenditure ledger."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              leftIcon={<TrendingUp className="w-4 h-4 text-[#01A8F3]" />}
              onClick={() => navigate('/finance/sales-analysis')}
            >
              Sales Analysis
            </Button>
            <Button
              variant="outline"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-[#547E1B]" />}
              onClick={() => navigate('/finance/reports')}
            >
              Financial Reports
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/finance/expenses?recordExpense=1')}
            >
              Record Expense
            </Button>
          </div>
        }
      />

      {/* Date Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span>Reporting Window:</span>
          <span className="text-[#0188C7] font-bold">{getFilterLabel()}</span>
        </div>
        <div className="w-48">
          <Select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            options={[
              { value: 'THIS_MONTH', label: 'This Month' },
              { value: 'LAST_MONTH', label: 'Last Month' },
              { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { value: 'ALL', label: 'All Historical Data' },
            ]}
          />
        </div>
      </div>

      {/* Executive Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`${getFilterLabel()} Delivered Sales`}
          value={formatCurrency(salesRevenue)}
          subtitle={`${deliveredCount} delivered of ${totalOrders} total orders`}
          icon={<DollarSign className="w-4 h-4" />}
          accentColor="blue"
        />
        <StatCard
          title="Gross Profit"
          value={formatCurrency(grossProfit)}
          subtitle={`COGS: ${formatCurrency(cogs)}`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="green"
        />
        <StatCard
          title={`${getFilterLabel()} Total Expenses`}
          value={formatCurrency(totalExpenses)}
          subtitle={`Net Profit: ${formatCurrency(netProfit)}`}
          icon={<Layers className="w-4 h-4" />}
          accentColor="amber"
        />
        <StatCard
          title="Petty Cash Balance"
          value={formatCurrency(pettyCashBalance)}
          subtitle={`Allocated Float: ${formatCurrency(pettyCashAllocated)}`}
          icon={<Wallet className="w-4 h-4" />}
          accentColor="purple"
        />
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Expenses Area Chart */}
        <Card className="lg:col-span-2 border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              14-Day Sales & Expense Cashflow
            </CardTitle>
            <CardDescription>Realized sales cash inflow vs operating outflow</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#01A8F3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#01A8F3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
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
                    name === 'sales' ? 'Realized Sales' : 'Expenses',
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
                  dataKey="sales"
                  name="Sales (LKR)"
                  stroke="#01A8F3"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses (LKR)"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#expGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Category Donut */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              {getFilterLabel()} Expense Ratio
            </CardTitle>
            <CardDescription>Expenditure by category</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex flex-col items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Expenditure']}
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
              <div className="text-xs text-slate-400">No expense records found for selected period.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/finance/sales-analysis')}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-[#01A8F3]/60 hover:bg-[#E8F7FE]/30 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900">Deep-Dive Sales Analysis</h4>
            <p className="text-xs text-slate-500">Team-wise revenue, package splits & fulfillment ledger</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#0188C7]" />
        </div>

        <div
          onClick={() => navigate('/finance/reports')}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-[#80BD2B]/60 hover:bg-[#F2F9E9]/30 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900">Official Financial Reports</h4>
            <p className="text-xs text-slate-500">Income Statements, Cash Flow, FSR & Inventory reports</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#547E1B]" />
        </div>

        <div
          onClick={() => navigate('/finance/petty-cash')}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900">Petty Cash Wallet</h4>
            <p className="text-xs text-slate-500">Audit transactions, disbursements & balance replenishments</p>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-700" />
        </div>
      </div>
    </div>
  );
};
