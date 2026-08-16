import React, { useState, useEffect } from 'react';
import { expenseRepository } from '../../repositories';
import { Expense } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { LoadingState } from '../../components/shared/LoadingState';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { DollarSign, Plus, Layers, ArrowRight, Calendar, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter States
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await expenseRepository.getAll();
        setExpenses(data);
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
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (datePreset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (datePreset === 'THIS_WEEK') {
      const day = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - day);
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (datePreset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  }, [datePreset]);

  if (loading) return <LoadingState rows={6} />;

  // Filter expenses by selected date range
  const filteredExpenses = expenses.filter((e) => {
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && e.expenseDate >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && e.expenseDate <= endDate;
    }
    return matchesDate;
  });

  const totalExpenseAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Group expenses by category for pie chart
  const categoryTotals: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    categoryTotals[e.categoryName] = (categoryTotals[e.categoryName] || 0) + e.amount;
  });

  const COLORS = ['#2563EB', '#16A34A', '#0284C7', '#D97706', '#4F46E5', '#7E22CE'];
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
  }));

  const getFilterLabel = () => {
    if (datePreset === 'THIS_MONTH') return 'This Month';
    if (datePreset === 'LAST_MONTH') return 'Last Month';
    if (datePreset === 'THIS_WEEK') return 'This Week';
    if (datePreset === 'ALL') return 'All Time';
    return 'Custom Range';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance & Expenditure Dashboard"
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/finance/expenses/new')}
          >
            Record Expense
          </Button>
        }
      />

      {/* Date Range Selector Control Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">Date Range Filter:</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              options={[
                { value: 'THIS_MONTH', label: 'This Month' },
                { value: 'LAST_MONTH', label: 'Last Month' },
                { value: 'THIS_WEEK', label: 'This Week' },
                { value: 'ALL', label: 'All Time' },
                { value: 'CUSTOM', label: 'Custom Range' },
              ]}
              className="w-40 text-xs"
            />
          </div>
        </div>

        {/* Custom Range Date Pickers */}
        {(datePreset === 'CUSTOM' || (datePreset !== 'ALL' && startDate && endDate)) && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Range:</span>
            </span>

            <div className="flex items-center gap-2">
              <label className="text-slate-500 font-medium">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('CUSTOM');
                  setStartDate(e.target.value);
                }}
                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-500 font-medium">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('CUSTOM');
                  setEndDate(e.target.value);
                }}
                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={`${getFilterLabel()} Total Expenses`}
          value={`$${totalExpenseAmount.toFixed(2)}`}
          subtitle={`${filteredExpenses.length} vouchers recorded`}
          icon={<DollarSign className="w-4 h-4" />}
          accentColor="blue"
        />
        <StatCard
          title={`${getFilterLabel()} Postal & Shipping`}
          value={`$${(categoryTotals['Postal Charges'] || 0).toFixed(2)}`}
          subtitle="Fulfillment courier dispatch fees"
          icon={<Layers className="w-4 h-4" />}
          accentColor="green"
        />
        <StatCard
          title={`${getFilterLabel()} Printing & Stationery`}
          value={`$${(categoryTotals['Printing'] || 0).toFixed(2)}`}
          subtitle="A4/A6 Labels and thermal rolls"
          icon={<DollarSign className="w-4 h-4" />}
          accentColor="purple"
        />
      </div>

      {/* Interactive Pie Chart Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{getFilterLabel()} Expense Distribution</CardTitle>
              <CardDescription>Category color breakdown and expenditure ratio</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="h-64 flex items-center justify-center">
              {pieData.length === 0 ? (
                <div className="text-xs text-slate-400">No expense records found for selected date range.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => `$${Number(val).toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                        color: '#0F172A',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category Color Cards Legend */}
            {pieData.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                {pieData.map((item, idx) => {
                  const color = COLORS[idx % COLORS.length];
                  const percentage = totalExpenseAmount > 0 ? ((item.value / totalExpenseAmount) * 100).toFixed(1) : '0';
                  return (
                    <div key={item.name} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ${item.value.toFixed(2)} ({percentage}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{getFilterLabel()} Recent Expenses</CardTitle>
              <CardDescription>Latest recorded expense transactions</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/finance/expenses')}
            >
              All
            </Button>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100">
            {filteredExpenses.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No expenses in this range.</div>
            ) : (
              filteredExpenses.slice(0, 5).map((exp) => (
                <div key={exp.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-semibold text-slate-900">{exp.categoryName}</div>
                    <div className="text-slate-400 truncate max-w-[180px]">{exp.remarks}</div>
                  </div>
                  <div className="font-bold text-slate-900 text-sm font-mono">${exp.amount.toFixed(2)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
