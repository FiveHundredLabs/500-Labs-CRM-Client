import React, { useState, useEffect, useMemo } from 'react';
import { expenseRepository, pettyCashRepository, orderRepository } from '../../repositories';
import { Expense, PettyCashWallet, Order } from '../../models/domain';
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
  Truck,
  FileSpreadsheet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { formatCurrency } from '../../utils/currency';

export const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wallet, setWallet] = useState<PettyCashWallet | null>(null);
  const [loading, setLoading] = useState(true);

  // Date Filter States
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [expData, walletData, orderData] = await Promise.all([
          expenseRepository.getAll(),
          pettyCashRepository.getWallet(),
          orderRepository.getAll(),
        ]);
        setExpenses(expData);
        setWallet(walletData);
        setOrders(orderData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      totalSales += amt;
      if (o.status === 'DELIVERED') {
        deliveredCOD += amt;
        deliveredCount++;
      } else if (o.status === 'DISPATCHED') {
        inTransit += amt;
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

  const totalExpenseAmount = filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const grossProfit = salesMetrics.deliveredCOD - totalExpenseAmount;

  // Category breakdown for Pie Chart
  const categoryTotals: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    categoryTotals[e.categoryName] = (categoryTotals[e.categoryName] || 0) + Number(e.amount || 0);
  });

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
  }));

  // Combined 30-Day Sales vs Expense Trend Chart
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

    orders.forEach((o) => {
      const k = o.createdAt.split('T')[0];
      if (dayMap[k]) {
        dayMap[k].sales += Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      }
    });

    expenses.forEach((e) => {
      const k = e.expenseDate;
      if (dayMap[k]) {
        dayMap[k].expenses += Number(e.amount || 0);
      }
    });

    return Object.values(dayMap);
  }, [orders, expenses]);

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<TrendingUp className="w-4 h-4 text-blue-600" />}
              onClick={() => navigate('/finance/sales-analysis')}
            >
              Sales Analysis
            </Button>
            <Button
              variant="outline"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              onClick={() => navigate('/finance/reports')}
            >
              Financial Reports
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/finance/expenses/new')}
            >
              Record Expense
            </Button>
          </div>
        }
      />

      {/* Date Filter Toolbar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span>Reporting Window:</span>
          <span className="text-blue-700 font-bold">{getFilterLabel()}</span>
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
        {/* Prominent Total Sales Metric Card */}
        <StatCard
          title={`${getFilterLabel()} Total Sales`}
          value={formatCurrency(salesMetrics.totalSales)}
          subtitle={`${salesMetrics.totalOrders} Booked Orders`}
          icon={<DollarSign className="w-4 h-4" />}
          accentColor="blue"
        />
        <StatCard
          title="Realized Delivered COD"
          value={formatCurrency(salesMetrics.deliveredCOD)}
          subtitle={`${salesMetrics.deliveredCount} Delivered Orders`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="green"
        />
        <StatCard
          title={`${getFilterLabel()} Total Expenses`}
          value={formatCurrency(totalExpenseAmount)}
          subtitle={`${filteredExpenses.length} Vouchers Recorded`}
          icon={<Layers className="w-4 h-4" />}
          accentColor="amber"
        />
        <StatCard
          title="Petty Cash Balance"
          value={formatCurrency(wallet?.remainingBalance || 0)}
          subtitle={`Allocated: ${formatCurrency(wallet?.allocatedAmount || 0)}`}
          icon={<Wallet className="w-4 h-4" />}
          accentColor="purple"
        />
      </div>

      {/* Interactive Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Expenses 15-Day Trajectory */}
        <Card className="lg:col-span-2 border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                15-Day Revenue Intake vs Expenditures
              </CardTitle>
              <CardDescription>Daily gross sales intake compared against logged operational costs</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-blue-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Sales (LKR)
              </span>
              <span className="flex items-center gap-1 text-rose-500 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Expenses (LKR)
              </span>
            </div>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="dashExpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
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
                    name === 'sales' ? 'Gross Sales' : 'Operating Expenses',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#dashSalesGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#dashExpGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Distribution Pie Chart */}
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
          className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 rounded-xl hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-blue-900">Deep-Dive Sales Analysis</h4>
            <p className="text-xs text-blue-700">Team-wise revenue, package splits & fulfillment ledger</p>
          </div>
          <ArrowRight className="w-5 h-5 text-blue-700" />
        </div>

        <div
          onClick={() => navigate('/finance/reports')}
          className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 rounded-xl hover:border-emerald-400 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-emerald-900">Official Financial Reports</h4>
            <p className="text-xs text-emerald-700">Income Statements, Cash Flow, FSR & Inventory reports</p>
          </div>
          <ArrowRight className="w-5 h-5 text-emerald-700" />
        </div>

        <div
          onClick={() => navigate('/finance/petty-cash')}
          className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 rounded-xl hover:border-purple-400 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-purple-900">Petty Cash Wallet</h4>
            <p className="text-xs text-purple-700">Audit transactions, disbursements & balance replenishments</p>
          </div>
          <ArrowRight className="w-5 h-5 text-purple-700" />
        </div>
      </div>
    </div>
  );
};
