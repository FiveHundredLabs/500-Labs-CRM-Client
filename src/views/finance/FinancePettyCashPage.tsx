import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PettyCashWallet, PettyCashTransaction } from '../../models/domain';
import { pettyCashRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
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
  CheckCircle2, 
  Clock, 
  DollarSign, 
  FileText, 
  ShieldAlert, 
  Tag, 
  User 
} from 'lucide-react';

export const FinancePettyCashPage: React.FC = () => {
  const { user } = useAuth();

  const [wallet, setWallet] = useState<PettyCashWallet | null>(null);
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ALLOCATION' | 'EXPENSE'>('ALL');

  // New Expense Dialog State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('Transport');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [walletData, txData] = await Promise.all([
        pettyCashRepository.getWallet(user?.teamId || undefined),
        pettyCashRepository.getTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(
        txData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
    } catch (err: any) {
      toast.error('Failed to load petty cash wallet data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading || !wallet) return <LoadingState rows={8} />;

  const parsedAmount = parseFloat(amount) || 0;
  const isOverBalance = parsedAmount > wallet.remainingBalance;

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!reason.trim()) {
      toast.error('Please enter a reason or voucher title for this expense.');
      return;
    }

    if (parsedAmount <= 0) {
      toast.error('Please enter a valid expense amount greater than 0.');
      return;
    }

    // 3.2 Petty Cash Restriction: Prevent transactions when Expense Amount > Available Balance
    if (parsedAmount > wallet.remainingBalance) {
      toast.error(
        `Cannot proceed: Expense amount (${formatCurrency(parsedAmount)}) exceeds available Petty Cash balance (${formatCurrency(wallet.remainingBalance)}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await pettyCashRepository.recordExpense(
        {
          reason: reason.trim(),
          category,
          amount: parsedAmount,
          date,
          description: description.trim() || reason.trim(),
        },
        user
      );

      toast.success(`Petty cash expense of ${formatCurrency(parsedAmount)} recorded successfully!`);
      setReason('');
      setAmount('');
      setDescription('');
      setIsExpenseModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record petty cash expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      !search ||
      t.reason.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.userName.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'ALL' || t.transactionType === typeFilter;
    return matchesSearch && matchesType;
  });

  const utilizationPercentage =
    wallet.allocatedAmount > 0
      ? Math.round((wallet.usedAmount / wallet.allocatedAmount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Petty Cash Wallet Management"
        description="Monitor allocated petty cash balance, record operational vouchers, and view audit trail"
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsExpenseModalOpen(true)}
          >
            Record Petty Cash Expense
          </Button>
        }
      />

      {/* Wallet Metric Cards (3.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Remaining Balance"
          value={formatCurrency(wallet.remainingBalance)}
          subtitle="Available in petty cash wallet"
          icon={<Wallet className="w-4 h-4" />}
          accentColor="green"
        />
        <StatCard
          title="Allocated Amount"
          value={formatCurrency(wallet.allocatedAmount)}
          subtitle="Allocated from Main Finance"
          icon={<ArrowDownRight className="w-4 h-4" />}
          accentColor="blue"
        />
        <StatCard
          title="Total Spent / Used"
          value={formatCurrency(wallet.usedAmount)}
          subtitle={`${utilizationPercentage}% of allocated wallet`}
          icon={<ArrowUpRight className="w-4 h-4" />}
          accentColor="amber"
        />
        <StatCard
          title="Total Transactions"
          value={transactions.length}
          subtitle="Audited ledger entries"
          icon={<FileText className="w-4 h-4" />}
          accentColor="purple"
        />
      </div>

      {/* Wallet Balance & Restriction Notice Bar */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 shadow-2xs">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Petty Cash Wallet Rules &amp; Spending Cap</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  Wallet Active
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Expenses cannot exceed the available wallet balance of <strong>{formatCurrency(wallet.remainingBalance)}</strong>. Overdrafts and manual balance additions are strictly restricted to Main Finance allocation.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Remaining Cap</div>
              <div className="text-base font-bold font-mono text-emerald-700">{formatCurrency(wallet.remainingBalance)}</div>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsExpenseModalOpen(true)}
            >
              New Expense
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Ledger (3.1 & 3.2) */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle>Petty Cash Audit Ledger</CardTitle>
            <CardDescription>Comprehensive historical log of all petty cash allocations and expenses</CardDescription>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-56">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search reason, user, category..."
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              options={[
                { value: 'ALL', label: 'All Transactions' },
                { value: 'EXPENSE', label: 'Expenses Only' },
                { value: 'ALLOCATION', label: 'Allocations Only' },
              ]}
              className="w-40 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No petty cash transactions found"
                description={
                  search
                    ? `No entries match "${search}".`
                    : 'No petty cash transactions recorded yet.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Reason / Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Remaining Balance</th>
                    <th className="px-4 py-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => {
                    const isAllocation = tx.transactionType === 'ALLOCATION';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-900">
                          {format(new Date(tx.date || tx.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                          {tx.id}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isAllocation ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                              <ArrowDownRight className="w-3 h-3" />
                              <span>Allocation</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Expense</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span>{tx.category || 'General'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs truncate">
                          <div className="font-semibold text-slate-900">{tx.reason}</div>
                          {tx.description && tx.description !== tx.reason && (
                            <div className="text-[11px] text-slate-400 truncate">{tx.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-bold">
                          <span className={isAllocation ? 'text-emerald-600' : 'text-slate-900'}>
                            {isAllocation ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-semibold text-blue-700">
                          {formatCurrency(tx.remainingBalance)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{tx.userName}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Petty Cash Expense Modal (3.1 & 3.2) */}
      <Dialog
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Petty Cash Expense"
        description="Enter expense voucher details. Spending is strictly limited to available petty cash."
        maxWidth="md"
      >
        <form onSubmit={handleRecordExpense} className="space-y-4">
          {/* Live Remaining Balance Pill */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-900">Available Petty Cash Balance:</span>
            </div>
            <span className="text-sm font-bold font-mono text-emerald-700">{formatCurrency(wallet.remainingBalance)}</span>
          </div>

          {/* Over-balance warning message (3.2) */}
          {isOverBalance && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Overspend Restriction:</strong> Expense amount of{' '}
                <span className="font-mono font-bold">{formatCurrency(parsedAmount)}</span> exceeds available balance of{' '}
                <span className="font-mono font-bold">{formatCurrency(wallet.remainingBalance)}</span>. You cannot spend more than the allocated wallet amount.
              </div>
            </div>
          )}

          <Input
            label="Expense Reason / Voucher Title *"
            placeholder="e.g. Courier Transport, Office Refreshments, Thermal Paper Rolls"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Expense Category *"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'Transport', label: 'Transport & Field Courier' },
                { value: 'Postal Charges', label: 'Postal & Dispatch Charges' },
                { value: 'Printing', label: 'Printing & Stationeries' },
                { value: 'Office Supplies', label: 'Office Supplies & Refreshments' },
                { value: 'Other', label: 'Other Operational Expense' },
              ]}
            />

            <Input
              label="Expense Date *"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Amount (LKR) *"
            type="number"
            step="0.01"
            min="1"
            placeholder="e.g. 2000.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Description / Receipt Justification
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add invoice reference, vendor details, purpose..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsExpenseModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isOverBalance || parsedAmount <= 0}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Record Voucher
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
