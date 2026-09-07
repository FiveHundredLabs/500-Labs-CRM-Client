import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ExpenseCategory, PettyCashWallet } from '../../models/domain';
import { expenseRepository, pettyCashRepository } from '../../repositories';
import { ExpenseService } from '../../services/expenseService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import toast from 'react-hot-toast';
import { 
  DollarSign, 
  ArrowLeft, 
  Wallet, 
  ShieldAlert, 
  CreditCard, 
  Building2, 
  Receipt,
  Calendar,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/currency';

export const FinanceNewExpensePage: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'PETTY_CASH'>('CASH');
  const [remarks, setRemarks] = useState('');
  const [notes, setNotes] = useState('');
  const [wallet, setWallet] = useState<PettyCashWallet | null>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>('');
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadReferenceData = async () => {
      setIsLoadingReferenceData(true);
      try {
        const [categoryData, walletData, allocationData] = await Promise.all([
          expenseRepository.getCategories(),
          pettyCashRepository.getWallet().catch(() => null),
          pettyCashRepository.getAllocations().catch(() => []),
        ]);
        setCategories(categoryData || []);
        setSelectedCategoryName((current) => current || categoryData?.[0]?.name || '');
        setWallet(walletData);
        setAllocations(allocationData || []);
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'Failed to load finance reference data.');
      } finally {
        setIsLoadingReferenceData(false);
      }
    };

    loadReferenceData();
  }, []);

  const parsedAmount = parseFloat(amount) || 0;
  const isPettyCash = selectedCategoryName === 'Petty Cash' || paymentMethod === 'PETTY_CASH';
  const isOverPettyCashBalance = isPettyCash && wallet && parsedAmount > wallet.remainingBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid positive amount.');
      return;
    }

    if (selectedCategoryName === 'Other' && !customCategory.trim()) {
      toast.error('Please specify the custom category name.');
      return;
    }

    const selectedCatObj = categories.find((c) => c.name === selectedCategoryName);
    if (selectedCategoryName !== 'Other' && !selectedCatObj) {
      toast.error('Please select a valid database expense category.');
      return;
    }

    if (!remarks.trim()) {
      toast.error('Please enter voucher remarks or purpose.');
      return;
    }

    if (isOverPettyCashBalance && wallet) {
      toast.error(
        `Expense amount (${formatCurrency(parsedAmount)}) exceeds available Petty Cash balance (${formatCurrency(wallet.remainingBalance)}).`
      );
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      if (isPettyCash) {
        await pettyCashRepository.recordExpense({
          reason: remarks.trim(),
          category: selectedCategoryName === 'Other' ? customCategory.trim() : selectedCategoryName,
          amount: parsedAmount,
          date: expenseDate,
          description: notes.trim() || remarks.trim(),
          allocationId: selectedAllocationId || undefined,
        });
      }

      await ExpenseService.createExpense(
        {
          categoryId: selectedCatObj?.id || '',
          categoryName: selectedCategoryName,
          customCategoryName: customCategory,
          amount: parsedAmount,
          expenseDate,
          remarks: remarks.trim(),
          paymentMethod,
          notes: notes.trim() || undefined,
          pettyCashRef: selectedAllocationId || undefined,
        },
        user
      );

      toast.success(`Expense voucher of ${formatCurrency(parsedAmount)} registered successfully!`);
      navigate(role === 'ADMIN' ? '/admin/finance/expenses' : '/finance/expenses');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingReferenceData) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4 text-slate-600" />}
          onClick={() => navigate(role === 'ADMIN' ? '/admin/finance/expenses' : '/finance/expenses')}
          className="text-xs"
        >
          Back to Expenses
        </Button>
      </div>

      <PageHeader
        title="Register New Expense Voucher"
        description="Capture operational costs, select funding methods, and record audit remarks."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200/90 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4.5 h-4.5 text-[#01A8F3]" />
                <span>Expense Voucher Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#01A8F3]" />
                    <span>Expense Category <span className="text-red-500">*</span></span>
                  </label>
                  <Select
                    value={selectedCategoryName}
                    onChange={(e) => setSelectedCategoryName(e.target.value)}
                    options={[
                      ...categories.map((c) => ({ value: c.name, label: c.name })),
                      { value: 'Other', label: '+ Other (Specify Custom Category)' },
                    ]}
                  />
                  {categories.length === 0 && (
                    <div className="mt-3">
                      <EmptyState
                        title="No database categories found"
                        description="Create an expense category before recording production expenses."
                      />
                    </div>
                  )}
                </div>

                {/* Custom Category input */}
                {selectedCategoryName === 'Other' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Custom Category Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g., Office Renovation, Software Licenses"
                    />
                  </div>
                )}

                {/* Amount & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[#547E1B]" />
                      <span>Voucher Amount (LKR) <span className="text-red-500">*</span></span>
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#01A8F3]" />
                      <span>Disbursement Date <span className="text-red-500">*</span></span>
                    </label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/20 shadow-2xs"
                      required
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#01A8F3]" />
                    <span>Disbursement / Funding Method</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'CASH'
                          ? 'border-[#01A8F3] bg-[#E8F7FE] text-[#0188C7] font-bold shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-slate-600 mb-1" />
                      <div className="text-xs font-bold">Cash</div>
                      <div className="text-[10px] text-slate-500">Direct register</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('BANK_TRANSFER')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'BANK_TRANSFER'
                          ? 'border-[#01A8F3] bg-[#E8F7FE] text-[#0188C7] font-bold shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-[#0188C7] mb-1" />
                      <div className="text-xs font-bold">Bank Transfer</div>
                      <div className="text-[10px] text-slate-500">Corporate bank</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PETTY_CASH')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'PETTY_CASH'
                          ? 'border-amber-600 bg-amber-50/70 text-amber-900 font-bold shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                      }`}
                    >
                      <Wallet className="w-4 h-4 text-amber-600 mb-1" />
                      <div className="text-xs font-bold">Petty Cash</div>
                      <div className="text-[10px] text-slate-500">Float wallet</div>
                    </button>
                  </div>
                </div>

                {/* Petty Cash Allocation Linkage */}
                {isPettyCash && allocations.length > 0 && (
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-amber-600" />
                      <span>Link to Specific Petty Cash Allocation (Optional)</span>
                    </label>
                    <Select
                      value={selectedAllocationId}
                      onChange={(e) => setSelectedAllocationId(e.target.value)}
                      options={[
                        { value: '', label: 'General Petty Cash Wallet Float' },
                        ...allocations.map((a) => ({
                          value: a.id,
                          label: `${a.allocationCode} — ${a.reason} (Bal: ${formatCurrency(a.remainingAmount)})`,
                        })),
                      ]}
                    />
                  </div>
                )}

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Voucher Remarks / Purpose <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Courier charges for Batticaloa delivery dispatch"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internal Reconciliation Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Receipt number, invoice reference, or audit annotations..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/20 shadow-2xs"
                  />
                </div>

                {/* Warning on Over balance */}
                {isOverPettyCashBalance && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>
                      The requested voucher amount of <strong>{formatCurrency(parsedAmount)}</strong> exceeds your available Petty Cash float balance of <strong>{formatCurrency(wallet?.remainingBalance)}</strong>.
                    </span>
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(role === 'ADMIN' ? '/admin/finance/expenses' : '/finance/expenses')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || Boolean(isOverPettyCashBalance)}
                  >
                    {isSubmitting ? 'Registering...' : 'Register Expense Voucher'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Voucher Preview Card */}
        <div className="space-y-4">
          <Card className="border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <div className="h-1 bg-[#01A8F3] w-full" />
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Voucher Preview
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#E8F7FE] text-[#0188C7] border border-[#B9E7FC]">
                  {paymentMethod}
                </span>
              </div>

              <div>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {formatCurrency(parsedAmount)}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-semibold">
                  {selectedCategoryName === 'Other' && customCategory ? customCategory : selectedCategoryName || 'Select category'}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Disbursement Date:</span>
                  <span className="font-mono text-slate-900">{format(new Date(expenseDate || new Date()), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recorded By:</span>
                  <span className="text-slate-900">{user?.fullName || 'Current User'}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-500 block text-[11px]">Purpose:</span>
                  <span className="text-slate-700 italic line-clamp-2">{remarks || 'Pending purpose'}</span>
                </div>
              </div>

              {wallet && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Petty Cash Float:</span>
                    <span className="font-mono text-slate-900 font-bold">{formatCurrency(wallet.remainingBalance)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
