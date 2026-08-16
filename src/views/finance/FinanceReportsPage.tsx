import React, { useState, useEffect } from 'react';
import { expenseRepository } from '../../repositories';
import { Expense } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Download, Printer, Calendar, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const FinanceReportsPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Report Name / Category State
  const [reportName, setReportName] = useState<string>('ALL');

  // 2. Date Range State
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 3. Report Format Type State (CSV or PDF)
  const [exportFormat, setExportFormat] = useState<'CSV' | 'PDF'>('CSV');

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

  useEffect(() => {
    handlePresetChange('THIS_MONTH');
  }, []);

  if (loading) return <LoadingState rows={6} />;

  // Filter matching expenses
  const filtered = expenses.filter((e) => {
    const matchesCat = reportName === 'ALL' || e.categoryName === reportName;
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

  const getReportTitleLabel = () => {
    switch (reportName) {
      case 'Postal Charges':
        return 'Postal & Shipping Charges Report';
      case 'Printing':
        return 'Printing & Stationery Supplies Report';
      case 'Transport':
        return 'Transport & Fuel Disbursements Report';
      case 'Petty Cash':
        return 'Petty Cash & Refreshments Report';
      case 'ALL':
      default:
        return 'All Operational Expenditures Report';
    }
  };

  // CSV Export Handler
  const generateCSV = () => {
    if (filtered.length === 0) {
      toast.error('No expense records found for the selected options.');
      return;
    }

    const headers = ['Voucher ID', 'Category', 'Expense Date', 'Remarks / Description', 'Recorded By', 'Amount ($)'];
    const rows = filtered.map((exp) => [
      exp.id,
      `"${exp.categoryName.replace(/"/g, '""')}"`,
      exp.expenseDate,
      `"${exp.remarks.replace(/"/g, '""')}"`,
      `"${exp.createdByName.replace(/"/g, '""')}"`,
      exp.amount.toFixed(2),
    ]);

    const csvContent = [
      `"Report Name","${getReportTitleLabel()}"`,
      `"Generated Date","${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}"`,
      `"Date Range","${startDate || 'Start'} to ${endDate || 'Present'}"`,
      `"Total Vouchers","${filtered.length}"`,
      `"Total Expenditure ($)","${totalAmount.toFixed(2)}"`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Finance_Report_${reportName}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report generated and downloaded!');
  };

  // Form Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filtered.length === 0) {
      toast.error('No expense records match your selected options.');
      return;
    }

    if (exportFormat === 'CSV') {
      generateCSV();
    } else {
      setIsPrintModalOpen(true);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Expense Reports Generator"
        description="Select report name, date range, and export format (CSV or PDF)"
      />

      {/* Simple 3-Step Report Selection Form */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="bg-slate-50/80 border-b border-slate-200 pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Generate Expense Report</span>
          </CardTitle>
          <CardDescription>
            Choose your report specifications to download CSV or generate PDF
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Step 1: Select Report Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-extrabold">1</span>
                <span>Select Report Name</span>
              </label>
              <Select
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Operational Expenditures Report' },
                  { value: 'Postal Charges', label: 'Postal & Shipping Charges Report' },
                  { value: 'Printing', label: 'Printing & Stationery Supplies Report' },
                  { value: 'Transport', label: 'Transport & Fuel Disbursements Report' },
                  { value: 'Petty Cash', label: 'Petty Cash & Refreshments Report' },
                ]}
              />
            </div>

            {/* Step 2: Select Date Range */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-extrabold">2</span>
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Select Date Range</span>
              </label>
              <Select
                value={datePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                options={[
                  { value: 'THIS_MONTH', label: 'This Month' },
                  { value: 'LAST_MONTH', label: 'Last Month' },
                  { value: 'THIS_WEEK', label: 'This Week' },
                  { value: 'ALL', label: 'All Time' },
                  { value: 'CUSTOM', label: 'Custom Date Range' },
                ]}
              />

              {/* Custom Date Range Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setDatePreset('CUSTOM');
                      setStartDate(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setDatePreset('CUSTOM');
                      setEndDate(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Select Type of Report (CSV or PDF) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-extrabold">3</span>
                <span>Select Type of Report Format</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    exportFormat === 'CSV'
                      ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="CSV"
                    checked={exportFormat === 'CSV'}
                    onChange={() => setExportFormat('CSV')}
                    className="text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>CSV Spreadsheet (.csv)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Instant CSV data file download</div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    exportFormat === 'PDF'
                      ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="PDF"
                    checked={exportFormat === 'PDF'}
                    onChange={() => setExportFormat('PDF')}
                    className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-blue-600" />
                      <span>PDF Audit Statement (.pdf)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Print or Save as PDF document</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                Matching Vouchers: <strong className="text-slate-900 font-mono">{filtered.length} records</strong> (Total: <strong className="text-emerald-700 font-mono">${totalAmount.toFixed(2)}</strong>)
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                leftIcon={exportFormat === 'CSV' ? <Download className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                {exportFormat === 'CSV' ? 'Download CSV Report' : 'Generate PDF Statement'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview Table of Matching Expense Records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Report Preview Data</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              {filtered.length} Vouchers
            </span>
          </CardTitle>
          <CardDescription>
            Preview of records that will be exported in your selected report
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState title="No matching expense records" description="Select a different category or date range." />
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
                <tbody className="divide-y divide-slate-100">
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
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Official PDF Statement Preview</h3>
                <p className="text-xs text-slate-500">Ready to print or save as PDF document</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
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
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="text-xl font-black tracking-tight text-slate-900">500 LABS CRM ENTERPRISE</div>
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
                    {getReportTitleLabel()}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 space-y-0.5 font-mono">
                  <div>Statement Ref: #EXP-{format(new Date(), 'yyyyMMdd-HHmm')}</div>
                  <div>Generated: {format(new Date(), 'MMM dd, yyyy hh:mm a')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Report Type:</span>
                  <div className="font-bold text-slate-900 mt-0.5 truncate">{reportName}</div>
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
                      Grand Total Report Expenditure:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-blue-700 font-black">
                      ${totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

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
