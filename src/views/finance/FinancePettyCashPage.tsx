import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PettyCashWallet, PettyCashTransaction, PettyCashAllocation } from '../../models/domain';
import { pettyCashRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Dialog } from '../../components/ui/Dialog';
import { SearchInput } from '../../components/shared/SearchInput';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatCurrency } from '../../utils/currency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  AlertTriangle, 
  Layers,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Download,
  FileText,
  Printer,
  Receipt,
  PiggyBank
} from 'lucide-react';
import { generatePettyCashAllocationPdf, generatePettyCashStatementPdf } from '../../utils/voucherPdfGenerator';
import * as XLSX from 'xlsx';

export const FinancePettyCashPage: React.FC = () => {
  const { user, role } = useAuth();

  const [wallet, setWallet] = useState<PettyCashWallet | null>(null);
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [allocations, setAllocations] = useState<PettyCashAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filter states
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ALLOCATION' | 'EXPENSE'>('ALL');

  // New Expense Dialog State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [selectedAllocId, setSelectedAllocId] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // New Allocation Dialog State
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocateReason, setAllocateReason] = useState('');
  const [allocateRemarks, setAllocateRemarks] = useState('');
  const [isSubmittingAllocation, setIsSubmittingAllocation] = useState(false);

  const targetTeamId = role === 'SUPERVISOR' ? user?.teamId ?? undefined : undefined;

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [walletData, txData, allocData] = await Promise.all([
        pettyCashRepository.getWallet(targetTeamId),
        pettyCashRepository.getTransactions(targetTeamId),
        pettyCashRepository.getAllocations(targetTeamId).catch(() => []),
      ]);
      setWallet(walletData);
      setTransactions(
        (txData || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      setAllocations(allocData || []);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load petty cash wallet data.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetTeamId]);

  const availableAllocations = allocations.filter((a) => Number(a.remainingAmount) > 0);
  const selectedAllocation = allocations.find((a) => a.id === selectedAllocId);
  const selectedAllocRemaining = Number(selectedAllocation?.remainingAmount || 0);

  const parsedAmount = parseFloat(amount) || 0;
  const isOverBalance = parsedAmount > (wallet?.remainingBalance || 0);
  const isOverAllocation = !!selectedAllocation && parsedAmount > selectedAllocRemaining;

  // Auto-select first available allocation when modal opens
  useEffect(() => {
    if (isExpenseModalOpen) {
      const valid = allocations.filter((a) => Number(a.remainingAmount) > 0);
      if (valid.length > 0 && (!selectedAllocId || !valid.some((a) => a.id === selectedAllocId))) {
        setSelectedAllocId(valid[0].id);
      }
    }
  }, [isExpenseModalOpen, allocations, selectedAllocId]);

  if (loading) return <LoadingState rows={8} />;

  if (loadError || !wallet) {
    return (
      <EmptyState
        title="Petty cash data unavailable"
        description={loadError || 'The wallet endpoint did not return a usable wallet.'}
      />
    );
  }

  // Handle Record Expense
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please enter a voucher purpose.');
      return;
    }

    if (parsedAmount <= 0) {
      toast.error('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (availableAllocations.length === 0) {
      toast.error('No allocation funds with available balance exist. Please allocate funds first.');
      return;
    }

    if (!selectedAllocId) {
      toast.error('Please select an active allocation fund.');
      return;
    }

    const targetAlloc = allocations.find((a) => a.id === selectedAllocId);
    if (!targetAlloc) {
      toast.error('Selected allocation fund was not found.');
      return;
    }

    if (parsedAmount > Number(targetAlloc.remainingAmount)) {
      toast.error(
        `Voucher amount (${formatCurrency(parsedAmount)}) exceeds available balance in ${targetAlloc.allocationCode} (${formatCurrency(targetAlloc.remainingAmount)}).`
      );
      return;
    }

    if (parsedAmount > wallet.remainingBalance) {
      toast.error(
        `Expense amount (${formatCurrency(parsedAmount)}) exceeds available Petty Cash balance (${formatCurrency(wallet.remainingBalance)}).`
      );
      return;
    }

    setIsSubmittingExpense(true);
    try {
      await pettyCashRepository.recordExpense({
        reason: reason.trim(),
        amount: parsedAmount,
        date,
        description: description.trim() || reason.trim(),
        allocationId: selectedAllocId,
        teamId: targetTeamId,
      });

      toast.success(`Petty cash voucher of ${formatCurrency(parsedAmount)} recorded against ${targetAlloc.allocationCode}!`);
      setReason('');
      setAmount('');
      setDescription('');
      setIsExpenseModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to record expense.');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Handle Allocate Funds
  const handleAllocateFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAlloc = parseFloat(allocateAmount);
    if (isNaN(parsedAlloc) || parsedAlloc <= 0) {
      toast.error('Please enter a valid allocation amount greater than 0.');
      return;
    }

    if (!allocateReason.trim()) {
      toast.error('Please specify a purpose for this allocation.');
      return;
    }

    setIsSubmittingAllocation(true);
    try {
      await pettyCashRepository.allocate(parsedAlloc, allocateReason.trim(), targetTeamId, allocateRemarks.trim() || undefined);
      toast.success(`Allocated ${formatCurrency(parsedAlloc)} to Petty Cash wallet!`);
      setAllocateAmount('');
      setAllocateReason('');
      setAllocateRemarks('');
      setIsAllocateModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to allocate funds.');
    } finally {
      setIsSubmittingAllocation(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const exportData = filteredTransactions.map((t) => ({
      'Type': t.transactionType,
      'Allocation Fund': t.allocation?.allocationCode || (t.transactionType === 'ALLOCATION' ? 'Deposit' : (t.category || 'N/A')),
      'Amount (LKR)': t.amount,
      'Date': t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '',
      'Reason': t.reason,
      'Description': t.description,
      'Balance After (LKR)': t.remainingBalance,
      'Authorized By': t.userName,
      'Timestamp': format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Petty Cash Ledger');
    XLSX.writeFile(wb, `Petty_Cash_Ledger_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  // Safe CSV export with formula injection escaping
  const handleExportCSV = () => {
    const escapeCsvValue = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Transaction ID',
      'Type',
      'Date',
      'Allocation Fund',
      'Reason',
      'Description',
      'Amount (LKR)',
      'Balance After (LKR)',
      'Authorized By',
      'Created At',
    ];

    const rows = filteredTransactions.map((t) => [
      t.id.length > 8 ? `TX-${t.id.slice(0, 8).toUpperCase()}` : t.id,
      t.transactionType,
      t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '',
      t.allocation?.allocationCode || (t.transactionType === 'ALLOCATION' ? 'Deposit' : (t.category || 'N/A')),
      t.reason,
      t.description || '',
      Number(t.amount).toFixed(2),
      Number(t.remainingBalance).toFixed(2),
      t.userName,
      format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm'),
    ]);

    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map((r) => r.map(escapeCsvValue).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Petty_Cash_Ledger_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Allocation Voucher PDF
  const handleDownloadAllocationPdf = (alloc: PettyCashAllocation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const doc = generatePettyCashAllocationPdf(alloc);
      doc.save(`Petty_Cash_Allocation_${alloc.allocationCode}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success(`Allocation voucher (${alloc.allocationCode}) downloaded.`);
    } catch {
      toast.error('Failed to generate allocation voucher PDF.');
    }
  };

  // Download Balance Statement PDF
  const handleDownloadStatementPdf = () => {
    if (!wallet) return;
    try {
      const doc = generatePettyCashStatementPdf(wallet, transactions, targetTeamId ? 'Team Petty Cash Float' : 'Global Treasury Float');
      doc.save(`Petty_Cash_Statement_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('Petty cash balance statement PDF downloaded.');
    } catch {
      toast.error('Failed to generate balance statement PDF.');
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      !search ||
      t.reason.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (t.allocation?.allocationCode && t.allocation.allocationCode.toLowerCase().includes(search.toLowerCase())) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.userName.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'ALL' || t.transactionType === typeFilter;
    return matchesSearch && matchesType;
  });

  const utilizationPercentage =
    wallet && wallet.allocatedAmount > 0
      ? Math.min(100, Math.round((wallet.usedAmount / wallet.allocatedAmount) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Petty Cash & Allocation Governance"
        description="Monitor working float balances, record operational vouchers, and drill down into allocation funding history."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              leftIcon={<Download className="w-4 h-4 text-[#0188C7]" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              leftIcon={<FileText className="w-4 h-4 text-slate-600" />}
              onClick={handleDownloadStatementPdf}
            >
              Statement PDF
            </Button>
            {(role === 'ADMIN' || role === 'FINANCE') && (
              <Button
                variant="primary"
                leftIcon={<PiggyBank className="w-4 h-4 text-white" />}
                onClick={() => setIsAllocateModalOpen(true)}
                className="bg-[#80BD2B] hover:bg-[#71A924] text-white border-none shadow-xs"
              >
                Allocate Funds
              </Button>
            )}
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsExpenseModalOpen(true)}
            >
              Record Voucher
            </Button>
          </div>
        }
      />

      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Remaining Float */}
        <StatCard
          title="Available Petty Cash Balance"
          value={formatCurrency(wallet.remainingBalance)}
          icon={<Wallet className="w-5 h-5 text-[#547E1B]" />}
          subtitle={`${100 - utilizationPercentage}% float remaining`}
          accentColor="green"
        />

        {/* Total Allocated */}
        <StatCard
          title="Cumulative Float Allocated"
          value={formatCurrency(wallet.allocatedAmount)}
          icon={<ArrowUpRight className="w-5 h-5 text-[#01A8F3]" />}
          subtitle={`${allocations.length} total funding allocations`}
          accentColor="blue"
        />

        {/* Total Spent */}
        <StatCard
          title="Total Vouchers Disbursed"
          value={formatCurrency(wallet.usedAmount)}
          icon={<ArrowDownRight className="w-5 h-5 text-amber-600" />}
          subtitle={`${utilizationPercentage}% cumulative utilization`}
          accentColor="amber"
        />
      </div>

      {/* Float Utilization Progress Bar */}
      <Card className="border border-slate-200/90 shadow-2xs">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Wallet Float Utilization:</span>
            <span className="font-mono font-bold text-slate-900">{utilizationPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                utilizationPercentage > 85 ? 'bg-red-500' : utilizationPercentage > 60 ? 'bg-amber-500' : 'bg-[#80BD2B]'
              }`}
              style={{ width: `${utilizationPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400">
            <span>Spent: {formatCurrency(wallet.usedAmount)}</span>
            <span>Float Cap: {formatCurrency(wallet.allocatedAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Unified Transactions & Operations Ledger */}
      <div className="space-y-4">
        {/* Filters Bar: Search on left, Operation Type Filter on right */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-80">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search voucher, allocation code, user, ID..."
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              options={[
                { value: 'ALL', label: 'All Operations' },
                { value: 'ALLOCATION', label: 'Allocations Only' },
                { value: 'EXPENSE', label: 'Vouchers / Expenses' },
              ]}
            />
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <EmptyState
            title="No petty cash records found"
            description="No transaction logs match your filter criteria."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Voucher Title</th>
                    <th className="py-3 px-4">Allocation Fund</th>
                    <th className="py-3 px-4">Authorized User</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Remaining Float</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredTransactions.map((tx) => {
                    const isAlloc = tx.transactionType === 'ALLOCATION';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isAlloc
                                ? 'bg-[#E8F7FE] text-[#0188C7] border border-[#B9E7FC]'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isAlloc ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{isAlloc ? 'Allocation' : 'Voucher'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-xs text-slate-900 truncate">{tx.reason}</div>
                          {tx.description && tx.description !== tx.reason && (
                            <div className="text-[11px] text-slate-400 truncate italic">{tx.description}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {tx.allocation?.allocationCode ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0188C7] bg-[#E8F7FE] border border-[#B9E7FC] px-2.5 py-1 rounded-lg">
                              <Layers className="w-3 h-3 text-[#01A8F3]" />
                              {tx.allocation.allocationCode}
                            </span>
                          ) : isAlloc ? (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                              Deposit
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {tx.category || 'Float'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">{tx.userName}</td>

                        <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                          {tx.date ? format(new Date(tx.date), 'MMM dd, yyyy') : 'N/A'}
                        </td>

                        <td className={`py-3.5 px-4 text-right font-mono font-bold text-xs ${isAlloc ? 'text-[#0188C7]' : 'text-slate-900'}`}>
                          {isAlloc ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-slate-700">
                          {formatCurrency(tx.remainingBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      <Dialog
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Petty Cash Voucher"
      >
        <form onSubmit={handleRecordExpense} className="space-y-4">
          {availableAllocations.length === 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <div>
                  <span className="font-bold block text-amber-950">No Allocation Funds Available</span>
                  <span className="text-amber-800">
                    All petty cash disbursements must be spent directly through an allocation fund. There are currently no active allocation funds with remaining balance.
                  </span>
                </div>
                {role === 'FINANCE' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="bg-white text-xs text-amber-900 border-amber-300 hover:bg-amber-100"
                    onClick={() => {
                      setIsExpenseModalOpen(false);
                      setIsAllocateModalOpen(true);
                    }}
                  >
                    Deposit Allocation Fund First
                  </Button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Voucher Purpose <span className="text-red-500">*</span>
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Courier charges, Office milk/tea refreshments"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (LKR) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disbursement Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Allocation Fund <span className="text-red-500">*</span>
            </label>
            {availableAllocations.length === 0 ? (
              <div className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                No active allocations available with remaining balance.
              </div>
            ) : (
              <>
                <Select
                  value={selectedAllocId}
                  onChange={(e) => setSelectedAllocId(e.target.value)}
                  options={availableAllocations.map((a) => ({
                    value: a.id,
                    label: `${a.allocationCode} — Available: ${formatCurrency(a.remainingAmount)} (${a.reason})`,
                  }))}
                  required
                />
                {selectedAllocation && (
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200">
                    <span>
                      Fund: <strong className="text-slate-800 font-mono">{selectedAllocation.allocationCode}</strong> ({selectedAllocation.reason})
                    </span>
                    <span>
                      Available Balance: <strong className="text-[#0188C7] font-mono">{formatCurrency(selectedAllocation.remainingAmount)}</strong>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed recipient or receipt note..."
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/20 shadow-2xs"
            />
          </div>

          {isOverAllocation && selectedAllocation && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                Requested voucher amount of <strong>{formatCurrency(parsedAmount)}</strong> exceeds available balance of <strong>{formatCurrency(selectedAllocRemaining)}</strong> in allocation <strong>{selectedAllocation.allocationCode}</strong>.
              </span>
            </div>
          )}

          {!isOverAllocation && isOverBalance && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                Requested voucher amount of <strong>{formatCurrency(parsedAmount)}</strong> exceeds total petty cash balance of <strong>{formatCurrency(wallet.remainingBalance)}</strong>.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                isSubmittingExpense ||
                availableAllocations.length === 0 ||
                !selectedAllocId ||
                isOverBalance ||
                isOverAllocation ||
                parsedAmount <= 0
              }
            >
              {isSubmittingExpense ? 'Recording...' : 'Record Voucher'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Allocate Funds Modal */}
      <Dialog
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        title="Deposit Allocation Float to Petty Cash"
      >
        <form onSubmit={handleAllocateFunds} className="space-y-4">
          <div className="p-3 bg-[#E8F7FE] border border-[#B9E7FC] rounded-xl text-xs text-[#0188C7] flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-[#01A8F3] shrink-0" />
            <span>This will deposit operational cash float and create an audit-tracked allocation code (e.g. PC-0001).</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deposit Amount (LKR) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={allocateAmount}
              onChange={(e) => setAllocateAmount(e.target.value)}
              placeholder="e.g. 50000"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Allocation Purpose / Reason <span className="text-red-500">*</span>
            </label>
            <Input
              value={allocateReason}
              onChange={(e) => setAllocateReason(e.target.value)}
              placeholder="e.g. Monthly Operations Float — September 2026"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks / Cheque No / Reference (Optional)
            </label>
            <Input
              value={allocateRemarks}
              onChange={(e) => setAllocateRemarks(e.target.value)}
              placeholder="e.g. Withdrawal cheque #883920"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAllocateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingAllocation}
              className="bg-[#80BD2B] hover:bg-[#71A924]"
            >
              {isSubmittingAllocation ? 'Depositing...' : 'Confirm Allocation'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
