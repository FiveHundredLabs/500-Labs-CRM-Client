import React, { useState, useEffect } from 'react';
import { expenseRepository } from '../../repositories';
import { Expense } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { SearchInput } from '../../components/shared/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingState } from '../../components/shared/LoadingState';
import { Plus, Calendar, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const FinanceExpensesPage: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Date Range Filter States
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await expenseRepository.getAll();
        setExpenses(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Update dates on preset selection
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - day);
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
  };

  if (loading) return <LoadingState rows={6} />;

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.categoryName.toLowerCase().includes(search.toLowerCase()) ||
      e.remarks.toLowerCase().includes(search.toLowerCase()) ||
      e.createdByName.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || e.categoryName === categoryFilter;

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && e.expenseDate >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && e.expenseDate <= endDate;
    }

    return matchesSearch && matchesCat && matchesDate;
  });

  const totalFilteredAmount = filtered.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Voucher Register"
        description="Filterable audit ledger of recorded operational expenditures"
        actions={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/finance/expenses/new')}>
            New Voucher
          </Button>
        }
      />

      {/* Filter Control Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search</label>
            <SearchInput value={search} onChange={setSearch} placeholder="Remarks, category, creator..." />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'Postal Charges', label: 'Postal Charges' },
                { value: 'Printing', label: 'Printing' },
                { value: 'Transport', label: 'Transport' },
                { value: 'Petty Cash', label: 'Petty Cash' },
              ]}
            />
          </div>

          {/* Date Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Date Filter</span>
            </label>
            <Select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Dates' },
                { value: 'THIS_MONTH', label: 'This Month' },
                { value: 'LAST_MONTH', label: 'Last Month' },
                { value: 'THIS_WEEK', label: 'This Week' },
                { value: 'CUSTOM', label: 'Custom Date Range' },
              ]}
            />
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <Button
              variant="outline"
              size="md"
              leftIcon={<X className="w-4 h-4 text-slate-400" />}
              onClick={handleClearFilters}
              className="w-full text-xs text-slate-600 hover:text-slate-900 border-slate-200"
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Custom Date Range Pickers (shown when Custom Date Range preset selected or dates set) */}
        {(datePreset === 'CUSTOM' || startDate || endDate) && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Custom Date Range:</span>
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
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}

        {/* Filter Summary Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Showing <strong className="text-slate-900">{filtered.length}</strong> of {expenses.length} expense vouchers</span>
          <span>Total Filtered: <strong className="text-emerald-700 font-mono text-sm">${totalFilteredAmount.toFixed(2)}</strong></span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No expenses recorded" description="No expense records match your current filter settings." />
      ) : (
        <div className="enterprise-table-container">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4">Expense Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      {exp.categoryName}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs truncate">{exp.remarks}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">{exp.createdByName}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                    {format(new Date(exp.expenseDate), 'MMM dd, yyyy')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                    ${exp.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
