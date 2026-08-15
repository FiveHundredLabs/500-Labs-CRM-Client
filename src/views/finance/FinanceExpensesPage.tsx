import React, { useState, useEffect } from 'react';
import { expenseRepository } from '../../repositories';
import { Expense } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { SearchInput } from '../../components/shared/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingState } from '../../components/shared/LoadingState';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const FinanceExpensesPage: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

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

  if (loading) return <LoadingState rows={6} />;

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.categoryName.toLowerCase().includes(search.toLowerCase()) ||
      e.remarks.toLowerCase().includes(search.toLowerCase()) ||
      e.createdByName.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || e.categoryName === categoryFilter;
    return matchesSearch && matchesCat;
  });

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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Search remarks, category, created by..." />
        </div>
        <div className="w-full sm:w-60">
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
                  <td className="py-3.5 px-4 text-xs text-slate-500">
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
