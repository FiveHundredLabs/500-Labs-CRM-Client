import React, { useState, useEffect, useRef } from 'react';
import { expenseRepository } from '../../repositories';
import { Expense } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Download, Printer, Calendar, DollarSign, Layers, FileText, Filter, CheckCircle2, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const FinanceReportsPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  if (loading) return <LoadingState rows={8} />;

  // Filter expenses
  const filtered = expenses.filter((e) => {
    const matchesCat = categoryFilter === 'ALL' || e.categoryName === categoryFilter;
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && e.expenseDate >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && e.expenseDate <= endDate;
    }
    return matchesCat && matchesDate;
  });

  const totalAmount = filtered.reduce((acc, curr) => acc + curr.amount, 0);
  const avgAmount = filtered.length > 0 ? totalAmount / filtered.length : 0;
  const maxAmount = filtered.length > 0 ? Math.max(...filtered.map((e) => e.amount)) : 0;

  // Category breakdown for summary card
  const categoryTotals: Record<string, number> = {};
  filtered.forEach((e) => {
    categoryTotals[e.categoryName] = (categoryTotals[e.categoryName] || 0) + e.amount;
  });

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No expense records to export.');
      return;
    }

    const headers = ['Voucher ID', 'Category Name', 'Expense Date', 'Remarks / Description', 'Recorded By', 'Amount ($)'];
    const rows = filtered.map((exp) => [
      exp.id,
      `"${exp.categoryName.replace(/"/g, '""')}"`,
      exp.expenseDate,
      `"${exp.remarks.replace(/"/g, '""')}"`,
      `"${exp.createdByName.replace(/"/g, '""')}"`,
      exp.amount.toFixed(2),
    ]);

    const reportTitle = categoryFilter === 'ALL' ? 'All Expenditure Categories' : categoryFilter;
    const csvContent = [
      `"Financial Expenditure Report","${reportTitle}"`,
      `"Generated Date","${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}"`,
      `"Date Range","${startDate || 'Start'} to ${endDate || 'Present'}"`,
      `"Total Vouchers","${filtered.length}"`,
      `"Total Amount ($)","${totalAmount.toFixed(2)}"`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Finance_Expense_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report exported successfully!');
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Expenditure Reports"
        description="Generate, filter, and export official financial audit statements in CSV and PDF formats"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Download className="w-4 h-4 text-emerald-600" />}
              onClick={handleExportCSV}
              className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => setIsPrintModalOpen(true)}
            >
              Export PDF / Print Statement
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Report Filter Parameters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Category</label>
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

            {/* Date Preset */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Time Period Preset</span>
              </label>
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
              />
            </div>

            {/* Quick Summary Pill */}
            <div className="flex flex-col justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-medium text-slate-500">Report Status:</span>
              <div className="font-bold text-slate-900 text-xs mt-0.5">
                {filtered.length} Vouchers &bull; ${totalAmount.toFixed(2)} Total
              </div>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {(datePreset === 'CUSTOM' || (datePreset !== 'ALL' && startDate && endDate)) && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <span className="font-semibold text-blue-900">Custom Date Range:</span>
              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-medium">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setDatePreset('CUSTOM');
                    setStartDate(e.target.value);
                  }}
                  className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-medium">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setDatePreset('CUSTOM');
                    setEndDate(e.target.value);
                  }}
                  className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Expenditure"
          value={`$${totalAmount.toFixed(2)}`}
          subtitle="Sum of filtered vouchers"
          icon={<DollarSign className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Vouchers Count"
          value={filtered.length}
          subtitle="Recorded transactions"
          icon={<FileText className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          title="Average Voucher"
          value={`$${avgAmount.toFixed(2)}`}
          subtitle="Mean cost per expense"
          icon={<Layers className="w-4 h-4 text-indigo-600" />}
          accentColor="purple"
        />
        <StatCard
          title="Highest Single Voucher"
          value={`$${maxAmount.toFixed(2)}`}
          subtitle="Peak transaction amount"
          icon={<CheckCircle2 className="w-4 h-4 text-amber-600" />}
          accentColor="green"
        />
      </div>

      {/* Report Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Expenditure Audit Table</CardTitle>
            <CardDescription>
              Showing {filtered.length} records ({categoryFilter === 'ALL' ? 'All Categories' : categoryFilter})
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportCSV}
            >
              CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => setIsPrintModalOpen(true)}
            >
              PDF Statement
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState title="No expense records found" description="Adjust your category or date filters to generate data." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Voucher ID</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Expense Date</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4 text-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filtered.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{exp.id}</td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          {exp.categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {format(new Date(exp.expenseDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{exp.remarks}</td>
                      <td className="py-3 px-4 text-slate-600">{exp.createdByName}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        ${exp.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF / Printable Statement Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            {/* Modal Header Controls (Hidden when printing) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Official PDF Statement Preview</h3>
                <p className="text-xs text-slate-500">Ready to save as PDF or print to physical printer</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={handleTriggerPrint}>
                  Print / Save as PDF
                </Button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet Content */}
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6 font-sans text-slate-900 printable-document">
              {/* Document Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="text-xl font-black tracking-tight text-slate-900">500 LABS CRM ENTERPRISE</div>
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
                    Financial Audit & Expenditure Statement
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 space-y-0.5 font-mono">
                  <div>Statement Ref: #EXP-{format(new Date(), 'yyyyMMdd-HHmm')}</div>
                  <div>Generated: {format(new Date(), 'MMM dd, yyyy hh:mm a')}</div>
                </div>
              </div>

              {/* Summary Metadata Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Category Filter:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{categoryFilter}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Date Range:</span>
                  <div className="font-bold text-slate-900 mt-0.5 font-mono">
                    {startDate || 'All Time'} to {endDate || 'Present'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Vouchers Count:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{filtered.length} Records</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Total Expenditure:</span>
                  <div className="font-black text-blue-700 text-sm mt-0.5 font-mono">${totalAmount.toFixed(2)}</div>
                </div>
              </div>

              {/* Vouchers Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px] border-y border-slate-300">
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description / Remarks</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                    <th className="py-2.5 px-3 text-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((exp) => (
                    <tr key={exp.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{exp.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{exp.categoryName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{exp.expenseDate}</td>
                      <td className="py-2.5 px-3 text-slate-700">{exp.remarks}</td>
                      <td className="py-2.5 px-3 text-slate-600">{exp.createdByName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">${exp.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
                    <td colSpan={5} className="py-3 px-3 text-right text-xs uppercase tracking-wider">
                      Grand Total Filtered Expenditure:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-blue-700 font-black">
                      ${totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures Footer */}
              <div className="pt-10 grid grid-cols-2 gap-8 text-xs border-t border-slate-200">
                <div className="space-y-8">
                  <div className="border-b border-slate-400 w-48" />
                  <div>
                    <p className="font-bold text-slate-900">Finance Officer Sign-off</p>
                    <p className="text-[11px] text-slate-500">Janaka Rajapaksha (Finance Department)</p>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="border-b border-slate-400 w-48" />
                  <div>
                    <p className="font-bold text-slate-900">System Verification & Stamp</p>
                    <p className="text-[11px] text-slate-500">500 Labs CRM Audit Verification</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
