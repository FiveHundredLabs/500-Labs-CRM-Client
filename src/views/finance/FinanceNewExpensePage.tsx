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
import toast from 'react-hot-toast';
import { DollarSign, ArrowLeft, Wallet, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/currency';

export const FinanceNewExpensePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Postal Charges');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [remarks, setRemarks] = useState('');
  const [wallet, setWallet] = useState<PettyCashWallet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    expenseRepository.getCategories().then(setCategories);
    pettyCashRepository.getWallet().then(setWallet);
  }, []);

  const parsedAmount = parseFloat(amount) || 0;
  const isPettyCash = selectedCategoryName === 'Petty Cash';
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

    // 3.2 Restriction: Expense amount cannot exceed available petty cash balance
    if (isOverPettyCashBalance && wallet) {
      toast.error(
        `Expense amount (${formatCurrency(parsedAmount)}) exceeds available Petty Cash balance (${formatCurrency(wallet.remainingBalance)}).`
      );
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      const selectedCatObj = categories.find((c) => c.name === selectedCategoryName);

      // If category is Petty Cash, also record through petty cash wallet
      if (isPettyCash) {
        await pettyCashRepository.recordExpense(
          {
            reason: remarks.trim() || 'Petty Cash Expense',
            category: 'Petty Cash',
            amount: parsedAmount,
            date: expenseDate,
            description: remarks.trim() || 'Petty cash voucher',
          },
          user
        );
      }

      await ExpenseService.createExpense(
        {
          categoryId: selectedCatObj ? selectedCatObj.id : 'cat_005',
          categoryName: selectedCategoryName,
          customCategoryName: customCategory,
          amount: parsedAmount,
          expenseDate,
          remarks: remarks.trim() || 'No remarks',
        },
        user
      );

      toast.success(`Expense voucher of ${formatCurrency(parsedAmount)} recorded successfully!`);
      navigate(user?.role === 'ADMIN' ? '/admin/finance/expenses' : '/finance/expenses');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate(user?.role === 'ADMIN' ? '/admin/finance/expenses' : '/finance/expenses')}
      >
        Back to Expenses
      </Button>

      <PageHeader
        title="Record Expense Voucher"
        description="Enter expense details, category classification, and financial remarks"
      />

      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span>New Expense Entry</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Expense Category *"
              value={selectedCategoryName}
              onChange={(e) => setSelectedCategoryName(e.target.value)}
              options={[
                { value: 'Postal Charges', label: 'Postal Charges (Courier Dispatch)' },
                { value: 'Printing', label: 'Printing & Thermal Sticker Rolls' },
                { value: 'Transport', label: 'Transport & Field Courier' },
                { value: 'Petty Cash', label: 'Petty Cash & Office Supplies' },
                { value: 'Other', label: 'Other (Custom Description)' },
              ]}
            />

            {selectedCategoryName === 'Other' && (
              <Input
                label="Specify Custom Category Name *"
                placeholder="e.g. Server Hosting / Equipment Repair"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
              />
            )}

            {/* Petty Cash Wallet Indicator */}
            {isPettyCash && wallet && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-blue-600" />
                    <span>Petty Cash Wallet Balance:</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(wallet.remainingBalance)}</span>
                </div>

                {isOverPettyCashBalance && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-[11px]">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Amount exceeds available Petty Cash balance ({formatCurrency(wallet.remainingBalance)}).</span>
                  </div>
                )}
              </div>
            )}

            <Input
              label="Amount (LKR) *"
              type="number"
              step="0.01"
              placeholder="e.g. 150.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <Input
              label="Expense Date *"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Remarks / Purpose *
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add expense justification or receipt reference..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => navigate('/finance/expenses')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Save Expense Voucher
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
